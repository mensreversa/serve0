import { request as httpRequest, IncomingMessage, ServerResponse } from 'http';
import { request as httpsRequest } from 'https';
import { pipeline } from 'stream';
import { Middleware, ProxyContext, RequestContext, SiteConfig } from './types.js';

export function findMatchingSite(req: IncomingMessage, sites: SiteConfig[]): SiteConfig | null {
  const host = req.headers.host;
  if (!host) return null;
  return (
    sites.find((site) => {
      if (site.domain === host) return true;
      if (site.domain.startsWith('*.')) return host.endsWith(site.domain.slice(2));
      return false;
    }) || null
  );
}

export function normalizeHeaders(
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

export async function executeMiddleware(
  ctx: RequestContext,
  middleware: Middleware[]
): Promise<void> {
  let index = 0;
  const next = async (): Promise<void> => {
    if (index < middleware.length) await middleware[index++](ctx, next);
  };
  await next();
}

export async function proxyRequest(ctx: RequestContext, target: string): Promise<void> {
  const { req, res } = ctx;
  const targetUrl = new URL(target);
  const requestFn = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;

  const proxyReq = requestFn(
    {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: ctx.url.pathname + ctx.url.search,
      method: req.method,
      headers: { ...ctx.headers, host: targetUrl.host },
    },
    (proxyRes) => {
      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        if (value) res.setHeader(key, value);
      });
      res.statusCode = proxyRes.statusCode || 200;
      pipeline(proxyRes, res, (err) => {
        if (err) {
          try {
            res.destroy(err);
          } catch {
            // Ignore
          }
        }
      });
    }
  );

  proxyReq.on('error', () => {
    res.statusCode = 502;
    res.end('Bad Gateway');
  });

  pipeline(req, proxyReq, () => {
    // Ignore errors
  });
}

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: ProxyContext
): Promise<void> {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const requestCtx: RequestContext = {
      req,
      res,
      url,
      method: req.method || 'GET',
      headers: normalizeHeaders(req.headers),
      startTime: Date.now(),
    };

    const site = findMatchingSite(req, ctx.sites);
    if (!site) {
      res.statusCode = 404;
      res.end('Site not found');
      return;
    }

    for (const plugin of ctx.plugins) {
      if (plugin.onRequest) {
        const response = await plugin.onRequest(req, requestCtx);
        if (response) {
          response.pipe(res);
          return;
        }
      }
    }

    const target = await site.route(req);
    if (!target) {
      res.statusCode = 404;
      res.end('No route found');
      return;
    }

    if (site.middleware) {
      await executeMiddleware(requestCtx, site.middleware);
    }

    await proxyRequest(requestCtx, target);
  } catch (error) {
    console.error('Request error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}
