/** Positional + option parsing for a command's argument list. */
export interface ParsedArgs {
  positionals: string[];
  options: Record<string, string | boolean>;
}

/**
 * Parse `--key value`, `--key=value`, and bare `--flag` options from a raw
 * argument list, returning the remaining positionals.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const options: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        options[arg.slice(2, eq)] = arg.slice(eq + 1);
        continue;
      }
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    } else {
      positionals.push(arg);
    }
  }
  return { positionals, options };
}

export function opt(options: Record<string, string | boolean>, key: string): string | undefined {
  const v = options[key];
  return typeof v === 'string' ? v : undefined;
}

export function flag(options: Record<string, string | boolean>, key: string): boolean {
  return options[key] === true || options[key] === 'true';
}