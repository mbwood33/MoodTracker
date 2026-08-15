/** Removes blank and duplicate tags while retaining the first display spelling. */
export function normalizeActivityTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  return tags.reduce<string[]>((result, tag) => {
    const label = tag.trim();
    const normalized = label.toLocaleLowerCase();
    if (!label || seen.has(normalized)) return result;
    seen.add(normalized);
    result.push(label);
    return result;
  }, []);
}
