import { describe, expect, it } from 'vitest';
import { fuzzyMatches, fuzzyScore } from '../core/pick/index.js';
import type { Project } from '../core/resolve/index.js';

function p(name: string): Project {
  return { zone: 'hot', name, path: '/x/' + name };
}

describe('fuzzyScore', () => {
  it('favours substring matches over subsequences', () => {
    expect(fuzzyScore('app', 'my-app')).toBeGreaterThan(fuzzyScore('app', 'a-p-p'));
  });

  it('scores 0 when no subsequence match', () => {
    expect(fuzzyScore('zzz', 'app')).toBe(-1);
  });
});

describe('fuzzyMatches', () => {
  it('returns only matching projects, best first', () => {
    const matches = fuzzyMatches('rct', [p('react'), p('rector'), p('solid')]);
    expect(matches.map((m) => m.name)).toEqual(['react', 'rector']);
  });
});