import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The visual rules of docs/UI.md that a machine can check. Every color, size, weight, line height
 * and duration lives in tokens.css; a literal anywhere else is how screens drift apart, so the
 * build refuses it. The type scale keeps its rhythm and every text color pair passes WCAG AA,
 * in both themes.
 *
 * A failure here lists "file:line: text". Fix it with a token (add one to tokens.css if none
 * fits), never by loosening the test.
 */

const SRC = join(__dirname, '..', '..');
const TOKENS = join(__dirname, 'tokens.css');

function files(dir: string, pattern: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path, pattern);
    return pattern.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const read = (path: string) => readFileSync(path, 'utf8');
// Comments keep their line breaks, so line numbers stay right.
const withoutComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ''));

const stylesheets = files(SRC, /\.css$/).filter((path) => path !== TOKENS);
const components = files(join(SRC, 'ui'), /\.tsx?$/);

/** The lines that break a rule, as "file:line: text". Media queries may hold breakpoints. */
function offending(paths: string[], breaks: (line: string) => boolean): string[] {
  return paths.flatMap((path) =>
    withoutComments(read(path))
      .split('\n')
      .flatMap((line, index) =>
        breaks(line) && !line.trimStart().startsWith('@media') ? [`${relative(SRC, path)}:${index + 1}: ${line.trim()}`] : [],
      ),
  );
}

const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|:\s*[^;]*\b(white|black)\b/;
const LENGTH = /(?<![\w-])\d*\.?\d+(px|rem|em|pt)\b/;
const DURATION = /(?<![\w-])(\d*\.?\d+)(ms|s)\b/g;

/** "--name: value;" pairs of the first `:root {` block after `from`. */
function declarations(css: string, from = 0): Map<string, string> {
  const start = css.indexOf(':root {', from);
  const body = css.slice(start, css.indexOf('}', start));
  return new Map([...withoutComments(body).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const tokensCss = read(TOKENS);
const light = declarations(tokensCss);
const dark = declarations(tokensCss, tokensCss.indexOf('@media (prefers-color-scheme: dark)'));

describe('no literals outside tokens.css', () => {
  it('keeps colors out of the stylesheets and components', () => {
    expect(offending([...stylesheets, ...components], (line) => COLOR.test(line))).toEqual([]);
  });

  it('keeps lengths out of the stylesheets and components', () => {
    expect(offending([...stylesheets, ...components], (line) => LENGTH.test(line))).toEqual([]);
  });

  it('keeps numbers out of inline styles, except percentages', () => {
    const numeric = /:\s*['"`]?-?\d*\.?[1-9]/;
    const percentage = /\d%['"`]?$/;
    const found = components.flatMap((path) =>
      [...read(path).matchAll(/style=\{\{([\s\S]*?)\}\}/g)]
        .filter((m) => m[1].split(',').some((entry) => numeric.test(entry) && !percentage.test(entry.trim())))
        .map((m) => `${relative(SRC, path)}: style={{${m[1].trim()}}}`),
    );
    expect(found).toEqual([]);
  });

  it('keeps durations out of the stylesheets, except 0s', () => {
    const breaks = (line: string) => [...line.matchAll(DURATION)].some((m) => Number(m[1]) !== 0);
    expect(offending(stylesheets, breaks)).toEqual([]);
  });

  it('takes font sizes, weights and line heights only from the scale', () => {
    const rule = /\b(font-size|font-weight|line-height)\s*:(?!\s*var\(--(font-size|font-weight|line-height)-)(?!\s*inherit)/;
    const shorthand = /\bfont\s*:(?!\s*inherit)/;
    expect(offending(stylesheets, (line) => rule.test(line) || shorthand.test(line))).toEqual([]);
  });

  it('uses only tokens that exist', () => {
    const sources = [...stylesheets, ...components, TOKENS].map(read).join('\n');
    // Custom properties a stylesheet or component sets for itself also count as defined.
    const defined = new Set([...sources.matchAll(/['"]?(--[\w-]+)['"]?\s*:/g)].map((m) => m[1]));
    const used = offending([...stylesheets, ...components], (line) =>
      [...line.matchAll(/var\(\s*(--[\w-]+)/g)].some((m) => !defined.has(m[1])),
    );
    expect(used).toEqual([]);
  });
});

function px(value: string): number {
  const match = /^(\d*\.?\d+)(px|rem)$/.exec(value);
  if (!match) throw new Error(`Expected px or rem, got ${value}`);
  return Number(match[1]) * (match[2] === 'rem' ? 16 : 1);
}

describe('the scales in tokens.css', () => {
  const fontSizes = [...light].filter(([name]) => name.startsWith('--font-size-')).map(([name, value]) => [name, px(value)] as const);

  // Display sizes (a hero number, a splash title) may leap: they stand alone, not in running text.
  it('lists the font sizes from small to large, each 1.125 to 1.5 times the one before (display sizes may leap more)', () => {
    expect(fontSizes.length).toBeGreaterThanOrEqual(4);
    const jumps = fontSizes.slice(1).map(([name, size], i) => [name, Number((size / fontSizes[i][1]).toFixed(3))] as const);
    for (const [name, ratio] of jumps) {
      expect(ratio, `${name} is ${ratio}x the size before it`).toBeGreaterThanOrEqual(1.125);
      if (!name.startsWith('--font-size-display')) expect(ratio, `${name} is ${ratio}x the size before it`).toBeLessThanOrEqual(1.5);
    }
  });

  it('never goes below 12px, and the body text is at least 16px', () => {
    for (const [name, size] of fontSizes) expect(size, name).toBeGreaterThanOrEqual(12);
    expect(px(light.get('--font-size-body')!)).toBeGreaterThanOrEqual(16);
  });

  it('keeps spacing on the 4px grid', () => {
    for (const [name, value] of light) {
      if (name.startsWith('--space-')) expect(px(value) % 4, `${name}: ${value}`).toBe(0);
    }
  });

  it('keeps touch targets at least 44px', () => {
    expect(px(light.get('--size-touch')!)).toBeGreaterThanOrEqual(44);
  });
});

function luminance(hex: string): number {
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Every pair of colors the UI puts one on top of the other. A new color token that carries text
 * or marks a control goes here too. Text needs 4.5:1 (WCAG 1.4.3); edges of controls, focus rings
 * and icons need 3:1 (WCAG 1.4.11).
 */
const TEXT_PAIRS = [
  ['--color-text', '--color-bg'],
  ['--color-text', '--color-surface'],
  ['--color-text-muted', '--color-bg'],
  ['--color-text-muted', '--color-surface'],
  ['--color-brand', '--color-bg'],
  ['--color-brand', '--color-surface'],
  ['--color-on-brand', '--color-brand'],
  ['--color-text', '--color-brand-soft'],
  ['--color-text-muted', '--color-brand-soft'],
  ['--color-brand', '--color-brand-soft'],
  ['--color-danger', '--color-brand-soft'],
  ['--color-success', '--color-brand-soft'],
  ['--color-danger', '--color-bg'],
  ['--color-danger', '--color-surface'],
  ['--color-on-danger', '--color-danger'],
  ['--color-success', '--color-bg'],
  ['--color-success', '--color-surface'],
] as const;

const NON_TEXT_PAIRS = [
  ['--color-border-strong', '--color-bg'],
  ['--color-border-strong', '--color-surface'],
  ['--color-focus', '--color-bg'],
  ['--color-focus', '--color-surface'],
] as const;

describe.each([
  ['light', light],
  ['dark', dark],
])('the %s theme', (_, theme) => {
  const color = (name: string) => {
    const value = theme.get(name);
    if (!value || !/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(value)) throw new Error(`${name} must be a hex color, got ${value}`);
    return value;
  };

  it.each(TEXT_PAIRS)('%s on %s is readable as text (4.5:1)', (fg, bg) => {
    expect(contrast(color(fg), color(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT_PAIRS)('%s on %s is visible (3:1)', (fg, bg) => {
    expect(contrast(color(fg), color(bg))).toBeGreaterThanOrEqual(3);
  });
});

describe('the dark theme', () => {
  it('redefines every color of the light theme', () => {
    const colors = [...light.keys()].filter((name) => name.startsWith('--color-'));
    expect(colors.filter((name) => !dark.has(name))).toEqual([]);
  });
});
