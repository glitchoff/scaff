import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addZone } from '../registry/index.js';
import { listProjects, resolveProject } from '../resolver/index.js';

// ---------------------------------------------------------------------------
// Test fixture
// ---------------------------------------------------------------------------

let tmpDir: string;
let registryPath: string;
/** A real temporary zone directory on disk (resolver stats real paths). */
let zoneDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaff-resolver-test-'));
  registryPath = path.join(tmpDir, 'registry.json');
  zoneDir = path.join(tmpDir, 'zone');
  fs.mkdirSync(zoneDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Helper: create a project directory inside zoneDir. */
function createProject(name: string): string {
  const p = path.join(zoneDir, name);
  fs.mkdirSync(p);
  return p;
}

// ---------------------------------------------------------------------------
// resolveProject
// ---------------------------------------------------------------------------

describe('resolveProject', () => {
  it('returns an empty array when no zones are registered', () => {
    const matches = resolveProject(registryPath, 'anything');
    expect(matches).toEqual([]);
  });

  it('returns an empty array when project does not exist in the zone', () => {
    addZone(registryPath, 'hot', zoneDir);
    const matches = resolveProject(registryPath, 'nonexistent-project');
    expect(matches).toEqual([]);
  });

  it('resolves a project that exists in a registered zone', () => {
    addZone(registryPath, 'hot', zoneDir);
    const projectPath = createProject('my-app');

    const matches = resolveProject(registryPath, 'my-app');
    expect(matches).toHaveLength(1);
    expect(matches[0]!.path).toBe(projectPath);
    expect(matches[0]!.zone).toBe('hot');
    expect(matches[0]!.name).toBe('my-app');
  });

  it('returns multiple matches when the same project name exists in two zones', () => {
    const zone2 = path.join(tmpDir, 'zone2');
    fs.mkdirSync(zone2);

    addZone(registryPath, 'hot', zoneDir);
    addZone(registryPath, 'cool', zone2);

    createProject('shared-app');                          // in zone
    fs.mkdirSync(path.join(zone2, 'shared-app'));         // in zone2

    const matches = resolveProject(registryPath, 'shared-app');
    expect(matches).toHaveLength(2);
    expect(matches.map((m) => m.zone).sort()).toEqual(['cool', 'hot']);
  });

  it('skips a zone whose base path no longer exists on disk', () => {
    addZone(registryPath, 'stale', path.join(tmpDir, 'does-not-exist'));
    addZone(registryPath, 'hot', zoneDir);
    createProject('real-app');

    const matches = resolveProject(registryPath, 'real-app');
    expect(matches).toHaveLength(1);
    expect(matches[0]!.zone).toBe('hot');
  });

  it('does not match files — only directories', () => {
    addZone(registryPath, 'hot', zoneDir);
    // Create a file, not a directory
    fs.writeFileSync(path.join(zoneDir, 'not-a-project'), 'content', 'utf8');

    const matches = resolveProject(registryPath, 'not-a-project');
    expect(matches).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// listProjects
// ---------------------------------------------------------------------------

describe('listProjects', () => {
  it('returns an empty array when no zones are registered', () => {
    expect(listProjects(registryPath)).toEqual([]);
  });

  it('lists all project directories in a registered zone', () => {
    addZone(registryPath, 'hot', zoneDir);
    createProject('alpha');
    createProject('beta');

    const projects = listProjects(registryPath);
    expect(projects.map((p) => p.name).sort()).toEqual(['alpha', 'beta']);
  });

  it('skips stale zone directories gracefully', () => {
    addZone(registryPath, 'stale', path.join(tmpDir, 'gone'));
    addZone(registryPath, 'hot', zoneDir);
    createProject('gamma');

    const projects = listProjects(registryPath);
    expect(projects).toHaveLength(1);
    expect(projects[0]!.name).toBe('gamma');
  });

  it('lists projects from multiple zones combined and sorted', () => {
    const zone2 = path.join(tmpDir, 'zone2');
    fs.mkdirSync(zone2);
    addZone(registryPath, 'hot', zoneDir);
    addZone(registryPath, 'cool', zone2);

    createProject('zebra');
    fs.mkdirSync(path.join(zone2, 'apple'));

    const projects = listProjects(registryPath);
    // sorted by zone then name: cool/apple, hot/zebra
    expect(projects[0]!.zone).toBe('cool');
    expect(projects[0]!.name).toBe('apple');
    expect(projects[1]!.zone).toBe('hot');
    expect(projects[1]!.name).toBe('zebra');
  });
});
