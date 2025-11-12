import autocannon from 'autocannon';
import { serve0 } from '@serve0/core';
import { createServer } from 'http';

async function benchmarkProxy() {
  // Start backend
  const backend = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'OK', timestamp: Date.now() }));
  });

  await new Promise<void>((resolve) => {
    backend.listen(3000, resolve);
  });

  // Start proxy
  const app = serve0();

  app.handle('localhost', {
    route() {
      return 'http://localhost:3000';
    },
  });

  const { stop } = await app.serve(8080);
  console.log('Running proxy benchmark...\n');

  const result = await autocannon({
    url: 'http://localhost:8080',
    connections: 50,
    duration: 30,
    pipelining: 1,
  });

  console.log('=== Proxy Benchmark ===');
  console.log(`Requests/sec: ${(result.requests.total / result.duration).toFixed(0)}`);
  console.log(`Throughput: ${(result.throughput.total / 1024 / 1024).toFixed(2)} MB/s`);
  console.log(
    `Latency: ${result.latency.mean}ms (mean), ${result.latency.p50}ms (p50), ${result.latency.p99}ms (p99)`
  );
  console.log(`Errors: ${result.errors}`);

  await stop();
  backend.close();
}

benchmarkProxy().catch(console.error);

