/**
 * TLS Certificate Management
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Logger } from '../types.js';

export interface Certificate {
  key: string;
  cert: string;
}

export interface CertificateManager {
  saveCertificate(domain: string, cert: Certificate): void;
  loadCertificate(domain: string): Certificate | null;
  isCertificateValid(cert: Certificate): boolean;
}

export class FileCertificateManager implements CertificateManager {
  private certDir: string;
  private logger: Logger;

  constructor(certDir: string, logger: Logger) {
    this.certDir = certDir;
    this.logger = logger;

    if (!existsSync(certDir)) {
      mkdirSync(certDir, { recursive: true });
    }
  }

  saveCertificate(domain: string, cert: Certificate): void {
    const keyPath = join(this.certDir, `${domain}-key.pem`);
    const certPath = join(this.certDir, `${domain}-cert.pem`);

    writeFileSync(keyPath, cert.key);
    writeFileSync(certPath, cert.cert);

    this.logger.debug('Saved certificate', { domain, keyPath, certPath });
  }

  loadCertificate(domain: string): Certificate | null {
    const keyPath = join(this.certDir, `${domain}-key.pem`);
    const certPath = join(this.certDir, `${domain}-cert.pem`);

    if (!existsSync(keyPath) || !existsSync(certPath)) {
      return null;
    }

    try {
      return {
        key: readFileSync(keyPath, 'utf8'),
        cert: readFileSync(certPath, 'utf8'),
      };
    } catch (error) {
      this.logger.debug('Failed to load certificate', { domain, error });
      return null;
    }
  }

  isCertificateValid(cert: Certificate): boolean {
    // Simplified validation - in production, parse and check expiration
    try {
      // Basic check: certificate should contain BEGIN CERTIFICATE
      return cert.cert.includes('BEGIN CERTIFICATE') && cert.key.includes('BEGIN');
    } catch {
      return false;
    }
  }
}
