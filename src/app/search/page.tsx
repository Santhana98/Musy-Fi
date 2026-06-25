'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { usePlayer, Song } from '@/context/PlayerContext';
import SongRow from '@/components/SongRow';

export default function SearchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    setPlaying,
    songs,
    setSongs,
    playTrack,
  } = usePlayer();

  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState<'male' | 'female'>('male');
  const [playlists, setPlaylists] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    const savedTheme = localStorage.getItem('musyfi-theme') as 'male' | 'female';
    if (savedTheme) setTheme(savedTheme);
  }, [status]);

  useEffect(() => {
    if (session) {
      fetchPlaylists();
    }
  }, [session]);

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('/api/playlists');
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists || []);
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
    }
  };

  const handleAddToPlaylist = async (playlistId: string, songId: string) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      });
      if (res.ok) {
        alert('Song added to playlist!');
      }
    } catch (err) {
      console.error(err);
    }
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this track from your library?')) return;
    const songToDelete = songs.find(s => s.id === id);
    if (songToDelete) {
      if (currentTrack && currentTrack.id === id) {
        const audioEl = document.querySelector('audio');
        if (audioEl) {
          try {
            audioEl.pause();
            audioEl.src = '';
            audioEl.load();
          } catch {}
        }
        setPlaying(false);
      }
      try {
        const YtDlp = (window as any).Capacitor?.Plugins?.YtDlp;
        if (YtDlp) {
          await YtDlp.deleteSong({ videoId: songToDelete.videoId });
        }
      } catch (err) {
        console.error('Failed native delete:', err);
      }
    }
    await fetch(`/api/songs/delete?id=${id}`, { method: 'DELETE' });
    setSongs(prev => prev.filter(s => s.id !== id));
  };

  const bgImage = theme === 'male' ? '/bg-male.jpg' : '/bg-female.jpg';

  const filteredSongs = query.trim()
    ? songs.filter(s =>
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        (s.artist && s.artist.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

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
                  <SongRow
                    key={song.id}
                    song={song}
                    index={i}
                    isActive={currentTrack?.id === song.id}
                    isPlaying={isPlaying && currentTrack?.id === song.id}
                    onClick={() => handlePlaySong(song)}
                    onDelete={() => handleDelete(song.id)}
                    onToggleLike={() => handleToggleLike(song.id)}
                    playlists={playlists}
                    onAddToPlaylist={handleAddToPlaylist}
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
