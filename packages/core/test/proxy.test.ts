/**
 * Serve0 Proxy Tests
 */

import { IncomingMessage, ServerResponse } from 'http';
import { serve0 } from '../src/serve0';
import { ProxyPlugin } from '../src/types';

describe('Serve0', () => {
  describe('handle', () => {
    test('should add route handlers', () => {
      const app = serve0();

      app.handle('localhost', {
        route: jest.fn().mockResolvedValue('http://localhost:3000'),
      });

      app.handle('api.example.com', {
        route: jest.fn().mockResolvedValue('http://localhost:3001'),
      });

      expect(app).toBeDefined();
    });

    test('should support wildcard domains', () => {
      const app = serve0();

      app.handle('*.example.com', {
        route: jest.fn().mockResolvedValue('http://localhost:3000'),
      });

      expect(app).toBeDefined();
    });

    test('should chain handle calls', () => {
      const app = serve0();

      const result = app
        .handle('localhost', {
          route: jest.fn().mockResolvedValue('http://localhost:3000'),
        })
        .handle('api.example.com', {
          route: jest.fn().mockResolvedValue('http://localhost:3001'),
        });

      expect(result).toBe(app);
    });
  });

  describe('plugin', () => {
    test('should add plugins', () => {
      const app = serve0();
      const mockPlugin: ProxyPlugin = {
        name: 'test-plugin',
        setup: jest.fn(),
      };

      app.plugin(mockPlugin);

      expect(app).toBeDefined();
    });

    test('should chain plugin calls', () => {
      const app = serve0();
      const plugin1: ProxyPlugin = { name: 'plugin1' };
      const plugin2: ProxyPlugin = { name: 'plugin2' };

      const result = app.plugin(plugin1).plugin(plugin2);

      expect(result).toBe(app);
    });
  });

  describe('serve', () => {
    test('should start and stop server', async () => {
      const app = serve0();

      app.handle('localhost', {
        route: jest.fn().mockResolvedValue('http://localhost:3000'),
      });

      const { stop } = await app.serve(0);
      expect(stop).toBeDefined();

      await stop();
    });
  });

  describe('Request Routing', () => {
    let app: ReturnType<typeof serve0>;
    let stop: () => Promise<void>;

    beforeEach(async () => {
      app = serve0();
      app.handle('localhost', {
        route: jest.fn().mockResolvedValue('http://localhost:3000'),
      });
      const result = await app.serve(0);
      stop = result.stop;
    });

    afterEach(async () => {
      await stop();
    });

    test('should route to correct site by domain', async () => {
      const route1 = jest.fn().mockResolvedValue('http://localhost:3000');
      const route2 = jest.fn().mockResolvedValue('http://localhost:3001');

      app.handle('example.com', {
        route: route1,
      });

      app.handle('api.example.com', {
        route: route2,
      });

      const req = {
        headers: { host: 'example.com' },
        url: '/test',
        method: 'GET',
      } as unknown as IncomingMessage;

      const res = {
        statusCode: 200,
        setHeader: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn(),
      } as unknown as ServerResponse;

      await app.handleRequest(req, res);

      expect(route1).toHaveBeenCalled();
      expect(route2).not.toHaveBeenCalled();
    });

    test('should return 404 for non-matching domain', async () => {
      const req = {
        headers: { host: 'unknown.com' },
        url: '/test',
        method: 'GET',
      } as unknown as IncomingMessage;

      const res = {
        statusCode: 200,
        setHeader: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn(),
      } as unknown as ServerResponse;

      await app.handleRequest(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.end).toHaveBeenCalledWith('Site not found');
    });

    test('should support wildcard domain matching', async () => {
      const route = jest.fn().mockResolvedValue('http://localhost:3000');

      app.handle('*.example.com', {
        route,
      });

      const req = {
        headers: { host: 'api.example.com' },
        url: '/test',
        method: 'GET',
      } as unknown as IncomingMessage;

      const res = {
        statusCode: 200,
        setHeader: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn(),
      } as unknown as ServerResponse;

      await app.handleRequest(req, res);

      expect(route).toHaveBeenCalled();
    });
  });

  describe('Plugin Integration', () => {
    test('should call plugin setup on serve', async () => {
      const app = serve0();
      const setupFn = jest.fn();
      const plugin: ProxyPlugin = {
        name: 'test-plugin',
        setup: setupFn,
      };

      app.plugin(plugin);
      app.handle('localhost', {
        route: jest.fn().mockResolvedValue('http://localhost:3000'),
      });

      const { stop } = await app.serve(0);

      expect(setupFn).toHaveBeenCalled();

      await stop();
    });

    test('should call plugin onRequest', async () => {
      const app = serve0();
      const onRequestFn = jest.fn().mockResolvedValue(undefined);
      const plugin: ProxyPlugin = {
        name: 'test-plugin',
        onRequest: onRequestFn,
      };

      app.plugin(plugin);
      app.handle('localhost', {
        route: jest.fn().mockResolvedValue('http://localhost:3000'),
      });

      const { stop } = await app.serve(0);

      const req = {
        headers: { host: 'localhost' },
        url: '/test',
        method: 'GET',
      } as unknown as IncomingMessage;

      const res = {
        statusCode: 200,
        setHeader: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn(),
      } as unknown as ServerResponse;

      await app.handleRequest(req, res);

      expect(onRequestFn).toHaveBeenCalled();

      await stop();
    });
  });

  describe('Error Handling', () => {
    test('should throw when handleRequest called before serve', async () => {
      const app = serve0();

      const req = {
        headers: { host: 'localhost' },
        url: '/test',
        method: 'GET',
      } as unknown as IncomingMessage;

      const res = {
        statusCode: 200,
        setHeader: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn(),
      } as unknown as ServerResponse;

      await expect(app.handleRequest(req, res)).rejects.toThrow('Server not started');
    });

    test('should handle route returning null', async () => {
      const app = serve0();

      app.handle('localhost', {
        route: jest.fn().mockResolvedValue(null),
      });

      const { stop } = await app.serve(0);

      const req = {
        headers: { host: 'localhost' },
        url: '/test',
        method: 'GET',
      } as unknown as IncomingMessage;

      const res = {
        statusCode: 200,
        setHeader: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn(),
      } as unknown as ServerResponse;

      await app.handleRequest(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.end).toHaveBeenCalledWith('No route found');

      await stop();
    });
  });
});

