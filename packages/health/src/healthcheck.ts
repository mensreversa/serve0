import { ProxyPlugin, RequestContext } from '@serve0/core';
import { IncomingMessage, ServerResponse } from 'http';

export interface HealthCheckConfig {
  path?: string;
}

export class HealthCheckPlugin implements ProxyPlugin {
  name = 'health-check';
  private healthPath: string;

  constructor(config: HealthCheckConfig = {}) {
    this.healthPath = config.path || '/health';
  }

  async onRequest(req: IncomingMessage, ctx: RequestContext): Promise<ServerResponse | void> {
    if (ctx.url.pathname === this.healthPath) {
      ctx.res.statusCode = 200;
      ctx.res.setHeader('Content-Type', 'application/json');
      ctx.res.end(
        JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        })
      );
      return ctx.res as unknown as ServerResponse;
    }
  }
}
