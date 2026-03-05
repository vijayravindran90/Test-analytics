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
