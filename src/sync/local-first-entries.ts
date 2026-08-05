import {
  createMoodEntry,
  restoreMoodEntry,
  softDeleteMoodEntry,
  updateMoodEntry,
  type Clock,
  type CreateMoodEntryInput,
  type EntryIdentityFactory,
  type MoodEntry,
  type UpdateMoodEntryInput,
} from '@/domain';
import type { LocalEntryRepository } from '@/data/local';

/**
 * UI-facing local-first API. Every mutation commits to IndexedDB before a
 * sync runner is invoked, so callers never need a network connection to save.
 */
export class LocalFirstEntries {
  constructor(
    private readonly repository: LocalEntryRepository,
    private readonly dependencies: {
      clock?: Clock;
      identityFactory?: EntryIdentityFactory;
    } = {},
  ) {}

  async create(input: CreateMoodEntryInput): Promise<MoodEntry> {
    const entry = createMoodEntry(input, this.dependencies);
    await this.repository.save(entry);
    return entry;
  }

  async update(
    entryId: string,
    input: UpdateMoodEntryInput,
  ): Promise<MoodEntry> {
    const entry = await this.requireEntry(entryId);
    const updated = updateMoodEntry(entry, input, this.dependencies);
    await this.repository.save(updated);
    return updated;
  }

  async remove(entryId: string): Promise<MoodEntry> {
    const deleted = softDeleteMoodEntry(
      await this.requireEntry(entryId),
      this.dependencies,
    );
    await this.repository.save(deleted);
    return deleted;
  }

  async restore(entryId: string): Promise<MoodEntry> {
    const restored = restoreMoodEntry(
      await this.requireEntry(entryId),
      this.dependencies,
    );
    await this.repository.save(restored);
    return restored;
  }

  private async requireEntry(entryId: string): Promise<MoodEntry> {
    const entry = await this.repository.get(entryId);
    if (!entry) {
      throw new Error(`Mood entry ${entryId} was not found in local storage.`);
    }
    return entry;
  }
}
