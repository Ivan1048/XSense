import { useId } from 'react';

export interface ChartPoint { seconds: number; value: number | null; label: string }
export default function EvidenceChart({ title, unit, points, minimumMax = 1 }: {
  title: string; unit: string; points: ChartPoint[]; minimumMax?: number;
}) {
  const id = useId();
  if (points.length < 2) return <p className="system-explanation">{title}: at least two captured samples are needed.</p>;
  const maxX = Math.max(1, ...points.map(point => point.seconds));
  const maxY = Math.max(minimumMax, ...points.map(point => point.value ?? 0)) * 1.1;
  const x = (time: number) => 62 + time / maxX * 614;
  const y = (value: number) => 180 - value / maxY * 148;
  let path = '';
  let connected = false;
  for (const point of points) {
    if (point.value === null) { connected = false; continue; }
    path += `${connected ? 'L' : 'M'}${x(point.seconds)},${y(point.value)} `;
    connected = true;
  }
  const transitions = points.filter((point, index) => index > 0 && point.label !== points[index - 1].label);
  return <figure className="evidence-chart">
    <figcaption>{title} ({unit})</figcaption>
    <svg viewBox="0 0 710 230" role="img" aria-labelledby={id}>
      <title id={id}>{title} against elapsed seconds. Sampled simulation values; gaps indicate unavailable measurements.</title>
      {[0, maxY / 2, maxY].map(value => <g key={value}>
        <line x1="62" x2="676" y1={y(value)} y2={y(value)} className="evidence-gridline" />
        <text x="52" y={y(value) + 5} textAnchor="end">{value.toFixed(1)}</text>
      </g>)}
      {[0, maxX / 2, maxX].map(time => <text key={time} x={x(time)} y="204" textAnchor="middle">{time.toFixed(1)} s</text>)}
      {transitions.map(point => <line key={point.seconds} x1={x(point.seconds)} x2={x(point.seconds)} y1="32" y2="180" className="evidence-eventline"><title>{point.label} at {point.seconds.toFixed(1)} seconds</title></line>)}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="3" />
      {points.filter(point => point.value !== null).map(point => <circle key={point.seconds} cx={x(point.seconds)} cy={y(point.value!)} r="2.5" fill="var(--accent)"><title>{point.seconds.toFixed(1)} s: {point.value!.toFixed(2)} {unit} · {point.label}</title></circle>)}
    </svg>
    {transitions.length > 0 && <p className="system-explanation">Action changes: {transitions.slice(0, 6).map(point => `${point.seconds.toFixed(1)} s — ${point.label.replace(/_/g, ' ')}`).join('; ')}{transitions.length > 6 ? '; more changes in sample data' : ''}.</p>}
  </figure>;
}
