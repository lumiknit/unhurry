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

// ── os_platform ───────────────────────────────────────────────────────────────

type osPlatformResp struct {
	Platform string `json:"platform"`
	Shell    string `json:"shell"`
}

// HandleOsPlatform returns the OS name and preferred shell.
func HandleOsPlatform(_ context.Context, _ json.RawMessage) (any, error) {
	shell := "shell"
	if runtime.GOOS == "windows" {
		shell = "powershell"
	}
	return osPlatformResp{Platform: runtime.GOOS, Shell: shell}, nil
}

// ── notebook_cell session ─────────────────────────────────────────────────────

type notebookCellPayload struct {
	Command string `json:"command"`
	Cwd     string `json:"cwd"`
}

type notebookCellSession struct {
	id      string
	ptmx    ipty.PTY
	send    func([]byte) error
	onClose func(id string)
	log     zerolog.Logger
}

// BuildNotebookCellSession is a wse.SessionBuilder that runs a single command
// in a PTY. On Unix, stdin is redirected from /dev/null so the process cannot
// read keyboard input. On Windows, ConPTY is used and the command runs in
// PowerShell.
func BuildNotebookCellSession(
	ctx context.Context,
	sessionID string,
	rawPayload json.RawMessage,
	send func([]byte) error,
	onClose func(id string),
) (wse.Session, error) {
	log := zerolog.Ctx(ctx).With().
		Str("session", sessionID).
		Str("purpose", "notebook_cell").
		Logger()

	var payload notebookCellPayload
	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		return nil, fmt.Errorf("notebook_cell: bad payload: %w", err)
	}
	if payload.Command == "" {
		return nil, fmt.Errorf("notebook_cell: command is required")
	}

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		// PowerShell: -NonInteractive suppresses prompts that would block
		// since there is no real stdin attached via ConPTY in cell mode.
		cmd = exec.Command("powershell.exe", "-NonInteractive", "-Command", payload.Command)
	} else {
		shell := os.Getenv("SHELL")
		if shell == "" {
			shell = "/bin/sh"
		}
		// exec </dev/null prevents the command from reading stdin while
		// still allowing signal delivery via the PTY.
		cmd = exec.Command(shell, "-c", "exec </dev/null; "+payload.Command)
	}
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")
	if payload.Cwd != "" {
		cmd.Dir = payload.Cwd
	}

	ptmx, err := ipty.Start(cmd)
	if err != nil {
		return nil, fmt.Errorf("notebook_cell: %w", err)
	}

	s := &notebookCellSession{
		id:      sessionID,
		ptmx:    ptmx,
		send:    send,
		onClose: onClose,
		log:     log,
	}
	go s.readLoop()
	return s, nil
}

func (s *notebookCellSession) ID() string { return s.id }

func (s *notebookCellSession) readLoop() {
	buf := make([]byte, 4096)
	for {
		n, err := s.ptmx.Read(buf)
		if n > 0 {
			if sendErr := s.send(buf[:n]); sendErr != nil {
				s.log.Warn().Err(sendErr).Msg("notebook_cell: send failed")
				break
			}
		}
		if err != nil {
			s.log.Info().Err(err).Msg("notebook_cell: pty read ended")
			break
		}
	}
	s.onClose(s.id)
}

func (s *notebookCellSession) Receive(data []byte) error {
	_, err := s.ptmx.Write(data)
	return err
}

func (s *notebookCellSession) Resize(cols, rows uint16) error {
	return s.ptmx.Resize(cols, rows)
}

func (s *notebookCellSession) Close() error {
	return s.ptmx.Close()
}
