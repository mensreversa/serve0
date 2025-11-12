# @serve0/auth

Authentication plugins for serve0.

## Installation

```bash
npm install @serve0/auth
```

## Usage

```typescript
import { serve0 } from '@serve0/core';
import { BasicAuthPlugin, BearerAuthPlugin, ApiKeyAuthPlugin } from '@serve0/auth';

const app = serve0();

app.handle('localhost', {
  route(req) {
    return 'http://localhost:3000';
  },
});

// Basic authentication
app.plugin(
  new BasicAuthPlugin({
    credentials: { username: 'password' },
    realm: 'My Realm',
  })
);

// Bearer token authentication
app.plugin(
  new BearerAuthPlugin({
    tokens: ['token1', 'token2'],
    realm: 'My Realm',
  })
);

// API Key authentication
app.plugin(
  new ApiKeyAuthPlugin({
    apiKeys: ['key1', 'key2'],
    header: 'x-api-key',
  })
);

await app.serve(8080);
```

## Plugins

- `BasicAuthPlugin`: HTTP Basic authentication
- `BearerAuthPlugin`: Bearer token authentication
- `ApiKeyAuthPlugin`: API key authentication
