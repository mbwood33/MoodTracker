const requiredHeaders = [
  'full_date',
  'time',
  'mood',
  'activites',
  'note',
] as const;

export type CsvMoodImportRow = {
  rowNumber: number;
  moodRating: 1 | 2 | 3 | 4 | 5;
  notePlainText: string;
  activityTags: string[];
  energyRating: null;
  occurredAtUtc: string;
  occurredTimeZone: string;
  occurredLocalDate: string;
};

export type CsvMoodImportResult = {
  rows: CsvMoodImportRow[];
  errors: string[];
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else field += character;
  }
  if (quoted) throw new Error('The CSV has an unclosed quoted field.');
  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function parseDateTime(
  dateValue: string,
  timeValue: string,
): {
  occurredAtUtc: string;
  occurredLocalDate: string;
} | null {
  const date = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateValue.trim());
  const time = /^(\d{1,2}):(\d{2})$/.exec(timeValue.trim());
  if (!date || !time) return null;
  const month = Number(date[1]);
  const day = Number(date[2]);
  const year = Number(date[3]);
  const hours = Number(time[1]);
  const minutes = Number(time[2]);
  if (month < 1 || month > 12 || day < 1 || hours > 23 || minutes > 59)
    return null;
  const local = new Date(year, month - 1, day, hours, minutes);
  if (
    local.getFullYear() !== year ||
    local.getMonth() !== month - 1 ||
    local.getDate() !== day ||
    local.getHours() !== hours ||
    local.getMinutes() !== minutes
  )
    return null;
  return {
    occurredAtUtc: local.toISOString(),
    occurredLocalDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

function parseTags(value: string): string[] {
  const seen = new Set<string>();
  return value.split(' | ').reduce<string[]>((tags, raw) => {
    const tag = raw.trim();
    const normalized = tag.toLocaleLowerCase();
    if (tag && !seen.has(normalized)) {
      seen.add(normalized);
      tags.push(tag);
    }
    return tags;
  }, []);
}

/** Parses the documented mood CSV without writing data, allowing a safe preview. */
export function parseMoodCsv(
  text: string,
  timeZone: string,
): CsvMoodImportResult {
  const records = parseCsv(text);
  if (!records.length) return { rows: [], errors: ['The CSV is empty.'] };
  const firstRecord = records[0];
  if (!firstRecord) return { rows: [], errors: ['The CSV is empty.'] };
  const headers = firstRecord.map((value) =>
    value
      .trim()
      .replace(/^\uFEFF/, '')
      .toLowerCase(),
  );
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length)
    return {
      rows: [],
      errors: [`Missing required column(s): ${missing.join(', ')}.`],
    };
  const positions = Object.fromEntries(
    headers.map((header, index) => [header, index]),
  );
  const rows: CsvMoodImportRow[] = [];
  const errors: string[] = [];
  for (let recordIndex = 1; recordIndex < records.length; recordIndex += 1) {
    const record = records[recordIndex];
    if (!record) continue;
    const rowNumber = recordIndex + 1;
    const get = (header: (typeof requiredHeaders)[number]) =>
      record[positions[header] ?? -1]?.trim() ?? '';
    const timestamp = parseDateTime(get('full_date'), get('time'));
    const mood = Number(get('mood'));
    if (!timestamp) {
      errors.push(
        `Row ${rowNumber}: full_date must be m/d/yyyy and time must be 24-hour h:mm.`,
      );
      continue;
    }
    if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
      errors.push(`Row ${rowNumber}: mood must be an integer from 1 to 5.`);
      continue;
    }
    rows.push({
      rowNumber,
      moodRating: mood as CsvMoodImportRow['moodRating'],
      notePlainText: get('note'),
      activityTags: parseTags(get('activites')),
      energyRating: null,
      occurredAtUtc: timestamp.occurredAtUtc,
      occurredLocalDate: timestamp.occurredLocalDate,
      occurredTimeZone: timeZone,
    });
  }
  return { rows, errors };
}
