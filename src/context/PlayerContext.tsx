'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Song {
  id: string;
  title: string;
  artist: string;
  type: string; // "mp3" | "google" | "youtube" | "vimeo"
  sourceUrl: string;
  duration: number;
  thumbnail: string | null;
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
  
  // Playback Control Functions
  playTrack: (track: Song, newQueueContext?: Song[]) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setQueue: (queue: Song[]) => void;
  addToQueue: (track: Song) => void;
  removeFromQueue: (trackId: string) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setPlaybackMode: (mode: 'normal' | 'shuffle' | 'repeat') => void;
  
  // Navigation
  setActiveView: (view: ActiveView, playlistId?: string | null) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [queue, setQueueState] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [volume, setVolumeState] = useState<number>(0.7); // default 70%
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackMode, setPlaybackMode] = useState<'normal' | 'shuffle' | 'repeat'>('normal');
  const [activeView, setActiveViewState] = useState<ActiveView>('home');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [originalQueue, setOriginalQueue] = useState<Song[]>([]); // for restoring shuffle order

  // Load volume from local storage on mount
  useEffect(() => {
    const savedVolume = localStorage.getItem('musifi_volume');
    if (savedVolume) {
      setVolumeState(parseFloat(savedVolume));
    }
  }, []);

  const setVolume = (vol: number) => {
    const safeVol = Math.max(0, Math.min(1, vol));
    setVolumeState(safeVol);
    localStorage.setItem('musifi_volume', safeVol.toString());
  };

  const playTrack = (track: Song, newQueueContext?: Song[]) => {
    if (newQueueContext && newQueueContext.length > 0) {
      setQueueState(newQueueContext);
      setOriginalQueue(newQueueContext);
      const index = newQueueContext.findIndex((s) => s.id === track.id);
      setCurrentIndex(index !== -1 ? index : 0);
    } else {
      // If track is not in queue, add it and play it
      const existingIdx = queue.findIndex((s) => s.id === track.id);
      if (existingIdx !== -1) {
        setCurrentIndex(existingIdx);
      } else {
        const newQueue = [...queue, track];
        setQueueState(newQueue);
        setOriginalQueue(newQueue);
        setCurrentIndex(newQueue.length - 1);
      }
    }
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const setPlaying = (playing: boolean) => {
    setIsPlaying(playing);
  };

  const nextTrack = () => {
    if (queue.length === 0) return;
    
    if (playbackMode === 'repeat' && currentTrack) {
      // Repeat track: reset progress and play again
      setProgress(0);
      // force reload stream
      const temp = currentTrack;
      setCurrentTrack(null);
      setTimeout(() => setCurrentTrack(temp), 50);
      return;
    }

    let nextIdx = currentIndex + 1;
    if (playbackMode === 'shuffle') {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (nextIdx >= queue.length) {
      nextIdx = 0; // wrap around
    }

    setCurrentIndex(nextIdx);
    setCurrentTrack(queue[nextIdx]);
    setProgress(0);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    if (queue.length === 0) return;

    let prevIdx = currentIndex - 1;
    if (playbackMode === 'shuffle') {
      prevIdx = Math.floor(Math.random() * queue.length);
    } else if (prevIdx < 0) {
      prevIdx = queue.length - 1; // wrap to end
    }

    setCurrentIndex(prevIdx);
    setCurrentTrack(queue[prevIdx]);
    setProgress(0);
    setIsPlaying(true);
  };

  const setQueue = (newQueue: Song[]) => {
    setQueueState(newQueue);
    setOriginalQueue(newQueue);
    if (currentTrack) {
      const idx = newQueue.findIndex((s) => s.id === currentTrack.id);
      setCurrentIndex(idx);
    }
  };

  const addToQueue = (track: Song) => {
    if (queue.some((s) => s.id === track.id)) return;
    setQueueState([...queue, track]);
    setOriginalQueue([...originalQueue, track]);
  };

  const removeFromQueue = (trackId: string) => {
    const newQueue = queue.filter((s) => s.id !== trackId);
    setQueueState(newQueue);
    setOriginalQueue(originalQueue.filter((s) => s.id !== trackId));
    
    if (currentTrack?.id === trackId) {
      if (newQueue.length > 0) {
        const nextIdx = currentIndex >= newQueue.length ? 0 : currentIndex;
        setCurrentIndex(nextIdx);
        setCurrentTrack(newQueue[nextIdx]);
      } else {
        setCurrentTrack(null);
        setIsPlaying(false);
        setCurrentIndex(-1);
      }
    } else {
      // update currentIndex
      if (currentTrack) {
        const newIdx = newQueue.findIndex((s) => s.id === currentTrack.id);
        setCurrentIndex(newIdx);
      }
    }
  };

  const setActiveView = (view: ActiveView, playlistId: string | null = null) => {
    setActiveViewState(view);
    setActivePlaylistId(playlistId);
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        queue,
        currentIndex,
        volume,
        progress,
        duration,
        playbackMode,
        activeView,
        activePlaylistId,
        playTrack,
        togglePlay,
        setPlaying,
        nextTrack,
        prevTrack,
        setQueue,
        addToQueue,
        removeFromQueue,
        setVolume,
        setProgress,
        setDuration,
        setPlaybackMode,
        setActiveView,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
