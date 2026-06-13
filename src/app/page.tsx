'use client';
import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import AddSongModal from '@/components/AddSongModal';
import { usePlayer } from '@/context/PlayerContext';

export interface Song {
  id: string;
  title: string;
  artist: string | null;
  thumbnail: string | null;
  youtubeUrl: string;
  videoId: string;
  duration: number | null;
  liked: boolean;
  importStatus: 'pending' | 'processing' | 'ready' | 'failed';
  lastPlayedAt?: string | null;
}

type Tab = 'all' | 'liked' | 'recent';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const { currentTrack: currentSong, isPlaying, playTrack } = usePlayer();
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'male' | 'female'>('male');
  const [tab, setTab] = useState<Tab>('all');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status]);

  useEffect(() => {
    if (session) {
      fetchSongs();
      // Register service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    }
    const savedTheme = localStorage.getItem('musyfi-theme') as 'male' | 'female';
    if (savedTheme) setTheme(savedTheme);
  }, [session]);

  // Poll for import status updates
  useEffect(() => {
    const pendingSongs = songs.filter(s => s.importStatus === 'pending' || s.importStatus === 'processing');
    if (pendingSongs.length === 0) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const updates = await Promise.all(
        pendingSongs.map(async (s) => {
          try {
            const res = await fetch(`/api/songs/status?id=${s.id}`);
            const data = await res.json();
            return { id: s.id, importStatus: data.importStatus };
          } catch { return null; }
        })
      );
      setSongs(prev => prev.map(s => {
        const update = updates.find(u => u?.id === s.id);
        return update ? { ...s, importStatus: update.importStatus } : s;
      }));
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [songs]);

  const fetchSongs = async () => {
    setLoading(true);
    const res = await fetch('/api/songs/list');
    const data = await res.json();
    setSongs(data.songs || []);
    setLoading(false);
  };

  const handleSongAdded = (song: Song) => {
    setSongs(prev => [song, ...prev]);
    playSong(song, [song, ...songs]);
    setShowAddModal(false);
  };

  const playSong = (song: Song, songList?: Song[]) => {
    const list = songList || songs;
    playTrack(song as any, list as any);
    // Update last played
    fetch('/api/songs/list').catch(() => {});
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/songs/delete?id=${id}`, { method: 'DELETE' });
    setSongs(prev => prev.filter(s => s.id !== id));
  };

  const handleToggleLike = async (id: string) => {
    const res = await fetch('/api/songs/favorite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    setSongs(prev => prev.map(s => s.id === id ? { ...s, liked: data.liked } : s));
  };

  const bgImage = theme === 'male'
    ? '/bg-male.jpg'
    : '/bg-female.jpg';

  const filteredSongs = tab === 'liked'
    ? songs.filter(s => s.liked)
    : tab === 'recent'
    ? [...songs].sort((a, b) => (b.lastPlayedAt || '') > (a.lastPlayedAt || '') ? 1 : -1).slice(0, 20)
    : songs;

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎵</div>
        <p style={{ color: '#666' }}>Loading Musy-Fi...</p>
      </div>
    </div>
  );

  const userName = session?.user?.name?.split(' ')[0] || 'there';
  const pendingCount = songs.filter(s => s.importStatus === 'pending' || s.importStatus === 'processing').length;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 160 }}>
      {/* Hero */}
      <div style={{ position: 'relative', minHeight: 300, overflow: 'hidden', backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(10,10,10,0.8) 70%, #0a0a0a 100%)' }} />

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.jpg" alt="Musy-Fi Logo" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ fontWeight: 900, fontSize: 18, color: '#e53935', fontFamily: 'Georgia, serif' }}>Musy-Fi</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {pendingCount > 0 && (
              <div style={{ background: 'rgba(229,57,53,0.2)', border: '1px solid rgba(229,57,53,0.4)', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#e53935', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                {pendingCount} importing
              </div>
            )}
            <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '6px 14px', color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(10px)' }}>
              <span>👤</span> {userName}
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, padding: '8px 20px 24px' }}>
          <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', marginBottom: 14 }}>Welcome back</h2>
          {songs.length > 0 && (
            <div onClick={() => playSong(songs[0])} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)' }}>
              <span style={{ fontSize: 18 }}>🎵</span>
              <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{songs[0].title.length > 22 ? songs[0].title.slice(0, 22) + '…' : songs[0].title}</span>
            </div>
          )}
        </div>
      </div>

      {/* Add button */}
      <button onClick={() => setShowAddModal(true)} style={{ position: 'fixed', right: 20, top: 60, zIndex: 40, width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#e53935,#c62828)', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(229,57,53,0.4)' }}>+</button>

      <div style={{ padding: '0 16px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['all', 'liked', 'recent'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 16px', borderRadius: 20,
              background: tab === t ? '#e53935' : 'rgba(255,255,255,0.05)',
              border: tab === t ? 'none' : '1px solid #2a2a2a',
              color: tab === t ? '#fff' : '#888',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
            }}>{t === 'all' ? '🎵 All' : t === 'liked' ? '❤️ Liked' : '🕐 Recent'}</button>
          ))}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 10 }}>
          Your Music Library
          {songs.length > 0 && <span style={{ color: '#555', fontWeight: 500, fontSize: 13, marginLeft: 8 }}>{filteredSongs.length} songs</span>}
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>⏳</div>Loading your library...
          </div>
        ) : filteredSongs.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid #1a1a1a', padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, color: '#e53935', marginBottom: 12 }}>🎵</div>
            <h3 style={{ fontWeight: 800, marginBottom: 8 }}>
              {tab === 'liked' ? 'No liked songs yet' : tab === 'recent' ? 'No recently played' : 'Your library is empty'}
            </h3>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>Paste a YouTube link to add your first song!</p>
            {tab === 'all' && (
              <button onClick={() => setShowAddModal(true)} style={{ background: '#fff', color: '#111', border: 'none', borderRadius: 24, padding: '12px 28px', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Add Songs Now</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredSongs.map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                index={i}
                isActive={currentSong?.id === song.id}
                isPlaying={isPlaying && currentSong?.id === song.id}
                onClick={() => playSong(song, filteredSongs)}
                onDelete={() => handleDelete(song.id)}
                onToggleLike={() => handleToggleLike(song.id)}
              />
            ))}
          </div>
        )}

        {/* Playlists */}
        <div style={{ marginTop: 28, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#e53935', fontSize: 18 }}>📚</span>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Your Playlists</h2>
            </div>
            <span style={{ color: '#888', fontSize: 20, cursor: 'pointer' }}>+</span>
          </div>
          {songs.length > 0 && (
            <div onClick={() => playSong(songs[0], songs)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', border: '1px solid #1a1a1a' }}>
              <div style={{ width: 44, height: 44, background: '#1a1a1a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎵</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>My Library</div>
                <div style={{ color: '#666', fontSize: 12 }}>{songs.length} songs</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && <AddSongModal onClose={() => setShowAddModal(false)} onSongAdded={handleSongAdded} />}



      <BottomNav active="home" />
    </div>
  );
}

function SongRow({ song, index, isActive, isPlaying, onClick, onDelete, onToggleLike }: {
  song: Song; index: number; isActive: boolean; isPlaying: boolean;
  onClick: () => void; onDelete: () => void; onToggleLike: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const statusBadge = () => {
    if (song.importStatus === 'pending') return <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: 6 }}>⏳ Pending</span>;
    if (song.importStatus === 'processing') return <span style={{ fontSize: 10, color: '#3b82f6', background: 'rgba(59,130,246,0.15)', padding: '2px 6px', borderRadius: 6 }}>⚙️ Processing</span>;
    if (song.importStatus === 'failed') return <span style={{ fontSize: 10, color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: 6 }}>⚠️ Failed</span>;
    return null;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', position: 'relative', background: isActive ? 'rgba(229,57,53,0.1)' : 'transparent', border: isActive ? '1px solid rgba(229,57,53,0.2)' : '1px solid transparent' }} onClick={onClick}>
      <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#1a1a1a', position: 'relative' }}>
        {song.thumbnail
          ? <img src={song.thumbnail} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎵</div>
        }
        {isActive && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(229,57,53,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 16 }}>{isPlaying ? '▶' : '⏸'}</span>
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: isActive ? '#e53935' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{song.title}</span>
          {statusBadge()}
        </div>
        <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{song.artist || 'Unknown'}</div>
      </div>
      <button onClick={e => { e.stopPropagation(); onToggleLike(); }} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: song.liked ? '#e53935' : '#444', padding: '4px' }}>
        {song.liked ? '❤️' : '🤍'}
      </button>
      <button onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, padding: '4px 8px' }}>⋮</button>
      {showMenu && (
        <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '6px', minWidth: 160, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <button onClick={e => { e.stopPropagation(); setShowMenu(false); onDelete(); }} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', textAlign: 'left', borderRadius: 8, fontSize: 14 }}>
            🗑️ Remove from library
          </button>
        </div>
      )}
    </div>
  );
}
