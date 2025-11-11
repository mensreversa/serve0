import autocannon from 'autocannon';
import { serve, site } from '@serve0/core';
import { createServer } from 'http';

async function benchmarkThroughput() {
  const backend = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('x'.repeat(1024)); // 1KB response
  });
  
  await new Promise<void>(resolve => {
    backend.listen(3000, resolve);
  });

  const proxy = await serve({
    sites: [
      site('localhost', {
        route() {
          return 'http://localhost:3000';
        }
      })
    ],
    port: 8080
  });

  await proxy.start();
  console.log('Running throughput benchmark (high concurrency)...\n');

  const result = await autocannon({
    url: 'http://localhost:8080',
    connections: 200,
    duration: 20,
    pipelining: 5
  });

  console.log('=== Throughput Benchmark ===');
  console.log(`Total Requests: ${result.requests.total}`);
  console.log(`Requests/sec: ${(result.requests.total / result.duration).toFixed(0)}`);
  console.log(`Throughput: ${(result.throughput.total / 1024 / 1024).toFixed(2)} MB/s`);
  console.log(`Duration: ${result.duration}s`);

  await proxy.stop();
  backend.close();
}

benchmarkThroughput().catch(console.error);

