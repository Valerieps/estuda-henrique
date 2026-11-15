# ADR-013: Charts as hand-written SVG components

**Status:** Accepted
**Date:** 2026-11-15
**Decision:** Phase 2 charts (the topic's mastery over time with exam markers, the weekly summary)
are React components in `src/ui/components/` that draw inline SVG (`LineChart`), like the
thermometer's sparkline in `Today.tsx`. Scales and point math live in a pure, tested helper
(`src/ui/components/chart-scale.ts`); colors, strokes and sizes come from tokens in
`src/ui/theme/tokens.css`. No chart library.
**Why:** ADR-001 keeps dependencies minimal; the charts needed are one line with markers on a
small phone screen. A library would add weight and its own colors that the token test cannot check.
**Alternatives:** Recharts, Chart.js, uPlot: more features than needed, tens of KB, styling outside
the tokens.
