import { describe, expect, it } from 'vitest';
import { scaleChart, type ChartBox } from './chart-scale';

const box: ChartBox = { width: 200, height: 100, left: 20, right: 10, top: 10, bottom: 20 };

describe('scaleChart', () => {
  it('draws nothing for an empty series', () => {
    expect(scaleChart([], [{ day: '2026-11-01', label: 'x' }], box)).toBeNull();
  });

  it('puts 0% at the bottom and 100% at the top of the plot area', () => {
    const chart = scaleChart([{ day: '2026-11-01', value: 0 }, { day: '2026-11-03', value: 1 }], [], box)!;
    expect(chart.yAxis).toEqual({ zero: 80, half: 45, full: 10 });
    expect(chart.points.map((p) => p.y)).toEqual([80, 10]);
    expect(chart.points.map((p) => p.x)).toEqual([20, 190]);
  });

  it('spaces points by calendar days, so a gap is not a zero', () => {
    const chart = scaleChart(
      [{ day: '2026-11-01', value: 0.5 }, { day: '2026-11-02', value: 0.5 }, { day: '2026-11-11', value: 0.5 }],
      [],
      box,
    )!;
    expect(chart.points).toHaveLength(3);
    expect(chart.points.map((p) => p.x)).toEqual([20, 37, 190]);
    expect(chart.points.every((p) => p.y === 45)).toBe(true);
  });

  it('centers a single day and clamps values', () => {
    const chart = scaleChart([{ day: '2026-11-01', value: 1.4 }], [], box)!;
    expect(chart.points[0]).toMatchObject({ x: 105, y: 10, value: 1 });
  });

  it('sorts unordered input and stretches the range to a later marker', () => {
    const chart = scaleChart(
      [{ day: '2026-11-03', value: 0.2 }, { day: '2026-11-01', value: 0.8 }],
      [{ day: '2026-11-05', label: 'Prova' }],
      box,
    )!;
    expect(chart.firstDay).toBe('2026-11-01');
    expect(chart.lastDay).toBe('2026-11-05');
    expect(chart.points.map((p) => p.day)).toEqual(['2026-11-01', '2026-11-03']);
    expect(chart.points[1].x).toBe(105);
    expect(chart.markers).toEqual([{ x: 190, label: 'Prova', day: '2026-11-05' }]);
  });
});
