import { ListTree } from 'lucide-react';

import { PagePlaceholder } from '@/components/page-placeholder';

export function LogPage() {
  return (
    <PagePlaceholder
      eyebrow="Log"
      title="Your entries"
      description="A searchable, reverse-chronological timeline will live here once core mood entries and synchronization are implemented."
      icon={ListTree}
    />
  );
}
