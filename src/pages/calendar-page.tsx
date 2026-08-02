import { CalendarDays } from 'lucide-react';

import { PagePlaceholder } from '@/components/page-placeholder';

export function CalendarPage() {
  return (
    <PagePlaceholder
      eyebrow="Calendar"
      title="Your month at a glance"
      description="This route is reserved for local-date mood summaries, clear no-data days, and daily entry navigation."
      icon={CalendarDays}
    />
  );
}
