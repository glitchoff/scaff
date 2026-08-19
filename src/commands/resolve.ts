import { loadConfig } from '../core/registry/store.js';
import { resolveToken, ResolveError, type Project } from '../core/resolve/index.js';
import { pickProject } from '../core/pick/index.js';

/** Resolve a token to a single project, applying picker/--first logic. */
export async function resolveOne(
  configPath: string,
  token: string,
  first: boolean,
): Promise<Project> {
  const config = loadConfig(configPath);
  const matches = resolveToken(config, token);
  if (matches.length === 0) {
    const addr = token.split(':');
    if (addr.length === 2) {
      throw new ResolveError(`no project "${addr[1]}" in zone "${addr[0]}".`);
    }
    throw new ResolveError(
      `project "${token}" not found in the primary zone. Try \`scaff -find\`, \`scaff -list\`, or \`scaff <zone>:<token>\`.`,
    );
  }
  return pickProject(matches, token, { first });
}