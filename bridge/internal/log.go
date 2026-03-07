package internal

import (
	"os"
	"time"

	"github.com/rs/zerolog"
)

// Log is the package-level logger used by all internal components.
var Log zerolog.Logger

func init() {
	output := zerolog.ConsoleWriter{
		Out:        os.Stderr,
		TimeFormat: time.RFC3339,
	}
	Log = zerolog.New(output).With().Timestamp().Logger()
}
