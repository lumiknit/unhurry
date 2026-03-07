// Package pty provides a cross-platform pseudo-terminal abstraction.
//
// Unix uses the creack/pty library (openpty + forkpty).
// Windows uses the Windows ConPTY API via github.com/UserExistsError/conpty.
//
// Usage:
//
//	cmd := exec.Command("bash")
//	cmd.Env = append(os.Environ(), "TERM=xterm-256color")
//	p, err := pty.Start(cmd)
//	// p.Read / p.Write / p.Resize / p.Close
package pty

import "os/exec"

// PTY is a pseudo-terminal master attached to a running process.
// The process's stdin, stdout, and stderr are all connected to the PTY.
//
// Implementations are platform-specific:
//   - pty_unix.go  (build: !windows) – backed by an *os.File from creack/pty
//   - pty_windows.go (build: windows) – backed by a Windows ConPTY handle
type PTY interface {
	// Read reads raw terminal output from the process.
	Read(p []byte) (n int, err error)
	// Write sends raw input to the process.
	Write(p []byte) (n int, err error)
	// Resize notifies the PTY of a new terminal window size.
	Resize(cols, rows uint16) error
	// Close tears down the PTY master, which delivers SIGHUP (Unix) or
	// terminates the ConPTY input/output pipes (Windows), ending the process.
	Close() error
}

// Start starts cmd with a pseudo-terminal attached to its stdio streams
// and returns the PTY master. The initial size is 80×24; use Resize to change it.
//
// On Unix, cmd.SysProcAttr and cmd.ExtraFiles are respected.
// On Windows, only cmd.Path, cmd.Args, cmd.Env, and cmd.Dir are used.
func Start(cmd *exec.Cmd) (PTY, error) {
	return start(cmd)
}
