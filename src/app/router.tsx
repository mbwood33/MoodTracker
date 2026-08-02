import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { CalendarPage } from '@/pages/calendar-page';
import { ErrorPage } from '@/pages/error-page';
import { LogPage } from '@/pages/log-page';
import { MorePage } from '@/pages/more-page';
import { StatsPage } from '@/pages/stats-page';
import { TodayPage } from '@/pages/today-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'log', element: <LogPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'more', element: <MorePage /> },
    ],
  },
]);
