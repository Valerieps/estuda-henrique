import { describe, expect, it } from 'vitest';
import { fittedSize } from './image-upload';

describe('fittedSize', () => {
  it('shrinks the longest side to 1600, keeping the proportion', () => {
    expect(fittedSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fittedSize(3000, 6000)).toEqual({ width: 800, height: 1600 });
  });
  it('never enlarges', () => {
    expect(fittedSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
