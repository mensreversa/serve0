// Serve0 - Modern Express-like API
export { Serve0, serve0 } from './serve0.js';
export type { ServeOptions } from './serve0.js';

// Export types
export type {
  Logger,
  Metrics,
  Middleware,
  ProxyContext,
  ProxyPlugin,
  ProxyRouter,
  RequestContext,
  SiteConfig,
  TlsConfig,
} from './types.js';

// Export ACME interfaces
export { DNSProvider } from './acme/dns.js';
export { HttpChallengeHandler } from './acme/http.js';
export { CertificateManager, FileCertificateManager } from './acme/tls.js';

// Export WebSocket functionality
export {
  WS_CLOSED,
  WS_CLOSING,
  WS_READY,
  createWebSocketHandler,
  proxyWebSocket,
} from './servers/websocket.js';

export type {
  WebSocketConfig,
  WebSocketConnection,
  WebSocketHandler,
} from './servers/websocket.js';
