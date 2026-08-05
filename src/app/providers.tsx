import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';

import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/features/auth';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            networkMode: 'offlineFirst',
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            networkMode: 'offlineFirst',
          },
        },
      }),
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
