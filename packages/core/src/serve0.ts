import cluster from 'cluster';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createServer as createHttp2Server, Http2ServerRequest, Http2ServerResponse } from 'http2';
import { cpus } from 'os';
import { handleRequest } from './http.js';
import { RoundRobinBalancerPlugin } from './plugins/balancer.js';
import { ConsoleLoggerPlugin } from './plugins/logger.js';
import { InMemoryMetricsPlugin } from './plugins/metrics.js';
import { ProxyContext, ProxyPlugin, SiteConfig } from './types.js';
import { createWebSocketHandler, proxyWebSocket } from './websocket.js';

export interface ServeOptions {
  host?: string;
  http2?: boolean;
  cluster?: {
    enabled?: boolean;
    workers?: number;
  };
}

export class Serve0 {
  private sites: SiteConfig[] = [];
  private plugins: ProxyPlugin[] = [];
  private ctx: ProxyContext | null = null;
  private server: ReturnType<typeof createServer> | ReturnType<typeof createHttp2Server> | null = null;

  handle(domain: string, config: Omit<SiteConfig, 'domain'>): this {
    this.sites.push({ domain, ...config });
    return this;
  }

  plugin(plugin: ProxyPlugin): this {
    this.plugins.push(plugin);
    return this;
  }

  async serve(port: number, options?: ServeOptions): Promise<{
    stop: () => Promise<void>;
    handleRequest: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    handleUpgrade: (req: IncomingMessage, socket: any, head: Buffer) => Promise<void>;
  }> {
    this.ctx = {
      sites: this.sites,
      plugins: [
        new ConsoleLoggerPlugin(),
        new InMemoryMetricsPlugin(),
        new RoundRobinBalancerPlugin(),
        ...this.plugins,
      ],
    };

    for (const plugin of this.ctx.plugins) {
      if (plugin.setup) await plugin.setup(this.ctx);
    }

    const http1Handler = async (req: IncomingMessage, res: ServerResponse) => {
      if (this.ctx) await handleRequest(req, res, this.ctx);
    };

    const http2Handler = async (req: Http2ServerRequest, res: Http2ServerResponse) => {
      if (this.ctx) await handleRequest(req as unknown as IncomingMessage, res as unknown as ServerResponse, this.ctx);
    };

    this.server = options?.http2 ? createHttp2Server({}, http2Handler) : createServer(http1Handler);

    if (!options?.http2) {
      this.server.on('upgrade', async (req, socket, head) => {
        if (!this.ctx) return;
        try {
          const site = this.findMatchingSite(req as IncomingMessage);
          if (!site) {
            socket.destroy();
            return;
          }
          if (site.websocket?.handler) {
            createWebSocketHandler(site.websocket.handler)(req as IncomingMessage, socket, head);
            return;
          }
          const target = await site.route(req as IncomingMessage);
          if (!target) {
            socket.destroy();
            return;
          }
          await proxyWebSocket(req as IncomingMessage, socket, head, target, site.websocket?.config);
        } catch (error) {
          console.error('WebSocket upgrade error:', error);
          try {
            socket.destroy();
          } catch {
            // Ignore
          }
        }
      });
    }

    if (options?.cluster?.enabled && cluster.isPrimary) {
      const workerCount = options.cluster.workers && options.cluster.workers > 0 ? options.cluster.workers : cpus().length;
      for (let i = 0; i < workerCount; i++) cluster.fork();
      cluster.on('exit', () => cluster.fork());
      console.log(`Serve0 primary ${process.pid} started ${workerCount} workers on ${options?.host || '0.0.0.0'}:${port}`);
      return {
        stop: async () => {
          /* Primary doesn't stop workers directly */
        },
        handleRequest: async () => {
          throw new Error('Not supported in primary cluster mode');
        },
        handleUpgrade: async () => {
          throw new Error('Not supported in primary cluster mode');
        },
      };
    }

    return new Promise((resolve, reject) => {
      this.server?.listen(port, options?.host || '0.0.0.0', () => {
        console.log(`Serve0 started on ${options?.host || '0.0.0.0'}:${port}${options?.http2 ? ' [HTTP/2]' : ''}`);
        resolve({
          stop: async () => {
            return new Promise<void>((stopResolve) => {
              this.server?.close(() => stopResolve());
            });
          },
          handleRequest: async (req: IncomingMessage, res: ServerResponse) => {
            if (!this.ctx) throw new Error('Serve0 context not initialized');
            await handleRequest(req, res, this.ctx);
          },
          handleUpgrade: async (req: IncomingMessage, socket: any, head: Buffer) => {
            if (!this.ctx) throw new Error('Serve0 context not initialized');
            await this.handleUpgrade(req, socket, head);
          },
        });
      });
      this.server?.on('error', reject);
    });
  }

  private findMatchingSite(req: IncomingMessage): SiteConfig | null {
    if (!this.ctx) return null;
    const host = req.headers.host;
    if (!host) return null;
    return (
      this.ctx.sites.find((site) => {
        if (site.domain === host) return true;
        if (site.domain.startsWith('*.')) return host.endsWith(site.domain.slice(2));
        return false;
      }) || null
    );
  }

  private async handleUpgrade(req: IncomingMessage, socket: any, head: Buffer): Promise<void> {
    if (!this.ctx) return;
    try {
      const site = this.findMatchingSite(req);
      if (!site) {
        socket.destroy();
        return;
      }
      if (site.websocket?.handler) {
        createWebSocketHandler(site.websocket.handler)(req, socket, head);
        return;
      }
      const target = await site.route(req);
      if (!target) {
        socket.destroy();
        return;
      }
      await proxyWebSocket(req, socket, head, target, site.websocket?.config);
    } catch (error) {
      console.error('WebSocket upgrade error:', error);
      try {
        socket.destroy();
      } catch {
        // Ignore
      }
    }
  }
}

export function serve0(): Serve0 {
  return new Serve0();
}
