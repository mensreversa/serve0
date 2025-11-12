# @serve0/route53

AWS Route53 DNS provider for serve0 ACME DNS-01 challenges.

## Installation

```bash
npm install @serve0/route53
```

## Usage

```typescript
import { DNSProvider } from '@serve0/core';
import { Route53DnsProvider } from '@serve0/route53';

// Use with ACME interfaces
const dnsProvider: DNSProvider = new Route53DnsProvider({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1',
});
```

## License

MIT
