import { describe, expect, it } from 'vitest';
import { parseArgs, flag, opt } from '../cli/args.js';

describe('parseArgs', () => {
  it('splits positionals from options', () => {
    const { positionals, options } = parseArgs(['name', '--zone', 'work', '--json']);
    expect(positionals).toEqual(['name']);
    expect(options['zone']).toBe('work');
    expect(options['json']).toBe(true);
  });

  it('supports --key=value', () => {
    const { options } = parseArgs(['--shell=powershell']);
    expect(options['shell']).toBe('powershell');
  });

  it('keeps leading-dash project tokens as positionals', () => {
    const { positionals } = parseArgs(['my-app', '--first']);
    expect(positionals).toEqual(['my-app']);
  });
});

describe('opt/flag', () => {
  it('reads string options and booleans', () => {
    const { options } = parseArgs(['--yes', '--with', 'terminal']);
    expect(flag(options, 'yes')).toBe(true);
    expect(opt(options, 'with')).toBe('terminal');
    expect(flag(options, 'with')).toBe(false);
  });
});