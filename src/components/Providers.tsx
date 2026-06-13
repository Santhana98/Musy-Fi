'use client';

import React, { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { PlayerProvider } from '@/context/PlayerContext';
import MusicPlayer from '@/components/MusicPlayer';

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
        // Clear all Cache Storage except the current expected ones to wipe out any Lovable-cached pages/assets
        if ('caches' in window) {
          caches.keys().then((names) => {
            for (let name of names) {
              if (name !== 'musyfi-v2' && name !== 'musyfi-audio-v2') {
                caches.delete(name);
              }
            }
          });
        }

        // Register service worker in production only
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then(
            (reg) => console.log('ServiceWorker registered successfully with scope:', reg.scope),
            (err) => console.warn('ServiceWorker registration failed:', err)
          );
        });
      }
    }

    // Handle Capacitor hardware back button on Android
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('backButton', ({ canGoBack }) => {
          if (!canGoBack || window.location.pathname === '/') {
            App.exitApp();
          } else {
            window.history.back();
          }
        });
      });
    }
  }, []);

  return (
    <SessionProvider>
      <PlayerProvider>
        {children}
        <MusicPlayer />
      </PlayerProvider>
    </SessionProvider>
  );
}
