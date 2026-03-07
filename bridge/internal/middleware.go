package internal

import (
	"bufio"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/google/uuid"
)

func newTraceID() string {
	return uuid.New().String()
}

// responseWriter wraps http.ResponseWriter to capture the status code and bytes written.
type responseWriter struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	n, err := rw.ResponseWriter.Write(b)
	rw.bytes += n
	return n, err
}

// Hijack delegates to the underlying ResponseWriter so that WebSocket
// upgrades (which require http.Hijacker) work through this wrapper.
func (rw *responseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h, ok := rw.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, fmt.Errorf("underlying ResponseWriter does not implement http.Hijacker")
	}
	return h.Hijack()
}

// TraceMiddleware is the outermost handler wrapper. For every request it:
//  1. Generates a UUID trace ID.
//  2. Creates a child zerolog.Logger with the trace ID pre-attached.
//  3. Injects the logger into the request context.
//  4. Emits a structured access-log line after the handler returns.
func TraceMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceID := newTraceID()
		log := Log.With().Str("trace", traceID).Logger()

		r = r.WithContext(log.WithContext(r.Context()))
		start := time.Now()

		rw := &responseWriter{ResponseWriter: w}
		w = rw

		log = log.With().
			Str("method", r.Method).
			Str("path", r.URL.RequestURI()).
			Str("remote", r.RemoteAddr).
			Logger()

		log.Info().Msg("→ request")

		next.ServeHTTP(w, r)

		elapsed := time.Since(start)
		event := log.Info()
		if rw.status >= 500 {
			event = log.Error()
		} else if rw.status >= 400 {
			event = log.Warn()
		}
		event.
			Int("status", rw.status).
			Dur("elapsed", elapsed).
			Msg("← response")
	})
}
