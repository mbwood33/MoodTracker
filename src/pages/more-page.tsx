import { Bell, CircleEllipsis, FileUp } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { PagePlaceholder } from '@/components/page-placeholder';

export function MorePage() {
  return (
    <div className="space-y-6">
      <PagePlaceholder
        eyebrow="More"
        title="Tools and preferences"
        description="Manage reminders and imports here. Settings, export, maps, photos, memories, and privacy controls will join them as their phases arrive."
        icon={CircleEllipsis}
      >
        <div className="mx-auto max-w-md text-center">
          <p className="font-medium">Choose a tool below</p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Your reminders and imported entries stay private to your signed-in
            account.
          </p>
        </div>
      </PagePlaceholder>
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
      <div className="border-border bg-card rounded-3xl border p-5 shadow-sm">
        <Bell aria-hidden="true" className="text-primary size-6" />
        <h2 className="mt-3 text-lg font-semibold">Reminders</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Set gentle mood check-ins for any time and the days that work for you.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/reminders">Manage reminders</Link>
        </Button>
      </div>
    </div>
  );
}
