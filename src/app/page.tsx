'use client';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import MusicPlayer from '@/components/MusicPlayer';
import AddSongModal from '@/components/AddSongModal';

export interface Song {
  id: string;
  title: string;
  artist: string | null;
  thumbnail: string | null;
  youtubeUrl: string;
  videoId: string;
  duration: number | null;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'male' | 'female'>('male');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status]);

  useEffect(() => {
    if (session) fetchSongs();
    const savedTheme = localStorage.getItem('musyfi-theme') as 'male' | 'female';
    if (savedTheme) setTheme(savedTheme);
  }, [session]);

  const fetchSongs = async () => {
    setLoading(true);
    const res = await fetch('/api/songs/list');
    const data = await res.json();
    setSongs(data.songs || []);
    setLoading(false);
  };

  const handleSongAdded = (song: Song) => {
    setSongs(prev => [song, ...prev]);
    setCurrentSong(song);
    setIsPlaying(true);
    setShowAddModal(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/songs/delete?id=${id}`, { method: 'DELETE' });
    setSongs(prev => prev.filter(s => s.id !== id));
    if (currentSong?.id === id) { setCurrentSong(null); setIsPlaying(false); }
  };

  const bgImage = theme === 'male'
    ? 'https://i.imgur.com/7bMqysF.jpeg'
    : 'https://i.imgur.com/KpMpDDv.jpeg';

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎵</div>
        <p style={{ color: '#666' }}>Loading Musy-Fi...</p>
      </div>
    </div>
  );

  const userName = session?.user?.name?.split(' ')[0] || 'there';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 160 }}>
      <div style={{
        position: 'relative', minHeight: 320, overflow: 'hidden',
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover', backgroundPosition: 'center top',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(10,10,10,0.7) 60%, #0a0a0a 100%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#e53935,#ff7043)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎵</div>
            <span style={{ fontWeight: 900, fontSize: 18, color: '#e53935', fontFamily: 'Georgia, serif' }}>Musy-Fi</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, cursor: 'pointer' }}>🔔</span>
            <button onClick={() => signOut({ callbackUrl: '/login' })} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 20, padding: '6px 14px', color: '#fff', fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              backdropFilter: 'blur(10px)',
            }}>
              <span>👤</span> {userName}
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, padding: '10px 20px 20px' }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 16 }}>Welcome back</h2>
          {songs.length > 0 && (
            <div onClick={() => { setCurrentSong(songs[0]); setIsPlaying(true); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
                borderRadius: 10, padding: '10px 16px', cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.15)',
              }}>
              <span style={{ fontSize: 20 }}>🎵</span>
              <span style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>
                {songs[0].title.length > 20 ? songs[0].title.slice(0, 20) + '…' : songs[0].title}
              </span>
            </div>
          )}
        </div>
      </div>

      <button onClick={() => setShowAddModal(true)} style={{
        position: 'fixed', right: 20, top: 60, zIndex: 40,
        width: 44, height: 44, borderRadius: '50%',
        background: 'rgba(30,30,30,0.9)', border: '1px solid #333',
        color: '#fff', fontSize: 22, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(10px)',
      }}>+</button>

      <div style={{ padding: '0 16px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Your Music Library</h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>⏳</div>
            Loading your library...
          </div>
        ) : songs.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 14,
            border: '1px solid #1a1a1a', padding: '40px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, color: '#e53935', marginBottom: 12 }}>🎵</div>
            <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Your library is empty</h3>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
              Paste YouTube links to populate your music player.
            </p>
            <button onClick={() => setShowAddModal(true)} style={{
              background: '#fff', color: '#111', border: 'none',
              borderRadius: 24, padding: '12px 28px', fontWeight: 800,
              fontSize: 15, cursor: 'pointer',
            }}>Add Songs Now</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {songs.map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                index={i}
                isActive={currentSong?.id === song.id}
                isPlaying={isPlaying && currentSong?.id === song.id}
                onClick={() => { setCurrentSong(song); setIsPlaying(true); }}
                onDelete={() => handleDelete(song.id)}
              />
            ))}
          </div>
        )}

        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#e53935', fontSize: 18 }}>📚</span>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Your Playlists</h2>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ color: '#888', fontSize: 20, cursor: 'pointer' }}>+</span>
              <span style={{ color: '#888', fontSize: 20, cursor: 'pointer' }}>⌄</span>
            </div>
          </div>
          {songs.length > 0 && (
            <div onClick={() => { setCurrentSong(songs[0]); setIsPlaying(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                padding: '12px 14px', cursor: 'pointer',
                border: '1px solid #1a1a1a',
              }}>
              <div style={{ width: 44, height: 44, background: '#1a1a1a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎵</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>My Library</div>
                <div style={{ color: '#666', fontSize: 12 }}>{songs.length} songs</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddSongModal onClose={() => setShowAddModal(false)} onSongAdded={handleSongAdded} />
      )}

      {currentSong && (
        <MusicPlayer
          song={currentSong}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          queue={songs}
          currentIndex={songs.findIndex(s => s.id === currentSong.id)}
          onSongChange={(song) => { setCurrentSong(song); setIsPlaying(true); }}
        />
      )}

      <BottomNav active="home" />
    </div>
  );
}

function SongRow({ song, index, isActive, isPlaying, onClick, onDelete }: {
  song: Song; index: number; isActive: boolean; isPlaying: boolean;
  onClick: () => void; onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
      borderRadius: 10, cursor: 'pointer', position: 'relative',
      background: isActive ? 'rgba(229,57,53,0.1)' : 'transparent',
      border: isActive ? '1px solid rgba(229,57,53,0.2)' : '1px solid transparent',
    }} onClick={onClick}>
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
        <div style={{ fontWeight: 700, fontSize: 14, color: isActive ? '#e53935' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
        <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{song.artist || 'Unknown'}</div>
      </div>
      <button onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }}
        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, padding: '4px 8px' }}>⋮</button>
      {showMenu && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 50,
          background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10,
          padding: '6px', minWidth: 160, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}>
          <button onClick={e => { e.stopPropagation(); setShowMenu(false); onDelete(); }}
            style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', textAlign: 'left', borderRadius: 8, fontSize: 14 }}>
            🗑️ Remove from library
          </button>
        </div>
      )}
    </div>
  );
}
