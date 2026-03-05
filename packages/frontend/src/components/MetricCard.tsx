import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

const colorClasses = {
  primary: 'border-primary-200 bg-primary-50',
  success: 'border-success-200 bg-success-50',
  warning: 'border-warning-200 bg-warning-50',
  danger: 'border-danger-200 bg-danger-50',
};

const valueColorClasses = {
  primary: 'text-primary-600',
  success: 'text-success-600',
  warning: 'text-warning-600',
  danger: 'text-danger-600',
};

export default function MetricCard({
  label,
  value,
  unit,
  trend,
  icon,
  color = 'primary',
}: MetricCardProps) {
  return (
    <div className={`card ${colorClasses[color]} border`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-neutral-600 text-sm font-medium">{label}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className={`text-3xl font-bold ${valueColorClasses[color]}`}>
                {value}
              </p>
              {unit && <span className="text-neutral-600 text-sm">{unit}</span>}
            </div>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                trend > 0 ? 'text-danger-600' : 'text-success-600'
              }`}>
                {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(trend)}%
              </div>
            )}
          </div>
          {icon && <div className="text-neutral-400">{icon}</div>}
        </div>
      </div>
    </div>
  );
}
