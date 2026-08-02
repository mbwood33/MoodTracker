import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type PagePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children?: ReactNode;
};

export function PagePlaceholder({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: PagePlaceholderProps) {
  return (
    <section>
      <div className="flex items-start gap-4">
        <div className="bg-primary/10 text-primary grid size-12 shrink-0 place-items-center rounded-2xl">
          <Icon aria-hidden="true" className="size-6" />
        </div>
        <div>
          <p className="text-primary text-sm font-medium">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-base leading-7 text-pretty">
            {description}
          </p>
        </div>
      </div>

      <div className="border-border bg-card/50 mt-8 rounded-3xl border border-dashed p-6 sm:p-10">
        {children ?? (
          <div className="mx-auto max-w-md text-center">
            <p className="font-medium">
              This workspace is ready for its feature.
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Product behavior will be added in a later phase; this release only
              establishes the application foundation.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
