import { Logger, ProxyPlugin, RequestContext } from '@serve0/core';

export class ConsoleLoggerPlugin implements ProxyPlugin, Logger {
  name = 'console-logger';

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
