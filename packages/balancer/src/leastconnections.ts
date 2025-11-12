import { ProxyRouter } from '@serve0/core';
import { TargetHealth } from './types.js';

export class LeastConnectionsBalancerPlugin implements ProxyRouter {
  name = 'least-connections-balancer';
  private connectionCounts: Map<string, number> = new Map();
  private healthStatus: Map<string, TargetHealth> = new Map();

  getTarget(targets: string[]): string | null {
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
