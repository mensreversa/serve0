# @serve0/cloudflare

Cloudflare DNS provider for serve0 ACME DNS-01 challenges.

## Installation

```bash
npm install @serve0/cloudflare
```

## Usage

```typescript
import { serve0 } from '@serve0/core';
import { CloudflareDnsProvider } from '@serve0/cloudflare';
import { AcmeHttpsPlugin } from '@serve0/core';

const app = serve0();

app.handle('example.com', {
  tls: {
    email: 'admin@example.com',
    domains: ['example.com', 'www.example.com'],
  },
  route(req) {
    return 'http://localhost:3000';
  },
});

app.plugin(
  new AcmeHttpsPlugin({
    dnsProvider: new CloudflareDnsProvider({
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
    }),
  })
);

await app.serve(443);
```

## License

MIT
