/**
 * Parse a project token into an explicit address.
 *
 * A token containing `:` is an explicit `zone:name` address. A token without
 * one is a bare name (resolved against the primary zone).
 */
export interface Address {
  zone: string | null;
  name: string;
}

export function parseAddress(token: string): Address {
  const idx = token.indexOf(':');
  if (idx === -1) {
    return { zone: null, name: token };
  }
  return { zone: token.slice(0, idx) || null, name: token.slice(idx + 1) };
}