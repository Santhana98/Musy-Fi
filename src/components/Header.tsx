'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePlayer } from '@/context/PlayerContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  User, 
  LogOut,
  Bell,
  X
} from 'lucide-react';

interface HeaderProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export default function Header({ searchQuery = '', setSearchQuery }: HeaderProps) {
  const { data: session } = useSession();
  const { activeView, setActiveView } = usePlayer();

  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);

  // Update logic states
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  // Handle Scroll Behavior
  useEffect(() => {
    const scrollArea = document.getElementById('main-scroll-area');
    if (!scrollArea) return;

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const currentScrollY = target.scrollTop;
      
      // Apply glass effect if scrolled past 10px
      setIsScrolled(currentScrollY > 10);

      // Hide if scrolling down past 60px
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setIsVisible(false);
      } else if (currentScrollY <= 60) {
        // Only reveal if we are near the top (scrollTop <= 60)
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    scrollArea.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, []);

  // Check for Updates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;

        const checkAndShowPrompt = async (worker: ServiceWorker) => {
          setWaitingWorker(worker);
          try {
            const res = await fetch(`/version.json?t=${Date.now()}`);
            if (res.ok) {
              const data = await res.json();
              setLatestVersion(data.version);
              const snoozedUntil = parseInt(localStorage.getItem('musifi_update_snooze_until') || '0', 10);
              const snoozedVersion = localStorage.getItem('musifi_snoozed_version');
              if (Date.now() < snoozedUntil && snoozedVersion === data.version) return;
            }
          } catch (e) {}
          setHasUpdate(true);
        };

        reg.update();

        if (reg.waiting) {
          checkAndShowPrompt(reg.waiting);
        }

        reg.addEventListener('updatefound', () => {
          if (reg.installing) {
            reg.installing.addEventListener('statechange', () => {
              if (reg.installing?.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  checkAndShowPrompt(reg.installing);
                }
              }
            });
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`);
        if (!res.ok) return;
        
        const data = await res.json();
        setLatestVersion(data.version);
        const currentVersion = localStorage.getItem('musifi_app_version');
        const snoozedUntil = parseInt(localStorage.getItem('musifi_update_snooze_until') || '0', 10);
        const snoozedVersion = localStorage.getItem('musifi_snoozed_version');

        if (currentVersion && currentVersion !== data.version) {
          const isSnoozed = Date.now() < snoozedUntil && snoozedVersion === data.version;
          if (!isSnoozed) {
            if ('serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.getRegistration();
              if (reg) {
                await reg.update();
              } else {
                setHasUpdate(true);
              }
            } else {
              setHasUpdate(true);
            }
          }
        }
        
        if (!currentVersion || currentVersion === data.version) {
          localStorage.setItem('musifi_app_version', data.version);
        }
      } catch (err) {
        console.error('Failed to check version:', err);
      }
    };

    checkVersion();
    window.addEventListener('focus', checkVersion);
    return () => {
      window.removeEventListener('focus', checkVersion);
    };
  }, []);

  const handleRefresh = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (let name of names) caches.delete(name);
        });
      }
      window.location.reload();
    }
  };

  const handleLater = () => {
    localStorage.setItem('musifi_update_snooze_until', (Date.now() + 5 * 60 * 60 * 1000).toString());
    if (latestVersion) {
      localStorage.setItem('musifi_snoozed_version', latestVersion);
    }
    setHasUpdate(false);
    setShowUpdatePopup(false);
  };

  return (
    <header 
      className={`h-16 flex items-center justify-between px-4 md:px-8 select-none transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full md:translate-y-0'
      } ${
        isScrolled ? 'glass-header' : 'bg-transparent border-transparent md:bg-[#070708]/75 md:backdrop-blur-xl md:border-b md:border-white/5'
      }`}
    >
      {/* Navigation History & Search Bar */}
      <div className="flex items-center gap-4 md:gap-6 flex-1">
        {/* Mobile Brand Logo (hidden on desktop and search page) */}
        {activeView !== 'search' && (
          <div className="md:hidden flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('home')}>
            <img src="/logo.jpg" alt="Musy-Fi Logo" className="w-8 h-8 rounded-full object-cover animate-spin" style={{ animationDuration: '15s' }} />
            <span className="text-xl font-bold tracking-tight text-[#D62828]">Musy-Fi</span>
          </div>
        )}

        {/* Navigation History Arrows */}
        <div className="hidden md:flex items-center gap-2">
          <button 
            disabled 
            className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-zinc-500 cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            disabled 
            className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-zinc-500 cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Search Bar (Only shown on search tab or if searchQuery state callback is provided) */}
        {activeView === 'search' && setSearchQuery && (
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="What do you want to play?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/90 border border-zinc-800 text-white placeholder-zinc-500 text-sm pl-10 pr-4 py-2 rounded-full focus:outline-none focus:border-zinc-700 transition-all"
            />
          </div>
        )}
      </div>

      {/* User Session Profile controls */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setShowUpdatePopup(!showUpdatePopup)}
            className="p-2 text-zinc-400 hover:text-white transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {hasUpdate && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-spotify-green rounded-full shadow-[0_0_8px_rgba(214,40,40,0.8)]"></span>
            )}
          </button>

          {/* Notification Popup */}
          {showUpdatePopup && (
            <div className="absolute top-full right-0 mt-2 w-[calc(100vw-32px)] sm:w-80 max-w-sm bg-bg-card border border-border-muted p-4 rounded-xl shadow-2xl z-50 animate-in slide-in-from-top-2">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-[15px] flex items-center gap-2 text-white">
                  <span>✨</span> New Update Available
                </h3>
                <button onClick={() => setShowUpdatePopup(false)} className="text-zinc-500 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Update now to get the latest features, UI improvements, performance enhancements, and bug fixes.
              </p>
              <div className="flex space-x-2">
                <button 
                  onClick={handleLater} 
                  className="flex-1 px-4 py-2 text-xs font-medium text-zinc-300 bg-neutral-800/50 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Later
                </button>
                <button 
                  onClick={handleRefresh} 
                  className="flex-1 px-4 py-2 text-xs font-bold bg-white text-black rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap shadow-md"
                >
                  Update Now
                </button>
              </div>
            </div>
          )}
        </div>

        {session ? (
          <div className="flex items-center gap-3 bg-black/40 hover:bg-black/60 border border-zinc-900 rounded-full pl-2 pr-3 sm:pr-4 py-1.5 transition-all group relative cursor-pointer">
            {session.user?.image ? (
              <img 
                src={session.user.image} 
                alt={session.user.name || 'User'} 
                className="w-7 h-7 rounded-full object-cover border border-zinc-800"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                <User className="w-4 h-4 text-zinc-400" />
              </div>
            )}
            <span className="text-sm font-semibold text-zinc-200 group-hover:text-white truncate max-w-[80px] sm:max-w-[120px]">
              {session.user?.name || session.user?.email}
            </span>

            {/* Hover Sign-Out Dropdown */}
            <div className="absolute right-0 top-full pt-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50">
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-2 bg-bg-card border border-border-muted hover:bg-bg-active text-zinc-300 hover:text-white px-4 py-2.5 rounded-md text-xs font-semibold shadow-2xl transition-all w-32"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveView('settings')}
              className="text-zinc-400 hover:text-white text-sm font-bold"
            >
              Sign up
            </button>
            <button
              onClick={() => setActiveView('settings')}
              className="bg-white hover:scale-105 text-black font-bold text-sm px-6 py-2 rounded-full transition-all"
            >
              Log in
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
