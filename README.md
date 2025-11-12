# Serve0

A high-performance, programmable reverse proxy and edge gateway written entirely in TypeScript with an Express-like API.

## ✨ Features

- 🚀 **Extremely Fast**: Built with native Node.js `http`/`https` modules
- 🎯 **Express-like API**: Clean, chainable API for easy configuration
- 🔄 **Load Balancing**: Round-robin, least-connections, sticky sessions
- 🧩 **Plugin System**: Modular middleware-based design
- 🔒 **HTTPS Support**: Built-in HTTPS with ACME (Let's Encrypt) support
- 📦 **Zero Dependencies**: No external runtime dependencies
- 🏃 **Multi-Runtime**: Runs on Node.js, Bun, or Deno
- 🐳 **Docker Ready**: Complete Docker support with monitoring
- 📊 **Observability**: Built-in metrics, logging, and health checks

## 🚀 Quick Start

### Installation

```bash
npm install @serve0/core
```

### Basic Usage

```typescript
import { serve0 } from '@serve0/core';
import { ConsoleLoggerPlugin } from '@serve0/core';

const app = serve0();

app.handle('localhost', {
  route(req) {
    if (req.url?.startsWith('/api')) {
      return 'http://localhost:4000';
    }
    return 'http://localhost:3000';
  },
});

app.plugin(new ConsoleLoggerPlugin());

const { stop } = await app.serve(8080);
```

## 🏗️ Architecture

### Modern API Design

Serve0 uses an Express-like API that's clean, chainable, and easy to understand:

```typescript
import { serve0 } from '@serve0/core';

const app = serve0();

// Add routes
app.handle('example.com', {
  route(req) {
    return 'http://backend:3000';
  },
});

// Add plugins
app.plugin(new ConsoleLoggerPlugin());

// Start server
await app.serve(8080);
```

### Plugin System

```typescript
// Simple plugin interface
interface ProxyPlugin {
  name: string;
  setup?(ctx: ProxyContext): void | Promise<void>;
  onRequest?(req: IncomingMessage, ctx: RequestContext): Promise<ServerResponse | void>;
}
```

## 📖 Examples

### Simple Proxy

```typescript
import { serve0 } from '@serve0/core';
import { ConsoleLoggerPlugin } from '@serve0/core';

const app = serve0();

app.handle('localhost', {
  route(req) {
    if (req.url?.startsWith('/api')) {
      return 'http://localhost:4000';
    }
    return 'http://localhost:3000';
  },
});

app.plugin(new ConsoleLoggerPlugin());

const { stop } = await app.serve(8080);
```

### Load Balanced Services

```typescript
import { serve0 } from '@serve0/core';
import { RoundRobinBalancerPlugin } from '@serve0/core';

const app = serve0();

app.handle('api.example.com', {
  route(req) {
    // Load balancer will distribute across these targets
    return ['http://service1:3000', 'http://service2:3000', 'http://service3:3000'];
  },
});

app.plugin(new RoundRobinBalancerPlugin());

await app.serve(8080);
```

### HTTPS with ACME

```typescript
import { serve0 } from '@serve0/core';
import { AcmeHttpsPlugin } from '@serve0/core';

const app = serve0();

app.handle('example.com', {
  tls: {
    email: 'admin@example.com',
    domains: ['example.com', 'www.example.com'],
  },
  route(req) {
    return 'http://backend:3000';
  },
});

app.plugin(new AcmeHttpsPlugin());

await app.serve(443);
```

### Docker Deployment

```bash
# Build and run
npm run docker:build
npm run docker:run

# Development with full stack
npm run docker:dev

# Production deployment
npm run docker:prod
```

## 🔧 Configuration

### Site Configuration

```typescript
const app = serve0();

app.handle('example.com', {
  tls: {
    email: 'admin@example.com',
    domains: ['example.com', 'www.example.com'],
    staging: true, // Use Let's Encrypt staging
  },
  route(req) {
    // Dynamic routing logic
    return 'http://backend:3000';
  },
  middleware: [
    // Custom middleware for this site
  ],
});
```

### Plugin Configuration

```typescript
// Logging
new ConsoleLoggerPlugin();
new FileLoggerPlugin('./logs/app.log');

// Metrics
new InMemoryMetricsPlugin();
new PrometheusMetricsPlugin();

// Load Balancing
new RoundRobinBalancerPlugin();
new LeastConnectionsBalancerPlugin();

// Security
new AuthPlugin({
  type: 'api-key',
  header: 'x-api-key',
  credentials: { admin: 'secret123' },
});

new CorsPlugin({
  origin: ['https://example.com'],
  methods: ['GET', 'POST'],
  credentials: true,
});
```

## 🐳 Docker Support

### Quick Start

```bash
# Build and run
npm run docker:build
npm run docker:run

# Development environment
npm run docker:dev

# Production with monitoring
npm run docker:prod
```

### Multi-Runtime Support

```bash
# Node.js (default)
npm run docker:run:node

# Bun (high performance)
npm run docker:run:bun

# Deno (modern runtime)
npm run docker:run:deno
```

## 📊 Monitoring

### Built-in Metrics

- Request counters and histograms
- Response time tracking
- Active connection monitoring
- Custom business metrics

### Observability Stack

- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **Loki**: Log aggregation
- **Promtail**: Log collection

## 🔒 Security

- Non-root containers
- Security headers
- Rate limiting
- Authentication plugins
- HTTPS/TLS support
- ACME certificate management

## 🚀 Performance

- Native Node.js performance
- Zero external dependencies
- Optimized Docker images
- Multi-stage builds
- Resource limits
- Health checks

## 📚 API Reference

### Core Functions

- `serve0()`: Create a new Serve0 instance
- `app.handle(domain, config)`: Add a route handler
- `app.plugin(plugin)`: Add a plugin
- `app.serve(port, options?)`: Start the server

### Packages

- **`@serve0/core`**: Core reverse proxy functionality
- **`@serve0/cloudflare`**: Cloudflare DNS provider for ACME
- **`@serve0/route53`**: AWS Route53 DNS provider for ACME

### Plugins

- `ConsoleLoggerPlugin`: Console logging
- `FileLoggerPlugin`: File logging
- `InMemoryMetricsPlugin`: In-memory metrics
- `PrometheusMetricsPlugin`: Prometheus metrics
- `RoundRobinBalancerPlugin`: Round-robin load balancing
- `LeastConnectionsBalancerPlugin`: Least connections load balancing
- `AuthPlugin`: Authentication
- `CorsPlugin`: CORS handling
- `AcmeHttpsPlugin`: ACME HTTPS support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Angular signals for the API design
- Built with modern TypeScript practices
- Zero external dependencies philosophy
- Docker-first deployment approach
