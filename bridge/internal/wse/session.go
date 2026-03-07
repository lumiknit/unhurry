package wse

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
)

// Session is a multiplexed channel within a single WebSocket connection.
type Session interface {
	ID() string
	// Receive handles raw bytes arriving from the frontend for this session.
	Receive(data []byte) error
	// Resize notifies the session of a terminal window size change.
	Resize(cols, rows uint16) error
	// Close tears down the session and its resources.
	Close() error
}

// sessionManager tracks active sessions for one WS connection.
type sessionManager struct {
	mu       sync.RWMutex
	sessions map[string]Session
}

func newSessionManager() *sessionManager {
	return &sessionManager{sessions: make(map[string]Session)}
}

func (sm *sessionManager) add(s Session) {
	sm.mu.Lock()
	sm.sessions[s.ID()] = s
	sm.mu.Unlock()
}

func (sm *sessionManager) get(id string) (Session, bool) {
	sm.mu.RLock()
	s, ok := sm.sessions[id]
	sm.mu.RUnlock()
	return s, ok
}

func (sm *sessionManager) remove(id string) {
	sm.mu.Lock()
	delete(sm.sessions, id)
	sm.mu.Unlock()
}

func (sm *sessionManager) closeAll() {
	sm.mu.Lock()
	for id, s := range sm.sessions {
		_ = s.Close()
		delete(sm.sessions, id)
	}
	sm.mu.Unlock()
}

func newSessionID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
