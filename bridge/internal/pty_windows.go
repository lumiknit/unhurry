//go:build windows

package pty

import (
	"fmt"
	"os/exec"
	"syscall"

	"github.com/UserExistsError/conpty"
	"golang.org/x/sys/windows"
)

type winPTY struct {
	cp *conpty.ConPTY
}

func start(cmd *exec.Cmd) (PTY, error) {
	cp, err := conpty.New(80, 24, 0)
	if err != nil {
		return nil, fmt.Errorf("pty: conpty.New: %w", err)
	}

	// Build a properly-quoted Windows command line from cmd.Args.
	// windows.ComposeCommandLine handles quoting and escaping.
	cmdLine := windows.ComposeCommandLine(cmd.Args)

	// Build a Windows environment block (null-separated KEY=VALUE pairs,
	// double-null terminated). Pass nil to inherit the current environment.
	var envBlock *uint16
	if cmd.Env != nil {
		if envBlock, err = buildEnvBlock(cmd.Env); err != nil {
			_ = cp.Close()
			return nil, fmt.Errorf("pty: env block: %w", err)
		}
	}

	if _, err = cp.Spawn(cmd.Path, cmdLine, envBlock, cmd.Dir); err != nil {
		_ = cp.Close()
		return nil, fmt.Errorf("pty: spawn: %w", err)
	}

	return &winPTY{cp: cp}, nil
}

func (p *winPTY) Read(b []byte) (int, error)  { return p.cp.Read(b) }
func (p *winPTY) Write(b []byte) (int, error) { return p.cp.Write(b) }
func (p *winPTY) Close() error                { return p.cp.Close() }

func (p *winPTY) Resize(cols, rows uint16) error {
	return p.cp.Resize(int16(cols), int16(rows))
}

// buildEnvBlock converts a []string environment ("KEY=VALUE") into the
// Windows CreateProcess lpEnvironment format: UTF-16 encoded null-separated
// entries with a final double-null terminator.
func buildEnvBlock(env []string) (*uint16, error) {
	var block []uint16
	for _, e := range env {
		encoded, err := syscall.UTF16FromString(e) // appends \0
		if err != nil {
			return nil, err
		}
		block = append(block, encoded...)
	}
	block = append(block, 0) // final extra \0 → double-null at end
	return &block[0], nil
}
