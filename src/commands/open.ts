import { openProject, type LaunchTarget } from '../core/launch/index.js';
import type { ParsedArgs } from '../cli/args.js';
import { flag, opt } from '../cli/args.js';
import { resolveOne } from './resolve.js';

const TARGETS: LaunchTarget[] = ['vscode', 'terminal', 'explorer'];

/** `scaff -open <name|zone:name> [--with target]` — resolve and open a project. */
export async function runOpen(configPath: string, args: ParsedArgs): Promise<number> {
  const token = args.positionals[0];
  if (!token) {
    console.error('scaff: usage: -open <name|zone:name> [--with vscode|terminal|explorer]');
    return 1;
  }
  const target = (opt(args.options, 'with') ?? 'vscode') as LaunchTarget;
  if (!TARGETS.includes(target)) {
    console.error(`scaff: unknown target "${target}". Use: ${TARGETS.join(', ')}`);
    return 1;
  }
  try {
    const project = await resolveOne(configPath, token, flag(args.options, 'first'));
    console.log(`Opening ${project.path} …`);
    openProject(project.path, target);
    return 0;
  } catch (err) {
    console.error(`scaff: ${(err as Error).message}`);
    return 1;
  }
}