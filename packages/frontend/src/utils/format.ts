export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = seconds / 60;
  return `${minutes.toFixed(1)}m`;
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PASSED: 'text-green-600 bg-green-50',
    FAILED: 'text-red-600 bg-red-50',
    SKIPPED: 'text-gray-600 bg-gray-50',
    TIMEOUT: 'text-orange-600 bg-orange-50',
  };
  return colors[status] || 'text-gray-600 bg-gray-50';
}

export function getTrendColor(trend: string): string {
  if (trend === 'improving') return 'text-green-600';
  if (trend === 'degrading') return 'text-red-600';
  return 'text-gray-600';
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

export function formatDateShort(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString();
}

export type StatusTier = 'good' | 'warning' | 'critical';

export function getPassRateTier(passRate: number): StatusTier {
  if (passRate >= 90) return 'good';
  if (passRate >= 75) return 'warning';
  return 'critical';
}

export const STATUS_TIER_META: Record<StatusTier, { label: string; textClass: string; badgeClass: string }> = {
  good: { label: 'Healthy', textClass: 'text-success-700', badgeClass: 'badge-success' },
  warning: { label: 'Needs attention', textClass: 'text-warning-700', badgeClass: 'badge-warning' },
  critical: { label: 'At risk', textClass: 'text-danger-700', badgeClass: 'badge-danger' },
};

export function getConfidenceTier(score: number): StatusTier {
  if (score >= 75) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}
