# @serve0/cloudflare

Cloudflare DNS provider for serve0 ACME DNS-01 challenges.

## Installation

```bash
npm install @serve0/cloudflare
```

## Usage

```typescript
import { DNSProvider } from '@serve0/core';
import { CloudflareDnsProvider } from '@serve0/cloudflare';

// Use with ACME interfaces
const dnsProvider: DNSProvider = new CloudflareDnsProvider({
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
});
```

## License

MIT
