# @serve0/route53

AWS Route53 DNS provider for serve0 ACME DNS-01 challenges.

## Installation

```bash
npm install @serve0/route53
```

## Usage

```typescript
import { serve0 } from '@serve0/core';
import { Route53DnsProvider } from '@serve0/route53';
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
    dnsProvider: new Route53DnsProvider({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: 'us-east-1',
    }),
  })
);

await app.serve(443);
```

## License

MIT
