import { Metrics, ProxyContext, ProxyPlugin, RequestContext } from '../types.js';

export class InMemoryMetricsPlugin implements ProxyPlugin, Metrics {
  name = 'in-memory-metrics';
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }

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

export class PrometheusMetricsPlugin implements ProxyPlugin, Metrics {
  name = 'prometheus-metrics';
  private metrics: Map<string, { type: string; help: string; values: Map<string, number> }> =
    new Map();

  setup?(_ctx: ProxyContext): void {
    // Setup logic if needed
  }

  onRequest?(req: RequestContext['req'], _ctx: RequestContext): Promise<void> {
    this.increment('requests.total', { method: req.method || 'GET' });
    return Promise.resolve();
  }

  increment(name: string, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags);
    const metric = this.metrics.get(key) || { type: 'counter', help: '', values: new Map() };
    const currentValue = metric.values.get('') || 0;
    metric.values.set('', currentValue + 1);
    this.metrics.set(key, metric);
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags);
    const metric = this.metrics.get(key) || { type: 'histogram', help: '', values: new Map() };
    const currentValue = metric.values.get('') || 0;
    metric.values.set('', currentValue + value);
    this.metrics.set(key, metric);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags);
    const metric = this.metrics.get(key) || { type: 'gauge', help: '', values: new Map() };
    metric.values.set('', value);
    this.metrics.set(key, metric);
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

  exportPrometheus(): string {
    let output = '';
    for (const [name, metric] of this.metrics) {
      output += `# HELP ${name} ${metric.help}\n`;
      output += `# TYPE ${name} ${metric.type}\n`;
      for (const [labels, value] of metric.values) {
        if (labels) {
          output += `${name}{${labels}} ${value}\n`;
        } else {
          output += `${name} ${value}\n`;
        }
      }
    }
    return output;
  }
}

// Default metrics instance
export const defaultMetrics = new InMemoryMetricsPlugin();
