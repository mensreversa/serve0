# @serve0/logger

Logging plugins for serve0.

## Installation

```bash
npm install @serve0/logger
```

## Usage

```typescript
import { serve0 } from '@serve0/core';
import { ConsoleLoggerPlugin } from '@serve0/logger';

const app = serve0();

app.handle('localhost', {
  route(req) {
    return 'http://localhost:3000';
  },
});

app.plugin(new ConsoleLoggerPlugin());

await app.serve(8080);
```

## Plugins

- `ConsoleLoggerPlugin`: Console-based logging
