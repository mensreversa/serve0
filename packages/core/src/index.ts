// Serve0 - Modern Angular signals-style API
export { serve, site } from './factory.js';

// Export types
export type {
  LoadBalanceStrategy,
  Logger,
  Metrics,
  Middleware,
  ProxyContext,
  ProxyOptions,
  ProxyPlugin,
  RequestContext,
  SiteConfig,
  TlsConfig,
} from './types.js';

// Export plugins
export { ConsoleLoggerPlugin, FileLoggerPlugin } from './plugins/logger.js';

export { InMemoryMetricsPlugin, PrometheusMetricsPlugin } from './plugins/metrics.js';

export { LeastConnectionsBalancerPlugin, RoundRobinBalancerPlugin } from './plugins/balancer.js';

export { AcmeHttpsPlugin, FileHttpsPlugin } from './plugins/https.js';

// Export ACME interfaces
export { DNSProvider } from './acme/dns.js';
export { HttpChallengeHandler } from './acme/http.js';
export { CertificateManager, FileCertificateManager } from './acme/tls.js';

export {
  HealthCheckMiddlewarePlugin,
  LoggingMiddlewarePlugin,
  MetricsMiddlewarePlugin,
  RateLimitMiddlewarePlugin,
  SecurityHeadersMiddlewarePlugin,
} from './plugins/middleware.js';

export { AuthPlugin } from './plugins/auth.js';

export { CorsPlugin } from './plugins/cors.js';

// Export WebSocket functionality
export {
  WS_CLOSED,
  WS_CLOSING,
  WS_READY,
  createWebSocketHandler,
  proxyWebSocket,
} from './websocket.js';

export type { WebSocketConfig, WebSocketConnection, WebSocketHandler } from './websocket.js';
