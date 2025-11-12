import { ProxyPlugin, RequestContext } from '@serve0/core';
import { IncomingMessage, ServerResponse } from 'http';
import { BearerAuthConfig } from './types.js';

export class BearerAuthPlugin implements ProxyPlugin {
  name = 'bearer-auth';
  private config: BearerAuthConfig;

  constructor(config: BearerAuthConfig) {
    this.config = config;
  }

  async onRequest(req: IncomingMessage, ctx: RequestContext): Promise<ServerResponse | void> {
    if (!this.validate(req)) {
      this.sendUnauthorized(ctx.res);
      return ctx.res as unknown as ServerResponse;
    }
  }

  private validate(req: IncomingMessage): boolean {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.slice(7);
    return this.config.tokens.includes(token);
  }

  private sendUnauthorized(res: ServerResponse): void {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', `Bearer realm="${this.config.realm || 'Serve0'}"`);
    res.setHeader('Content-Type', 'text/plain');
    res.end('Unauthorized');
  }
}
