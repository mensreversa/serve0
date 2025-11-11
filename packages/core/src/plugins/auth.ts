import { Middleware, ProxyContext, ProxyPlugin, RequestContext } from '../types.js';

export interface AuthConfig {
  type: 'basic' | 'bearer' | 'api-key';
  credentials?: Record<string, string>;
  header?: string;
  realm?: string;
}

export class AuthPlugin implements ProxyPlugin {
  name = 'auth';
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }

  private createAuthMiddleware(): Middleware {
    return async (ctx: RequestContext, next: () => Promise<void>) => {
      const { req, res } = ctx;

      switch (this.config.type) {
        case 'basic':
          if (!this.validateBasicAuth(req)) {
            this.sendUnauthorized(res, 'Basic');
            return;
          }
          break;

        case 'bearer':
          if (!this.validateBearerAuth(req)) {
            this.sendUnauthorized(res, 'Bearer');
            return;
          }
          break;

        case 'api-key':
          if (!this.validateApiKey(req)) {
            this.sendUnauthorized(res, 'ApiKey');
            return;
          }
          break;
      }

      await next();
    };
  }

  private validateBasicAuth(req: RequestContext['req']): boolean {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    if (!this.config.credentials) {
      return false;
    }

    return this.config.credentials[username] === password;
  }

  private validateBearerAuth(req: RequestContext['req']): boolean {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.slice(7);

    if (!this.config.credentials) {
      return false;
    }

    return Object.values(this.config.credentials).includes(token);
  }

  private validateApiKey(req: RequestContext['req']): boolean {
    const headerName = this.config.header || 'x-api-key';
    const apiKey = req.headers[headerName.toLowerCase()];

    if (!apiKey || !this.config.credentials) {
      return false;
    }

    const apiKeyValue = Array.isArray(apiKey) ? apiKey[0] : apiKey;
    return Object.values(this.config.credentials).includes(apiKeyValue);
  }

  private sendUnauthorized(res: RequestContext['res'], authType: string): void {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', `${authType} realm="${this.config.realm || 'Serve0'}"`);
    res.setHeader('Content-Type', 'text/plain');
    res.end('Unauthorized');
  }
}
