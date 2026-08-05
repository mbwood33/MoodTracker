import type { SupabaseClient } from '@supabase/supabase-js';

import { moodEntrySchema, type MoodEntry } from '@/domain';

import { getSupabaseClient } from './supabase';

/**
 * The transport representation shared by the remote repository and sync layer.
 * Times are ISO 8601 strings. `occurredLocalDate` is authoritative for all
 * calendar-based features and must never be recreated from UTC.
 */
export interface RemoteMoodEntry {
  id: string;
  userId: string;
  moodRating: 1 | 2 | 3 | 4 | 5;
  energyRating: 1 | 2 | 3 | 4 | 5 | null;
  notePlainText: string | null;
  occurredAtUtc: string;
  occurredTimeZone: string;
  occurredLocalDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  revision: number;
  clientMutationId: string;
}

export type RemotePushResult =
  | { status: 'applied'; entry: RemoteMoodEntry }
  | { status: 'conflict'; message: string };

export class RemoteConfigurationError extends Error {
  constructor() {
    super(
      'Supabase is not configured. Set both public Supabase environment values.',
    );
    this.name = 'RemoteConfigurationError';
  }
}

interface MoodEntryRow {
  id: string;
  user_id: string;
  mood_rating: 1 | 2 | 3 | 4 | 5;
  energy_rating: 1 | 2 | 3 | 4 | 5 | null;
  note_plain_text: string | null;
  occurred_at_utc: string;
  occurred_time_zone: string;
  occurred_local_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  revision: number;
  client_mutation_id: string;
}

function toRemoteEntry(row: MoodEntryRow): RemoteMoodEntry {
  return {
    id: row.id,
    userId: row.user_id,
    moodRating: row.mood_rating,
    energyRating: row.energy_rating,
    notePlainText: row.note_plain_text,
    occurredAtUtc: row.occurred_at_utc,
    occurredTimeZone: row.occurred_time_zone,
    occurredLocalDate: row.occurred_local_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    revision: row.revision,
    clientMutationId: row.client_mutation_id,
  };
}

function toDomainEntry(row: MoodEntryRow): MoodEntry {
  const remote = toRemoteEntry(row);
  return moodEntrySchema.parse({
    ...remote,
    // PostgreSQL accepts a nullable plain-text field; the local domain model
    // normalizes absence to the empty string for search and export stability.
    notePlainText: remote.notePlainText ?? '',
  });
}

function toRow(entry: RemoteMoodEntry): MoodEntryRow {
  return {
    id: entry.id,
    user_id: entry.userId,
    mood_rating: entry.moodRating,
    energy_rating: entry.energyRating,
    note_plain_text: entry.notePlainText,
    occurred_at_utc: entry.occurredAtUtc,
    occurred_time_zone: entry.occurredTimeZone,
    occurred_local_date: entry.occurredLocalDate,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
    deleted_at: entry.deletedAt,
    revision: entry.revision,
    client_mutation_id: entry.clientMutationId,
  };
}

function fromDomainEntry(entry: MoodEntry): RemoteMoodEntry {
  const parsed = moodEntrySchema.parse(entry);
  return {
    ...parsed,
    moodRating: parsed.moodRating as RemoteMoodEntry['moodRating'],
    energyRating: parsed.energyRating as RemoteMoodEntry['energyRating'],
  };
}

/** A thin Supabase boundary; retry scheduling and conflict UI stay in src/sync. */
export class SupabaseMoodEntryRepository {
  constructor(
    private readonly client: SupabaseClient | null = getSupabaseClient(),
  ) {}

  async push(
    entry: RemoteMoodEntry,
    expectedRevision: number,
  ): Promise<RemotePushResult> {
    const client = this.requireClient();
    const { data, error } = await client.rpc('apply_mood_entry_mutation', {
      p_entry: toRow(entry),
      p_expected_revision: expectedRevision,
    });

    if (error) {
      if (error.code === '40001')
        return { status: 'conflict', message: error.message };
      throw new Error(`Unable to synchronize mood entry: ${error.message}`);
    }

    return { status: 'applied', entry: toRemoteEntry(data as MoodEntryRow) };
  }

  /** Adapter consumed by the Phase 1 sync queue. */
  async write(entry: MoodEntry): Promise<void> {
    const result = await this.push(
      fromDomainEntry(entry),
      Math.max(0, entry.revision - 1),
    );
    if (result.status === 'conflict') throw new Error(result.message);
  }

  async pullChanges(updatedAfter: string | null): Promise<MoodEntry[]> {
    const client = this.requireClient();
    let query = client
      .from('mood_entries')
      .select('*')
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true });

    if (updatedAfter) query = query.gt('updated_at', updatedAfter);

    const { data, error } = await query;
    if (error)
      throw new Error(
        `Unable to retrieve mood entry changes: ${error.message}`,
      );

    return (data as MoodEntryRow[]).map(toDomainEntry);
  }

  private requireClient(): SupabaseClient {
    if (!this.client) throw new RemoteConfigurationError();
    return this.client;
  }
}
