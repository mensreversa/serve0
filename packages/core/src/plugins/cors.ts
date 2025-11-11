import { Middleware, ProxyContext, ProxyPlugin, RequestContext } from '../types.js';

export interface CorsConfig {
  origin?: string | string[] | boolean;
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export class CorsPlugin implements ProxyPlugin {
  name = 'cors';
  private config: CorsConfig;

  constructor(config: CorsConfig = {}) {
    this.config = {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization'],
      credentials: false,
      maxAge: 86400,
      ...config,
    };
  }

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }

  private createCorsMiddleware(): Middleware {
    return async (ctx: RequestContext, next: () => Promise<void>) => {
      const { req, res } = ctx;

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        this.setCorsHeaders(res, req.headers.origin as string);
        res.statusCode = 204;
        res.end();
        return;
      }

      // Set CORS headers for actual requests
      this.setCorsHeaders(res, req.headers.origin as string);

      await next();
    };
  }

  private setCorsHeaders(res: RequestContext['res'], origin?: string): void {
    // Origin
    if (this.config.origin === true) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else if (Array.isArray(this.config.origin)) {
      if (origin && this.config.origin.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    } else if (typeof this.config.origin === 'string') {
      res.setHeader('Access-Control-Allow-Origin', this.config.origin);
    }

    // Methods
    if (this.config.methods) {
      res.setHeader('Access-Control-Allow-Methods', this.config.methods.join(', '));
    }

    // Headers
    if (this.config.headers) {
      res.setHeader('Access-Control-Allow-Headers', this.config.headers.join(', '));
    }

    // Credentials
    if (this.config.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Max Age
    if (this.config.maxAge) {
      res.setHeader('Access-Control-Max-Age', this.config.maxAge.toString());
    }
  }
}
