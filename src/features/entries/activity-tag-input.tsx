import { Plus, X } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { normalizeActivityTags } from './activity-tags';

type ActivityTagInputProps = {
  value: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
};

export function ActivityTagInput({
  value,
  suggestions,
  onChange,
}: ActivityTagInputProps) {
  const [pendingTag, setPendingTag] = useState('');
  const listId = useId();
  const add = () => {
    const next = normalizeActivityTags([...value, pendingTag]);
    if (next.length !== value.length) onChange(next);
    setPendingTag('');
  };
  const remove = (tag: string) =>
    onChange(
      value.filter(
        (item) => item.toLocaleLowerCase() !== tag.toLocaleLowerCase(),
      ),
    );

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">
        Activities and tags{' '}
        <span className="text-muted-foreground font-normal">(optional)</span>
      </legend>
      {value.length ? (
        <div
          className="flex flex-wrap gap-2"
          aria-label="Selected activities and tags"
        >
          {value.map((tag) => (
            <span
              className="bg-secondary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm"
              key={tag.toLocaleLowerCase()}
            >
              #{tag}
              <button
                aria-label={`Remove ${tag}`}
                className="hover:bg-background rounded-full p-0.5"
                type="button"
                onClick={() => remove(tag)}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <input
          className="border-input bg-background h-10 min-w-0 flex-1 rounded-xl border px-3"
          list={listId}
          placeholder="Add an activity or tag"
          value={pendingTag}
          onChange={(event) => setPendingTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
        />
        <datalist id={listId}>
          {suggestions
            .filter(
              (tag) =>
                !value.some(
                  (valueTag) =>
                    valueTag.toLocaleLowerCase() === tag.toLocaleLowerCase(),
                ),
            )
            .map((tag) => (
              <option key={tag.toLocaleLowerCase()} value={tag} />
            ))}
        </datalist>
        <Button
          type="button"
          variant="secondary"
          onClick={add}
          disabled={!pendingTag.trim()}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Press Enter or Add. Matching tags are suggested from your previous
        entries.
      </p>
    </fieldset>
  );
}

type ActivityTagFilterProps = {
  value: string;
  tags: string[];
  onChange: (tag: string) => void;
};
/** Reusable single-tag filter for logs, galleries, and future statistics. */
export function ActivityTagFilter({
  value,
  tags,
  onChange,
}: ActivityTagFilterProps) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      Activity or tag
      <select
        aria-label="Filter by activity or tag"
        className="border-input bg-background h-10 rounded-xl border px-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All activities and tags</option>
        {tags.map((tag) => (
          <option key={tag.toLocaleLowerCase()} value={tag}>
            #{tag}
          </option>
        ))}
      </select>
    </label>
  );
}
