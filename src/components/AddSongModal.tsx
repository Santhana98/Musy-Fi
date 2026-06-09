'use client';
import { useState } from 'react';
import { Song } from '@/app/page';

interface Props {
  onClose: () => void;
  onSongAdded: (song: Song) => void;
}

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

export default function AddSongModal({ onClose, onSongAdded }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    const trimmed = url.trim();
    if (!trimmed) { setError('Please paste a YouTube URL'); return; }
    const videoId = extractVideoId(trimmed);
    if (!videoId) { setError('Invalid YouTube URL — please check and try again'); return; }

    setLoading(true);
    setError('');

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
      onSongAdded(data.song);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 500, background: '#141414', borderRadius: '20px 20px 0 0', border: '1px solid #222', padding: '24px 20px 48px' }} onClick={e => e.stopPropagation()}>

        <div style={{ width: 40, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 20px' }} />
        <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 6, color: '#fff' }}>🎵 Add YouTube Song</h3>
        <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>Song appears in your library instantly — streams while saving in background</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            autoFocus
            style={{ width: '100%', padding: '14px 16px', background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none' }}
            onKeyDown={e => e.key === 'Enter' && !loading && handleAdd()}
          />

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', color: '#ff6b6b', fontSize: 13 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '16px', background: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.2)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
              <p style={{ color: '#e53935', fontWeight: 700, fontSize: 14 }}>Adding to your library...</p>
              <p style={{ color: '#666', fontSize: 12, marginTop: 4 }}>Song will appear instantly and start playing!</p>
            </div>
          ) : (
            <button onClick={handleAdd} disabled={!url.trim()} style={{
              padding: '15px', background: 'linear-gradient(135deg,#e53935,#c62828)',
              color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 16,
              cursor: url.trim() ? 'pointer' : 'not-allowed',
              opacity: url.trim() ? 1 : 0.5,
            }}>
              Add to Library →
            </button>
          )}
        </div>

        <p style={{ color: '#444', fontSize: 11, textAlign: 'center', marginTop: 16 }}>
          ✓ Streams from your IP &nbsp;·&nbsp; ✓ Cached for offline &nbsp;·&nbsp; ✓ Download anytime
        </p>
      </div>
    </div>
  );
}
