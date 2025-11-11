/**
 * HTTP-01 Challenge Handler
 */

import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Logger } from '../types.js';

export interface HttpChallengeConfig {
  certDir?: string;
  port?: number;
}

export class HttpChallengeHandler {
  private config: HttpChallengeConfig;
  private logger: Logger;
  private challenges: Map<string, string> = new Map();

  constructor(config: HttpChallengeConfig, logger: Logger) {
    this.config = {
      certDir: './certs',
      port: 8080,
      ...config,
    };
    this.logger = logger;
  }

  /**
   * Store challenge response for HTTP-01 validation
   */
  async storeChallenge(token: string, keyAuthorization: string): Promise<void> {
    const challengeDir = join(this.config.certDir!, 'challenges');

    if (!existsSync(challengeDir)) {
      mkdirSync(challengeDir, { recursive: true });
    }

    const challengePath = join(challengeDir, token);
    writeFileSync(challengePath, keyAuthorization);
    this.challenges.set(token, keyAuthorization);

    this.logger.debug('Stored HTTP challenge', { token, path: challengePath });
  }

  /**
   * Get challenge response
   */
  getChallenge(token: string): string | null {
    if (this.challenges.has(token)) {
      return this.challenges.get(token)!;
    }

    const challengePath = join(this.config.certDir!, 'challenges', token);
    if (existsSync(challengePath)) {
      return readFileSync(challengePath, 'utf8');
    }

    return null;
  }

  /**
   * Create key authorization for challenge
   */
  createKeyAuthorization(token: string, accountThumbprint: string): string {
    return `${token}.${accountThumbprint}`;
  }

  /**
   * Calculate account thumbprint
   */
  calculateThumbprint(accountKey: string): string {
    const hash = createHash('sha256');
    hash.update(accountKey);
    return this.base64url(hash.digest());
  }

  private base64url(data: Buffer): string {
    return data.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}
