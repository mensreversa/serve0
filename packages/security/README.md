# @serve0/security

Security headers plugin for serve0.

## Installation

```bash
npm install @serve0/security
```

## Usage

```typescript
import { serve0 } from '@serve0/core';
import { SecurityPlugin } from '@serve0/security';

const app = serve0();

app.handle('localhost', {
  route(req) {
    return 'http://localhost:3000';
  },
});

app.plugin(new SecurityPlugin());

await app.serve(8080);
```

## Security Headers

The plugin adds the following security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security` (HTTPS only)
