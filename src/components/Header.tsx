'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePlayer } from '@/context/PlayerContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  User, 
  LogOut 
} from 'lucide-react';

interface HeaderProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export default function Header({ searchQuery = '', setSearchQuery }: HeaderProps) {
  const { data: session } = useSession();
  const { activeView, setActiveView } = usePlayer();

  return (
    <header className="glass-header h-16 flex items-center justify-between px-4 md:px-8 select-none z-10">
      {/* Navigation History & Search Bar */}
      <div className="flex items-center gap-4 md:gap-6 flex-1">
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
        {session ? (
          <div className="flex items-center gap-3 bg-black/40 hover:bg-black/60 border border-zinc-900 rounded-full pl-2 pr-2 sm:pr-4 py-1.5 transition-all group relative cursor-pointer">
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
            <span className="text-sm font-semibold text-zinc-200 group-hover:text-white truncate max-w-[120px] hidden sm:inline">
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
