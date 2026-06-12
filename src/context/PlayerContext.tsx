'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface Song {
  id: string;
  title: string;
  artist: string | null;
  youtubeUrl?: string;
  videoId?: string;
  driveFileId?: string | null;
  duration: number | null;
  thumbnail: string | null;
  liked?: boolean;
  importStatus?: string;
  addedAt?: string;
  lastPlayedAt?: string | null;
  // Computed helpers (not in DB)
  type?: string;
  sourceUrl?: string;
  isLiked?: boolean;
}

export type ActiveView = 'home' | 'search' | 'playlists' | 'liked-songs' | 'upload' | 'settings';

interface PlayerContextType {
  currentTrack: Song | null;
  isPlaying: boolean;
  queue: Song[];
  currentIndex: number;
  volume: number;
  progress: number;
  duration: number;
  playbackMode: 'normal' | 'shuffle' | 'repeat';
  activeView: ActiveView;
  activePlaylistId: string | null;
  trackRestartTrigger: number;

  // Theme state
  userTheme: 'male' | 'female' | null;
  loadingTheme: boolean;
  setUserTheme: (theme: 'male' | 'female') => Promise<void>;

  // Playback Control
  playTrack: (track: Song, newQueueContext?: Song[]) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  playNext: () => void;
  playPrev: () => void;
  setProgress: (p: number) => void;
  setVolume: (v: number) => void;
  setPlaybackMode: (m: 'normal' | 'shuffle' | 'repeat') => void;
  setActiveView: (v: ActiveView, playlistId?: string | null) => void;
  setActivePlaylistId: (id: string | null) => void;

  // Library
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  fetchSongs: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [currentTrack, setCurrentTrack] = useState<Song | null>(null);
  const [isPlaying, setIsPlayingState] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [progress, setProgressState] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackMode, setPlaybackModeState] = useState<'normal' | 'shuffle' | 'repeat'>('normal');
  const [activeView, setActiveViewState] = useState<ActiveView>('home');
  const [activePlaylistId, setActivePlaylistIdState] = useState<string | null>(null);
  const [trackRestartTrigger, setTrackRestartTrigger] = useState(0);
  const [userTheme, setUserThemeState] = useState<'male' | 'female' | null>(null);
  const [loadingTheme, setLoadingTheme] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);

  const fetchSongs = async () => {
    try {
      const res = await fetch('/api/songs/list');
      const data = await res.json();
      if (data.songs) setSongs(data.songs);
    } catch {}
  };

  useEffect(() => {
    if (session?.user) fetchSongs();
  }, [session]);

  const playTrack = (track: Song, newQueueContext?: Song[]) => {
    if (currentTrack?.id === track.id) {
      setTrackRestartTrigger(t => t + 1);
      setIsPlayingState(true);
      return;
    }
    const ctx = newQueueContext || queue;
    const idx = ctx.findIndex(s => s.id === track.id);
    setCurrentTrack(track);
    setQueue(ctx);
    setCurrentIndex(idx >= 0 ? idx : 0);
    setIsPlayingState(true);
    setProgressState(0);
  };

  const togglePlay = () => setIsPlayingState(p => !p);
  const setPlaying = (playing: boolean) => setIsPlayingState(playing);

  const playNext = () => {
    if (!queue.length) return;
    const next = playbackMode === 'shuffle'
      ? Math.floor(Math.random() * queue.length)
      : (currentIndex + 1) % queue.length;
    setCurrentTrack(queue[next]);
    setCurrentIndex(next);
    setProgressState(0);
    setIsPlayingState(true);
  };

  const playPrev = () => {
    if (!queue.length) return;
    const prev = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    setCurrentTrack(queue[prev]);
    setCurrentIndex(prev);
    setProgressState(0);
    setIsPlayingState(true);
  };

  const setUserTheme = async (theme: 'male' | 'female') => {
    setLoadingTheme(true);
    try {
      setUserThemeState(theme);
      localStorage.setItem('musyfi-theme', theme);
      await fetch('/api/user/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      });
    } finally {
      setLoadingTheme(false);
    }
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack, isPlaying, queue, currentIndex, volume, progress,
      duration, playbackMode, activeView, activePlaylistId, trackRestartTrigger,
      userTheme, loadingTheme, setUserTheme,
      playTrack, togglePlay, setPlaying, playNext, playPrev,
      setProgress: setProgressState, setVolume: setVolumeState,
      setPlaybackMode: setPlaybackModeState,
      setActiveView: (v: ActiveView, playlistId?: string | null) => { setActiveViewState(v); if (playlistId !== undefined) setActivePlaylistIdState(playlistId); },
      setActivePlaylistId: setActivePlaylistIdState,
      songs, setSongs, fetchSongs,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
