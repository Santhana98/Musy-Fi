'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePlayer, Song } from '@/context/PlayerContext';
import { useSession } from 'next-auth/react';
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
  Tv,
  ChevronDown,
  Disc
} from 'lucide-react';

// Dynamically import ReactPlayer with SSR disabled since it uses window/navigator APIs
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

export default function MusicPlayer() {
  const { data: session } = useSession();
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [useVideoFallback, setUseVideoFallback] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  const isYouTubeTrack = currentTrack?.type === 'youtube';
  const isVimeoTrack = currentTrack?.type === 'vimeo';
  const isVideoTrack = isVimeoTrack || (isYouTubeTrack && useVideoFallback);

  const normalizeYouTubeUrl = (sourceUrl: string) => {
    if (/^[a-zA-Z0-9_-]{11}$/.test(sourceUrl)) {
      return `https://www.youtube.com/watch?v=${sourceUrl}`;
    }

    try {
      const url = new URL(sourceUrl);
      const videoId =
        url.searchParams.get('v') ||
        url.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/)?.[1] ||
        (url.hostname.includes('youtu.be') ? url.pathname.split('/').filter(Boolean)[0] : null);

      return videoId ? `https://www.youtube.com/watch?v=${videoId}` : sourceUrl;
    } catch {
      return sourceUrl;
    }
  };

  const seekTo = (seconds: number) => {
    if (isVideoTrack && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(seconds, 'seconds');
    } else if (audioRef.current) {
      audioRef.current.currentTime = seconds;
    }

    setProgress(seconds);
  };

  useEffect(() => {
    setUseVideoFallback(false);
  }, [currentTrack?.id]);

  // 1. Force reload audio source when track changes
  useEffect(() => {
    if (!audioRef.current || isVideoTrack || !currentTrack) return;
    
    try {
      audioRef.current.load();
    } catch (err) {
      console.warn('Audio element load failed:', err);
    }
    
    if (isPlaying) {
      audioRef.current.play().catch(err => {
        console.warn('Initial play on track change interrupted:', err);
      });
    }
  }, [currentTrack, isVideoTrack, isPlaying]);

  // 2. Synchronize Play/Pause toggling
  useEffect(() => {
    if (!audioRef.current || isVideoTrack || !currentTrack) return;

    if (isPlaying) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(err => {
          console.warn('Play trigger interrupted:', err);
        });
      }
    } else {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isVideoTrack, currentTrack]);

  // 2. Volume synchronization
  useEffect(() => {
    const currentVol = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = currentVol;
    }
  }, [volume, isMuted]);

  // 3. Media Session API for background lockscreen metadata and controls
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

    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekTo(details.seekTime);
        }
      });
    } catch (err) {
      console.warn('Media Session seekto not supported:', err);
    }

    try {
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        const current = audioRef.current && !isVideoTrack ? audioRef.current.currentTime : progress;
        seekTo(Math.max(0, current - offset));
      });
    } catch (err) {
      console.warn('Media Session seekbackward not supported:', err);
    }

    try {
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        const current = audioRef.current && !isVideoTrack ? audioRef.current.currentTime : progress;
        seekTo(Math.min(duration || 0, current + offset));
      });
    } catch (err) {
      console.warn('Media Session seekforward not supported:', err);
    }

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      try {
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      } catch (err) {}
    };
  }, [currentTrack, duration, progress, isVideoTrack]);

  // 4. Synchronize Playback State & Position with Media Session API dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !currentTrack) return;

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    try {
      if ('setPositionState' in navigator.mediaSession) {
        if (duration && duration > 0 && progress >= 0 && progress <= duration) {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: 1,
            position: progress,
          });
        }
      }
    } catch (err) {
      console.warn('Could not set mediaSession position state:', err);
    }
  }, [isPlaying, progress, duration, currentTrack]);

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

  const handleAudioCanPlay = () => {
    if (isPlaying && audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(err => {
        console.warn('Play attempt inside onCanPlay failed:', err);
      });
    }
  };

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    console.error('HTML5 Audio error encountered:', e.currentTarget.error);
    if (isYouTubeTrack) {
      setUseVideoFallback(true);
    }
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
    
    seekTo(value);
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

  const token = (session?.user as any)?.id || '';
  const streamUrl = `/api/songs/stream?id=${currentTrack.id}${token ? `&token=${token}` : ''}`;

  return (
    <>
      {/* HTML5 Audio Player (MP3s, Google Drive, local files, and YouTube stream-first playback) */}
      {!isVideoTrack && currentTrack && (
        <audio
          ref={audioRef}
          src={streamUrl}
          onTimeUpdate={handleAudioTimeUpdate}
          onLoadedMetadata={handleAudioLoadedMetadata}
          onEnded={handleAudioEnded}
          onCanPlay={handleAudioCanPlay}
          onError={handleAudioError}
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
              isYouTubeTrack
                ? normalizeYouTubeUrl(currentTrack.sourceUrl)
                : `https://vimeo.com/${currentTrack.sourceUrl}`
            }
            playing={isPlaying}
            volume={isMuted ? 0 : volume}
            playsinline
            muted={false}
            onProgress={handleVideoProgress}
            onDuration={handleVideoDuration}
            onEnded={handleVideoEnded}
            width="100%"
            height="100%"
            config={{
              youtube: {
                playerVars: {
                  controls: 0,
                  autoplay: 1,
                  modestbranding: 1,
                  rel: 0,
                  showinfo: 0,
                  iv_load_policy: 3,
                  disablekb: 1,
                  enablejsapi: 1,
                  playsinline: 1
                },
              },
            }}
          />
        </div>
      )}

      {/* Fullscreen Mobile Player Overlay */}
      {isExpanded && (
        <div className="fixed inset-0 bg-zinc-950/98 backdrop-blur-2xl z-50 md:hidden flex flex-col justify-between px-6 py-8 select-none text-white animate-slide-up">
          
          {/* Top Header bar */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setIsExpanded(false)} 
              className="p-2.5 bg-zinc-900/60 hover:bg-zinc-800 rounded-full border border-zinc-800/40"
            >
              <ChevronDown className="w-6 h-6 text-zinc-400" />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Now Playing</span>
            <div className="w-11"></div> {/* Alignment spacer */}
          </div>

          {/* Large Rotating Cover Disc */}
          <div className="flex-1 flex flex-col items-center justify-center my-8">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden shadow-[0_0_50px_rgba(214,40,40,0.15)] border border-zinc-850 flex items-center justify-center bg-zinc-900">
              <img 
                src={currentTrack.thumbnail || '/assets/images/18.jpg'} 
                alt={currentTrack.title} 
                className={`w-full h-full object-cover transition-transform duration-[20000ms] ease-linear ${isPlaying ? 'animate-spin' : ''}`}
                style={{ borderRadius: '50%' }}
                onError={(e) => {
                  e.currentTarget.src = '/assets/images/18.jpg';
                }}
              />
              {/* Inner Hole for Vinyl Disk look */}
              <div className="absolute w-14 h-14 bg-zinc-950 border-4 border-zinc-900 rounded-full shadow-inner z-10 flex items-center justify-center">
                <div className="w-3.5 h-3.5 bg-zinc-800 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Track Details */}
          <div className="space-y-1 mb-4">
            <div className="flex items-center justify-between">
              <div className="max-w-[80%]">
                <h2 className="text-2xl font-black text-white truncate tracking-tight">{currentTrack.title}</h2>
                <p className="text-base text-zinc-400 font-semibold truncate mt-0.5">{currentTrack.artist}</p>
              </div>
              <button className="text-zinc-400 hover:text-white p-2">
                <Heart className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Mobile Seek Slider */}
          <div className="space-y-3 mb-6">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={progress}
              onChange={handleSeekChange}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-spotify-green focus:outline-none"
            />
            <div className="flex justify-between text-xs text-zinc-500 font-bold uppercase tracking-wider">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Expanded Playback Controls */}
          <div className="flex items-center justify-between px-2 mb-4">
            <button 
              onClick={() => setPlaybackMode(playbackMode === 'shuffle' ? 'normal' : 'shuffle')}
              className={`p-3 transition-colors ${playbackMode === 'shuffle' ? 'text-spotify-green' : 'text-zinc-500'}`}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button onClick={prevTrack} className="p-3 text-zinc-300">
              <SkipBack className="w-7 h-7 fill-current" />
            </button>

            <button 
              onClick={togglePlay} 
              className="w-16 h-16 bg-white rounded-full text-black flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-black" />
              ) : (
                <Play className="w-6 h-6 fill-black ml-1" />
              )}
            </button>

            <button onClick={nextTrack} className="p-3 text-zinc-300">
              <SkipForward className="w-7 h-7 fill-current" />
            </button>

            <button 
              onClick={() => setPlaybackMode(playbackMode === 'repeat' ? 'normal' : 'repeat')}
              className={`p-3 transition-colors ${playbackMode === 'repeat' ? 'text-spotify-green' : 'text-zinc-500'}`}
            >
              <Repeat className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Control Bar Layout (Mini-player on mobile, standard on desktop) */}
      <div 
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-14 md:bottom-0 left-0 right-0 h-20 md:h-24 bg-zinc-950/95 border-t border-zinc-900 px-4 md:px-6 flex items-center justify-between select-none z-30 backdrop-blur-lg cursor-pointer md:cursor-default"
      >
        
        {/* Thin progress bar visible only on mobile top-edge when collapsed */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-zinc-900 md:hidden">
          <div 
            className="bg-spotify-green h-full transition-all duration-300"
            style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
          ></div>
        </div>
        
        {/* Left Side: Active Track Metadata */}
        <div className="flex items-center gap-2 md:gap-4 w-[60%] md:w-[30%] min-w-[140px] md:min-w-[180px]">
          <div className="w-10 h-10 md:w-16 md:h-16 bg-zinc-900 rounded flex-shrink-0 flex items-center justify-center border border-zinc-800 overflow-hidden relative group">
            {currentTrack.thumbnail ? (
              <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover" />
            ) : (
              <Music className="w-5 h-5 text-zinc-500" />
            )}
          </div>
          <div className="truncate flex-1">
            <h4 className="text-xs md:text-sm font-bold text-white truncate hover:underline">{currentTrack.title}</h4>
            <p className="text-[10px] md:text-xs text-zinc-400 truncate hover:underline">{currentTrack.artist}</p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // handle like toggle or just custom action
            }}
            className="text-zinc-400 hover:text-white transition-colors p-1"
          >
            <Heart className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Playback Core Controls & Seek Timeline */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-1 md:gap-2 flex-1 max-w-2xl px-2 md:px-4"
        >
          
          {/* Controls buttons row */}
          <div className="flex items-center gap-3 md:gap-5">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setPlaybackMode(playbackMode === 'shuffle' ? 'normal' : 'shuffle');
              }}
              className={`hover:text-white transition-colors hidden md:block ${playbackMode === 'shuffle' ? 'text-spotify-green' : 'text-zinc-400'}`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                prevTrack();
              }}
              className="text-zinc-400 hover:text-white transition-colors p-1" 
              title="Previous"
            >
              <SkipBack className="w-5 h-5 fill-zinc-400 hover:fill-white" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="bg-white hover:scale-105 p-2 md:p-3 rounded-full text-black transition-transform flex items-center justify-center"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4.5 h-4.5 md:w-5 md:h-5 fill-black" />
              ) : (
                <Play className="w-4.5 h-4.5 md:w-5 md:h-5 fill-black ml-0.5" />
              )}
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                nextTrack();
              }}
              className="text-zinc-400 hover:text-white transition-colors p-1" 
              title="Next"
            >
              <SkipForward className="w-5 h-5 fill-zinc-400 hover:fill-white" />
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                setPlaybackMode(playbackMode === 'repeat' ? 'normal' : 'repeat');
              }}
              className={`hover:text-white transition-colors hidden md:block ${playbackMode === 'repeat' ? 'text-spotify-green' : 'text-zinc-400'}`}
              title="Repeat"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Seek Slider */}
          <div className="w-full hidden md:flex items-center gap-3">
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
        <div 
          onClick={(e) => e.stopPropagation()}
          className="hidden md:flex items-center justify-end gap-3 w-[30%] min-w-[150px] text-zinc-400"
        >

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
