// Names for saved versions, such as "v1" and "v2". Used for resume versions and LinkedIn headlines.

// "v" and a whole number, like "v3" or "V12". A name like "v3 Google" or "Google v3" doesn't count.
const NUMBERED = /^v(\d{1,9})$/i;

const same = (name: string) => name.trim().toLowerCase();

/**
 * Whether a new version name is already used. Spaces around a name and upper or lower
 * case don't count as a difference, so "V3" and " v3 " are the same name. An empty name is
 * never "taken": it means "use the suggested name".
 */
export function isNameTaken(existingNames: readonly string[], candidate: string): boolean {
  const wanted = same(candidate);
  return wanted !== "" && existingNames.some((name) => same(name) === wanted);
}

/**
 * The name to suggest for the next saved version: one above the highest "vN" among the
 * existing names. Names that aren't plain "vN" are ignored, so a custom name never
 * changes the count. With no "vN" names, the suggestion is "v1".
 */
export function nextVersionName(existingNames: readonly string[]): string {
  let highest = 0;
  for (const name of existingNames) {
    const match = NUMBERED.exec(name.trim());
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return "v" + (highest + 1);
}
