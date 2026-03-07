package internal

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"sync"

	"github.com/rs/zerolog"
)

const inviteTokenLength = 32
const sessionTokenLength = 64

func randToken(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

const cookieName = "keybo_sess"

// Auth holds the server-lifetime invite token and active session IDs.
type Auth struct {
	token    string // URL invite token (shown in terminal on startup)
	sessions map[string]struct{}
	mu       sync.RWMutex
}

func newAuth() *Auth {
	return &Auth{
		token:    randToken(inviteTokenLength),
		sessions: make(map[string]struct{}),
	}
}

// Token returns the invite token to embed in the startup URL.
func (a *Auth) Token() string { return a.token }

// addSession creates a new session ID, stores it, and returns it.
func (a *Auth) addSession() string {
	id := randToken(sessionTokenLength)
	a.mu.Lock()
	a.sessions[id] = struct{}{}
	a.mu.Unlock()
	return id
}

// validSession reports whether the given session ID is active.
func (a *Auth) validSession(id string) bool {
	a.mu.RLock()
	_, ok := a.sessions[id]
	a.mu.RUnlock()
	return ok
}

// sessionFromRequest returns the session cookie value, or "" if absent/invalid.
func sessionFromRequest(r *http.Request) string {
	c, err := r.Cookie(cookieName)
	if err != nil {
		return ""
	}
	return c.Value
}

// baseCookie returns a cookie template with the security attributes applied.
// Secure is derived from the request so the same code works for both HTTP and HTTPS.
func baseCookie(r *http.Request) *http.Cookie {
	return &http.Cookie{
		Name:     cookieName,
		Path:     "/",
		HttpOnly: true,
		Secure:   r.TLS != nil,
		SameSite: http.SameSiteStrictMode,
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// HandleAuth handles GET /api/auth[?token=<token>].
// Called by the frontend via fetch before connecting the WebSocket.
//
// With token: validates the invite token, issues (or renews) a session cookie.
// Without token: checks the existing session cookie; returns 401 if absent or invalid.
func (a *Auth) HandleAuth(w http.ResponseWriter, r *http.Request) {
	log := zerolog.Ctx(r.Context())

	provided := r.URL.Query().Get("token")

	// No token — cookie-only check.
	if provided == "" {
		if a.validSession(sessionFromRequest(r)) {
			log.Info().Str("remote", r.RemoteAddr).Msg("auth: cookie check passed")
			writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		} else {
			log.Warn().Str("remote", r.RemoteAddr).Msg("auth: no token, no valid session")
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		}
		return
	}

	// Token provided — validate it.
	if provided != a.token {
		log.Warn().
			Str("remote", r.RemoteAddr).
			Str("provided_token", provided[:min(len(provided), 8)]+"…").
			Msg("auth rejected: invalid token")
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "invalid token"})
		return
	}

	existing := sessionFromRequest(r)
	if existing != "" && a.validSession(existing) {
		log.Info().Str("remote", r.RemoteAddr).Msg("auth: existing session valid")
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}

	// Stale or absent cookie: clear it and issue a new session.
	if existing != "" {
		log.Warn().Str("remote", r.RemoteAddr).Msg("auth: stale session cookie, replacing")
		del := baseCookie(r)
		del.MaxAge = -1
		http.SetCookie(w, del)
	}

	sessID := a.addSession()
	log.Info().Str("remote", r.RemoteAddr).Msg("auth: new session issued")

	c := baseCookie(r)
	c.Value = sessID
	http.SetCookie(w, c)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// RequireSession is middleware that rejects requests without a valid session.
func (a *Auth) RequireSession(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log := zerolog.Ctx(r.Context())
		sess := sessionFromRequest(r)
		if !a.validSession(sess) {
			log.Warn().
				Str("remote", r.RemoteAddr).
				Str("path", r.URL.Path).
				Bool("cookie_present", sess != "").
				Msg("session required: unauthorized")
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}
