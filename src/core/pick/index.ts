import * as readline from 'node:readline/promises';
import type { Project } from '../resolve/index.js';

export interface PickOptions {
  /** Auto-select the first candidate without prompting. */
  first?: boolean;
  /** Whether stdin is a TTY (interactive). Defaults to isTTY. */
  interactive?: boolean;
}

/**
 * Resolve an ambiguous set of candidates to a single one.
 *
 * Priority:
 *   1. Single candidate → it.
 *   2. `--first` → the first candidate (deterministic, for scripting).
 *   3. Non-interactive stdin → warn and take the first.
 *   4. Interactive → a numbered prompt on stdin.
 */
export async function pickProject(
  candidates: Project[],
  token: string,
  opts: PickOptions = {},
): Promise<Project> {
  if (candidates.length === 1) return candidates[0]!;

  if (opts.first) {
    return candidates[0]!;
  }

  const interactive = opts.interactive ?? Boolean(process.stdin.isTTY);

  if (!interactive) {
    console.warn(
      `scaff: "${token}" is ambiguous (${candidates.length} matches) — using the first. Pass --first to silence.`,
    );
    return candidates[0]!;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  console.error(`scaff: "${token}" is ambiguous — choose a match:`);
  candidates.forEach((c, i) => {
    console.error(`  ${i + 1}. [${c.zone}] ${c.path}`);
  });

  try {
    const answer = await rl.question('Selection (1-N): ');
    const idx = Number.parseInt(answer.trim(), 10) - 1;
    if (Number.isInteger(idx) && idx >= 0 && idx < candidates.length) {
      return candidates[idx]!;
    }
    console.error('scaff: invalid selection.');
    return candidates[0]!;
  } finally {
    rl.close();
  }
}

/** Simple subsequence fuzzy scoring: substring wins, then shorter, then earlier. */
export function fuzzyScore(query: string, candidate: string): number {
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();
  const idx = c.indexOf(q);
  if (idx !== -1) return 1000 - idx - c.length * 0.001;
  let qi = 0;
  for (let ci = 0; ci < c.length && qi < q.length; ci++) {
    if (c[ci] === q[qi]) qi++;
  }
  if (qi === q.length) return 500 - c.length * 0.001;
  return -1;
}

export function fuzzyMatches(query: string, candidates: Project[]): Project[] {
  const scored: Array<{ project: Project; score: number }> = [];
  for (const c of candidates) {
    const score = fuzzyScore(query, c.name);
    if (score >= 0) scored.push({ project: c, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.project.name.localeCompare(b.project.name))
    .map((s) => s.project);
}