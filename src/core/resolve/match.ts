/** Case-insensitive exact match of a project directory name. */
export function namesMatch(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}