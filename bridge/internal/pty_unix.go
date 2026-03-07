//go:build !windows

package pty

import (
	"fmt"
	"os"
	"os/exec"

	creack "github.com/creack/pty"
)

type unixPTY struct {
	f *os.File
}

func start(cmd *exec.Cmd) (PTY, error) {
	f, err := creack.Start(cmd)
	if err != nil {
		return nil, fmt.Errorf("pty: start: %w", err)
	}
	// Set an initial size so xterm FitAddon has something to work with.
	_ = creack.Setsize(f, &creack.Winsize{Cols: 80, Rows: 24})
	return &unixPTY{f: f}, nil
}

func (p *unixPTY) Read(b []byte) (int, error)  { return p.f.Read(b) }
func (p *unixPTY) Write(b []byte) (int, error) { return p.f.Write(b) }
func (p *unixPTY) Close() error                { return p.f.Close() }

func (p *unixPTY) Resize(cols, rows uint16) error {
	return creack.Setsize(p.f, &creack.Winsize{Cols: cols, Rows: rows})
}
