'use client';
import { useEffect, useRef, useState } from 'react';
import { Song } from '@/app/page';

interface Props {
  song: Song;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  queue: Song[];
  currentIndex: number;
  onSongChange: (song: Song) => void;
}

const CACHE_NAME = 'musyfi-audio-v1';

async function getCached(videoId: string): Promise<string | null> {
  try {
    if (typeof caches === 'undefined') return null;
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(`/audio/${videoId}`);
    if (!res) return null;
    return URL.createObjectURL(await res.blob());
  } catch { return null; }
}

async function saveToCache(videoId: string, url: string) {
  try {
    if (typeof caches === 'undefined') return;
    const cache = await caches.open(CACHE_NAME);
    const existing = await cache.match(`/audio/${videoId}`);
    if (existing) return;
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (res.ok) await cache.put(`/audio/${videoId}`, res.clone());
  } catch { }
}

export default function MusicPlayer({ song, isPlaying, setIsPlaying, queue, currentIndex, onSongChange }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<'none' | 'caching' | 'cached'>('none');
  const lastVideoIdRef = useRef('');

  useEffect(() => {
    if (!song || lastVideoIdRef.current === song.videoId) return;
    lastVideoIdRef.current = song.videoId;
    setProgress(0);
    setDuration(0);
    setLoadingUrl(true);
    setCacheStatus('none');

    (async () => {
      const cached = await getCached(song.videoId);
      if (cached) {
        setStreamUrl(cached);
        setLoadingUrl(false);
        setCacheStatus('cached');
        return;
      }
      
      // Attempt resolving locally via YtDlp Capacitor plugin if running on Android
      const capacitor = (window as any).Capacitor;
      if (capacitor?.Plugins?.YtDlp) {
        try {
          const res = await capacitor.Plugins.YtDlp.getAudioUrl({ url: song.youtubeUrl });
          if (res && res.url) {
            setStreamUrl(res.url);
            setLoadingUrl(false);
            setCacheStatus('caching');
            saveToCache(song.videoId, res.url).then(() => setCacheStatus('cached'));
            return;
          }
        } catch (err) {
          console.error('[YtDlp native error] Falling back to Render resolver:', err);
        }
      }

      try {
        const res = await fetch(`/api/songs/stream?videoId=${song.videoId}`);
        const data = await res.json();
        if (data.directUrl) {
          setStreamUrl(data.directUrl);
          setLoadingUrl(false);
          setCacheStatus('caching');
          saveToCache(song.videoId, data.directUrl).then(() => setCacheStatus('cached'));
        }
      } catch (e) {
        setLoadingUrl(false);
      }
    })();
  }, [song?.videoId]);

  useEffect(() => {
    if (!audioRef.current || !streamUrl) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying, streamUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    if (!song || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist || 'Unknown',
      album: 'Musy-Fi',
      artwork: song.thumbnail ? [{ src: song.thumbnail, sizes: '300x300', type: 'image/jpeg' }] : [],
    });
    navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
    navigator.mediaSession.setActionHandler('nexttrack', handleNext);
    navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
    try {
      navigator.mediaSession.setActionHandler('seekto', (d) => {
        if (d.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = d.seekTime;
          setProgress(d.seekTime);
        }
      });
    } catch {}
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    };
  }, [song, queue, currentIndex]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  const handleNext = () => {
    if (currentIndex < queue.length - 1) onSongChange(queue[currentIndex + 1]);
  };

  const handlePrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (currentIndex > 0) onSongChange(queue[currentIndex - 1]);
  };

  const handleDownload = async () => {
    if (!streamUrl) return;
    try {
      const res = await fetch(streamUrl);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${song.title}.mp3`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(streamUrl, '_blank');
    }
  };

  const formatTime = (t: number) => {
    if (isNaN(t)) return '0:00';
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = duration ? (progress / duration) * 100 : 0;

  return (
    <>
      <audio
        ref={audioRef}
        src={streamUrl}
        preload="auto"
        onTimeUpdate={() => { if (!isSeeking && audioRef.current) setProgress(audioRef.current.currentTime); }}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
        onEnded={handleNext}
        onCanPlay={() => { if (isPlaying && audioRef.current?.paused) audioRef.current.play().catch(() => {}); }}
      />

      {isExpanded && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'linear-gradient(160deg, #1a0505 0%, #0d0d0d 100%)',
          display: 'flex', flexDirection: 'column', padding: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <button onClick={() => setIsExpanded(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 24, cursor: 'pointer' }}>⌄</button>
            <span style={{ color: '#888', fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Now Playing</span>
            <button onClick={handleDownload} style={{ background: 'none', border: 'none', color: '#e53935', fontSize: 20, cursor: 'pointer' }} title="Download MP3">⬇</button>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
            <div style={{ width: 260, height: 260, borderRadius: 20, overflow: 'hidden', background: '#1a1a1a', boxShadow: '0 20px 60px rgba(229,57,53,0.3)', border: '2px solid rgba(229,57,53,0.2)' }}>
              {song.thumbnail
                ? <img src={song.thumbnail} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>🎵</div>
              }
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 6 }}>{song.title}</h2>
                <p style={{ color: '#888', fontSize: 15 }}>{song.artist || 'Unknown'}</p>
              </div>
              {cacheStatus === 'cached' && <span style={{ color: '#1DB954', fontSize: 12 }}>✓ Cached</span>}
              {cacheStatus === 'caching' && <span style={{ color: '#888', fontSize: 12 }}>💾 Saving...</span>}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <input type="range" min={0} max={duration || 0} step={0.1} value={progress}
              onChange={e => { setIsSeeking(true); setProgress(+e.target.value); }}
              onMouseUp={e => { setIsSeeking(false); if (audioRef.current) audioRef.current.currentTime = +(e.target as HTMLInputElement).value; }}
              onTouchEnd={e => { setIsSeeking(false); if (audioRef.current) audioRef.current.currentTime = +(e.target as HTMLInputElement).value; }}
              style={{ width: '100%', accentColor: '#e53935' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: 12, marginTop: 4 }}>
              <span>{formatTime(progress)}</span><span>{formatTime(duration)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <button onClick={handlePrev} style={{ background: 'none', border: 'none', color: '#ccc', fontSize: 28, cursor: 'pointer' }}>⏮</button>
            <button onClick={() => setIsPlaying(!isPlaying)} style={{
              width: 68, height: 68, borderRadius: '50%',
              background: 'linear-gradient(135deg,#e53935,#c62828)',
              border: 'none', color: '#fff', fontSize: 26, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(229,57,53,0.4)',
            }}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={handleNext} style={{ background: 'none', border: 'none', color: '#ccc', fontSize: 28, cursor: 'pointer' }}>⏭</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setMuted(!muted)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer' }}>
              {muted || volume === 0 ? '🔇' : '🔊'}
            </button>
            <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
              onChange={e => { setVolume(+e.target.value); if (+e.target.value > 0) setMuted(false); }}
              style={{ flex: 1, accentColor: '#e53935' }}
            />
          </div>
        </div>
      )}

      <div style={{
        position: 'fixed', bottom: 56, left: 0, right: 0, zIndex: 50,
        background: 'rgba(15,5,5,0.97)', borderTop: '1px solid #2a1010',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ height: 2, background: '#2a1010' }}>
          <div style={{ height: '100%', background: '#e53935', width: `${progressPct}%`, transition: 'width 0.3s linear' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 12 }}
          onClick={() => setIsExpanded(true)}>
          <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
            {song.thumbnail
              ? <img src={song.thumbnail} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎵</div>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loadingUrl ? '⏳ Loading...' : song.title}
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>
              {song.artist || 'Unknown'}
              {cacheStatus === 'cached' && <span style={{ color: '#1DB954', marginLeft: 6 }}>✓</span>}
              {cacheStatus === 'caching' && <span style={{ color: '#888', marginLeft: 6 }}>💾</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
            <button onClick={handleDownload} style={{ background: 'none', border: 'none', color: '#e53935', fontSize: 18, cursor: 'pointer' }} title="Download">⬇</button>
            <button onClick={handlePrev} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 22, cursor: 'pointer' }}>⏮</button>
            <button onClick={() => setIsPlaying(!isPlaying)} style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'linear-gradient(135deg,#e53935,#c62828)',
              border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={handleNext} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 22, cursor: 'pointer' }}>⏭</button>
          </div>
        </div>
      </div>
    </>
  );
}

