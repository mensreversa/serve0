import { ProxyPlugin, RequestContext } from '@serve0/core';
import { IncomingMessage, ServerResponse } from 'http';

export class SecurityPlugin implements ProxyPlugin {
  name = 'security';

  async onRequest(_req: IncomingMessage, ctx: RequestContext): Promise<ServerResponse | void> {
    const { res } = ctx;

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Add HSTS header if HTTPS
    if ((ctx.req.socket as any)?.encrypted) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  }
}
