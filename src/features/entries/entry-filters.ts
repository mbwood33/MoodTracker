import type { MoodEntry, MoodRating } from './types';

export type EntryFilters = {
  fromDate: string;
  toDate: string;
  moodRating: '' | MoodRating;
  activityTag: string;
  hasNote: boolean;
  energyRating: '' | 'none' | MoodRating;
  search: string;
};

export const emptyEntryFilters: EntryFilters = {
  fromDate: '',
  toDate: '',
  moodRating: '',
  activityTag: '',
  hasNote: false,
  energyRating: '',
  search: '',
};

export function hasActiveEntryFilters(filters: EntryFilters) {
  return Object.values(filters).some(Boolean);
}

/** Filters active entries using their stored, original local calendar date. */
export function filterEntries(entries: MoodEntry[], filters: EntryFilters) {
  const query = filters.search.trim().toLocaleLowerCase();
  const selectedTag = filters.activityTag.toLocaleLowerCase();

  return entries.filter((entry) => {
    if (entry.deletedAt !== null) return false;
    if (filters.fromDate && entry.occurredLocalDate < filters.fromDate)
      return false;
    if (filters.toDate && entry.occurredLocalDate > filters.toDate) return false;
    if (filters.moodRating && entry.moodRating !== filters.moodRating)
      return false;
    if (
      selectedTag &&
      !entry.activityTags.some(
        (tag) => tag.toLocaleLowerCase() === selectedTag,
      )
    )
      return false;
    if (filters.hasNote && !entry.note.trim()) return false;
    if (filters.energyRating === 'none' && entry.energyRating !== null)
      return false;
    if (
      typeof filters.energyRating === 'number' &&
      entry.energyRating !== filters.energyRating
    )
      return false;
    if (
      query &&
      !entry.note.toLocaleLowerCase().includes(query) &&
      !entry.activityTags.some((tag) =>
        tag.toLocaleLowerCase().includes(query),
      )
    )
      return false;
    return true;
  });
}
