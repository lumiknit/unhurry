package wse

import (
	"context"
	"encoding/json"
)

// OnceHandler handles a single stateless request-response call over WebSocket.
// payload is the raw JSON body of the request.
// The returned value is JSON-marshalled and sent back as the response body.
type OnceHandler func(ctx context.Context, payload json.RawMessage) (any, error)

// SessionBuilder is called when the frontend requests a new multiplexed
// session of a given purpose.
//
//   - sessionID: server-assigned ID for this session
//   - payload: optional JSON payload supplied by the frontend at creation time
//   - send: sends raw bytes to the frontend for this session (framing is done
//     by WsClient; the builder/session should pass unframed data)
//   - onClose: must be called exactly once when the session ends naturally
type SessionBuilder func(
	ctx context.Context,
	sessionID string,
	payload json.RawMessage,
	send func([]byte) error,
	onClose func(id string),
) (Session, error)

// WsRouter holds the handler registrations shared across all WsClient
// instances on a server. Register all handlers before the server starts;
// the router is read-only during serving.
type WsRouter struct {
	once     map[string]OnceHandler
	sessions map[string]SessionBuilder
}

// NewWsRouter creates an empty router.
func NewWsRouter() *WsRouter {
	return &WsRouter{
		once:     make(map[string]OnceHandler),
		sessions: make(map[string]SessionBuilder),
	}
}

// OnOnce registers a handler for a once-type (-1-) request.
func (r *WsRouter) OnOnce(msgType string, h OnceHandler) {
	r.once[msgType] = h
}

// OnSession registers a builder for session-creation requests.
// The frontend triggers this by sending "new_session_<purpose>".
func (r *WsRouter) OnSession(purpose string, b SessionBuilder) {
	r.sessions[purpose] = b
}
