'use client';

import React, { useEffect, useState } from 'react';

export default function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check for Service Worker updates natively via PWA events
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;

        // Active check on mount
        reg.update();

        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setShowPrompt(true);
        }

        reg.addEventListener('updatefound', () => {
          if (reg.installing) {
            reg.installing.addEventListener('statechange', () => {
              if (reg.installing?.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  setWaitingWorker(reg.installing);
                  setShowPrompt(true);
                }
              }
            });
          }
        });
      });

      // Reload when new worker takes over
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // 2. Custom robust Version Check via API/JSON
    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`);
        if (!res.ok) return;
        
        const data = await res.json();
        const currentVersion = localStorage.getItem('musifi_app_version');

        if (currentVersion && currentVersion !== data.version) {
          // If a new version exists on the server, but the SW hasn't triggered `updatefound` yet,
          // we force an SW update check.
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
              await reg.update(); // This should trigger the `updatefound` flow above
            } else {
              // If no SW but version changed, just show prompt to reload
              setShowPrompt(true);
            }
          } else {
            setShowPrompt(true);
          }
        }
        
        // If it's the first time, or after an update, set it
        if (!currentVersion || currentVersion === data.version) {
          localStorage.setItem('musifi_app_version', data.version);
        }
      } catch (err) {
        console.error('Failed to check version:', err);
      }
    };

    checkVersion();

    // Re-check when window regains focus
    window.addEventListener('focus', checkVersion);

    return () => {
      window.removeEventListener('focus', checkVersion);
    };
  }, []);

  const handleRefresh = () => {
    if (waitingWorker) {
      // The SW event listener for controllerchange will trigger window.reload
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Fallback reload and clear caches manually just in case
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (let name of names) caches.delete(name);
        });
      }
      window.location.reload();
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[9999] bg-[#121212] border border-neutral-800 p-4 rounded-xl shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between">
        <div className="text-white">
          <h3 className="font-bold text-[15px] flex items-center gap-2">
            <span>✨</span> New Update Available
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Refresh now to get the latest features, UI improvements, and bug fixes.
          </p>
        </div>
      </div>
      <div className="flex space-x-2 w-full mt-1">
        <button 
          onClick={() => setShowPrompt(false)} 
          className="flex-1 px-4 py-2 text-xs font-medium text-gray-300 bg-neutral-800/50 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Later
        </button>
        <button 
          onClick={handleRefresh} 
          className="flex-1 px-4 py-2 text-xs font-bold bg-white text-black rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
        >
          Refresh Now
        </button>
      </div>
    </div>
  );
}
