'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MainView from '@/components/MainView';
import MusicPlayer from '@/components/MusicPlayer';
import { Disc, Home, Search, Heart, UploadCloud, Settings } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { activeView, setActiveView } = usePlayer();
  const router = useRouter();
  
  // Search query state managed in the dashboard shell and shared between Header and MainView
  const [searchQuery, setSearchQuery] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  // Mark app as loaded once the user is authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      setHasLoaded(true);
    }
  }, [status]);

  // Protect route
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading' && !hasLoaded) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-4 text-zinc-500">
        <img src="/logo.jpg" alt="Musy-Fi Logo" className="w-12 h-12 rounded-full object-cover animate-pulse" />
        <span className="text-sm font-semibold tracking-wide animate-pulse">Loading Musy-Fi...</span>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // will redirect in useEffect
  }

  return (
    <main className="h-screen w-screen bg-bg-base text-foreground flex flex-col overflow-hidden relative select-none">
      {/* Top Main Section */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-bg-base relative">
          {/* Header containing search bar & user profile */}
          <div className="absolute top-0 left-0 right-0 z-50">
            <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </div>

          {/* Core main dashboard viewport */}
          <MainView searchQuery={searchQuery} />
        </div>
      </div>

      {/* Persistent Bottom Controls Bar */}
      <MusicPlayer />

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden bg-bg-sidebar border-t border-border-muted py-2 flex items-center justify-around z-20">
        <button
          onClick={() => setActiveView('home')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeView === 'home' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>
        <button
          onClick={() => setActiveView('search')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeView === 'search' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
        >
          <Search className="w-5 h-5" />
          <span>Search</span>
        </button>
        <button
          onClick={() => setActiveView('liked-songs')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeView === 'liked-songs' ? 'text-[#D62828]' : 'text-zinc-400 hover:text-white'}`}
        >
          <Heart className={`w-5 h-5 ${activeView === 'liked-songs' ? 'fill-red-500 text-red-500' : ''}`} />
          <span>Liked</span>
        </button>
        <button
          onClick={() => setActiveView('upload')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeView === 'upload' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
        >
          <UploadCloud className="w-5 h-5" />
          <span>Upload</span>
        </button>
        <button
          onClick={() => setActiveView('settings')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeView === 'settings' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </main>
  );
}
