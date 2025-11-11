import { existsSync, readFileSync } from 'fs';
import { Logger, ProxyContext, ProxyPlugin } from '../types.js';

export class FileHttpsPlugin implements ProxyPlugin {
  name = 'file-https';
  private keyPath: string;
  private certPath: string;

  constructor(keyPath: string, certPath: string) {
    this.keyPath = keyPath;
    this.certPath = certPath;
  }

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }

  getCertificates(): { key: string; cert: string } | null {
    try {
      if (!existsSync(this.keyPath) || !existsSync(this.certPath)) {
        return null;
      }

      const key = readFileSync(this.keyPath, 'utf8');
      const cert = readFileSync(this.certPath, 'utf8');

      return { key, cert };
    } catch {
      return null;
    }
  }

  isEnabled(): boolean {
    return existsSync(this.keyPath) && existsSync(this.certPath);
  }
}

// AcmeHttpsPlugin - to be implemented using new ACME structure (http.ts, dns.ts, tls.ts)
export interface AcmeConfig {
  email: string;
  domains: string[];
  staging?: boolean;
  keySize?: number;
  certDir?: string;
}

export class AcmeHttpsPlugin implements ProxyPlugin {
  name = 'acme-https';

  constructor(
    config: AcmeConfig,
    private logger: Logger
  ) {
    // Minimal placeholder - implement using new ACME structure
    throw new Error('AcmeHttpsPlugin not yet implemented with new ACME structure');
  }

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }
}

export function createHttpsPlugin(
  config: { key?: string; cert?: string; acme?: AcmeConfig },
  logger: Logger
): ProxyPlugin | null {
  if (config.key && config.cert) {
    return new FileHttpsPlugin(config.key, config.cert);
  }

  if (config.acme) {
    return new AcmeHttpsPlugin(config.acme, logger);
  }

  return null;
}
