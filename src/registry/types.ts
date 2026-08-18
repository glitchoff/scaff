/** A single registered zone: a friendly name mapped to an absolute filesystem path. */
export interface Zone {
  name: string;
  path: string;
}

/** The top-level shape of registry.json on disk. */
export interface Registry {
  zones: Record<string, string>; // name → absolute path
}
