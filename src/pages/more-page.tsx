import { CircleEllipsis, FileUp } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { PagePlaceholder } from '@/components/page-placeholder';

export function MorePage() {
  return (
    <div className="space-y-6">
      <PagePlaceholder
        eyebrow="More"
        title="Tools and preferences"
        description="Settings, import and export, reminders, maps, photos, memories, and privacy controls will be organized here as their phases arrive."
        icon={CircleEllipsis}
      />
      <div className="border-border bg-card rounded-3xl border p-5 shadow-sm">
        <FileUp aria-hidden="true" className="text-primary size-6" />
        <h2 className="mt-3 text-lg font-semibold">Import mood data</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Preview and save CSV mood entries, including activity tags and notes.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/import">Import CSV</Link>
        </Button>
      </div>
    </div>
  );
}
