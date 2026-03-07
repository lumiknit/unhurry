package internal

import (
	"fmt"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/lumiknit/keybo/internal/handlers"
	"github.com/lumiknit/keybo/internal/wse"
	"github.com/lumiknit/keybo/ui"
	"github.com/rs/zerolog"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func newRouter() *wse.WsRouter {
	r := wse.NewWsRouter()
	r.OnSession("terminal", handlers.BuildTerminalSession)
	r.OnSession("notebook_cell", handlers.BuildNotebookCellSession)
	r.OnOnce("fs_home", handlers.HandleFsHome)
	r.OnOnce("fs_list", handlers.HandleFsList)
	r.OnOnce("os_platform", handlers.HandleOsPlatform)
	return r
}

func wsHandler(auth *Auth, router *wse.WsRouter) http.HandlerFunc {
	return auth.RequireSession(func(w http.ResponseWriter, r *http.Request) {
		log := zerolog.Ctx(r.Context())

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Error().Err(err).Msg("ws upgrade failed")
			return
		}
		defer conn.Close()

		log.Info().Str("remote", r.RemoteAddr).Msg("ws connected")
		wse.NewWsClient(conn, router, *log).Run()
	})
}

// Serve starts the HTTP server and prints the auth URL to stdout.
func Serve(addr string) error {
	auth := newAuth()
	router := newRouter()

	mux := http.NewServeMux()
	mux.HandleFunc("/api/auth", auth.HandleAuth)
	mux.HandleFunc("/api/ws", wsHandler(auth, router))

	if ui.FS != nil {
		mux.Handle("/", http.FileServer(http.FS(ui.FS)))
	}

	fmt.Printf("\n  Open this URL to authenticate:\n\n    http://localhost%s/?token=%s\n\n",
		addr, auth.Token())

	return http.ListenAndServe(addr, TraceMiddleware(mux))
}
