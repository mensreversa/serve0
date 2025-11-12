import { ProxyPlugin, RequestContext } from '@serve0/core';
import { IncomingMessage, ServerResponse } from 'http';

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

  async onRequest(req: IncomingMessage, ctx: RequestContext): Promise<ServerResponse | void> {
    const { res } = ctx;
    const origin = req.headers.origin as string | undefined;

    // Set CORS headers for all requests
    this.setCorsHeaders(res, origin);

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return res as unknown as ServerResponse;
    }

    // For non-OPTIONS requests, return void to continue processing
    return;
  }

  private setCorsHeaders(res: ServerResponse, origin?: string): void {
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
