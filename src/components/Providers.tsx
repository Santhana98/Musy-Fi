'use client';

import React, { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { PlayerProvider } from '@/context/PlayerContext';
import UpdatePrompt from '@/components/UpdatePrompt';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'development') {
        // Unregister stale service workers in dev mode to avoid caching bugs
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log('Unregistered stale service worker in dev mode');
              }
            });
          }
        });
      } else {
        // Register service worker in production only
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then(
            (reg) => console.log('ServiceWorker registered successfully with scope:', reg.scope),
            (err) => console.warn('ServiceWorker registration failed:', err)
          );
        });
      }
    }
  }, []);

  return (
    <SessionProvider>
      <PlayerProvider>
        {children}
        <UpdatePrompt />
      </PlayerProvider>
    </SessionProvider>
  );
}
