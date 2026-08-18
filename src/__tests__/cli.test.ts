import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// CLI integration tests
//
// These tests run the real CLI source through `tsx` (TypeScript executor) with
// SCAFF_CONFIG_DIR set to an isolated tmp directory.  This means:
//  - no real config files on the developer's machine are read or modified
//  - each test starts with a clean registry
//  - the test covers externally observable behavior (stdout, stderr, exit code)
// ---------------------------------------------------------------------------

// Invoke the CLI through Node directly (tsx's JS entry) rather than spawning a
// `.cmd`/`.sh` shim. On Windows, `spawnSync` cannot execute `.cmd` files with
// the default `shell: false`, which returned `status: null` and broke every
// CLI test there. Running `node <tsx-cli>` avoids the shim entirely and works
// on all platforms.
const TSX_BIN = path.resolve('node_modules', 'tsx', 'dist', 'cli.mjs');
const MAIN = path.resolve('src', 'main.ts');

let tmpDir: string;
let env: NodeJS.ProcessEnv;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaff-cli-test-'));
  env = { ...process.env, SCAFF_CONFIG_DIR: tmpDir };
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Run the CLI synchronously and return { stdout, stderr, status }. */
function scaff(args: string[]): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync(process.execPath, [TSX_BIN, MAIN, ...args], {
    encoding: 'utf8',
    env,
    cwd: path.resolve('.'),
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

/** Create a real project directory inside tmpDir. */
function mkProject(zonePath: string, projectName: string): string {
  const p = path.join(zonePath, projectName);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

// ---------------------------------------------------------------------------
// zone add
// ---------------------------------------------------------------------------

describe('scaff zone add', () => {
  it('registers a zone and reports success', () => {
    const zoneDir = path.join(tmpDir, 'projects');
    fs.mkdirSync(zoneDir);

    const { stdout, status } = scaff(['zone', 'add', 'hot', zoneDir]);
    expect(status).toBe(0);
    expect(stdout).toContain('hot');
    expect(stdout).toContain(zoneDir);
  });

  it('errors when the path does not exist', () => {
    const { stderr, status } = scaff(['zone', 'add', 'bad', '/nonexistent/path/xyz']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/does not exist/i);
  });
});

// ---------------------------------------------------------------------------
// zone list
// ---------------------------------------------------------------------------

describe('scaff zone list', () => {
  it('reports no zones when empty', () => {
    const { stdout, status } = scaff(['zone', 'list']);
    expect(status).toBe(0);
    expect(stdout).toMatch(/no zones/i);
  });

  it('lists a registered zone', () => {
    const zoneDir = path.join(tmpDir, 'zone');
    fs.mkdirSync(zoneDir);
    scaff(['zone', 'add', 'hot', zoneDir]);

    const { stdout } = scaff(['zone', 'list']);
    expect(stdout).toContain('hot');
    expect(stdout).toContain(zoneDir);
  });
});

// ---------------------------------------------------------------------------
// zone remove
// ---------------------------------------------------------------------------

describe('scaff zone remove', () => {
  it('removes a previously registered zone', () => {
    const zoneDir = path.join(tmpDir, 'zone');
    fs.mkdirSync(zoneDir);
    scaff(['zone', 'add', 'hot', zoneDir]);
    const { status } = scaff(['zone', 'remove', 'hot']);
    expect(status).toBe(0);

    const { stdout } = scaff(['zone', 'list']);
    expect(stdout).not.toContain('hot');
  });

  it('errors when removing a zone that does not exist', () => {
    const { stderr, status } = scaff(['zone', 'remove', 'phantom']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/not registered/i);
  });
});

// ---------------------------------------------------------------------------
// scaff list
// ---------------------------------------------------------------------------

describe('scaff list', () => {
  it('lists projects across registered zones', () => {
    const zoneDir = path.join(tmpDir, 'zone');
    fs.mkdirSync(zoneDir);
    scaff(['zone', 'add', 'hot', zoneDir]);
    mkProject(zoneDir, 'alpha');
    mkProject(zoneDir, 'beta');

    const { stdout, status } = scaff(['list']);
    expect(status).toBe(0);
    expect(stdout).toContain('alpha');
    expect(stdout).toContain('beta');
    expect(stdout).toContain('hot');
  });
});

// ---------------------------------------------------------------------------
// scaff open (without actually launching an editor)
// ---------------------------------------------------------------------------

describe('scaff open', () => {
  it('errors clearly when the project is not found', () => {
    const { stderr, status } = scaff(['open', 'ghost-project']);
    expect(status).not.toBe(0);
    expect(stderr).toContain('ghost-project');
    expect(stderr).toMatch(/not found/i);
  });

  it('reports ambiguity when the same project name exists in two zones', () => {
    const zone1 = path.join(tmpDir, 'zone1');
    const zone2 = path.join(tmpDir, 'zone2');
    fs.mkdirSync(zone1);
    fs.mkdirSync(zone2);
    scaff(['zone', 'add', 'hot', zone1]);
    scaff(['zone', 'add', 'cool', zone2]);
    mkProject(zone1, 'shared-app');
    mkProject(zone2, 'shared-app');

    const { stderr, status } = scaff(['open', 'shared-app']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/ambiguous/i);
  });
});

// ---------------------------------------------------------------------------
// scaff <project> (short-form default)
// ---------------------------------------------------------------------------

describe('scaff <project> (default handler)', () => {
  it('errors clearly when the project does not exist', () => {
    const { stderr, status } = scaff(['no-such-project']);
    expect(status).not.toBe(0);
    expect(stderr).toContain('no-such-project');
  });
});
