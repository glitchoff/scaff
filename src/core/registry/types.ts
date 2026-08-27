/** The on-disk config schema for scaff. */
export interface Config {
  version: number;
  /** The hot zone that bare `scaff <name>` and `scaff :<name>` use. */
  hot: string | null;
  /** Zone name → single absolute directory. */
  zones: Record<string, string>;
}

export interface Zone {
  name: string;
  path: string;
  isHot: boolean;
}