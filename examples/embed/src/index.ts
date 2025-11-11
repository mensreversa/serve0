import { ConsoleLoggerPlugin, serve, site } from '@serve0/core';
import express from 'express';

async function main() {
  // 1) Start your Express app on an internal port (backend)
  const app = express();
  app.get('/', (_req, res) => res.send('Hello from Express app'));
  app.get('/api', (_req, res) => res.json({ ok: true }));
  await new Promise<void>((resolve) => app.listen(3000, resolve));
  console.log('Express app listening on :3000');

  // 2) Start Serve0 in front (edge), forwarding to Express
  const proxy = await serve({
    sites: [
      site('localhost', {
        route(req) {
          // All traffic to the Express app behind the proxy
          return 'http://localhost:3000';
        },
      }),
    ],
    plugins: [new ConsoleLoggerPlugin()],
    port: 8080,
    host: '0.0.0.0',
  });

  await proxy.start();
  console.log('Serve0 proxy listening on :8080 (front)');
}

main().catch(console.error);
