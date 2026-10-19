// Small dependency-free SVG charts for the design preview.
export const AreaChart = ({ data, color = '#138653', height = 180 }) => {
  const w = 600, h = height, pad = { l: 36, r: 8, t: 10, b: 24 };
  const max = Math.ceil(Math.max(...data.map((d) => d.v)) / 100) * 100;
  const x = (i) => pad.l + (i * (w - pad.l - pad.r)) / (data.length - 1);
  const y = (v) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.v)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${h - pad.b} L${x(0)},${h - pad.b} Z`;
  const ticks = [0, max / 2, max];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Attendance trend, demo data">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="#E2E8F0" />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748B">{t}</text>
        </g>
      ))}
      <path d={area} fill={color} opacity="0.1" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.label}>
          <circle cx={x(i)} cy={y(d.v)} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />
          <text x={x(i)} y={h - 6} textAnchor="middle" fontSize="11" fill="#64748B">{d.label}</text>
        </g>
      ))}
    </svg>
  );
};

export const Donut = ({ parts, size = 150, label, sub }) => {
  const total = parts.reduce((a, p) => a + p.v, 0);
  const r = 52, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={`${label} ${sub}`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF2F6" strokeWidth="16" />
      {parts.map((p) => {
        const len = (p.v / total) * c;
        const el = (
          <circle key={p.name} cx="70" cy="70" r={r} fill="none" stroke={p.color} strokeWidth="16"
            strokeDasharray={`${len - 2} ${c - len + 2}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />
        );
        offset += len;
        return el;
      })}
      <text x="70" y="68" textAnchor="middle" fontSize="20" fontWeight="700" fill="#17212B">{label}</text>
      <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#64748B">{sub}</text>
    </svg>
  );
};

export const Bars = ({ data, color = '#278FC5' }) => (
  <div className="space-y-3">
    {data.map((d) => (
      <div key={d.label} className="flex items-center gap-3 text-sm">
        <span className="w-20 shrink-0 text-brand-muted">{d.label}</span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full" style={{ width: `${(d.v / d.total) * 100}%`, background: color }} />
        </div>
        <span className="w-10 text-right font-semibold tabular-nums text-brand-dark">{d.v}%</span>
      </div>
    ))}
  </div>
);
