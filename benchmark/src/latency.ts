import autocannon from 'autocannon';
import { serve, site } from '@serve0/core';
import { createServer } from 'http';

async function benchmarkLatency() {
  const backend = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
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
  console.log('Running latency benchmark...\n');

  const result = await autocannon({
    url: 'http://localhost:8080',
    connections: 10,
    duration: 30,
    pipelining: 1
  });

  console.log('=== Latency Benchmark ===');
  console.log(`Mean Latency: ${result.latency.mean}ms`);
  console.log(`Min Latency: ${result.latency.min}ms`);
  console.log(`Max Latency: ${result.latency.max}ms`);
  console.log(`p50: ${result.latency.p50}ms`);
  console.log(`p75: ${result.latency.p75}ms`);
  console.log(`p90: ${result.latency.p90}ms`);
  console.log(`p99: ${result.latency.p99}ms`);
  console.log(`p99.9: ${result.latency.p999}ms`);

  await proxy.stop();
  backend.close();
}

benchmarkLatency().catch(console.error);

