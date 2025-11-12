import { ProxyPlugin, RequestContext } from '@serve0/core';
import { IncomingMessage, ServerResponse } from 'http';
import { ApiKeyAuthConfig } from './types.js';

export class ApiKeyAuthPlugin implements ProxyPlugin {
  name = 'api-key-auth';
  private config: ApiKeyAuthConfig;

  constructor(config: ApiKeyAuthConfig) {
    this.config = config;
  }

  async onRequest(req: IncomingMessage, ctx: RequestContext): Promise<ServerResponse | void> {
    if (!this.validate(req)) {
      this.sendUnauthorized(ctx.res);
      return ctx.res as unknown as ServerResponse;
    }
  }

  private validate(req: IncomingMessage): boolean {
    const headerName = this.config.header || 'x-api-key';
    const apiKey = req.headers[headerName.toLowerCase()];

    if (!apiKey) {
      return false;
    }

    const apiKeyValue = Array.isArray(apiKey) ? apiKey[0] : apiKey;
    return this.config.apiKeys.includes(apiKeyValue);
  }

  private sendUnauthorized(res: ServerResponse): void {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Unauthorized');
  }
}
