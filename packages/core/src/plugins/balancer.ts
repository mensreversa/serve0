import { ProxyContext, ProxyPlugin } from '../types.js';

export interface TargetHealth {
  url: string;
  healthy: boolean;
  lastCheck: number;
  responseTime?: number;
}

export class RoundRobinBalancerPlugin implements ProxyPlugin {
  name = 'round-robin-balancer';
  private currentIndex: number = 0;
  private connectionCounts: Map<string, number> = new Map();
  private healthStatus: Map<string, TargetHealth> = new Map();
  private stickySessions: Map<string, string> = new Map();

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }

  getTarget(targets: string[], strategy: string = 'round-robin', clientId?: string): string | null {
    const healthyTargets = this.getHealthyTargets(targets);

    if (healthyTargets.length === 0) {
      return null;
    }

    switch (strategy) {
      case 'round-robin':
        return this.roundRobin(healthyTargets);
      case 'least-connections':
        return this.leastConnections(healthyTargets);
      case 'sticky':
        return this.stickySession(healthyTargets, clientId);
      case 'weighted':
        return this.weightedRoundRobin(healthyTargets);
      default:
        return healthyTargets[0];
    }
  }

  private roundRobin(targets: string[]): string {
    const target = targets[this.currentIndex % targets.length];
    this.currentIndex++;
    return target;
  }

  private leastConnections(targets: string[]): string {
    let minConnections = Infinity;
    let selectedTarget = targets[0];

    for (const target of targets) {
      const connections = this.connectionCounts.get(target) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedTarget = target;
      }
    }

    return selectedTarget;
  }

  private stickySession(targets: string[], clientId?: string): string {
    if (!clientId) {
      return this.roundRobin(targets);
    }

    const existingTarget = this.stickySessions.get(clientId);
    if (existingTarget && targets.includes(existingTarget)) {
      return existingTarget;
    }

    const newTarget = this.roundRobin(targets);
    this.stickySessions.set(clientId, newTarget);
    return newTarget;
  }

  private weightedRoundRobin(targets: string[]): string {
    // For now, implement as round-robin
    // TODO: Implement actual weighted round-robin
    return this.roundRobin(targets);
  }

  private getHealthyTargets(targets: string[]): string[] {
    return targets.filter((target) => {
      const health = this.healthStatus.get(target);
      return health?.healthy !== false;
    });
  }

  incrementConnections(target: string): void {
    const current = this.connectionCounts.get(target) || 0;
    this.connectionCounts.set(target, current + 1);
  }

  decrementConnections(target: string): void {
    const current = this.connectionCounts.get(target) || 0;
    if (current > 0) {
      this.connectionCounts.set(target, current - 1);
    }
  }

  updateHealth(target: string, healthy: boolean, responseTime?: number): void {
    const health = this.healthStatus.get(target);
    if (health) {
      health.healthy = healthy;
      health.lastCheck = Date.now();
      if (responseTime !== undefined) {
        health.responseTime = responseTime;
      }
    } else {
      this.healthStatus.set(target, {
        url: target,
        healthy,
        lastCheck: Date.now(),
        responseTime,
      });
    }
  }

  getHealthStatus(): Map<string, TargetHealth> {
    return new Map(this.healthStatus);
  }

  addTarget(target: string): void {
    this.healthStatus.set(target, {
      url: target,
      healthy: true,
      lastCheck: Date.now(),
    });
  }

  removeTarget(target: string): void {
    this.healthStatus.delete(target);
    this.connectionCounts.delete(target);
  }
}

export class LeastConnectionsBalancerPlugin implements ProxyPlugin {
  name = 'least-connections-balancer';
  private connectionCounts: Map<string, number> = new Map();
  private healthStatus: Map<string, TargetHealth> = new Map();

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }

  getTarget(
    targets: string[],
    _strategy: string = 'least-connections',
    _clientId?: string
  ): string | null {
    const healthyTargets = this.getHealthyTargets(targets);

    if (healthyTargets.length === 0) {
      return null;
    }

    return this.leastConnections(healthyTargets);
  }

  private leastConnections(targets: string[]): string {
    let minConnections = Infinity;
    let selectedTarget = targets[0];

    for (const target of targets) {
      const connections = this.connectionCounts.get(target) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedTarget = target;
      }
    }

    return selectedTarget;
  }

  private getHealthyTargets(targets: string[]): string[] {
    return targets.filter((target) => {
      const health = this.healthStatus.get(target);
      return health?.healthy !== false;
    });
  }

  incrementConnections(target: string): void {
    const current = this.connectionCounts.get(target) || 0;
    this.connectionCounts.set(target, current + 1);
  }

  decrementConnections(target: string): void {
    const current = this.connectionCounts.get(target) || 0;
    if (current > 0) {
      this.connectionCounts.set(target, current - 1);
    }
  }

  updateHealth(target: string, healthy: boolean, responseTime?: number): void {
    const health = this.healthStatus.get(target);
    if (health) {
      health.healthy = healthy;
      health.lastCheck = Date.now();
      if (responseTime !== undefined) {
        health.responseTime = responseTime;
      }
    } else {
      this.healthStatus.set(target, {
        url: target,
        healthy,
        lastCheck: Date.now(),
        responseTime,
      });
    }
  }

  getHealthStatus(): Map<string, TargetHealth> {
    return new Map(this.healthStatus);
  }

  addTarget(target: string): void {
    this.healthStatus.set(target, {
      url: target,
      healthy: true,
      lastCheck: Date.now(),
    });
  }

  removeTarget(target: string): void {
    this.healthStatus.delete(target);
    this.connectionCounts.delete(target);
  }
}

// Default load balancer instance
export const defaultLoadBalancer = new RoundRobinBalancerPlugin();
