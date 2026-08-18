import * as os from 'node:os';
import * as path from 'node:path';

const APP_NAME = 'scaff';

/**
 * Returns the platform-appropriate base config directory for scaff.
 *
 * | Platform | Path                                      |
 * |----------|-------------------------------------------|
 * | Windows  | %APPDATA%\scaff\                          |
 * | macOS    | ~/Library/Application Support/scaff/      |
 * | Linux    | ~/.config/scaff/                          |
 *
 * The SCAFF_CONFIG_DIR environment variable overrides this for all platforms
 * (useful for isolated test runs and advanced users).
 */
export function getConfigDir(): string {
  if (process.env['SCAFF_CONFIG_DIR']) {
    return process.env['SCAFF_CONFIG_DIR'];
  }

  const platform = process.platform;

  if (platform === 'win32') {
    const appData = process.env['APPDATA'] ?? path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, APP_NAME);
  }

  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', APP_NAME);
  }

  // Linux and other Unix-like systems
  const xdgConfig = process.env['XDG_CONFIG_HOME'] ?? path.join(os.homedir(), '.config');
  return path.join(xdgConfig, APP_NAME);
}

/**
 * Returns the absolute path to the registry JSON file.
 */
export function getRegistryPath(): string {
  return path.join(getConfigDir(), 'registry.json');
}
