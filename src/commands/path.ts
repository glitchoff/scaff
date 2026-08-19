import type { ParsedArgs } from '../cli/args.js';
import { flag } from '../cli/args.js';
import { resolveOne } from './resolve.js';

/** Bare project token (no leading '-') — resolve & print the path for the wrapper. */
export async function runBare(configPath: string, token: string): Promise<number> {
  return runPath(configPath, { positionals: [token], options: {} });
}

/** `scaff -path <name|zone:name>` — print the resolved absolute path. */
export async function runPath(configPath: string, args: ParsedArgs): Promise<number> {
  const token = args.positionals[0];
  if (!token) {
    console.error('scaff: usage: -path <name|zone:name>');
    return 1;
  }
  try {
    const project = await resolveOne(configPath, token, flag(args.options, 'first'));
    console.log(project.path);
    return 0;
  } catch (err) {
    console.error(`scaff: ${(err as Error).message}`);
    return 1;
  }
}