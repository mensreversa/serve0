# @serve0/balancer

Load balancing routers for serve0. Balancers implement the `ProxyRouter` interface to select targets from a list.

## Installation

```bash
npm install @serve0/balancer
```

## Usage

```typescript
import { serve0 } from '@serve0/core';
import { RoundRobinBalancerPlugin, LeastConnectionsBalancerPlugin } from '@serve0/balancer';

const app = serve0();

app.handle('localhost', {
  route(req) {
    const targets = ['http://localhost:3000', 'http://localhost:3001'];
    const balancer = new RoundRobinBalancerPlugin();
    return balancer.getTarget(targets) || targets[0];
  },
});

await app.serve(8080);
```

## Routers

- `RoundRobinBalancerPlugin`: Round-robin load balancing
- `LeastConnectionsBalancerPlugin`: Least connections load balancing

Balancers implement the `ProxyRouter` interface and are used within the `route` function to select a target from an array of targets.
