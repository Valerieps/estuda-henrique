import { strings } from '../../domain/strings';
import { scaleChart, type ChartBox, type ChartMarker, type ChartPoint } from './chart-scale';
import './LineChart.css';

/** Drawing units of the viewBox; the SVG scales to the width of its container. */
const BOX: ChartBox = { width: 320, height: 180, left: 44, right: 16, top: 16, bottom: 32 };

interface Props {
  /** Mastery 0 to 1 per day; the chart sorts it. */
  readonly points: readonly ChartPoint[];
  readonly markers?: readonly ChartMarker[];
  /** What the chart shows, for the screen reader ("Domínio de Citologia ao longo do tempo"). */
  readonly label: string;
}

/** "2026-11-05" as "05/11". */
function shortDay(day: string): string {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
}

/** A line of mastery over time with optional vertical markers (ADR-013). Nothing for an empty series. */
export function LineChart({ points, markers = [], label }: Props) {
  const chart = scaleChart(points, markers, BOX);
  if (!chart) return null;
  const lastPoint = chart.points[chart.points.length - 1];
  const description = `${label}. ${strings.chart.summary(shortDay(chart.firstDay), shortDay(chart.lastDay), Math.round(lastPoint.value * 100))}`;
  const path = chart.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const plotLeft = BOX.left;
  const plotRight = BOX.width - BOX.right;
  const dayLabelY = BOX.height - BOX.bottom / 2;
  return (
    <svg className="line-chart" viewBox={`0 0 ${BOX.width} ${BOX.height}`} role="img" aria-label={description}>
      {[
        { y: chart.yAxis.full, text: '100%' },
        { y: chart.yAxis.half, text: '50%' },
        { y: chart.yAxis.zero, text: '0%' },
      ].map((tick) => (
        <g key={tick.text}>
          <line className="line-chart-grid" x1={plotLeft} x2={plotRight} y1={tick.y} y2={tick.y} />
          <text className="line-chart-label" x={plotLeft - 6} y={tick.y} textAnchor="end" dominantBaseline="middle">
            {tick.text}
          </text>
        </g>
      ))}
      {chart.markers.map((m) => (
        <g key={`${m.day}-${m.label}`}>
          <line className="line-chart-marker" x1={m.x} x2={m.x} y1={chart.yAxis.full} y2={chart.yAxis.zero} />
          <text className="line-chart-label" x={m.x} y={chart.yAxis.full - 4} textAnchor="middle">
            {m.label}
          </text>
        </g>
      ))}
      <path className="line-chart-line" d={path} />
      {chart.points.map((p) => (
        <circle key={p.day} className="line-chart-dot" cx={p.x} cy={p.y} r="3" />
      ))}
      <text className="line-chart-label" x={plotLeft} y={dayLabelY} textAnchor="start">
        {shortDay(chart.firstDay)}
      </text>
      <text className="line-chart-label" x={plotRight} y={dayLabelY} textAnchor="end">
        {shortDay(chart.lastDay)}
      </text>
    </svg>
  );
}
