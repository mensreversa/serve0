import { IncomingMessage, ServerResponse } from 'http';
import { WebSocketConfig, WebSocketHandler } from './servers/websocket.js';

export interface RequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  method: string;
  headers: Record<string, string>;
  startTime: number;
}

export type Middleware = (ctx: RequestContext, next: () => Promise<void>) => Promise<void>;

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

export interface Metrics {
  increment(name: string, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
}

export interface ProxyContext {
  sites: SiteConfig[];
  plugins: ProxyPlugin[];
}

export interface ProxyPlugin {
  name: string;
  setup?(ctx: ProxyContext): void | Promise<void>;
  onRequest?(req: IncomingMessage, ctx: RequestContext): Promise<ServerResponse | void>;
}

export interface ProxyRouter {
  getTarget(targets: string[]): string | null;
}

export interface SiteConfig {
  domain: string;
  tls?: TlsConfig;
  route: (req: IncomingMessage) => string | Promise<string>;
  middleware?: Middleware[];
  websocket?: {
    handler?: WebSocketHandler;
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
