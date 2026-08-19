import type { ParsedArgs } from '../cli/args.js';
import { flag, opt } from '../cli/args.js';
import { commandExists } from '../core/launch/index.js';
import {
  detectShell,
  listAliases,
  removeAlias,
  profilePath,
  type ShellName,
} from '../core/shells/index.js';
import { installAlias } from './setup.js';

/** `scaff -alias <name>` — manage a short alias for scaff. */
export async function runAlias(args: ParsedArgs): Promise<number> {
  const shell = (opt(args.options, 'shell') as ShellName | undefined) ?? detectShell();
  const profile = profilePath(shell);

  if (flag(args.options, 'status')) {
    const aliases = listAliases(profile);
    if (aliases.length === 0) {
      console.log('No scaff aliases installed.');
      return 0;
    }
    console.log('Installed scaff aliases:');
    for (const a of aliases) {
      console.log(`  • ${a.name}  (${a.line})`);
    }
    return 0;
  }

  const name = args.positionals[0];
  if (!name) {
    console.error('scaff: usage: -alias <name> | -alias --status');
    return 1;
  }

  if (flag(args.options, 'uninstall')) {
    const removed = removeAlias(profile, name);
    console.log(
      removed
        ? `✔ Removed alias "${name}" from ${profile}.`
        : `No alias "${name}" found in ${profile}.`,
    );
    return 0;
  }

  // Hard error if the alias name already resolves to a PATH command.
  if (commandExists(name) && !flag(args.options, 'force')) {
    console.error(
      `scaff: "${name}" already exists as a command on PATH. Use --force to override it anyway.`,
    );
    return 1;
  }

  return installAlias(shell, profile, name, flag(args.options, 'yes'));
}