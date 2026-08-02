import { Heart } from 'lucide-react';

import { PagePlaceholder } from '@/components/page-placeholder';

export function TodayPage() {
  return (
    <PagePlaceholder
      eyebrow="Today"
      title="How are you?"
      description="The fast mood-entry experience will begin here. The shell is intentionally calm, focused, and ready for offline-first entry work."
      icon={Heart}
    >
      <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-3">
        {['Quick entry', 'Latest entry', 'Seven-day view'].map((label) => (
          <div
            key={label}
            className="border-border bg-background min-h-28 rounded-2xl border p-4"
          >
            <div className="bg-primary/20 h-2 w-16 rounded-full" />
            <p className="text-muted-foreground mt-8 text-sm font-medium">
              {label}
            </p>
          </div>
        ))}
      </div>
    </PagePlaceholder>
  );
}
