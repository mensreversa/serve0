/**
 * Proxy Factory Tests
 */

import { serve, site } from '../src/factory';

describe('Proxy Factory', () => {
  describe('serve', () => {
    test('should create a proxy instance', async () => {
      const proxy = await serve({
        sites: [
          site('localhost', {
            route(req) {
              return 'http://localhost:3000';
            },
          }),
        ],
        port: 8080,
      });

      expect(proxy).toBeDefined();
      expect(proxy.start).toBeDefined();
      expect(proxy.stop).toBeDefined();
      expect(proxy.getContext).toBeDefined();

      await proxy.stop();
    });

    test('should create proxy with multiple sites', async () => {
      const proxy = await serve({
        sites: [
          site('example.com', {
            route(req) {
              return 'http://localhost:3000';
            },
          }),
          site('api.example.com', {
            route(req) {
              return 'http://localhost:3001';
            },
          }),
        ],
      });

      const ctx = proxy.getContext();
      expect(ctx.sites).toHaveLength(2);
      expect(ctx.sites[0].domain).toBe('example.com');
      expect(ctx.sites[1].domain).toBe('api.example.com');

      await proxy.stop();
    });
  });

  describe('site', () => {
    test('should create a site configuration', () => {
      const siteConfig = site('example.com', {
        route(req) {
          return 'http://localhost:3000';
        },
      });

      expect(siteConfig.domain).toBe('example.com');
      expect(siteConfig.route).toBeDefined();
    });
  });
});
