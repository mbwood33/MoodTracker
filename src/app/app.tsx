import { RouterProvider } from 'react-router-dom';

import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';
import { PwaUpdatePrompt } from '@/components/pwa-update-prompt';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <PwaInstallPrompt />
      <PwaUpdatePrompt />
    </AppProviders>
  );
}
