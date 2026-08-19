import * as fs from 'node:fs';
import * as readline from 'node:readline/promises';
import type { ParsedArgs } from '../cli/args.js';
import { flag, opt } from '../cli/args.js';
import {
  detectShell,
  hasSetupBlock,
  installSetup,
  profilePath,
  uninstallSetup,
  wrapperPath,
  addAlias,
  hasAlias,
  aliasLine,
  type ShellName,
} from '../core/shells/index.js';

/** `scaff -setup` — install/uninstall shell integration. */
export async function runSetup(args: ParsedArgs): Promise<number> {
  const shell = (opt(args.options, 'shell') as ShellName | undefined) ?? detectShell();
  const profile = profilePath(shell);
  const forceYes = flag(args.options, 'yes');

  if (flag(args.options, 'status')) {
    const installed = hasSetupBlock(profile);
    console.log(
      installed
        ? `✔ scaff shell integration installed in ${profile}`
        : `✖ scaff shell integration not installed (profile: ${profile})`,
    );
    return 0;
  }

  if (flag(args.options, 'uninstall')) {
    const removed = uninstallSetup(profile);
    console.log(
      removed
        ? `✔ Removed scaff shell integration from ${profile}.`
        : `No scaff shell integration found in ${profile}.`,
    );
    return 0;
  }

  const wrapper = wrapperPath(shell);
  if (!fs.existsSync(wrapper)) {
    console.error(`scaff: could not find shell wrapper at ${wrapper}`);
    return 1;
  }

  installSetup(shell, profile);
  console.log(`✔ Installed scaff shell integration for ${shell}.`);
  console.log(`  Profile: ${profile}`);

  // Optional alias prompt (interactive only).
  const aliasName = opt(args.options, 'alias');
  if (aliasName) {
    return installAlias(shell, profile, aliasName, forceYes);
  }
  if (forceYes || !process.stdin.isTTY) {
    console.log('  Restart your shell, or reload your profile, then try `scaff <project>`.');
    return 0;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  try {
    const want = await rl.question('  Add a short alias (e.g. scf)? [y/N] ');
    if (want.trim().toLowerCase().startsWith('y')) {
      const name = (await rl.question('  Alias name: ')).trim();
      rl.close();
      if (!name) {
        console.log('  Skipping alias (no name given).');
        return 0;
      }
      return installAlias(shell, profile, name, forceYes);
    }
    console.log('  Restart your shell, or reload your profile, then try `scaff <project>`.');
    return 0;
  } finally {
    rl.close();
  }
}

/** Shared alias-add logic (also used by -alias). Exported for the alias command. */
export async function installAlias(
  shell: ShellName,
  profile: string,
  name: string,
  yes: boolean,
): Promise<number> {
  if (hasAlias(profile, name)) {
    console.log(`✔ Alias "${name}" is already installed.`);
    return 0;
  }
  const line = aliasLine(shell, name);

  if (!yes && process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    try {
      const ok = await rl.question(`  Add "${line}" to ${profile}? [y/N] `);
      if (!ok.trim().toLowerCase().startsWith('y')) {
        console.log('  Aborted.');
        return 0;
      }
    } finally {
      rl.close();
    }
  }

  addAlias(shell, profile, name);
  console.log(`✔ Added alias "${name}" → scaff in ${profile}.`);
  return 0;
}