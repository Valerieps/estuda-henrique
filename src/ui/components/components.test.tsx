import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
import { Chip } from './Chip';
import { Hero } from './Hero';
import { Icon } from './Icon';
import { ProgressBar } from './ProgressBar';
import { StateBadge } from './StateBadge';
import { Tile } from './Tile';

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe('ProgressBar', () => {
  it('always shows the number and exposes it to assistive tech', () => {
    const out = html(<ProgressBar value={3} max={20} label="Revisões de hoje" />);
    expect(out).toContain('3 de 20');
    expect(out).toContain('role="progressbar"');
    expect(out).toContain('aria-valuenow="3"');
    expect(out).toContain('aria-valuemax="20"');
    expect(out).toContain('aria-label="Revisões de hoje"');
    expect(out).toContain('width:15%');
  });

  it('keeps the value inside the range and survives an empty goal', () => {
    expect(html(<ProgressBar value={30} max={20} label="x" />)).toContain('aria-valuenow="20"');
    expect(html(<ProgressBar value={-2} max={20} label="x" />)).toContain('aria-valuenow="0"');
    expect(html(<ProgressBar value={0} max={0} label="x" />)).toContain('0 de 0');
  });
});

describe('StateBadge', () => {
  it.each([
    ['new', 'Novo'],
    ['weak', 'Fraco'],
    ['progress', 'Em andamento'],
    ['mastered', 'Dominado'],
  ] as const)('shows %s with its name and an icon', (state, name) => {
    const out = html(<StateBadge state={state} />);
    expect(out).toContain(name);
    expect(out).toContain(`data-state="${state}"`);
    expect(out).toContain('<svg');
  });
});

describe('Tile', () => {
  it('shows icon, title, support and tone', () => {
    const out = html(<Tile icon="target" title="Citologia" support="3 de 10 vistas" tone="weak" />);
    expect(out).toContain('Citologia');
    expect(out).toContain('3 de 10 vistas');
    expect(out).toContain('data-tone="weak"');
    expect(out).toContain('<svg');
  });

  it('is a link when it has a destination', () => {
    expect(html(<Tile title="Genética" to="/topico/x" />)).toContain('href="/topico/x"');
  });
});

describe('Chip', () => {
  it('is plain text unless tappable', () => {
    expect(html(<Chip icon="flame">3 dias</Chip>)).toContain('<span class="chip">');
    const tappable = html(<Chip onClick={() => {}} pressed>Fracos</Chip>);
    expect(tappable).toContain('<button');
    expect(tappable).toContain('aria-pressed="true"');
  });
});

describe('Hero', () => {
  it('holds the screen highlight', () => {
    const out = html(<Hero title="Missões de hoje" icon="flame">corpo</Hero>);
    expect(out).toContain('Missões de hoje');
    expect(out).toContain('corpo');
  });
});

describe('Button', () => {
  it('says why it is disabled', () => {
    const out = html(<Button disabled disabledReason="Escolha um tópico">Começar</Button>);
    expect(out).toContain('Escolha um tópico');
    expect(out).toContain('aria-describedby');
  });

  it('shows no reason while enabled, and no wrapper without one', () => {
    expect(html(<Button disabledReason="Escolha um tópico">Começar</Button>)).not.toContain('Escolha');
    expect(html(<Button disabled>Começar</Button>)).not.toContain('button-reason');
  });
});

describe('Icon', () => {
  it.each(['flame', 'crown', 'alert', 'sparkle', 'check', 'target'] as const)('draws %s', (name) => {
    expect(html(<Icon name={name} />)).toMatch(/<(path|circle)/);
  });
});

describe('docs/UI.md rules a machine can check', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : /\.tsx$/.test(name) && !/\.test\./.test(name) ? [path] : [];
    });

  it('draws every progress bar through ProgressBar, which always shows its number', () => {
    // The study session's own bar predates ProgressBar; its redesign (S4 of docs/rascunhos/gamificacao.md)
    // moves it to the component and removes this exception.
    const exceptions = ['ProgressBar.tsx', 'Study.tsx'];
    const outside = walk(join(__dirname, '..')).filter(
      (path) => !exceptions.some((name) => path.endsWith(name)) && readFileSync(path, 'utf8').includes('role="progressbar"'),
    );
    expect(outside).toEqual([]);
  });
});
