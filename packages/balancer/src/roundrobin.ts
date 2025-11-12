import { ProxyRouter } from '@serve0/core';
import { TargetHealth } from './types.js';

export class RoundRobinBalancerPlugin implements ProxyRouter {
  name = 'round-robin-balancer';
  private currentIndex: number = 0;
  private healthStatus: Map<string, TargetHealth> = new Map();

  getTarget(targets: string[]): string | null {
    const healthyTargets = this.getHealthyTargets(targets);
    if (healthyTargets.length === 0) {
      return null;
    }
    const target = healthyTargets[this.currentIndex % healthyTargets.length];
    this.currentIndex++;
    return target;
  }

  private getHealthyTargets(targets: string[]): string[] {
    return targets.filter((target) => {
      const health = this.healthStatus.get(target);
      return health?.healthy !== false;
    });
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
  }
}
