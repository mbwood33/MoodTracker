/**
 * UI-facing entry contract. The local data layer owns persistence-specific
 * fields and adapts them to this stable feature shape.
 */
export type MoodRating = 1 | 2 | 3 | 4 | 5;

export type EntryDraft = {
  moodRating: MoodRating;
  note: string;
  energyRating: MoodRating | null;
  occurredAt: string;
  occurredTimeZone: string;
  /** Preserved from the date-time field; never derive this from UTC. */
  occurredLocalDate: string;
};

export type MoodEntry = EntryDraft & {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: 'saved-locally' | 'synchronizing' | 'synchronized' | 'problem';
};

export type EntryActions = {
  create: (draft: EntryDraft) => Promise<void> | void;
  update: (id: string, draft: EntryDraft) => Promise<void> | void;
  remove: (id: string) => Promise<void> | void;
};

/**
 * Injection boundary between this presentation feature and the local-first
 * repository. Application composition owns the adapter implementation.
 */
export type EntryRepositoryAdapter = EntryActions & {
  entries: MoodEntry[];
};

export const moods: ReadonlyArray<{
  rating: MoodRating;
  label: string;
  face: string;
}> = [
  { rating: 1, label: 'Awful', face: '😣' },
  { rating: 2, label: 'Bad', face: '🙁' },
  { rating: 3, label: 'Meh', face: '😐' },
  { rating: 4, label: 'Good', face: '🙂' },
  { rating: 5, label: 'Rad', face: '😄' },
];

export const energyLevels: ReadonlyArray<{
  rating: MoodRating;
  label: string;
}> = [
  { rating: 1, label: 'Exhausted' },
  { rating: 2, label: 'Low' },
  { rating: 3, label: 'OK' },
  { rating: 4, label: 'High' },
  { rating: 5, label: 'Energized' },
];

export function moodFor(rating: MoodRating) {
  const mood = moods.find((item) => item.rating === rating);

  if (!mood) {
    throw new Error(`Unsupported mood rating: ${rating}`);
  }

  return mood;
}

export function energyFor(rating: MoodRating) {
  const energy = energyLevels.find((item) => item.rating === rating);

  if (!energy) {
    throw new Error(`Unsupported energy rating: ${rating}`);
  }

  return energy;
}
