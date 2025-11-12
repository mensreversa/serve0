# @serve0/core

High-performance, programmable reverse proxy and edge gateway core for serve0.

## Installation

```bash
npm install @serve0/core
```

## Usage

```typescript
import { serve0 } from '@serve0/core';
import { ConsoleLoggerPlugin } from '@serve0/logger';

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

const { stop } = await app.serve(8080);
```

## License

MIT
