import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleEllipsis,
  House,
  ListTree,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  end?: boolean;
};

const navigationItems: NavigationItem[] = [
  { label: 'Today', href: '/', icon: House, end: true },
  { label: 'Log', href: '/log', icon: ListTree },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays },
  { label: 'Stats', href: '/stats', icon: ChartNoAxesCombined },
  { label: 'More', href: '/more', icon: CircleEllipsis },
];

export function AppNavigation({ variant }: { variant: 'sidebar' | 'bottom' }) {
  return (
    <div
      className={cn(
        variant === 'sidebar' && 'flex flex-col gap-1 px-3 py-3',
        variant === 'bottom' && 'grid h-16 grid-cols-5',
      )}
    >
      {navigationItems.map(({ label, href, icon: Icon, end }) => (
        <NavLink
          key={href}
          to={href}
          end={end}
          className={({ isActive }) =>
            cn(
              'group focus-visible:ring-ring flex items-center text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
              variant === 'sidebar' &&
                'text-muted-foreground hover:bg-accent hover:text-accent-foreground min-h-11 gap-3 rounded-xl px-3',
              variant === 'bottom' &&
                'text-muted-foreground min-h-14 flex-col justify-center gap-1 text-[0.68rem]',
              isActive &&
                variant === 'sidebar' &&
                'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
              isActive && variant === 'bottom' && 'text-primary',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  variant === 'bottom' &&
                    'grid h-7 min-w-12 place-items-center rounded-full',
                  isActive && variant === 'bottom' && 'bg-primary/10',
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
