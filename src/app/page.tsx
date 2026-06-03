'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MainView from '@/components/MainView';
import MusicPlayer from '@/components/MusicPlayer';
import { Disc } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Search query state managed in the dashboard shell and shared between Header and MainView
  const [searchQuery, setSearchQuery] = useState('');

  // Protect route
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-4 text-zinc-500">
        <img src="/logo.jpg" alt="Musi-Fi Logo" className="w-12 h-12 rounded-full object-cover animate-pulse" />
        <span className="text-sm font-semibold tracking-wide animate-pulse">Loading Musi-Fi...</span>
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
        <div className="flex-1 flex flex-col overflow-hidden bg-bg-base">
          {/* Header containing search bar & user profile */}
          <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

          {/* Core main dashboard viewport */}
          <MainView searchQuery={searchQuery} />
        </div>
      </div>

      {/* Persistent Bottom Controls Bar */}
      <MusicPlayer />
    </main>
  );
}
