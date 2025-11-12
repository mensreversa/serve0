import autocannon from 'autocannon';
import { serve0 } from '@serve0/core';
import { createServer } from 'http';

async function main() {
  // Start a simple backend server
  const backend = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello from backend');
  });

  await new Promise<void>((resolve) => {
    backend.listen(3000, () => {
      console.log('Backend server listening on :3000');
      resolve();
    });
  });

  // Start serve0 proxy
  const app = serve0();

  app.handle('localhost', {
    route() {
      return 'http://localhost:3000';
    },
  });

  const { stop } = await app.serve(8080);
  console.log('Serve0 proxy started on :8080\n');

  // Run benchmarks
  console.log('Running throughput benchmark...');
  const result = await autocannon({
    url: 'http://localhost:8080',
    connections: 100,
    duration: 10,
    pipelining: 10,
  });

  console.log('\n=== Benchmark Results ===');
  console.log(`Requests: ${result.requests.total}`);
  console.log(`Throughput: ${(result.throughput.total / 1024 / 1024).toFixed(2)} MB/s`);
  console.log(`Latency: ${result.latency.mean}ms (avg), ${result.latency.p99}ms (p99)`);
  console.log(`Errors: ${result.errors}`);

  await stop();
  backend.close();
  process.exit(0);
}

main().catch(console.error);

