# Serve0

A high-performance, programmable reverse proxy and edge gateway written entirely in TypeScript with an Angular signals-style API.

## ✨ Features

- 🚀 **Extremely Fast**: Built with native Node.js `http`/`https` modules
- 🎯 **Angular Signals Style**: Modern, functional API inspired by Angular signals
- 🔄 **Load Balancing**: Round-robin, least-connections, sticky sessions
- 🧩 **Plugin System**: Modular middleware-based design
- 🔄 **Hot Reload**: Dynamic configuration using plain TypeScript
- 🔒 **HTTPS Support**: Built-in HTTPS with ACME (Let's Encrypt) support
- 📦 **Zero Dependencies**: No external runtime dependencies
- 🏃 **Multi-Runtime**: Runs on Node.js, Bun, or Deno
- 🐳 **Docker Ready**: Complete Docker support with monitoring
- 📊 **Observability**: Built-in metrics, logging, and health checks

## 🚀 Quick Start

### Installation

```bash
npm install serve0
```

### Basic Usage

```typescript
import { createProxy, site, ConsoleLoggerPlugin } from 'serve0';

const proxy = await createProxy({
  runtime: 'node',
  sites: [
    site('example.com', {
      route(req) {
        if (req.url?.startsWith('/api')) {
          return 'http://localhost:4000';
        }
        return 'http://localhost:3000';
      },
    }),
  ],
  plugins: [new ConsoleLoggerPlugin()],
});

await proxy.start();
```

### CLI Usage

```bash
# Start the proxy
serve0 start

# Start with custom port
serve0 start --port 3000

# Start with HTTPS
serve0 start --https-key ./key.pem --https-cert ./cert.pem

# Start with ACME (Let's Encrypt)
serve0 start --acme-email admin@example.com --acme-domains example.com,www.example.com

# Check status
serve0 status
```

## 🏗️ Architecture

### Modern API Design

Serve0 uses an Angular signals-inspired API that's clean, functional, and easy to understand:

```typescript
// Site configuration
site('example.com', {
  tls: { email: 'admin@example.com' },
  route(req) {
    // Pure function for routing logic
    return 'http://backend:3000';
  }
})

// Proxy factory
createProxy({
  runtime: 'node', // 'bun' | 'deno' | 'edge'
  sites: [...],
  plugins: [...]
})
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
import { createProxy, site, ConsoleLoggerPlugin } from 'serve0';

const proxy = await createProxy({
  runtime: 'node',
  sites: [
    site('localhost', {
      route(req) {
        if (req.url?.startsWith('/api')) {
          return 'http://localhost:4000';
        }
        return 'http://localhost:3000';
      },
    }),
  ],
  plugins: [new ConsoleLoggerPlugin()],
});

await proxy.start();
```

### Load Balanced Services

```typescript
import { createProxy, site, RoundRobinBalancerPlugin } from 'serve0';

const proxy = await createProxy({
  runtime: 'node',
  sites: [
    site('api.example.com', {
      route(req) {
        // Load balancer will distribute across these targets
        return ['http://service1:3000', 'http://service2:3000', 'http://service3:3000'];
      },
    }),
  ],
  plugins: [new RoundRobinBalancerPlugin()],
});

await proxy.start();
```

### HTTPS with ACME

```typescript
import { createProxy, site, AcmeHttpsPlugin } from 'serve0';

const proxy = await createProxy({
  runtime: 'node',
  sites: [
    site('example.com', {
      tls: {
        email: 'admin@example.com',
        domains: ['example.com', 'www.example.com'],
      },
      route(req) {
        return 'http://backend:3000';
      },
    }),
  ],
  plugins: [new AcmeHttpsPlugin()],
});

await proxy.start();
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
site('example.com', {
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

- `createProxy(options)`: Create a new proxy instance
- `site(domain, config)`: Configure a site

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
