import { existsSync } from 'fs';
import { resolve } from 'path';
import { ConsoleLoggerPlugin, InMemoryMetricsPlugin, serve, site } from './index.js';

interface CliConfig {
  port?: number;
  host?: string;
  config?: string;
  logFile?: string;
  https?: {
    key?: string;
    cert?: string;
    acme?: {
      email: string;
      domains: string[];
      staging?: boolean;
      certDir?: string;
    };
  };
}

class Serve0Cli {
  private config: CliConfig = {};
  private proxy: any = null;

  constructor(args: string[]) {
    this.parseArgs(args);
  }

  private parseArgs(args: string[]): void {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const value = args[i + 1];

      switch (arg) {
        case '--port':
        case '-p':
          this.config.port = parseInt(value, 10);
          i++;
          break;
        case '--host':
        case '-h':
          this.config.host = value;
          i++;
          break;
        case '--config':
        case '-c':
          this.config.config = value;
          i++;
          break;
        case '--log-file':
        case '-l':
          this.config.logFile = value;
          i++;
          break;
        case '--https-key':
          this.config.https = this.config.https || {};
          this.config.https.key = value;
          i++;
          break;
        case '--https-cert':
          this.config.https = this.config.https || {};
          this.config.https.cert = value;
          i++;
          break;
        case '--acme-email':
          this.config.https = this.config.https || {};
          this.config.https.acme = this.config.https.acme || { email: '', domains: [] };
          this.config.https.acme.email = value;
          i++;
          break;
        case '--acme-domains':
          this.config.https = this.config.https || {};
          this.config.https.acme = this.config.https.acme || { email: '', domains: [] };
          this.config.https.acme.domains = value.split(',').map((d) => d.trim());
          i++;
          break;
        case '--acme-staging':
          this.config.https = this.config.https || {};
          this.config.https.acme = this.config.https.acme || { email: '', domains: [] };
          this.config.https.acme.staging = true;
          break;
        case '--acme-cert-dir':
          this.config.https = this.config.https || {};
          this.config.https.acme = this.config.https.acme || { email: '', domains: [] };
          this.config.https.acme.certDir = value;
          i++;
          break;
      }
    }
  }

  private async start(): Promise<void> {
    try {
      // Create proxy with new API
      this.proxy = await serve({
        sites: [
          site('localhost', {
            route(req) {
              // Simple default routing
              if (req.url?.startsWith('/api')) {
                return 'http://localhost:4000';
              }
              return 'http://localhost:3000';
            },
          }),
        ],
        plugins: [new ConsoleLoggerPlugin(), new InMemoryMetricsPlugin()],
        port: this.config.port || 8080,
        host: this.config.host || '0.0.0.0',
      });

      // Load configuration
      await this.loadConfig();

      // Start the server
      await this.proxy.start();

      console.log(`Serve0 started on ${this.config.host || '0.0.0.0'}:${this.config.port || 8080}`);

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('SIGINT received, shutting down gracefully...');
        if (this.proxy) {
          await this.proxy.stop();
        }
        process.exit(0);
      });
    } catch (error) {
      console.error(
        'Failed to start Serve0:',
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  }

  private async loadConfig(): Promise<void> {
    const configPath = this.config.config || 'config.ts';
    if (existsSync(configPath)) {
      try {
        const configModule = await import(resolve(process.cwd(), configPath));
        if (configModule.default && typeof configModule.default === 'function') {
          // If config exports a function, call it with the proxy instance
          if (this.proxy) {
            configModule.default(this.proxy);
          }
        }
      } catch (error) {
        console.warn(
          `Warning: Could not load config file ${configPath}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  private status(): void {
    if (this.proxy) {
      const ctx = this.proxy.getContext();
      console.log('Serve0 Status:');
      console.log(`  Sites: ${ctx.sites.length}`);
      console.log(`  Plugins: ${ctx.plugins.map((p: any) => p.name).join(', ')}`);
    } else {
      console.log('Serve0 is not running.');
    }
  }

  async run(): Promise<void> {
    const command = process.argv[2];
    switch (command) {
      case 'start':
        await this.start();
        break;
      case 'status':
        this.status();
        break;
      default:
        this.showHelp();
        process.exit(1);
    }
  }

  private showHelp(): void {
    console.log(`
Serve0 - A programmable reverse proxy and edge gateway

Usage: serve0 <command> [options]

Commands:
  start     Start the proxy server
  status    Show server status

Start Options:
  -p, --port <port>        Port to listen on (default: 8080)
  -h, --host <host>        Host to bind to (default: 0.0.0.0)
  -c, --config <file>      Configuration file (default: config.ts)
  -l, --log-file <file>    Log file path
  --https-key <file>       HTTPS private key file
  --https-cert <file>      HTTPS certificate file
  --acme-email <email>     ACME email address
  --acme-domains <list>    Comma-separated list of domains
  --acme-staging           Use Let's Encrypt staging environment
  --acme-cert-dir <dir>    Certificate storage directory

Examples:
  serve0 start
  serve0 start --port 3000 --config ./my-config.ts
  serve0 start --https-key ./key.pem --https-cert ./cert.pem
  serve0 start --acme-email admin@example.com --acme-domains example.com,www.example.com
  serve0 status
`);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  new Serve0Cli(process.argv.slice(2)).run();
}
