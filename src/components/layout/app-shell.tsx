import { Cloud, CloudOff } from 'lucide-react';
import { Outlet } from 'react-router-dom';

import { AppNavigation } from '@/components/layout/app-navigation';
import { ThemeSwitcher } from '@/components/theme-switcher';

export function AppShell() {
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Skip to content
      </a>

      <div className="mx-auto flex min-h-dvh max-w-screen-2xl">
        <aside className="border-border bg-sidebar hidden w-64 shrink-0 border-r lg:flex lg:flex-col">
          <Brand />
          <AppNavigation variant="sidebar" />
          <div className="border-border mt-auto border-t p-5">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <CloudOff aria-hidden="true" className="size-4" />
              Offline foundation ready
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-border/80 bg-background/90 sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <div className="text-muted-foreground hidden items-center gap-2 text-sm lg:flex">
              <Cloud aria-hidden="true" className="text-success size-4" />
              <span>Local-first workspace</span>
            </div>
            <ThemeSwitcher />
          </header>

          <main
            id="main-content"
            className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:px-10 lg:pb-12"
          >
            <Outlet />
          </main>

          <nav
            aria-label="Primary navigation"
            className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
          >
            <AppNavigation variant="bottom" />
          </nav>
        </div>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? 'flex items-center gap-2'
          : 'flex h-20 items-center gap-3 px-6'
      }
    >
      <span
        aria-hidden="true"
        className="bg-primary shadow-primary/20 grid size-9 place-items-center rounded-xl shadow-lg"
      >
        <span className="border-primary-foreground size-4 rounded-full border-[3px]" />
      </span>
      <span
        className={
          compact ? 'text-sm font-semibold' : 'font-semibold tracking-tight'
        }
      >
        Mood Tracker
      </span>
    </div>
  );
}
