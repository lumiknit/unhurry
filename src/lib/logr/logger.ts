/**
 * Logger is a simple logging utility that logs messages to the console and stores them in memory.
 */
export type LogLevel = 'info' | 'warn' | 'error';

/**
 * LogItem is a structure that represents a single log message.
 * It contains the level of the log message, the message itself, and the timestamp of the log message.
 */
export interface LogItem {
	level: LogLevel;
	message: string;
	timestamp: number; // Milliseconds since epoch
}

/**
 * Logger is a simple logging utility that logs messages to the console and stores them in memory.
 * It provides methods for logging messages at different levels (info, warn, error) and for clearing the log.
 */
class Logger {
	items: LogItem[] = [];

	log(level: LogLevel, ...msgs: any[]): void {
		const timestamp = Date.now();
		this.items.push({ level, message: msgs.join('\t'), timestamp });
		console[level](...msgs);
	}

	info(...msgs: any[]): void {
		this.log('info', ...msgs);
	}

	warn(...msgs: any[]): void {
		this.log('warn', ...msgs);
	}

	error(...msgs: any[]): void {
		this.log('error', ...msgs);
	}

	clear(): void {
		this.items = [];
	}
}

/**
 * Singleton instance of the Logger class.
 */
export const logr = new Logger();
