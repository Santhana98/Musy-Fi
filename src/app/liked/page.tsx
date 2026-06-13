'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { usePlayer, Song } from '@/context/PlayerContext';

export default function LikedPage() {
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

  const [theme, setTheme] = useState<'male' | 'female'>('male');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    const savedTheme = localStorage.getItem('musyfi-theme') as 'male' | 'female';
    if (savedTheme) setTheme(savedTheme);
  }, [status]);

  const bgImage = theme === 'male' ? '/bg-male.jpg' : '/bg-female.jpg';

  const likedSongs = songs.filter(s => s.liked);

  const handleSongChange = (song: Song) => {
    playTrack(song, likedSongs);
  };

  const handlePlaySong = (song: Song) => {
    playTrack(song, likedSongs);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 160 }}>
      {/* Hero */}
      <div style={{ position: 'relative', minHeight: 200, overflow: 'hidden', backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(10,10,10,0.85) 70%, #0a0a0a 100%)' }} />

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 8 }}>
          <img src="/logo.jpg" alt="Musy-Fi Logo" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontWeight: 900, fontSize: 18, color: '#e53935', fontFamily: 'Georgia, serif' }}>Musy-Fi</span>
        </div>

        <div style={{ position: 'relative', zIndex: 1, padding: '8px 20px 24px' }}>
          <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Liked Songs</h2>
          <p style={{ color: '#888', fontSize: 14 }}>Your personalized collection of favorites · {likedSongs.length} songs</p>
        </div>
      </div>

      {/* Songs List */}
      <div style={{ padding: '0 16px', marginTop: 16 }}>
        {likedSongs.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid #1a1a1a', padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, color: '#e53935', marginBottom: 12 }}>❤️</div>
            <h3 style={{ fontWeight: 800, marginBottom: 8, color: '#fff' }}>No liked songs yet</h3>
            <p style={{ color: '#666', fontSize: 14 }}>Tap the heart icon on any song in your library to add it here!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {likedSongs.map((song, i) => (
              <LikedSongRow
                key={song.id}
                song={song}
                isActive={currentTrack?.id === song.id}
                isPlaying={isPlaying && currentTrack?.id === song.id}
                onClick={() => handlePlaySong(song)}
              />
            ))}
          </div>
        )}
      </div>



      <BottomNav active="liked" />
    </div>
  );
}

function LikedSongRow({ song, isActive, isPlaying, onClick }: {
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
