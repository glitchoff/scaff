import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { emptyConfig, isValidZoneName, loadConfig, saveConfig } from '../core/registry/store.js';

let tmp: string;
let configPath: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scaff-store-'));
  configPath = path.join(tmp, 'config.json');
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('store', () => {
  it('loads an empty config when no file exists', () => {
    expect(loadConfig(configPath)).toEqual({ version: 3, hot: null, zones: {} });
  });

  it('round-trips a config', () => {
    const cfg = { version: 3, hot: 'hot', zones: { hot: '/a', work: '/c' } };
    saveConfig(configPath, cfg);
    expect(loadConfig(configPath)).toEqual(cfg);
  });

  it('returns empty config on corrupt json', () => {
    fs.writeFileSync(configPath, 'not json{', 'utf8');
    expect(loadConfig(configPath)).toEqual(emptyConfig());
  });

  it('drops invalid zone names and empty dirs on load', () => {
    const bad = { version: 3, hot: 'hot', zones: { '-bad': '/x', hot: '' } };
    saveConfig(configPath, bad as never);
    const cfg = loadConfig(configPath);
    expect(cfg.zones['-bad']).toBeUndefined();
    expect(cfg.zones['hot']).toBeUndefined();
    expect(cfg.hot).toBeNull();
  });

  it('validates zone names', () => {
    expect(isValidZoneName('hot')).toBe(true);
    expect(isValidZoneName('-bad')).toBe(false);
    expect(isValidZoneName('a:b')).toBe(false);
    expect(isValidZoneName('')).toBe(false);
  });
});
