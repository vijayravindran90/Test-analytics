import React, { useMemo, useState } from 'react';
import type { Heatmap } from '../api/hooks';

interface ModuleHeatmapProps {
  heatmap: Heatmap | null;
  loading: boolean;
}

interface TooltipState {
  x: number;
  y: number;
  module: string;
  date: string;
  totalTests: number;
  passedTests: number;
  passRate: number;
}

function cellColor(totalTests: number, passRate: number): string {
  if (totalTests === 0) return '#e5e7eb';
  if (passRate >= 97) return '#15803d';
  if (passRate >= 90) return '#22c55e';
  if (passRate >= 75) return '#f59e0b';
  if (passRate >= 50) return '#f97316';
  return '#dc2626';
}

const LEGEND = [
  { color: '#e5e7eb', label: 'No runs' },
  { color: '#dc2626', label: '< 50%' },
  { color: '#f97316', label: '50-74%' },
  { color: '#f59e0b', label: '75-89%' },
  { color: '#22c55e', label: '90-96%' },
  { color: '#15803d', label: '97-100%' },
];

export default function ModuleHeatmap({ heatmap, loading }: ModuleHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const cellLookup = useMemo(() => {
    const map = new Map<string, { totalTests: number; passedTests: number; passRate: number }>();
    heatmap?.cells.forEach((cell) => {
      map.set(`${cell.module}::${cell.date}`, cell);
    });
    return map;
  }, [heatmap]);

  if (loading || !heatmap) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold">Module heatmap</h3>
        <p className="mt-4 text-sm text-neutral-500">Loading heatmap...</p>
      </div>
    );
  }

  const modules = heatmap.modules.slice(0, 10);

  if (modules.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold">Module heatmap</h3>
        <p className="mt-4 text-sm text-neutral-500">No test data yet for this time range.</p>
      </div>
    );
  }

  return (
    <div className="card relative p-6">
      <h3 className="text-lg font-semibold">Module heatmap</h3>
      <p className="mt-1 text-sm text-neutral-600">Pass rate by module (folder) and day. Hover a cell for details.</p>

      <div className="mt-4 overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex">
            <div className="w-32 flex-shrink-0" />
            <div className="flex gap-[3px]">
              {heatmap.dates.map((date) => (
                <div key={date} className="w-5 flex-shrink-0 text-center text-[10px] text-neutral-400">
                  {new Date(date + 'T00:00:00').getDate()}
                </div>
              ))}
            </div>
          </div>

          {modules.map((module) => (
            <div key={module} className="mt-[3px] flex items-center">
              <div className="w-32 flex-shrink-0 truncate pr-2 text-sm text-neutral-700" title={module}>
                {module}
              </div>
              <div className="flex gap-[3px]">
                {heatmap.dates.map((date) => {
                  const cell = cellLookup.get(`${module}::${date}`);
                  const totalTests = cell?.totalTests || 0;
                  const passedTests = cell?.passedTests || 0;
                  const passRate = cell?.passRate || 0;

                  return (
                    <div
                      key={date}
                      className="h-5 w-5 flex-shrink-0 cursor-pointer rounded-sm"
                      style={{ backgroundColor: cellColor(totalTests, passRate) }}
                      onMouseEnter={(event) => {
                        const rect = (event.target as HTMLElement).getBoundingClientRect();
                        const containerRect = event.currentTarget.closest('.card')!.getBoundingClientRect();
                        setTooltip({
                          x: rect.left - containerRect.left + rect.width / 2,
                          y: rect.top - containerRect.top,
                          module,
                          date,
                          totalTests,
                          passedTests,
                          passRate,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
        >
          <p className="font-semibold text-neutral-900">{tooltip.module}</p>
          <p className="text-neutral-600">{tooltip.date}</p>
          {tooltip.totalTests > 0 ? (
            <p className="mt-1 text-neutral-700">
              {tooltip.passedTests}/{tooltip.totalTests} passed ({tooltip.passRate.toFixed(1)}%)
            </p>
          ) : (
            <p className="mt-1 text-neutral-500">No runs</p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-neutral-100 pt-4">
        {LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-neutral-600">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
