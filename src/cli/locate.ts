import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Walk upward from the calling module to the nearest directory containing a
 * package.json. This is robust across tsx source (`src/**`) and the bundled
 * single-file `dist/main.js`, both of which live somewhere under the package
 * root.
 */
export function packageRoot(fromUrl: string): string {
  let dir = path.dirname(fileURLToPath(fromUrl));
  for (;;) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return dir;
    dir = parent;
  }
}

/** Read the scaff package.json (version etc.) as a plain object. */
export function readPackage(fromUrl: string): Record<string, unknown> {
  const root = packageRoot(fromUrl);
  return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as Record<
    string,
    unknown
  >;
}