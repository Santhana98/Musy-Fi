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

import VinylPlayer from './VinylPlayer';

// Dynamically import ReactPlayer with SSR disabled since it uses window/navigator APIs
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

// ─── Browser Audio Cache (Cache API) ─────────────────────────────────────────
// Saves audio blobs locally after first play — repeat plays are instant & offline.
const AUDIO_CACHE_NAME = 'musy-fi-audio-v1';

async function getCachedAudio(songId: string): Promise<string | null> {
  try {
    if (typeof caches === 'undefined') return null;
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const response = await cache.match(`/audio-cache/${songId}`);
    if (!response) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch { return null; }
}

async function cacheAudio(songId: string, audioUrl: string): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    // Don't cache proxy URLs or blob URLs — only real fetchable URLs
    if (audioUrl.startsWith('blob:') || audioUrl.includes('/api/songs/stream')) return;
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const existing = await cache.match(`/audio-cache/${songId}`);
    if (existing) return; // already cached
    const res = await fetch(audioUrl, { signal: AbortSignal.timeout(30_000) });
    if (res.ok) await cache.put(`/audio-cache/${songId}`, res);
  } catch { /* non-fatal */ }
}

async function cacheAudioFromBlob(songId: string, blob: Blob): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const existing = await cache.match(`/audio-cache/${songId}`);
    if (existing) return;
    await cache.put(`/audio-cache/${songId}`, new Response(blob, {
      headers: { 'Content-Type': blob.type || 'audio/mpeg' }
    }));
  } catch { /* non-fatal */ }
}

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
    trackRestartTrigger,
    queue,
    currentIndex,
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [useVideoFallback, setUseVideoFallback] = useState(false);
  const [importStatus, setImportStatus] = useState<'ready'|'pending'|'failed'|null>(null);

  const [streamUrl, setStreamUrl] = useState<string>('');
  const [nextTrackUrl, setNextTrackUrl] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const lastLoadedTrackIdRef = useRef<string>('');
  const activeBlobUrlRef = useRef<string>('');
  const nextBlobUrlRef = useRef<string>('');

  // Cleanup Object URLs on unmount
  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
      if (nextBlobUrlRef.current) {
        URL.revokeObjectURL(nextBlobUrlRef.current);
      }
    };
  }, []);

  // ── Import status polling ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack || currentTrack.type !== 'youtube') {
      setImportStatus(null);
      return;
    }
    setImportStatus('pending');
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/songs/import-status?id=${currentTrack.id}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setImportStatus(data.importStatus);
        if (data.importStatus === 'ready' && data.type === 'google') {
          const token = (session?.user as any)?.id || '';
          setStreamUrl(`/api/songs/stream?id=${currentTrack.id}${token ? `&token=${token}` : ''}`);
        }
      } catch { /* non-fatal */ }
    };

    poll();
    const interval = setInterval(poll, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentTrack?.id]);

  // Synchronize stream URL
  useEffect(() => {
    if (!currentTrack) {
      setStreamUrl('');
      lastLoadedTrackIdRef.current = '';
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = '';
      }
      return;
    }
    
    if (lastLoadedTrackIdRef.current === currentTrack.id && streamUrl) {
      return;
    }

    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = '';
    }

    const token = (session?.user as any)?.id || '';
    const accessToken = (session?.user as any)?.accessToken || '';
    const proxyUrl = `/api/songs/stream?id=${currentTrack.id}${token ? `&token=${token}` : ''}`;

    if (currentTrack.type === 'google') {
      if (accessToken) {
        getCachedAudio(currentTrack.id).then(cachedUrl => {
          if (cachedUrl) {
            activeBlobUrlRef.current = cachedUrl;
            setStreamUrl(cachedUrl);
            return;
          }

          const driveUrl = `https://www.googleapis.com/drive/v3/files/${currentTrack.sourceUrl}?alt=media`;
          fetch(driveUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
            .then(async (res) => {
              if (!res.ok) throw new Error(`Google API returned status ${res.status}`);
              const blob = await res.blob();
              const blobUrl = URL.createObjectURL(blob);
              activeBlobUrlRef.current = blobUrl;
              setStreamUrl(blobUrl);
              cacheAudioFromBlob(currentTrack.id, blob);
            })
            .catch((err) => {
              console.warn('[MusicPlayer] Client-side Google Drive fetch failed, falling back to proxy stream:', err);
              setStreamUrl(proxyUrl);
            });
        });
      } else {
        const publicUrl = `https://lh3.googleusercontent.com/d/${currentTrack.sourceUrl}`;
        setStreamUrl(publicUrl);
      }
    } else {
      if (currentTrack.type === 'youtube') {
        const token = (session?.user as any)?.id || '';
        const resolveUrl = `/api/songs/stream?id=${currentTrack.id}${token ? `&token=${token}` : ''}`;

        fetch(resolveUrl)
          .then(async (res) => {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const data = await res.json();
              if (data.directUrl) {
                setStreamUrl(data.directUrl);
                lastLoadedTrackIdRef.current = currentTrack.id;
                return;
              }
            }
            setStreamUrl(resolveUrl);
          })
          .catch((err) => {
            console.warn('[MusicPlayer] Failed to resolve YouTube direct URL:', err);
            setStreamUrl(resolveUrl);
          });

        lastLoadedTrackIdRef.current = currentTrack.id;
        return;
      }

      setStreamUrl(proxyUrl);
    }

    lastLoadedTrackIdRef.current = currentTrack.id;
  }, [currentTrack, session, streamUrl]);

  // Synchronize next track preloading URL
  useEffect(() => {
    if (queue.length === 0 || currentIndex === -1) {
      setNextTrackUrl('');
      if (nextBlobUrlRef.current) {
        URL.revokeObjectURL(nextBlobUrlRef.current);
        nextBlobUrlRef.current = '';
      }
      return;
    }
    const nextIdx = currentIndex + 1;
    if (nextIdx < queue.length) {
      const nextTrackObj = queue[nextIdx];
      const token = (session?.user as any)?.id || '';
      const accessToken = (session?.user as any)?.accessToken || '';
      
      if (nextBlobUrlRef.current) {
        URL.revokeObjectURL(nextBlobUrlRef.current);
        nextBlobUrlRef.current = '';
      }

      if (nextTrackObj.type === 'google') {
        if (accessToken) {
          const driveUrl = `https://www.googleapis.com/drive/v3/files/${nextTrackObj.sourceUrl}?alt=media`;
          fetch(driveUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
            .then(async (res) => {
              if (!res.ok) throw new Error(`Google API returned status ${res.status}`);
              const blob = await res.blob();
              const blobUrl = URL.createObjectURL(blob);
              nextBlobUrlRef.current = blobUrl;
              setNextTrackUrl(blobUrl);
            })
            .catch((err) => {
              console.warn('[MusicPlayer] Client-side preload fetch failed:', err);
              setNextTrackUrl(`/api/songs/stream?id=${nextTrackObj.id}${token ? `&token=${token}` : ''}`);
            });
        } else {
          setNextTrackUrl(`https://lh3.googleusercontent.com/d/${nextTrackObj.sourceUrl}`);
        }
      } else if (nextTrackObj.type === 'mp3') {
        setNextTrackUrl(`/api/songs/stream?id=${nextTrackObj.id}${token ? `&token=${token}` : ''}`);
      } else {
        setNextTrackUrl('');
      }
    } else {
      setNextTrackUrl('');
      if (nextBlobUrlRef.current) {
        URL.revokeObjectURL(nextBlobUrlRef.current);
        nextBlobUrlRef.current = '';
      }
    }
  }, [queue, currentIndex, session]);

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
  }, [currentTrack?.id, isVideoTrack]);

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

  useEffect(() => {
    const currentVol = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = currentVol;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (!currentTrack || typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: 'Musy-Fi Cloud Library',
      artwork: currentTrack.thumbnail 
        ? [{ src: currentTrack.thumbnail, sizes: '300x300', type: 'image/jpeg' }]
        : [{ src: '/placeholder-artwork.jpg', sizes: '300x300', type: 'image/jpeg' }]
    });
    navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
    navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) seekTo(details.seekTime);
      });
    } catch (err) {}
    try {
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        const current = audioRef.current && !isVideoTrack ? audioRef.current.currentTime : progress;
        seekTo(Math.max(0, current - offset));
      });
    } catch (err) {}
    try {
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        const current = audioRef.current && !isVideoTrack ? audioRef.current.currentTime : progress;
        seekTo(Math.min(duration || 0, current + offset));
      });
    } catch (err) {}
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
    } catch (err) {}
  }, [isPlaying, progress, duration, currentTrack]);

  useEffect(() => {
    if (trackRestartTrigger === 0 || !currentTrack) return;
    if (isVideoTrack && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(0, 'seconds');
      } catch (err) {}
    } else if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => {});
      } catch (err) {}
    }
    setProgress(0);
    setPlaying(true);
  }, [trackRestartTrigger]);

  if (!currentTrack) return null;

  const handleAudioTimeUpdate = () => {
    if (isSeeking || !audioRef.current) return;
    setProgress(audioRef.current.currentTime);
  };

  const handleAudioLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleAudioEnded = () => { nextTrack(); };

  const handleAudioCanPlay = () => {
    if (isPlaying && audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(err => {});
    }
  };

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const err = e.currentTarget.error;
    console.error('HTML5 Audio error encountered:', err);
    if (currentTrack) {
      if (err && (err.code === 1 || err.code === 2)) {
        const savedProgress = progress;
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.load();
            audioRef.current.currentTime = savedProgress;
            if (isPlaying) audioRef.current.play().catch(() => {});
          }
        }, 1000);
        return;
      }
      const token = (session?.user as any)?.id || '';
      const proxyUrl = `/api/songs/stream?id=${currentTrack.id}${token ? `&token=${token}` : ''}`;
      if (streamUrl !== proxyUrl) {
        setStreamUrl(proxyUrl);
        const savedProgress = progress;
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.load();
            audioRef.current.currentTime = savedProgress;
            if (isPlaying) audioRef.current.play().catch(() => {});
          }
        }, 50);
        return;
      }
    }
    if (isYouTubeTrack) setUseVideoFallback(true);
  };

  const handleVideoProgress = (state: { playedSeconds: number }) => {
    if (isSeeking) return;
    setProgress(state.playedSeconds);
  };

  const handleVideoDuration = (dur: number) => { setDuration(dur); };
  const handleVideoEnded = () => { nextTrack(); };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSeeking(true);
    setProgress(parseFloat(e.target.value));
  };

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsSeeking(false);
    seekTo(parseFloat((e.target as HTMLInputElement).value));
  };

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

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <>
      {!isVideoTrack && currentTrack && (
        <audio
          ref={audioRef}
          src={streamUrl}
          preload="auto"
          onTimeUpdate={handleAudioTimeUpdate}
          onLoadedMetadata={handleAudioLoadedMetadata}
          onEnded={handleAudioEnded}
          onCanPlay={handleAudioCanPlay}
          onError={handleAudioError}
        />
      )}

      {nextTrackUrl && (
        <audio src={nextTrackUrl} preload="auto" muted style={{ display: 'none' }} />
      )}

      {isVideoTrack && (
        <div className="fixed bottom-0 right-0 w-[200px] h-[200px] opacity-[0.001] pointer-events-none z-[-1] overflow-hidden">
          <ReactPlayer
            onReady={(player: any) => { ytPlayerRef.current = player; }}
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
                  controls: 0, autoplay: 1, modestbranding: 1,
                  rel: 0, showinfo: 0, iv_load_policy: 3,
                  disablekb: 1, enablejsapi: 1, playsinline: 1
                },
              },
            }}
          />
        </div>
      )}

      {isExpanded && (
        <div className="fixed inset-0 bg-zinc-950/98 backdrop-blur-2xl z-50 md:hidden flex flex-col justify-between px-6 py-8 select-none text-white animate-slide-up">
          <div className="flex items-center justify-between">
            <button onClick={() => setIsExpanded(false)} className="p-2.5 bg-zinc-900/60 hover:bg-zinc-800 rounded-full border border-zinc-800/40">
              <ChevronDown className="w-6 h-6 text-zinc-400" />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Now Playing</span>
            <div className="w-11"></div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center my-8 w-full overflow-hidden">
            <VinylPlayer currentTrack={currentTrack} isPlaying={isPlaying} />
          </div>

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

          <div className="space-y-3 mb-6">
            <input
              type="range" min={0} max={duration || 0} step={0.1} value={progress}
              onChange={handleSeekChange} onMouseUp={handleSeekEnd} onTouchEnd={handleSeekEnd}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-spotify-green focus:outline-none"
            />
            <div className="flex justify-between text-xs text-zinc-500 font-bold uppercase tracking-wider">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 mb-4">
            <button onClick={() => setPlaybackMode(playbackMode === 'shuffle' ? 'normal' : 'shuffle')}
              className={`p-3 transition-colors ${playbackMode === 'shuffle' ? 'text-spotify-green' : 'text-zinc-500'}`}>
              <Shuffle className="w-5 h-5" />
            </button>
            <button onClick={prevTrack} className="p-3 text-zinc-300">
              <SkipBack className="w-7 h-7 fill-current" />
            </button>
            <button onClick={togglePlay} className="w-16 h-16 bg-white rounded-full text-black flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform">
              {isPlaying ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black ml-1" />}
            </button>
            <button onClick={nextTrack} className="p-3 text-zinc-300">
              <SkipForward className="w-7 h-7 fill-current" />
            </button>
            <button onClick={() => setPlaybackMode(playbackMode === 'repeat' ? 'normal' : 'repeat')}
              className={`p-3 transition-colors ${playbackMode === 'repeat' ? 'text-spotify-green' : 'text-zinc-500'}`}>
              <Repeat className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-14 md:bottom-0 left-0 right-0 h-20 md:h-24 bg-zinc-950/95 border-t border-zinc-900 px-4 md:px-6 flex items-center justify-between select-none z-30 backdrop-blur-lg cursor-pointer md:cursor-default"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-zinc-900 md:hidden">
          <div className="bg-spotify-green h-full transition-all duration-300"
            style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}></div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 w-[60%] md:w-[30%] min-w-[140px] md:min-w-[180px]">
          <div className="w-10 h-10 md:w-16 md:h-16 bg-zinc-900 rounded flex-shrink-0 flex items-center justify-center border border-zinc-800 overflow-hidden">
            {currentTrack.thumbnail
              ? <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover" />
              : <Music className="w-5 h-5 text-zinc-500" />}
          </div>
          <div className="truncate flex-1">
            <h4 className="text-xs md:text-sm font-bold text-white truncate">{currentTrack.title}</h4>
            <p className="text-[10px] md:text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
            {importStatus === 'pending' && (
              <span className="text-[9px] text-amber-400 font-semibold tracking-wide animate-pulse">⏳ Saving to library…</span>
            )}
            {importStatus === 'failed' && (
              <span className="text-[9px] text-red-400 font-semibold tracking-wide">⚠ Save failed — streaming live</span>
            )}
          </div>
          <button onClick={(e) => e.stopPropagation()} className="text-zinc-400 hover:text-white transition-colors p-1">
            <Heart className="w-4 h-4" />
          </button>
        </div>

        <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1 md:gap-2 flex-1 max-w-2xl px-2 md:px-4">
          <div className="flex items-center gap-3 md:gap-5">
            <button onClick={(e) => { e.stopPropagation(); setPlaybackMode(playbackMode === 'shuffle' ? 'normal' : 'shuffle'); }}
              className={`hover:text-white transition-colors hidden md:block ${playbackMode === 'shuffle' ? 'text-spotify-green' : 'text-zinc-400'}`}>
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); prevTrack(); }} className="text-zinc-400 hover:text-white transition-colors p-1">
              <SkipBack className="w-5 h-5 fill-zinc-400 hover:fill-white" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="bg-white hover:scale-105 p-2 md:p-3 rounded-full text-black transition-transform flex items-center justify-center">
              {isPlaying
                ? <Pause className="w-4 h-4 md:w-5 md:h-5 fill-black" />
                : <Play className="w-4 h-4 md:w-5 md:h-5 fill-black ml-0.5" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); nextTrack(); }} className="text-zinc-400 hover:text-white transition-colors p-1">
              <SkipForward className="w-5 h-5 fill-zinc-400 hover:fill-white" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setPlaybackMode(playbackMode === 'repeat' ? 'normal' : 'repeat'); }}
              className={`hover:text-white transition-colors hidden md:block ${playbackMode === 'repeat' ? 'text-spotify-green' : 'text-zinc-400'}`}>
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full hidden md:flex items-center gap-3">
            <span className="text-[10px] font-semibold text-zinc-400 w-8 text-right">{formatTime(progress)}</span>
            <input type="range" min={0} max={duration || 0} step={0.1} value={progress}
              onChange={handleSeekChange} onMouseUp={handleSeekEnd} onTouchEnd={handleSeekEnd}
              className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-spotify-green focus:outline-none" />
            <span className="text-[10px] font-semibold text-zinc-400 w-8">{formatTime(duration)}</span>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()} className="hidden md:flex items-center justify-end gap-3 w-[30%] min-w-[150px] text-zinc-400">
          <button onClick={toggleMute} className="hover:text-white transition-colors">
            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume}
            onChange={(e) => { const val = parseFloat(e.target.value); setVolume(val); if (val > 0) setIsMuted(false); }}
            className="w-24 h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-spotify-green focus:outline-none" />
        </div>
      </div>
    </>
  );
}

