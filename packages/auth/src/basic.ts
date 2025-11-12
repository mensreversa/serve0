import { ProxyPlugin, RequestContext } from '@serve0/core';
import { IncomingMessage, ServerResponse } from 'http';
import { BasicAuthConfig } from './types.js';

export class BasicAuthPlugin implements ProxyPlugin {
  name = 'basic-auth';
  private config: BasicAuthConfig;

  constructor(config: BasicAuthConfig) {
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
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    return this.config.credentials[username] === password;
  }

  private sendUnauthorized(res: ServerResponse): void {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', `Basic realm="${this.config.realm || 'Serve0'}"`);
    res.setHeader('Content-Type', 'text/plain');
    res.end('Unauthorized');
  }
}
