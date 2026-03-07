// Package wse implements the WebSocket engine: message routing, session
// multiplexing, and the once (-1-) request-response protocol.
//
// Message framing:
//
//	Session data  (bidirectional): "-s-<sessionID>\n<raw bytes>"
//	Once request  (FE → BE):       "-1-<callID>\n<type>\n<json body>"
//	Once response (BE → FE):       "-1-<callID>\n<type>\n<json body>"
//	Once error    (BE → FE):       "-1-<callID>\nerr\n{"message":"..."}"
//	Control       (bidirectional): "<type>\n<json body>"
//
// Session creation control messages:
//
//	FE → BE: "new_session_<purpose>\n{"correlation_id":"..."}"
//	BE → FE: "session_created\n{"session_id":"...","purpose":"...","correlation_id":"..."}"
//	BE → FE: "session_closed\n{"session_id":"..."}"
package wse

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
)

const (
	sessionMsgPrefix = "-s-"
	onceMsgPrefix    = "-1-"
)

// ── control message types ─────────────────────────────────────────────────────

type newSessionReq struct {
	CorrelationID string          `json:"correlation_id"`
	Payload       json.RawMessage `json:"payload,omitempty"`
}

type sessionCreatedResp struct {
	SessionID     string `json:"session_id"`
	Purpose       string `json:"purpose"`
	CorrelationID string `json:"correlation_id"`
}

type sessionClosedResp struct {
	SessionID string `json:"session_id"`
}

type closeSessionReq struct {
	SessionID string `json:"session_id"`
}

type resizeSessionReq struct {
	SessionID string `json:"session_id"`
	Cols      uint16 `json:"cols"`
	Rows      uint16 `json:"rows"`
}

// ── WsClient ─────────────────────────────────────────────────────────────────

// WsClient owns one WebSocket connection and dispatches incoming messages via
// a shared WsRouter.
type WsClient struct {
	conn     *websocket.Conn
	router   *WsRouter
	sessions *sessionManager
	writeMu  sync.Mutex
	log      zerolog.Logger
	ctx      context.Context
	cancel   context.CancelFunc
}

// NewWsClient creates a client for conn using the provided router.
// The logger is embedded into the client's context so handlers can retrieve it
// via zerolog.Ctx(ctx).
func NewWsClient(conn *websocket.Conn, router *WsRouter, log zerolog.Logger) *WsClient {
	ctx, cancel := context.WithCancel(context.Background())
	ctx = log.WithContext(ctx)
	return &WsClient{
		conn:     conn,
		router:   router,
		sessions: newSessionManager(),
		log:      log,
		ctx:      ctx,
		cancel:   cancel,
	}
}

// Run reads messages until the connection closes, then tears down all sessions.
func (c *WsClient) Run() {
	defer c.cancel()
	defer c.sessions.closeAll()

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			c.log.Info().Err(err).Msg("ws: read ended")
			break
		}
		if err := c.route(raw); err != nil {
			c.log.Warn().Err(err).Msg("ws: route error")
		}
	}
}

// ── low-level write ───────────────────────────────────────────────────────────

func (c *WsClient) writeBytes(msgType int, data []byte) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	return c.conn.WriteMessage(msgType, data)
}

func (c *WsClient) writeControl(msgType string, payload any) error {
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return c.writeBytes(websocket.TextMessage,
		[]byte(fmt.Sprintf("%s\n%s", msgType, b)))
}

// ── routing ───────────────────────────────────────────────────────────────────

func (c *WsClient) route(raw []byte) error {
	s := string(raw)
	switch {
	case strings.HasPrefix(s, sessionMsgPrefix):
		return c.routeSession(s, raw)
	case strings.HasPrefix(s, onceMsgPrefix):
		return c.routeOnce(s)
	default:
		return c.routeControl(s)
	}
}

func (c *WsClient) routeSession(s string, raw []byte) error {
	rest := s[len(sessionMsgPrefix):]
	nlIdx := strings.IndexByte(rest, '\n')
	if nlIdx < 0 {
		return fmt.Errorf("malformed session message: no newline")
	}
	sessionID := rest[:nlIdx]
	data := raw[len(sessionMsgPrefix)+nlIdx+1:]

	sess, ok := c.sessions.get(sessionID)
	if !ok {
		return fmt.Errorf("unknown session: %s", sessionID)
	}
	return sess.Receive(data)
}

func (c *WsClient) routeOnce(s string) error {
	// "-1-<callID>\n<type>\n<body>"
	rest := s[len(onceMsgPrefix):]

	nl1 := strings.IndexByte(rest, '\n')
	if nl1 < 0 {
		return fmt.Errorf("malformed once message: missing first newline")
	}
	callID := rest[:nl1]

	rest2 := rest[nl1+1:]
	nl2 := strings.IndexByte(rest2, '\n')
	if nl2 < 0 {
		return fmt.Errorf("malformed once message: missing second newline")
	}
	msgType := rest2[:nl2]
	body := json.RawMessage(rest2[nl2+1:])

	handler, ok := c.router.once[msgType]
	if !ok {
		return c.sendOnceError(callID, fmt.Errorf("unknown once type: %q", msgType))
	}

	go func() {
		result, err := handler(c.ctx, body)
		if err != nil {
			if sendErr := c.sendOnceError(callID, err); sendErr != nil {
				c.log.Warn().Err(sendErr).Str("call_id", callID).Msg("once: send error failed")
			}
			return
		}
		if sendErr := c.sendOnceResp(callID, msgType, result); sendErr != nil {
			c.log.Warn().Err(sendErr).Str("call_id", callID).Msg("once: send resp failed")
		}
	}()
	return nil
}

func (c *WsClient) sendOnceResp(callID, msgType string, data any) error {
	b, err := json.Marshal(data)
	if err != nil {
		return err
	}
	msg := fmt.Sprintf("%s%s\n%s\n%s", onceMsgPrefix, callID, msgType, b)
	return c.writeBytes(websocket.TextMessage, []byte(msg))
}

func (c *WsClient) sendOnceError(callID string, errVal error) error {
	b, _ := json.Marshal(map[string]string{"message": errVal.Error()})
	msg := fmt.Sprintf("%s%s\nerr\n%s", onceMsgPrefix, callID, b)
	return c.writeBytes(websocket.TextMessage, []byte(msg))
}

func (c *WsClient) routeControl(s string) error {
	nlIdx := strings.IndexByte(s, '\n')
	msgType, payload := s, ""
	if nlIdx >= 0 {
		msgType = s[:nlIdx]
		payload = s[nlIdx+1:]
	}
	return c.handleControl(msgType, payload)
}

func (c *WsClient) handleControl(msgType, payload string) error {
	switch {
	case msgType == "ping":
		return c.writeControl("pong", struct{}{})

	case strings.HasPrefix(msgType, "new_session_"):
		purpose := msgType[len("new_session_"):]
		return c.handleNewSession(purpose, payload)

	case msgType == "close_session":
		var req closeSessionReq
		if err := json.Unmarshal([]byte(payload), &req); err != nil {
			return fmt.Errorf("close_session parse: %w", err)
		}
		return c.closeSession(req.SessionID)

	case msgType == "resize_session":
		var req resizeSessionReq
		if err := json.Unmarshal([]byte(payload), &req); err != nil {
			return fmt.Errorf("resize_session parse: %w", err)
		}
		sess, ok := c.sessions.get(req.SessionID)
		if !ok {
			return fmt.Errorf("resize_session: unknown session %s", req.SessionID)
		}
		return sess.Resize(req.Cols, req.Rows)

	default:
		c.log.Warn().Str("type", msgType).Msg("ws: unknown control type")
	}
	return nil
}

func (c *WsClient) handleNewSession(purpose, payload string) error {
	var req newSessionReq
	if err := json.Unmarshal([]byte(payload), &req); err != nil {
		return fmt.Errorf("new_session_%s parse: %w", purpose, err)
	}

	builder, ok := c.router.sessions[purpose]
	if !ok {
		return fmt.Errorf("unknown session purpose: %q", purpose)
	}

	sessID := newSessionID()
	log := c.log.With().Str("session", sessID).Str("purpose", purpose).Logger()

	// send wraps raw data with the "-s-<id>\n" frame before writing.
	send := func(data []byte) error {
		prefix := []byte(sessionMsgPrefix + sessID + "\n")
		frame := make([]byte, len(prefix)+len(data))
		copy(frame, prefix)
		copy(frame[len(prefix):], data)
		return c.writeBytes(websocket.BinaryMessage, frame)
	}

	onClose := func(id string) {
		c.sessions.remove(id)
		if err := c.writeControl("session_closed", sessionClosedResp{SessionID: id}); err != nil {
			log.Warn().Err(err).Msg("session_closed notify failed")
		}
		log.Info().Msg("session closed")
	}

	sess, err := builder(c.ctx, sessID, req.Payload, send, onClose)
	if err != nil {
		return fmt.Errorf("build session %q: %w", purpose, err)
	}

	c.sessions.add(sess)
	log.Info().Msg("session created")

	return c.writeControl("session_created", sessionCreatedResp{
		SessionID:     sessID,
		Purpose:       purpose,
		CorrelationID: req.CorrelationID,
	})
}

func (c *WsClient) closeSession(sessionID string) error {
	sess, ok := c.sessions.get(sessionID)
	if !ok {
		return fmt.Errorf("close_session: unknown session %s", sessionID)
	}
	c.sessions.remove(sessionID)
	_ = sess.Close()
	return c.writeControl("session_closed", sessionClosedResp{SessionID: sessionID})
}
