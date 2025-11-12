import { ProxyPlugin, RequestContext } from '@serve0/core';
import { IncomingMessage, ServerResponse } from 'http';

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
}

export class RateLimitPlugin implements ProxyPlugin {
  name = 'rate-limit';
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(config: RateLimitConfig = {}) {
    this.windowMs = config.windowMs || 60000;
    this.maxRequests = config.maxRequests || 100;
  }

  async onRequest(req: IncomingMessage, ctx: RequestContext): Promise<ServerResponse | void> {
    const clientIp = this.getClientIp(req);
    const now = Date.now();

    const clientData = this.requestCounts.get(clientIp);

    if (!clientData || now > clientData.resetTime) {
      this.requestCounts.set(clientIp, { count: 1, resetTime: now + this.windowMs });
    } else {
      clientData.count++;

      if (clientData.count > this.maxRequests) {
        ctx.res.statusCode = 429;
        ctx.res.setHeader('Content-Type', 'application/json');
        ctx.res.setHeader('Retry-After', Math.ceil((clientData.resetTime - now) / 1000).toString());
        ctx.res.end(
          JSON.stringify({
            error: 'Too Many Requests',
            retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
          })
        );
        return ctx.res as unknown as ServerResponse;
      }
    }
  }

  private getClientIp(req: IncomingMessage): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.socket?.remoteAddress as string) ||
      'unknown'
    );
  }
}
