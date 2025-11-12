# @serve0/health

Health check plugin for serve0.

## Installation

```bash
npm install @serve0/health
```

## Usage

```typescript
import { serve0 } from '@serve0/core';
import { HealthCheckPlugin } from '@serve0/health';

const app = serve0();

app.handle('localhost', {
  route(req) {
    return 'http://localhost:3000';
  },
});

app.plugin(new HealthCheckPlugin({ path: '/health' }));

await app.serve(8080);
```

## Configuration

- `path`: Health check endpoint path (default: `/health`)
