import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { ErrorPage } from '@/pages/error-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        lazy: async () => {
          const { TodayPage } = await import('@/pages/today-page');
          return { Component: TodayPage };
        },
      },
      {
        path: 'auth',
        lazy: async () => {
          const { AuthPage } = await import('@/pages/auth-page');
          return { Component: AuthPage };
        },
      },
      {
        path: 'log',
        lazy: async () => {
          const { LogPage } = await import('@/pages/log-page');
          return { Component: LogPage };
        },
      },
      {
        path: 'calendar',
        lazy: async () => {
          const { CalendarPage } = await import('@/pages/calendar-page');
          return { Component: CalendarPage };
        },
      },
      {
        path: 'stats',
        lazy: async () => {
          const { StatsPage } = await import('@/pages/stats-page');
          return { Component: StatsPage };
        },
      },
      {
        path: 'more',
        lazy: async () => {
          const { MorePage } = await import('@/pages/more-page');
          return { Component: MorePage };
        },
      },
    ],
  },
]);
