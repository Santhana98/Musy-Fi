'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { usePlayer, Song } from '@/context/PlayerContext';

export default function SearchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    setPlaying,
    songs,
    playTrack,
    currentIndex,
    queue,
  } = usePlayer();

  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState<'male' | 'female'>('male');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    const savedTheme = localStorage.getItem('musyfi-theme') as 'male' | 'female';
    if (savedTheme) setTheme(savedTheme);
  }, [status]);

  const bgImage = theme === 'male' ? '/bg-male.jpg' : '/bg-female.jpg';

  const filteredSongs = query.trim()
    ? songs.filter(s =>
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        (s.artist && s.artist.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  const handleSongChange = (song: Song) => {
    playTrack(song, filteredSongs);
  };

  const handlePlaySong = (song: Song) => {
    playTrack(song, filteredSongs);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 160 }}>
      {/* Hero */}
      <div style={{ position: 'relative', minHeight: 180, overflow: 'hidden', backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(10,10,10,0.85) 70%, #0a0a0a 100%)' }} />

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 8 }}>
          <img src="/logo.jpg" alt="Musy-Fi Logo" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontWeight: 900, fontSize: 18, color: '#e53935', fontFamily: 'Georgia, serif' }}>Musy-Fi Search</span>
        </div>

        <div style={{ position: 'relative', zIndex: 1, padding: '0 20px' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by song name or artist..."
            style={{
              width: '100%',
              maxWidth: 500,
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              color: '#fff',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: '0 16px', marginTop: 16 }}>
        {query.trim() ? (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 12 }}>
              Search Results ({filteredSongs.length})
            </h2>
            {filteredSongs.length === 0 ? (
              <p style={{ color: '#555', fontSize: 14 }}>No songs found matching your search.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filteredSongs.map((song, i) => (
                  <SearchSongRow
                    key={song.id}
                    song={song}
                    isActive={currentTrack?.id === song.id}
                    isPlaying={isPlaying && currentTrack?.id === song.id}
                    onClick={() => handlePlaySong(song)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#555' }}>
            <span style={{ fontSize: 32 }}>🔍</span>
            <p style={{ marginTop: 8, fontSize: 14 }}>Search your personal music library above</p>
          </div>
        )}
      </div>



      <BottomNav active="search" />
    </div>
  );
}

function SearchSongRow({ song, isActive, isPlaying, onClick }: {
  song: Song; isActive: boolean; isPlaying: boolean; onClick: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 10,
        cursor: 'pointer',
        background: isActive ? 'rgba(229,57,53,0.1)' : 'transparent',
        border: isActive ? '1px solid rgba(229,57,53,0.2)' : '1px solid transparent',
      }}
      onClick={onClick}
    >
      <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#1a1a1a', position: 'relative' }}>
        {song.thumbnail ? (
          <img src={song.thumbnail} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎵</div>
        )}
        {isActive && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(229,57,53,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 16, color: '#fff' }}>{isPlaying ? '▶' : '⏸'}</span>
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: isActive ? '#e53935' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
        <div style={{ color: '#555', fontSize: 12, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist || 'Unknown Artist'}</div>
      </div>
    </div>
  );
}
