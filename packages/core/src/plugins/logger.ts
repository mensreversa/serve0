import { Logger, ProxyContext, ProxyPlugin, RequestContext } from '../types.js';

export class ConsoleLoggerPlugin implements ProxyPlugin, Logger {
  name = 'console-logger';

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }

  onRequest?(req: RequestContext['req'], _ctx: RequestContext): Promise<void> {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    return Promise.resolve();
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.log(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(this.formatMessage('error', message, meta));
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  private formatMessage(level: string, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }
}

export class FileLoggerPlugin implements ProxyPlugin, Logger {
  name = 'file-logger';
  private logFile: string;

  constructor(logFile: string = 'serve0.log') {
    this.logFile = logFile;
  }

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }

  onRequest?(req: RequestContext['req'], _ctx: RequestContext): Promise<void> {
    const logEntry = `${req.method} ${req.url} - ${new Date().toISOString()}\n`;
    // In a real implementation, you'd write to file here
    console.log(`[FILE] ${logEntry.trim()}`);
    return Promise.resolve();
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.writeLog('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.writeLog('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.writeLog('error', message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      this.writeLog('debug', message, meta);
    }
  }

  private async writeLog(
    level: string,
    message: string,
    meta?: Record<string, unknown>
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}\n`;

    try {
      // In a real implementation, you'd write to file here
      console.log(`[FILE] ${logEntry.trim()}`);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
}

// Default logger instance
export const defaultLogger = new ConsoleLoggerPlugin();
