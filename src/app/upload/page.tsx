'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import MusicPlayer from '@/components/MusicPlayer';
import { usePlayer, Song } from '@/context/PlayerContext';

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v') ||
        u.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/)?.[1] || null;
    }
  } catch {}
  const m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) || url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    setPlaying,
    songs,
    playTrack,
    fetchSongs,
    currentIndex,
    queue,
  } = usePlayer();

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [theme, setTheme] = useState<'male' | 'female'>('male');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    const savedTheme = localStorage.getItem('musyfi-theme') as 'male' | 'female';
    if (savedTheme) setTheme(savedTheme);
  }, [status]);

  const bgImage = theme === 'male' ? '/bg-male.jpg' : '/bg-female.jpg';

  const handleAdd = async () => {
    const trimmed = url.trim();
    if (!trimmed) { setError('Please paste a YouTube URL'); return; }
    const videoId = extractVideoId(trimmed);
    if (!videoId) { setError('Invalid YouTube URL — please check and try again'); return; }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/songs/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add song');
      if (data.duplicate) {
        setError('This song is already in your library!');
        setLoading(false);
        return;
      }
      setSuccess('Successfully added to your library! Stream will play now.');
      setUrl('');
      await fetchSongs();
      playTrack(data.song);
      setLoading(false);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
      setLoading(false);
    }
  };

  const handleSongChange = (song: Song) => {
    playTrack(song);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 160 }}>
      {/* Hero */}
      <div style={{ position: 'relative', minHeight: 180, overflow: 'hidden', backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(10,10,10,0.85) 70%, #0a0a0a 100%)' }} />

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 8 }}>
          <img src="/logo.jpg" alt="Musy-Fi Logo" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontWeight: 900, fontSize: 18, color: '#e53935', fontFamily: 'Georgia, serif' }}>Musy-Fi</span>
        </div>

        <div style={{ position: 'relative', zIndex: 1, padding: '8px 20px 24px' }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Add YouTube Links</h2>
          <p style={{ color: '#888', fontSize: 13 }}>Download & convert tracks instantly to your offline audio player</p>
        </div>
      </div>

      {/* Upload Form */}
      <div style={{ padding: '0 16px', marginTop: 16 }}>
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid #1a1a1a', padding: '24px 16px' }}>
          <h3 style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 12 }}>Paste YouTube Video URL</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              style={{
                width: '100%',
                padding: '14px 16px',
                background: '#0d0d0d',
                border: '1px solid #2a2a2a',
                borderRadius: 12,
                color: '#fff',
                fontSize: 14,
                outline: 'none',
              }}
              onKeyDown={e => e.key === 'Enter' && !loading && handleAdd()}
            />

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', color: '#ff6b6b', fontSize: 13 }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, padding: '10px 14px', color: '#34d399', fontSize: 13 }}>
                {success}
              </div>
            )}

            {loading ? (
              <div style={{ padding: '16px', background: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.2)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                <p style={{ color: '#e53935', fontWeight: 700, fontSize: 14 }}>Importing track...</p>
                <p style={{ color: '#666', fontSize: 12, marginTop: 4 }}>This song will appear in your home tab library instantly!</p>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                disabled={!url.trim()}
                style={{
                  padding: '15px',
                  background: 'linear-gradient(135deg,#e53935,#c62828)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: url.trim() ? 'pointer' : 'not-allowed',
                  opacity: url.trim() ? 1 : 0.5,
                }}
              >
                Download Song →
              </button>
            )}
          </div>
        </div>
      </div>

      {currentTrack && (
        <MusicPlayer
          song={currentTrack as any}
          isPlaying={isPlaying}
          setIsPlaying={setPlaying}
          queue={queue as any}
          currentIndex={currentIndex}
          onSongChange={handleSongChange as any}
        />
      )}

      <BottomNav active="upload" />
    </div>
  );
}
