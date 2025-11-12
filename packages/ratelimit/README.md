# @serve0/ratelimit

Rate limiting plugin for serve0.

## Installation

```bash
npm install @serve0/ratelimit
```

## Usage

```typescript
import { serve0 } from '@serve0/core';
import { RateLimitPlugin } from '@serve0/ratelimit';

const app = serve0();

app.handle('localhost', {
  route(req) {
    return 'http://localhost:3000';
  },
});

app.plugin(
  new RateLimitPlugin({
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per window
  })
);

await app.serve(8080);
```

## Configuration

- `windowMs`: Time window in milliseconds (default: 60000)
- `maxRequests`: Maximum requests per window (default: 100)
