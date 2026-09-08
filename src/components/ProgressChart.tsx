import React, { useMemo } from 'react';

export interface ProgressChartPoint {
  date: string;
  value: number;
}

interface ProgressChartProps {
  points: ProgressChartPoint[];
  metricLabel: string;
  title?: string;
  testid?: string;
}

// Responsive SVG line chart of a single-exercise history. The caller supplies
// chronologically ordered points. Handles a single point (drawn centred) and
// stays purely presentational: it never computes progression metrics, so it can
// be reused by any page without overlapping the LOT D analysis engine.
export const ProgressChart: React.FC<ProgressChartProps> = ({ points, metricLabel, title, testid }) => {
  const model = useMemo(() => {
    const clean = points.filter((p) => Number.isFinite(p.value));
    if (clean.length === 0) return null;
    const values = clean.map((p) => p.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    let min = rawMin;
    let max = rawMax;
    if (max === min) {
      min = max - 10;
      max = max + 10;
    }
    const pad = (max - min) * 0.15 || 5;
    return { clean, min, max, pad };
  }, [points]);

  if (!model) {
    return (
      <div className="pt-1 text-center py-6 rounded-2xl bg-white/5 border border-white/5 text-xs text-zinc-500" data-testid={testid || 'progress-chart'}>
        Pas encore de courbe.
      </div>
    );
  }

  const W = 640;
  const H = 180;
  const PAD_X = 42;
  const PAD_TOP = 22;
  const PAD_BOTTOM = 34;

  const xFor = (i: number) =>
    model.clean.length === 1 ? W / 2 : PAD_X + (i * (W - 2 * PAD_X)) / (model.clean.length - 1);
  const yFor = (v: number) =>
    PAD_TOP + ((model.max + model.pad - v) * (H - PAD_TOP - PAD_BOTTOM)) / (model.max + model.pad - (model.min - model.pad));

  const coords = model.clean.map((p, i) => ({ x: xFor(i), y: yFor(p.value), p }));
  const linePath = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const shortDate = (d: string) => {
    const dd = new Date(d);
    if (isNaN(dd.getTime())) return d;
    return `${dd.getDate()}/${dd.getMonth() + 1}`;
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4" data-testid={testid || 'progress-chart'}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-violet-300">
          {title || `Courbe — ${metricLabel}`}
        </span>
        <span className="text-[11px] text-zinc-400">
          {model.clean.length} séance{model.clean.length > 1 ? 's' : ''}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Courbe de progression (${metricLabel})`}
      >
        <line x1={PAD_X} y1={H - PAD_BOTTOM} x2={W - PAD_X} y2={H - PAD_BOTTOM} className="stroke-white/15" strokeWidth="1" />
        <line x1={PAD_X} y1={PAD_TOP} x2={PAD_X} y2={H - PAD_BOTTOM} className="stroke-white/15" strokeWidth="1" />
        <text x={PAD_X - 6} y={yFor(model.max + model.pad) + 0} className="fill-zinc-500" fontSize="10" textAnchor="end">
          {Math.round(model.max + model.pad)}
        </text>
        <text x={PAD_X - 6} y={yFor(model.min - model.pad)} className="fill-zinc-500" fontSize="10" textAnchor="end">
          {Math.round(model.min - model.pad)}
        </text>
        {model.clean.length > 1 && (
          <polyline
            points={linePath}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-violet-400"
          />
        )}
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={model.clean.length === 1 ? 5 : 3.5} className="fill-violet-400 stroke-[#12121a] stroke-2" />
            <text x={c.x} y={Math.max(PAD_TOP - 2, c.y - 8)} className="fill-zinc-300" fontSize="10" textAnchor="middle">
              {Number.isInteger(c.p.value) ? c.p.value : c.p.value.toFixed(1)}
            </text>
            {model.clean.length > 1 && (
              <text x={c.x} y={H - 12} className="fill-zinc-500" fontSize="9" textAnchor="middle">
                {shortDate(c.p.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};