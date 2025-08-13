export const LOG_LEVELS = {
	Trace: 'trace',
	Debug: 'debug',
	Info: 'info',
	Warn: 'warn',
	Error: 'error',
	Fatal: 'fatal',
} as const;
export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];
