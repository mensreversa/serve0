export interface TargetHealth {
  url: string;
  healthy: boolean;
  lastCheck: number;
  responseTime?: number;
}
