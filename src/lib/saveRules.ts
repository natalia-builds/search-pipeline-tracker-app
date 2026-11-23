// When "Save version" has something to save. The page uses these both to turn the button off
// and to refuse a save, so the two can't disagree.

export type SaveBlocker = "empty" | "unchanged" | null;

/** A headline is saved with its spaces tidied: no spaces at the ends, one space between words. */
export function normalizeHeadline(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Whether a resume can be saved as a new version. `currentText` is the text of the current
 * version, or null when there is none yet. Returns why not, or null when it can be saved.
 */
export function resumeSaveBlocker(text: string, currentText: string | null): SaveBlocker {
  if (!text.trim()) return "empty";
  if (currentText !== null && text === currentText) return "unchanged";
  return null;
}

/** The same for a LinkedIn headline, compared after tidying the spaces. */
export function headlineSaveBlocker(rawText: string, currentText: string | null): SaveBlocker {
  const text = normalizeHeadline(rawText);
  if (!text) return "empty";
  if (currentText !== null && text === currentText) return "unchanged";
  return null;
}
