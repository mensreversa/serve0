import { ConsoleLoggerPlugin, serve0 } from '@serve0/core';
import express from 'express';

async function main() {
  // 1) Start your Express app on an internal port (backend)
  const expressApp = express();
  expressApp.get('/', (_req, res) => res.send('Hello from Express app'));
  expressApp.get('/api', (_req, res) => res.json({ ok: true }));
  await new Promise<void>((resolve) => expressApp.listen(3000, resolve));
  console.log('Express app listening on :3000');

  // 2) Start Serve0 in front (edge), forwarding to Express
  const app = serve0();

  app.handle('localhost', {
    route(req) {
      // All traffic to the Express app behind the proxy
      return 'http://localhost:3000';
    },
  });

  app.plugin(new ConsoleLoggerPlugin());

  const { stop } = await app.serve(8080);
  console.log('Serve0 proxy listening on :8080 (front)');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await stop();
    process.exit(0);
  });
}

main().catch(console.error);
