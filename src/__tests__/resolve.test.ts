import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Config } from '../core/registry/types.js';
import { listProjects, resolveToken, ResolveError } from '../core/resolve/index.js';

let tmp: string;
let cfg: Config;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scaff-resolve-'));
  cfg = { version: 1, primary: 'hot', zones: { hot: [], work: [] } };
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function zoneDir(name: string, zone = 'hot'): string {
  const d = path.join(tmp, zone, name);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

describe('resolveToken (bare = primary zone only)', () => {
  it('resolves a bare name in the primary zone', () => {
    const p = zoneDir('app');
    cfg.zones['hot'] = [path.join(tmp, 'hot')];
    const [m] = resolveToken(cfg, 'app');
    expect(m?.path).toBe(p);
    expect(m?.zone).toBe('hot');
  });

  it('does NOT resolve a bare name that only exists in a non-primary zone', () => {
    zoneDir('only-work', 'work');
    cfg.zones['work'] = [path.join(tmp, 'work')];
    expect(resolveToken(cfg, 'only-work')).toEqual([]);
  });

  it('throws when no primary zone is set', () => {
    cfg.primary = null;
    expect(() => resolveToken(cfg, 'app')).toThrowError(ResolveError);
  });

  it('matches case-insensitively but returns the real path', () => {
    const p = zoneDir('MyApp');
    cfg.zones['hot'] = [path.join(tmp, 'hot')];
    const [m] = resolveToken(cfg, 'myapp');
    expect(m?.path).toBe(p);
    expect(m?.name).toBe('MyApp');
  });

  it('returns multiple matches when a name exists in 2 primary dirs', () => {
    zoneDir('dup');
    zoneDir('dup', 'work');
    cfg.zones['hot'] = [path.join(tmp, 'hot'), path.join(tmp, 'work')];
    expect(resolveToken(cfg, 'dup')).toHaveLength(2);
  });

  it('throws for an unknown zone in explicit addressing', () => {
    cfg.zones['hot'] = [path.join(tmp, 'hot')];
    expect(() => resolveToken(cfg, 'nope:app')).toThrowError(ResolveError);
  });

  it('resolves an explicit zone:name', () => {
    const p = zoneDir('site', 'work');
    cfg.zones['work'] = [path.join(tmp, 'work')];
    const [m] = resolveToken(cfg, 'work:site');
    expect(m?.path).toBe(p);
    expect(m?.zone).toBe('work');
  });
});

describe('listProjects', () => {
  it('skips dot-prefixed dirs by default', () => {
    zoneDir('.hidden');
    zoneDir('visible');
    cfg.zones['hot'] = [path.join(tmp, 'hot')];
    const names = listProjects(cfg).map((p) => p.name);
    expect(names).toEqual(['visible']);
  });

  it('includes dot-dirs with includeDot', () => {
    zoneDir('.hidden');
    zoneDir('visible');
    cfg.zones['hot'] = [path.join(tmp, 'hot')];
    const names = listProjects(cfg, { includeDot: true }).map((p) => p.name).sort();
    expect(names).toEqual(['.hidden', 'visible']);
  });

  it('filters by zone', () => {
    zoneDir('a');
    zoneDir('b', 'work');
    cfg.zones['hot'] = [path.join(tmp, 'hot')];
    cfg.zones['work'] = [path.join(tmp, 'work')];
    const projects = listProjects(cfg, { zone: 'work' });
    expect(projects).toHaveLength(1);
    expect(projects[0]!.zone).toBe('work');
  });
});