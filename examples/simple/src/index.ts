import { ConsoleLoggerPlugin, InMemoryMetricsPlugin, serve0 } from '@serve0/core';

async function main() {
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
  app.plugin(new InMemoryMetricsPlugin());

  const { stop } = await app.serve(8080);
  console.log('Serve0 proxy started on http://localhost:8080');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await stop();
    process.exit(0);
  });
}

main().catch(console.error);
