import {
  Logger,
  Metrics,
  Middleware,
  ProxyContext,
  ProxyPlugin,
  RequestContext,
} from '../types.js';

export class LoggingMiddlewarePlugin implements ProxyPlugin {
  name = 'logging-middleware';
  private logger?: Logger;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }

  createMiddleware(): Middleware {
    return async (ctx: RequestContext, next: () => Promise<void>) => {
      const { req, res, url, method } = ctx;

      this.logger?.info('Request started', {
        method,
        url: url.pathname,
        userAgent: req.headers['user-agent'],
        ip: this.getClientIp(req),
      });

      res.on('finish', () => {
        const duration = Date.now() - ctx.startTime;
        this.logger?.info('Request completed', {
          method,
          url: url.pathname,
          status: res.statusCode,
          duration,
        });
      });

      await next();
    };
  }

  private getClientIp(req: RequestContext['req']): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }
}

export class MetricsMiddlewarePlugin implements ProxyPlugin {
  name = 'metrics-middleware';
  private metrics?: Metrics;

  constructor(metrics?: Metrics) {
    this.metrics = metrics;
  }

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }

  createMiddleware(): Middleware {
    return async (ctx: RequestContext, next: () => Promise<void>) => {
      this.metrics?.increment('proxy.requests.started', {
        method: ctx.method,
        path: ctx.url.pathname,
      });

      ctx.res.on('finish', () => {
        const duration = Date.now() - ctx.startTime;
        this.metrics?.histogram('proxy.request.duration', duration, {
          method: ctx.method,
          status: ctx.res.statusCode?.toString() || '200',
        });
      });

      await next();
    };
  }
}

export class RateLimitMiddlewarePlugin implements ProxyPlugin {
  name = 'rate-limit-middleware';
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }

  createMiddleware(): Middleware {
    return async (ctx: RequestContext, next: () => Promise<void>) => {
      const clientIp = this.getClientIp(ctx.req);
      const now = Date.now();

      const clientData = this.requestCounts.get(clientIp);

      if (!clientData || now > clientData.resetTime) {
        this.requestCounts.set(clientIp, { count: 1, resetTime: now + this.windowMs });
      } else {
        clientData.count++;

        if (clientData.count > this.maxRequests) {
          ctx.res.statusCode = 429;
          ctx.res.setHeader('Content-Type', 'application/json');
          ctx.res.end(
            JSON.stringify({
              error: 'Too Many Requests',
              retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
            })
          );
          return;
        }
      }

      await next();
    };
  }

  private getClientIp(req: RequestContext['req']): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }
}

export class SecurityHeadersMiddlewarePlugin implements ProxyPlugin {
  name = 'security-headers-middleware';

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }

  createMiddleware(): Middleware {
    return async (ctx: RequestContext, next: () => Promise<void>) => {
      // Add security headers
      ctx.res.setHeader('X-Content-Type-Options', 'nosniff');
      ctx.res.setHeader('X-Frame-Options', 'DENY');
      ctx.res.setHeader('X-XSS-Protection', '1; mode=block');
      ctx.res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

      // Add HSTS header if HTTPS
      if ((ctx.req.connection as any)?.encrypted) {
        ctx.res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }

      await next();
    };
  }
}

export class HealthCheckMiddlewarePlugin implements ProxyPlugin {
  name = 'health-check-middleware';
  private healthPath: string;

  constructor(healthPath: string = '/health') {
    this.healthPath = healthPath;
  }

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }

  createMiddleware(): Middleware {
    return async (ctx: RequestContext, next: () => Promise<void>) => {
      if (ctx.url.pathname === this.healthPath) {
        ctx.res.statusCode = 200;
        ctx.res.setHeader('Content-Type', 'application/json');
        ctx.res.end(
          JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0',
          })
        );
        return;
      }

      await next();
    };
  }
}
