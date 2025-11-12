import { Metrics, ProxyPlugin, RequestContext } from '@serve0/core';

export class InMemoryMetricsPlugin implements ProxyPlugin, Metrics {
  name = 'in-memory-metrics';
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();

  onRequest?(req: RequestContext['req'], _ctx: RequestContext): Promise<void> {
    this.increment('requests.total', { method: req.method || 'GET' });
    return Promise.resolve();
  }

  increment(name: string, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags);
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key)?.push(value);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags);
    this.gauges.set(key, value);
  }

  private getKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }
    const sortedTags = Object.keys(tags)
      .sort()
      .map((k) => `${k}:${tags[k]}`)
      .join(',');
    return `${name}{${sortedTags}}`;
  }

  getSummary(): Record<string, any> {
    return {
      counters: Object.fromEntries(this.counters),
      histograms: Object.fromEntries(this.histograms),
      gauges: Object.fromEntries(this.gauges),
    };
  }

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }
}
