import { IncomingMessage, ServerResponse } from 'http';
import { WebSocketConfig, WebSocketHandler } from './websocket.js';

export interface RequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  method: string;
  headers: Record<string, string>;
  body?: Buffer;
  startTime: number;
  target?: string;
  route?: RouteConfig;
}

export interface RouteConfig {
  path: string;
  targets: string[];
  strategy: LoadBalanceStrategy;
  middleware?: Middleware[];
  options?: RouteOptions;
}

export interface RouteOptions {
  timeout?: number;
  retries?: number;
  healthCheck?: boolean;
  sticky?: boolean;
  weight?: number;
}

export type LoadBalanceStrategy = 'round-robin' | 'least-connections' | 'sticky' | 'weighted';

export type Middleware = (ctx: RequestContext, next: () => Promise<void>) => Promise<void>;

export interface ProxyConfig {
  port: number;
  host?: string;
  https?: HttpsConfig;
  middleware?: Middleware[];
  routes: RouteConfig[];
  workers?: number;
  timeout?: number;
}

export interface HttpsConfig {
  key?: string;
  cert?: string;
  acme?: AcmeConfig;
}

export interface AcmeConfig {
  email: string;
  domains: string[];
  staging?: boolean;
  keySize?: number;
  certDir?: string;
}

// Logger interface
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

// Metrics interface
export interface Metrics {
  increment(name: string, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
}

// New simplified plugin system
export interface ProxyContext {
  sites: SiteConfig[];
  plugins: ProxyPlugin[];
}

export interface ProxyPlugin {
  name: string;
  setup?(ctx: ProxyContext): void | Promise<void>;
  onRequest?(req: IncomingMessage, ctx: RequestContext): Promise<ServerResponse | void>;
}

export interface SiteConfig {
  domain: string;
  tls?: TlsConfig;
  route: (req: IncomingMessage) => string | Promise<string>;
  middleware?: Middleware[];
  websocket?: {
    // WebSocket server mode: handle connections directly
    handler?: WebSocketHandler;
    // WebSocket proxy mode: configuration for proxying
    config?: WebSocketConfig;
  };
}

export interface TlsConfig {
  email?: string;
  domains?: string[];
  staging?: boolean;
  key?: string;
  cert?: string;
}

export interface ProxyOptions {
  sites: SiteConfig[];
  plugins?: ProxyPlugin[];
  port?: number;
  host?: string;
  // Enable HTTP/2 server (h2c). Note: real-world browsers typically require TLS for h2.
  http2?: boolean;
  // Enable multi-process clustering
  cluster?: {
    enabled?: boolean;
    workers?: number; // default: number of CPUs
  };
}
