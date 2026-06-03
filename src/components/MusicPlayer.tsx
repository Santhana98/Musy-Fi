'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePlayer, Song } from '@/context/PlayerContext';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Shuffle, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Heart,
  Music,
  Tv
} from 'lucide-react';

// Dynamically import ReactPlayer with SSR disabled since it uses window/navigator APIs
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

export default function MusicPlayer() {
  const {
    currentTrack,
    isPlaying,
    setPlaying,
    togglePlay,
    volume,
    setVolume,
    progress,
    setProgress,
    duration,
    setDuration,
    playbackMode,
    setPlaybackMode,
    nextTrack,
    prevTrack,
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [isSeeking, setIsSeeking] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  const isVideoTrack = currentTrack?.type === 'youtube' || currentTrack?.type === 'vimeo';

  // 1. Synchronize HTML5 Audio Element Play/Pause
  useEffect(() => {
    if (!audioRef.current || isVideoTrack || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.play().catch(err => {
        console.warn('Audio play interrupted or requires user interaction:', err);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack, isVideoTrack]);

  // 2. Volume synchronization
  useEffect(() => {
    const currentVol = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = currentVol;
    }
  }, [volume, isMuted]);

  // 3. Media Session API for background lockscreen controls
  useEffect(() => {
    if (!currentTrack || typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    // Set metadata
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: 'Musi-Fi Cloud Library',
      artwork: currentTrack.thumbnail 
        ? [{ src: currentTrack.thumbnail, sizes: '300x300', type: 'image/jpeg' }]
        : [{ src: '/placeholder-artwork.jpg', sizes: '300x300', type: 'image/jpeg' }]
    });

    // Action Handlers
    navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
    navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    };
  }, [currentTrack]);

  if (!currentTrack) return null;

  // Handle HTML5 Audio Callbacks
  const handleAudioTimeUpdate = () => {
    if (isSeeking || !audioRef.current) return;
    setProgress(audioRef.current.currentTime);
  };

  const handleAudioLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleAudioEnded = () => {
    nextTrack();
  };

  // Handle YouTube/Video Callbacks
  const handleVideoProgress = (state: { playedSeconds: number }) => {
    if (isSeeking) return;
    setProgress(state.playedSeconds);
  };

  const handleVideoDuration = (dur: number) => {
    setDuration(dur);
  };

  const handleVideoEnded = () => {
    nextTrack();
  };

  // Unified Seek Slider actions
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSeeking(true);
    const value = parseFloat(e.target.value);
    setProgress(value);
  };

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsSeeking(false);
    const value = parseFloat((e.target as HTMLInputElement).value);
    
    if (isVideoTrack && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(value);
    } else if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
    setProgress(value);
  };

  // Toggle Mute Helper
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(prevVolume);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      setVolume(0);
    }
  };

  // Format Time helper
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const streamUrl = `/api/songs/stream?id=${currentTrack.id}`;

  return (
    <>
      {/* HTML5 Audio Player (MP3s) */}
      {!isVideoTrack && currentTrack && (
        <audio
          ref={audioRef}
          src={streamUrl}
          onTimeUpdate={handleAudioTimeUpdate}
          onLoadedMetadata={handleAudioLoadedMetadata}
          onEnded={handleAudioEnded}
        />
      )}

      {/* Invisible YouTube / Video player satisfying size and visibility rules */}
      {isVideoTrack && (
        <div className="fixed bottom-0 right-0 w-[200px] h-[200px] opacity-[0.001] pointer-events-none z-[-1] overflow-hidden">
          <ReactPlayer
            onReady={(player: any) => {
              ytPlayerRef.current = player;
            }}
            url={
              currentTrack.type === 'youtube'
                ? `https://www.youtube.com/watch?v=${currentTrack.sourceUrl}`
                : `https://vimeo.com/${currentTrack.sourceUrl}`
            }
            playing={isPlaying}
            volume={isMuted ? 0 : volume}
            onProgress={handleVideoProgress}
            onDuration={handleVideoDuration}
            onEnded={handleVideoEnded}
            width="100%"
            height="100%"
            config={{
              youtube: {
                playerVars: {
                  controls: 0,
                  modestbranding: 1,
                  rel: 0,
                  showinfo: 0,
                  iv_load_policy: 3,
                  disablekb: 1
                },
              },
            }}
          />
        </div>
      )}

      {/* Bottom Control Bar Layout */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-zinc-950/95 border-t border-zinc-900 px-6 flex items-center justify-between select-none z-30 backdrop-blur-lg">
        
        {/* Left Side: Active Track Metadata */}
        <div className="flex items-center gap-4 w-[30%] min-w-[180px]">
          <div className="w-16 h-16 bg-zinc-900 rounded flex-shrink-0 flex items-center justify-center border border-zinc-800 overflow-hidden relative group">
            {currentTrack.thumbnail ? (
              <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover" />
            ) : (
              <Music className="w-6 h-6 text-zinc-500" />
            )}
          </div>
          <div className="truncate">
            <h4 className="text-sm font-bold text-white truncate hover:underline cursor-pointer">{currentTrack.title}</h4>
            <p className="text-xs text-zinc-400 truncate hover:underline cursor-pointer">{currentTrack.artist}</p>
          </div>
          <button className="text-zinc-400 hover:text-white transition-colors">
            <Heart className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Playback Core Controls & Seek Timeline */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl px-4">
          
          {/* Controls buttons row */}
          <div className="flex items-center gap-5">
            <button 
              onClick={() => setPlaybackMode(playbackMode === 'shuffle' ? 'normal' : 'shuffle')}
              className={`hover:text-white transition-colors ${playbackMode === 'shuffle' ? 'text-spotify-green' : 'text-zinc-400'}`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            
            <button onClick={prevTrack} className="text-zinc-400 hover:text-white transition-colors" title="Previous">
              <SkipBack className="w-5 h-5 fill-zinc-400 hover:fill-white" />
            </button>

            <button
              onClick={togglePlay}
              className="bg-white hover:scale-105 p-3 rounded-full text-black transition-transform flex items-center justify-center"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black ml-0.5" />
              )}
            </button>

            <button onClick={nextTrack} className="text-zinc-400 hover:text-white transition-colors" title="Next">
              <SkipForward className="w-5 h-5 fill-zinc-400 hover:fill-white" />
            </button>

            <button 
              onClick={() => setPlaybackMode(playbackMode === 'repeat' ? 'normal' : 'repeat')}
              className={`hover:text-white transition-colors ${playbackMode === 'repeat' ? 'text-spotify-green' : 'text-zinc-400'}`}
              title="Repeat"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Seek Slider */}
          <div className="w-full flex items-center gap-3">
            <span className="text-[10px] font-semibold text-zinc-400 w-8 text-right">
              {formatTime(progress)}
            </span>
            
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={progress}
              onChange={handleSeekChange}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-spotify-green hover:accent-spotify-green-hover transition-all focus:outline-none"
            />
            
            <span className="text-[10px] font-semibold text-zinc-400 w-8">
              {formatTime(duration)}
            </span>
          </div>

        </div>

        {/* Right Side: Volume Controls & PiP video toggles */}
        <div className="flex items-center justify-end gap-3 w-[30%] min-w-[150px] text-zinc-400">

          <button onClick={toggleMute} className="hover:text-white transition-colors" title="Mute/Unmute">
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-red-500" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
          
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVolume(val);
              if (val > 0) setIsMuted(false);
            }}
            className="w-24 h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-spotify-green focus:outline-none"
          />
        </div>

      </div>
    </>
  );
}
