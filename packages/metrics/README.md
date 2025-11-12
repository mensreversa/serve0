# @serve0/metrics

Metrics plugins for serve0.

## Installation

```bash
npm install @serve0/metrics
```

## Usage

```typescript
import { serve0 } from '@serve0/core';
import { InMemoryMetricsPlugin } from '@serve0/metrics';

const app = serve0();

app.handle('localhost', {
  route(req) {
    return 'http://localhost:3000';
  },
});

const metrics = new InMemoryMetricsPlugin();
app.plugin(metrics);

await app.serve(8080);

// Access metrics
const summary = metrics.getSummary();
console.log(summary);
```

## Plugins

- `InMemoryMetricsPlugin`: In-memory metrics collection
