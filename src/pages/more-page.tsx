import { CircleEllipsis } from 'lucide-react';

import { PagePlaceholder } from '@/components/page-placeholder';

export function MorePage() {
  return (
    <PagePlaceholder
      eyebrow="More"
      title="Tools and preferences"
      description="Settings, import and export, reminders, maps, photos, memories, and privacy controls will be organized here as their phases arrive."
      icon={CircleEllipsis}
    />
  );
}
