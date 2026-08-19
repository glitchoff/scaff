/** The on-disk config schema for scaff. */
export interface Config {
  /** Schema version, reserved for forward migration. */
  version: number;
  /** The zone that bare `scaff <name>` lookups use. Null disables bare lookups. */
  primary: string | null;
  /** Zone name → ordered list of absolute directories (1+). */
  zones: Record<string, string[]>;
}

/** A single registered zone plus its resolved directories. */
export interface Zone {
  name: string;
  paths: string[];
  isPrimary: boolean;
}