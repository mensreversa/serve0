import cluster from 'cluster';
import { createServer, request as httpRequest, IncomingMessage, ServerResponse } from 'http';
import { createServer as createHttp2Server, Http2ServerRequest, Http2ServerResponse } from 'http2';
import { request as httpsRequest } from 'https';
import { cpus } from 'os';
import { pipeline } from 'stream';
import { RoundRobinBalancerPlugin } from './plugins/balancer.js';
import { ConsoleLoggerPlugin } from './plugins/logger.js';
import { InMemoryMetricsPlugin } from './plugins/metrics.js';
import { Middleware, ProxyContext, ProxyOptions, RequestContext, SiteConfig } from './types.js';
import { createWebSocketHandler, proxyWebSocket } from './websocket.js';

export function site(domain: string, config: Omit<SiteConfig, 'domain'>): SiteConfig {
  return {
    domain,
    ...config,
  };
}

export async function serve(options: ProxyOptions) {
  const { sites, plugins = [], port = 8080, host = '0.0.0.0' } = options;

  // Create proxy context
  const ctx: ProxyContext = {
    sites,
    plugins: [
      new ConsoleLoggerPlugin(),
      new InMemoryMetricsPlugin(),
      new RoundRobinBalancerPlugin(),
      ...plugins,
    ],
  };

  // Setup plugins
  for (const plugin of ctx.plugins) {
    if (plugin.setup) {
      await plugin.setup(ctx);
    }
  }

  // Create server (HTTP/1.1 or HTTP/2 h2c) based on options
  const http1Handler = async (req: IncomingMessage, res: ServerResponse) => {
    await handleRequest(req, res, ctx);
  };

  const http2Handler = async (req: Http2ServerRequest, res: Http2ServerResponse) => {
    // Minimal compatibility: Node exposes url/method on Http2ServerRequest
    await handleRequest(req as unknown as IncomingMessage, res as unknown as ServerResponse, ctx);
  };

  const server = options.http2 ? createHttp2Server({}, http2Handler) : createServer(http1Handler);

  // WebSocket upgrade (HTTP/1.1 only)
  if (!options.http2) {
    server.on('upgrade', async (req, socket, head) => {
      try {
        const site = findMatchingSite(req as IncomingMessage, ctx.sites);
        if (!site) {
          socket.destroy();
          return;
        }

        // Check if site has WebSocket handler (server mode)
        if (site.websocket?.handler) {
          const handler = createWebSocketHandler(site.websocket.handler);
          handler(req as IncomingMessage, socket, head);
          return;
        }

        // Otherwise, proxy WebSocket
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
          // Ignore errors during socket destruction
        }
      }
    });
  }

  return {
    async start() {
      // Optional clustering (Node runtime only)
      if (options.cluster?.enabled && cluster.isPrimary) {
        const workerCount =
          options.cluster.workers && options.cluster.workers > 0
            ? options.cluster.workers
            : cpus().length;
        for (let i = 0; i < workerCount; i++) cluster.fork();
        cluster.on('exit', () => cluster.fork());
        console.log(
          `Serve0 primary ${process.pid} started ${workerCount} workers on ${host}:${port}`
        );
        return;
      }

      return new Promise<void>((resolve, reject) => {
        server.listen(port, host, () => {
          console.log(`Serve0 started on ${host}:${port}${options.http2 ? ' [HTTP/2]' : ''}`);
          resolve();
        });
        server.on('error', reject);
      });
    },

    async stop() {
      return new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },

    getContext() {
      return ctx;
    },

    // Hot-routing: replace sites at runtime
    updateSites(newSites: SiteConfig[]) {
      ctx.sites = newSites;
    },

    // Embedding: use as a Node HTTP handler (Express/Fastify)
    async handle(req: IncomingMessage, res: ServerResponse) {
      await handleRequest(req, res, ctx);
    },

    // Embedding: handle WebSocket upgrades from parent server
    async handleUpgrade(req: IncomingMessage, socket: any, head: Buffer) {
      try {
        const site = findMatchingSite(req as IncomingMessage, ctx.sites);
        if (!site) {
          socket.destroy();
          return;
        }

        // Check if site has WebSocket handler (server mode)
        if (site.websocket?.handler) {
          const handler = createWebSocketHandler(site.websocket.handler);
          handler(req, socket, head);
          return;
        }

        // Otherwise, proxy WebSocket
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
          // Ignore errors during socket destruction
        }
      }
    },
  };
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, ctx: any) {
  const startTime = Date.now();

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const method = req.method || 'GET';

    const requestCtx: RequestContext = {
      req,
      res,
      url,
      method,
      headers: normalizeHeaders(req.headers),
      startTime,
    };

    // Find matching site
    const site = findMatchingSite(req, ctx.sites);
    if (!site) {
      res.statusCode = 404;
      res.end('Site not found');
      return;
    }

    // Execute plugins
    for (const plugin of ctx.plugins) {
      if (plugin.onRequest) {
        const response = await plugin.onRequest(req, requestCtx);
        if (response) {
          response.pipe(res);
          return;
        }
      }
    }

    // Execute site route function
    const target = await site.route(req);
    if (!target) {
      res.statusCode = 404;
      res.end('No route found');
      return;
    }

    // Execute middleware
    if (site.middleware) {
      await executeMiddleware(requestCtx, site.middleware);
    }

    // Proxy request
    await proxyRequest(requestCtx, target);
  } catch (error) {
    console.error('Request error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}

function findMatchingSite(req: IncomingMessage, sites: SiteConfig[]): SiteConfig | null {
  const host = req.headers.host;
  if (!host) return null;

  return (
    sites.find((site) => {
      if (site.domain === host) return true;
      if (site.domain.startsWith('*.')) {
        const domain = site.domain.slice(2);
        return host.endsWith(domain);
      }
      return false;
    }) || null
  );
}

async function executeMiddleware(ctx: RequestContext, middleware: Middleware[]): Promise<void> {
  let index = 0;

  const next = async (): Promise<void> => {
    if (index < middleware.length) {
      const fn = middleware[index++];
      await fn(ctx, next);
    }
  };

  await next();
}

async function proxyRequest(ctx: RequestContext, target: string): Promise<void> {
  const { req, res } = ctx;
  const targetUrl = new URL(target);
  const isHttps = targetUrl.protocol === 'https:';
  const requestFn = isHttps ? httpsRequest : httpRequest;

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (isHttps ? 443 : 80),
    path: ctx.url.pathname + ctx.url.search,
    method: req.method,
    headers: {
      ...ctx.headers,
      host: targetUrl.host,
    },
  };

  const proxyReq = requestFn(options, (proxyRes) => {
    // Copy response headers
    Object.entries(proxyRes.headers).forEach(([key, value]) => {
      if (value) {
        res.setHeader(key, value);
      }
    });

    res.statusCode = proxyRes.statusCode || 200;
    // Zero-copy streaming
    pipeline(proxyRes, res, (err) => {
      if (err) {
        try {
          res.destroy(err);
        } catch {
          // Ignore errors during response destruction
        }
      }
    });
  });

  proxyReq.on('error', (error) => {
    console.error('Proxy error:', error);
    res.statusCode = 502;
    res.end('Bad Gateway');
  });

  // Zero-copy streaming for request body
  pipeline(req, proxyReq, (err) => {
    if (err) {
      try {
        proxyReq.destroy(err);
      } catch {
        // Ignore errors during request destruction
      }
    }
  });
}

function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      normalized[key.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      normalized[key.toLowerCase()] = value.join(', ');
    }
  }
  return normalized;
}
