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
  const [step, setStep] = useState<'input' | 'loading' | 'preview' | 'saving'>('input');
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');

  const handleResolve = async () => {
    const videoId = extractVideoId(url.trim());
    if (!videoId) { setError('Please enter a valid YouTube URL'); return; }
    setStep('loading'); setError('');
    try {
      const res = await fetch(`/api/songs/stream?videoId=${videoId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setPreview({ ...data, videoId, youtubeUrl: url.trim() });
      setStep('preview');
    } catch (e: any) {
      setError(e.message || 'Could not load song info');
      setStep('input');
    }
  };

  const handleSave = async () => {
    setStep('saving');
    try {
      const res = await fetch('/api/songs/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: preview.title,
          artist: preview.artist,
          thumbnail: preview.thumbnail,
          youtubeUrl: preview.youtubeUrl,
          videoId: preview.videoId,
          duration: preview.duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSongAdded(data.song);
    } catch (e: any) {
      setError(e.message);
      setStep('preview');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 500,
        background: '#141414', borderRadius: '20px 20px 0 0',
        border: '1px solid #222', padding: '24px 20px 40px',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ width: 40, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 20px' }} />
        <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 20, color: '#fff' }}>🎵 Add YouTube Song</h3>

        {(step === 'input' || step === 'loading') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              value={url} onChange={e => setUrl(e.target.value)}
              placeholder="Paste YouTube URL here..."
              style={{ width: '100%', padding: '14px 16px', background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none' }}
              onKeyDown={e => e.key === 'Enter' && handleResolve()}
            />
            {error && <p style={{ color: '#ff4444', fontSize: 13 }}>{error}</p>}
            <button onClick={handleResolve} disabled={step === 'loading' || !url.trim()} style={{
              padding: '14px', background: 'linear-gradient(135deg,#e53935,#c62828)',
              color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15,
              cursor: 'pointer', opacity: (step === 'loading' || !url.trim()) ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {step === 'loading' ? '⏳ Loading song info...' : 'Load Song →'}
            </button>
          </div>
        )}

        {step === 'preview' && preview && (
          <div>
            <div style={{ display: 'flex', gap: 14, marginBottom: 20, background: '#0d0d0d', borderRadius: 12, padding: 14 }}>
              {preview.thumbnail && (
                <img src={preview.thumbnail} alt={preview.title} style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8 }} />
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 4 }}>{preview.title}</div>
                <div style={{ color: '#888', fontSize: 13 }}>{preview.artist}</div>
                {preview.duration && (
                  <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>
                    {Math.floor(preview.duration / 60)}:{String(preview.duration % 60).padStart(2, '0')}
                  </div>
                )}
              </div>
            </div>
            {error && <p style={{ color: '#ff4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep('input')} style={{ flex: 1, padding: '13px', background: '#1a1a1a', color: '#aaa', border: '1px solid #2a2a2a', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>← Back</button>
              <button onClick={handleSave} style={{ flex: 2, padding: '13px', background: 'linear-gradient(135deg,#e53935,#c62828)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer', fontSize: 15 }}>✓ Add to Library</button>
            </div>
          </div>
        )}

        {step === 'saving' && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <p style={{ color: '#888' }}>Adding to your library...</p>
          </div>
        )}
      </div>
    </div>
  );
}
