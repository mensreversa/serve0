# @serve0/cors

CORS plugin for serve0.

## Installation

```bash
npm install @serve0/cors
```

## Usage

```typescript
import { serve0 } from '@serve0/core';
import { CorsPlugin } from '@serve0/cors';

const app = serve0();

app.handle('localhost', {
  route(req) {
    return 'http://localhost:3000';
  },
});

app.plugin(
  new CorsPlugin({
    origin: ['https://example.com'],
    methods: ['GET', 'POST'],
    credentials: true,
  })
);

await app.serve(8080);
```

## Configuration

- `origin`: Allowed origins (string, string[], or true for all)
- `methods`: Allowed HTTP methods
- `headers`: Allowed headers
- `credentials`: Allow credentials
- `maxAge`: Preflight cache duration in seconds
