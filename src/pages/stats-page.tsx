import { ChartNoAxesCombined } from 'lucide-react';

import { PagePlaceholder } from '@/components/page-placeholder';

export function StatsPage() {
  return (
    <PagePlaceholder
      eyebrow="Stats"
      title="Understand your patterns"
      description="Transparent charts and tested, framework-independent mood calculations will be introduced after the data model is stable."
      icon={ChartNoAxesCombined}
    />
  );
}
