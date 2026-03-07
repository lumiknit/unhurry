package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"runtime"

	ipty "github.com/lumiknit/keybo/internal/pty"
	"github.com/lumiknit/keybo/internal/wse"
	"github.com/rs/zerolog"
)

// BuildTerminalSession is a wse.SessionBuilder that spawns a PTY shell.
func BuildTerminalSession(
	ctx context.Context,
	sessionID string,
	_ json.RawMessage,
	send func([]byte) error,
	onClose func(id string),
) (wse.Session, error) {
	log := zerolog.Ctx(ctx).With().
		Str("session", sessionID).
		Str("purpose", "terminal").
		Logger()
	return newTerminalSession(sessionID, send, onClose, log)
}

// ── terminalSession ───────────────────────────────────────────────────────────

type terminalSession struct {
	id      string
	ptmx    ipty.PTY
	send    func([]byte) error
	onClose func(id string)
	log     zerolog.Logger
}

func newTerminalSession(
	id string,
	send func([]byte) error,
	onClose func(id string),
	log zerolog.Logger,
) (*terminalSession, error) {
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("powershell.exe")
	} else {
		shell := os.Getenv("SHELL")
		if shell == "" {
			shell = "/bin/sh"
		}
		cmd = exec.Command(shell)
	}
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")

	ptmx, err := ipty.Start(cmd)
	if err != nil {
		return nil, fmt.Errorf("terminal: %w", err)
	}

	ts := &terminalSession{
		id:      id,
		ptmx:    ptmx,
		send:    send,
		onClose: onClose,
		log:     log,
	}
	go ts.readLoop()
	return ts, nil
}

func (ts *terminalSession) ID() string { return ts.id }

func (ts *terminalSession) readLoop() {
	buf := make([]byte, 4096)
	for {
		n, err := ts.ptmx.Read(buf)
		if n > 0 {
			if sendErr := ts.send(buf[:n]); sendErr != nil {
				ts.log.Warn().Err(sendErr).Msg("terminal: send failed")
				break
			}
		}
		if err != nil {
			ts.log.Info().Err(err).Msg("terminal: pty read ended")
			break
		}
	}
	ts.onClose(ts.id)
}

func (ts *terminalSession) Receive(data []byte) error {
	_, err := ts.ptmx.Write(data)
	return err
}

func (ts *terminalSession) Resize(cols, rows uint16) error {
	return ts.ptmx.Resize(cols, rows)
}

func (ts *terminalSession) Close() error {
	return ts.ptmx.Close()
}
