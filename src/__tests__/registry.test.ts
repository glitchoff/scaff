import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addZone, listZones, readRegistry, removeZone } from '../registry/index.js';

// ---------------------------------------------------------------------------
// Test fixture — isolated tmp directory per test
// ---------------------------------------------------------------------------

let tmpDir: string;
let registryPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaff-test-'));
  registryPath = path.join(tmpDir, 'registry.json');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// readRegistry
// ---------------------------------------------------------------------------

describe('readRegistry', () => {
  it('returns an empty registry when the file does not exist', () => {
    const registry = readRegistry(registryPath);
    expect(registry).toEqual({ zones: {} });
  });

  it('returns an empty registry when the file is corrupt JSON', () => {
    fs.writeFileSync(registryPath, '{ invalid json }', 'utf8');
    const registry = readRegistry(registryPath);
    expect(registry).toEqual({ zones: {} });
  });

  it('returns an empty registry when the file has unexpected shape', () => {
    fs.writeFileSync(registryPath, JSON.stringify({ notZones: {} }), 'utf8');
    const registry = readRegistry(registryPath);
    expect(registry).toEqual({ zones: {} });
  });

  it('reads a valid registry correctly', () => {
    const data = { zones: { myzone: '/some/path' } };
    fs.mkdirSync(path.dirname(registryPath), { recursive: true });
    fs.writeFileSync(registryPath, JSON.stringify(data), 'utf8');
    const registry = readRegistry(registryPath);
    expect(registry.zones['myzone']).toBe('/some/path');
  });
});

// ---------------------------------------------------------------------------
// addZone
// ---------------------------------------------------------------------------

describe('addZone', () => {
  it('creates the registry file and persists the zone', () => {
    addZone(registryPath, 'hot', '/projects/hot');
    const registry = readRegistry(registryPath);
    expect(registry.zones['hot']).toBe('/projects/hot');
  });

  it('can add multiple zones', () => {
    addZone(registryPath, 'hot', '/projects/hot');
    addZone(registryPath, 'cool', '/projects/cool');
    const registry = readRegistry(registryPath);
    expect(Object.keys(registry.zones)).toHaveLength(2);
    expect(registry.zones['cool']).toBe('/projects/cool');
  });

  it('overwrites a zone with the same name', () => {
    addZone(registryPath, 'hot', '/projects/old');
    addZone(registryPath, 'hot', '/projects/new');
    const registry = readRegistry(registryPath);
    expect(registry.zones['hot']).toBe('/projects/new');
    expect(Object.keys(registry.zones)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// removeZone
// ---------------------------------------------------------------------------

describe('removeZone', () => {
  it('removes a registered zone', () => {
    addZone(registryPath, 'hot', '/projects/hot');
    removeZone(registryPath, 'hot');
    const registry = readRegistry(registryPath);
    expect(registry.zones['hot']).toBeUndefined();
  });

  it('throws when the zone does not exist', () => {
    expect(() => removeZone(registryPath, 'nonexistent')).toThrow(
      /Zone "nonexistent" is not registered/,
    );
  });

  it('does not affect other zones when removing one', () => {
    addZone(registryPath, 'hot', '/projects/hot');
    addZone(registryPath, 'cool', '/projects/cool');
    removeZone(registryPath, 'hot');
    const zones = listZones(registryPath);
    expect(zones).toHaveLength(1);
    expect(zones[0]!.name).toBe('cool');
  });
});

// ---------------------------------------------------------------------------
// listZones
// ---------------------------------------------------------------------------

describe('listZones', () => {
  it('returns an empty array when no zones are registered', () => {
    expect(listZones(registryPath)).toEqual([]);
  });

  it('returns all zones sorted by name', () => {
    addZone(registryPath, 'zebra', '/z');
    addZone(registryPath, 'alpha', '/a');
    addZone(registryPath, 'mango', '/m');
    const zones = listZones(registryPath);
    expect(zones.map((z) => z.name)).toEqual(['alpha', 'mango', 'zebra']);
  });

  it('includes name and path in each Zone object', () => {
    addZone(registryPath, 'hot', '/projects/hot');
    const zones = listZones(registryPath);
    expect(zones[0]).toMatchObject({ name: 'hot', path: '/projects/hot' });
  });
});
