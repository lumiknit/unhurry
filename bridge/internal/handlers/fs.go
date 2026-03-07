package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
)

type fsListReq struct {
	Path string `json:"path"`
}

type fsListResp struct {
	Entries []string `json:"entries"`
}

type fsHomeResp struct {
	Path string `json:"path"`
}

// HandleFsHome returns the current user's home directory.
func HandleFsHome(_ context.Context, _ json.RawMessage) (any, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		home = "/"
	}
	return fsHomeResp{Path: home}, nil
}

// HandleFsList handles the "fs_list" once request.
// Request:  {"path": "/some/dir"}
// Response: {"entries": ["file.txt", "subdir/", ...]}
// Directories are identified by a trailing "/".
func HandleFsList(_ context.Context, payload json.RawMessage) (any, error) {
	var req fsListReq
	if err := json.Unmarshal(payload, &req); err != nil {
		return nil, fmt.Errorf("fs_list: %w", err)
	}
	if req.Path == "" {
		return nil, fmt.Errorf("fs_list: path is required")
	}

	entries, err := os.ReadDir(req.Path)
	if err != nil {
		return nil, fmt.Errorf("fs_list: %w", err)
	}

	names := make([]string, 0, len(entries))
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() {
			name += "/"
		}
		names = append(names, name)
	}
	return fsListResp{Entries: names}, nil
}
