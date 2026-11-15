// The math of LineChart (ADR-013): series and markers to SVG coordinates. Pure, so it is tested
// without a DOM. A day is a string "YYYY-MM-DD"; x is proportional to the calendar, so a gap of
// days with no snapshot is a longer stretch of the line, never a point at zero.
import { daysBetween } from '../../domain/study/diagnostic';

export interface ChartPoint {
  readonly day: string;
  /** 0 to 1. */
  readonly value: number;
}

export interface ChartMarker {
  readonly day: string;
  readonly label: string;
}

/** The drawing box in viewBox units, and the room left for the axes' labels. */
export interface ChartBox {
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface ScaledChart {
  readonly points: readonly { x: number; y: number; day: string; value: number }[];
  /** The markers with the x of their vertical line. */
  readonly markers: readonly { x: number; label: string; day: string }[];
  /** y of 0%, 50% and 100%. */
  readonly yAxis: { readonly zero: number; readonly half: number; readonly full: number };
  readonly firstDay: string;
  readonly lastDay: string;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Maps the series to the box. The x range runs from the earliest to the latest day among points
 * and markers, so an exam date after the last snapshot still fits. Returns null with nothing to draw.
 */
export function scaleChart(series: readonly ChartPoint[], markers: readonly ChartMarker[], box: ChartBox): ScaledChart | null {
  if (series.length === 0) return null;
  const sorted = [...series].sort((a, b) => a.day.localeCompare(b.day));
  const days = [...sorted.map((p) => p.day), ...markers.map((m) => m.day)].sort();
  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  const span = daysBetween(firstDay, lastDay);
  const innerWidth = box.width - box.left - box.right;
  const innerHeight = box.height - box.top - box.bottom;
  // A single day sits in the middle.
  const x = (day: string) => box.left + (span === 0 ? innerWidth / 2 : (daysBetween(firstDay, day) / span) * innerWidth);
  const y = (value: number) => box.top + (1 - clamp01(value)) * innerHeight;
  return {
    points: sorted.map((p) => ({ x: x(p.day), y: y(p.value), day: p.day, value: clamp01(p.value) })),
    markers: [...markers].sort((a, b) => a.day.localeCompare(b.day)).map((m) => ({ x: x(m.day), label: m.label, day: m.day })),
    yAxis: { zero: y(0), half: y(0.5), full: y(1) },
    firstDay,
    lastDay,
  };
}
