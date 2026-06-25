'use client';
import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import AddSongModal from '@/components/AddSongModal';
import { usePlayer } from '@/context/PlayerContext';
import SongRow from '@/components/SongRow';

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
  const { 
    currentTrack: currentSong, 
    isPlaying, 
    playTrack, 
    setPlaying,
    activeView,
    activePlaylistId,
    setActiveView
  } = usePlayer();
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'male' | 'female'>('male');
  const [tab, setTab] = useState<Tab>('all');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Playlists state
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [playlistDetail, setPlaylistDetail] = useState<any | null>(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');

  // Reordering state for playlist songs
  const [isEditingPlaylist, setIsEditingPlaylist] = useState(false);
  const [editSongs, setEditSongs] = useState<Song[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const touchStartIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchSongs();
      fetchPlaylists();
      // Register service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    }
    const savedTheme = localStorage.getItem('musyfi-theme') as 'male' | 'female';
    if (savedTheme) setTheme(savedTheme);
  }, [session]);

  // Set default view on home mount
  useEffect(() => {
    if (activeView !== 'playlists') {
      setActiveView('home');
    }
  }, []);

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

  // Fetch playlist details when view target changes
  useEffect(() => {
    if (activeView === 'playlists' && activePlaylistId) {
      fetchPlaylistDetail(activePlaylistId);
    }
  }, [activeView, activePlaylistId]);

  const fetchSongs = async () => {
    setLoading(true);
    const res = await fetch('/api/songs/list');
    const data = await res.json();
    setSongs(data.songs || []);
    setLoading(false);
  };

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

  const fetchPlaylistDetail = async (id: string) => {
    setPlaylistLoading(true);
    try {
      const res = await fetch(`/api/playlists/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPlaylistDetail(data.playlist || null);
        if (data.playlist?.songs) {
          setEditSongs(data.playlist.songs);
        }
      }
    } catch (err) {
      console.error('Error fetching playlist details:', err);
    } finally {
      setPlaylistLoading(false);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlaylistName,
          description: newPlaylistDesc,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewPlaylistName('');
        setNewPlaylistDesc('');
        setShowCreateModal(false);
        await fetchPlaylists();
        if (data.playlist?.id) {
          setActiveView('playlists', data.playlist.id);
        }
      }
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    try {
      const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPlaylistDetail(null);
        setActiveView('home');
        fetchPlaylists();
      }
    } catch (err) {
      console.error('Error deleting playlist:', err);
    }
  };

  const handleRemoveSongFromPlaylist = async (playlistId: string, songId: string) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs?songId=${songId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchPlaylistDetail(playlistId);
      }
    } catch (err) {
      console.error('Error removing song from playlist:', err);
    }
  };

  const handleAddSongToPlaylist = async (playlistId: string, songId: string) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      });
      if (res.ok) {
        if (activeView === 'playlists' && activePlaylistId === playlistId) {
          fetchPlaylistDetail(playlistId);
        } else {
          alert('Song added to playlist!');
        }
      }
    } catch (err) {
      console.error('Error adding song to playlist:', err);
    }
  };

  const handleSavePlaylistOrder = async () => {
    if (!playlistDetail) return;
    try {
      setSavingOrder(true);
      const res = await fetch(`/api/playlists/${playlistDetail.id}/songs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songIds: editSongs.map(s => s.id),
        }),
      });
      if (res.ok) {
        setIsEditingPlaylist(false);
        fetchPlaylistDetail(playlistDetail.id);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save playlist order');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving the playlist order');
    } finally {
      setSavingOrder(false);
    }
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
    const songToDelete = songs.find(s => s.id === id);
    if (songToDelete) {
      // 1. Handle active playing file lock release if deleting currently playing song
      if (currentSong && currentSong.id === id) {
        const audioEl = document.querySelector('audio');
        if (audioEl) {
          try {
            audioEl.pause();
            audioEl.src = '';
            audioEl.load();
            console.log('[MUSY_DEBUG] Stopped playback and released file lock for deleted track');
          } catch (domErr) {
            console.error('[MUSY_DEBUG] Failed to release audio file lock in DOM:', domErr);
          }
        }
        setPlaying(false);
      }

      // 2. Trigger native file deletion
      try {
        const YtDlp = (window as any).Capacitor?.Plugins?.YtDlp;
        if (YtDlp) {
          console.log('[MUSY_DEBUG] Calling native deleteSong for:', songToDelete.videoId);
          const delRes = await YtDlp.deleteSong({ videoId: songToDelete.videoId });
          console.log('[MUSY_DEBUG] deleteSong response:', delRes);
        }
      } catch (err) {
        console.error('[MUSY_DEBUG] Failed to delete native audio file:', err);
      }
    }

    // 3. Clear database record and update UI state immediately
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

  // Drag & Drop reorder handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...editSongs];
    const item = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, item);

    setDraggedIndex(index);
    setEditSongs(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Mobile reorder buttons
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...editSongs];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setEditSongs(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === editSongs.length - 1) return;
    const updated = [...editSongs];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setEditSongs(updated);
  };

  const handleRemoveLocalSong = (index: number) => {
    const updated = [...editSongs];
    updated.splice(index, 1);
    setEditSongs(updated);
  };

  // Touch handlers for Capacitor Android WebView reordering
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    touchStartIndexRef.current = index;
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartIndexRef.current === null) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    const songItem = element.closest('.edit-song-item');
    if (!songItem) return;

    const targetIndexAttr = songItem.getAttribute('data-index');
    if (targetIndexAttr === null) return;

    const targetIndex = parseInt(targetIndexAttr, 10);
    const sourceIndex = touchStartIndexRef.current;

    if (sourceIndex !== targetIndex && targetIndex >= 0 && targetIndex < editSongs.length) {
      const updated = [...editSongs];
      const item = updated[sourceIndex];
      updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, item);

      touchStartIndexRef.current = targetIndex;
      setDraggedIndex(targetIndex);
      setEditSongs(updated);
    }
  };

  const handleTouchEnd = () => {
    touchStartIndexRef.current = null;
    setDraggedIndex(null);
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

  // Render the Playlist Detail view
  const renderPlaylistDetailView = () => {
    if (playlistLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '100px 0', color: '#666' }}>
          <div style={{ fontSize: 32, marginBottom: 10, animation: 'spin 1s linear infinite' }}>⏳</div>
          <p>Loading playlist details...</p>
        </div>
      );
    }

    if (!playlistDetail) {
      return (
        <div style={{ textAlign: 'center', padding: '100px 0', color: '#888' }}>
          <p>Playlist not found.</p>
          <button onClick={() => setActiveView('home')} style={{ marginTop: 20, background: '#e53935', border: 'none', color: '#fff', borderRadius: 20, padding: '8px 18px', cursor: 'pointer', fontWeight: 700 }}>
            Back to Home
          </button>
        </div>
      );
    }

    return (
      <div style={{ padding: '0 16px' }}>
        {/* Back navigation */}
        <button onClick={() => { setActiveView('home'); setIsEditingPlaylist(false); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '6px 14px', color: '#fff', fontSize: 13, cursor: 'pointer', marginBottom: 24, backdropFilter: 'blur(10px)' }}>
          ◀ Back to Home
        </button>

        {isEditingPlaylist ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Reorder Tracks</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setIsEditingPlaylist(false)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePlaylistOrder}
                  disabled={savingOrder}
                  style={{ background: '#e53935', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 800 }}
                >
                  {savingOrder ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {editSongs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666', background: 'rgba(255,255,255,0.01)', border: '1px dashed #222', borderRadius: 12 }}>
                No songs in playlist. Add some tracks below first!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(255,255,255,0.01)', borderRadius: 12, padding: 8, border: '1px solid rgba(255,255,255,0.02)' }}>
                {editSongs.map((song, index) => {
                  const isDragged = draggedIndex === index;
                  return (
                    <div
                      key={song.id}
                      draggable
                      onDragStart={e => handleDragStart(e, index)}
                      onDragOver={e => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className="edit-song-item"
                      data-index={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: isDragged ? 'rgba(229,57,53,0.15)' : 'rgba(255,255,255,0.02)',
                        border: isDragged ? '1px solid #e53935' : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 8,
                        opacity: isDragged ? 0.75 : 1,
                        cursor: 'grab'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveLocalSong(index)}
                          style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: 16, cursor: 'pointer', padding: 4 }}
                          title="Remove from playlist"
                        >
                          ➖
                        </button>
                        <img src={song.thumbnail || '/logo.jpg'} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                          <div style={{ color: '#666', fontSize: 11, marginTop: 1 }}>{song.artist || 'Unknown'}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          style={{ background: 'none', border: 'none', color: index === 0 ? '#1f1f1f' : '#888', cursor: 'pointer', padding: 4, fontSize: 12 }}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === editSongs.length - 1}
                          style={{ background: 'none', border: 'none', color: index === editSongs.length - 1 ? '#1f1f1f' : '#888', cursor: 'pointer', padding: 4, fontSize: 12 }}
                        >
                          ▼
                        </button>
                        <div
                          style={{ color: '#555', fontSize: 16, padding: '4px 8px', touchAction: 'none' }}
                          onTouchStart={e => handleTouchStart(e, index)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                        >
                          ☰
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Playlist Info Header */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, position: 'relative' }}>
              <div style={{ width: 90, height: 90, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                {playlistDetail.coverImage ? (
                  <img src={playlistDetail.coverImage} alt={playlistDetail.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 36 }}>📚</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#e53935', textTransform: 'uppercase', letterSpacing: 1 }}>Playlist</span>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginTop: 4, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playlistDetail.name}</h2>
                {playlistDetail.description && <p style={{ color: '#888', fontSize: 13, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playlistDetail.description}</p>}
                <span style={{ color: '#666', fontSize: 12 }}>{playlistDetail.songs.length} {playlistDetail.songs.length === 1 ? 'song' : 'songs'}</span>
              </div>
              
              <button
                onClick={() => handleDeletePlaylist(playlistDetail.id)}
                style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: 18, cursor: 'pointer', padding: 10, alignSelf: 'center' }}
                title="Delete Playlist"
              >
                🗑️
              </button>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {playlistDetail.songs.length > 0 && (
                <button
                  onClick={() => playSong(playlistDetail.songs[0], playlistDetail.songs)}
                  style={{
                    background: 'linear-gradient(135deg,#e53935,#c62828)', border: 'none',
                    color: '#fff', borderRadius: 24, padding: '10px 24px',
                    fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 4px 12px rgba(229,57,53,0.3)'
                  }}
                >
                  <span>▶</span> Play
                </button>
              )}
              <button
                onClick={() => { setEditSongs(playlistDetail.songs); setIsEditingPlaylist(true); }}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', borderRadius: 24, padding: '10px 20px',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer'
                }}
              >
                📝 Reorder
              </button>
            </div>

            {/* Tracks List */}
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 6 }}>Playlist Tracks</h3>
            {playlistDetail.songs.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', padding: '40px 20px', textAlign: 'center', color: '#555' }}>
                This playlist is empty. Add songs from your library below!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {playlistDetail.songs.map((song: any, i: number) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={i}
                    isActive={currentSong?.id === song.id}
                    isPlaying={isPlaying && currentSong?.id === song.id}
                    onClick={() => playSong(song, playlistDetail.songs)}
                    onDelete={() => handleDelete(song.id)}
                    onToggleLike={() => handleToggleLike(song.id)}
                    playlists={playlists}
                    onAddToPlaylist={handleAddSongToPlaylist}
                    isPlaylistView={true}
                    onRemoveFromPlaylist={(songId) => handleRemoveSongFromPlaylist(playlistDetail.id, songId)}
                  />
                ))}
              </div>
            )}

            {/* Recommendations / Adding from library */}
            <div style={{ marginTop: 40, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Add to Playlist</h3>
              <p style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>Select songs from your library to add to this playlist:</p>
              
              {songs.filter(s => !playlistDetail.songs.some((ps: any) => ps.id === s.id)).length === 0 ? (
                <p style={{ color: '#555', fontSize: 12, fontStyle: 'italic' }}>No remaining library tracks to add.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {songs
                    .filter(s => !playlistDetail.songs.some((ps: any) => ps.id === s.id))
                    .map((song) => (
                      <div
                        key={song.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)',
                          borderRadius: 10
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                          <img src={song.thumbnail || '/logo.jpg'} style={{ width: 34, height: 34, borderRadius: 4, objectFit: 'cover' }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                            <div style={{ color: '#555', fontSize: 11, marginTop: 1 }}>{song.artist || 'Unknown'}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddSongToPlaylist(playlistDetail.id, song.id)}
                          style={{
                            background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)',
                            color: '#e53935', borderRadius: 20, padding: '4px 12px',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          ➕ Add
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(10,10,10,0.95) 100%), url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center top',
      backgroundAttachment: 'fixed',
      paddingBottom: 160,
      color: '#fff'
    }}>
      {/* Hero */}
      <div style={{ position: 'relative', minHeight: 240, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(10,10,10,0.4) 100%)' }} />

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

      {/* Main Content Area */}
      {activeView === 'playlists' ? (
        renderPlaylistDetailView()
      ) : (
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
                  playlists={playlists}
                  onAddToPlaylist={handleAddSongToPlaylist}
                />
              ))}
            </div>
          )}

          {/* Playlists Section */}
          <div style={{ marginTop: 28, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#e53935', fontSize: 18 }}>📚</span>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Your Playlists</h2>
              </div>
              <span onClick={() => setShowCreateModal(true)} style={{ color: '#e53935', fontSize: 24, cursor: 'pointer', padding: '0 8px', fontWeight: 900 }}>+</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  onClick={() => setActiveView('playlists', playlist.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    border: '1px solid #1a1a1a',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ width: 44, height: 44, background: '#1a1a1a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden', flexShrink: 0 }}>
                    {playlist.coverImage ? (
                      <img src={playlist.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      '📚'
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{playlist.name}</div>
                    <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}</div>
                  </div>
                </div>
              ))}

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
        </div>
      )}

      {showAddModal && <AddSongModal onClose={() => setShowAddModal(false)} onSongAdded={handleSongAdded} />}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.85)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 20,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: '#121212', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14, padding: 24, width: '100%', maxWidth: 400,
            boxShadow: '0 20px 50px rgba(0,0,0,0.9)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800 }}>Create Playlist</h3>
            <form onSubmit={handleCreatePlaylist}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 700 }}>Name</label>
                <input
                  type="text"
                  required
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  placeholder="My Playlist #1"
                  style={{
                    width: '100%', background: '#0a0a0a', border: '1px solid #222',
                    borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 700 }}>Description (Optional)</label>
                <textarea
                  value={newPlaylistDesc}
                  onChange={e => setNewPlaylistDesc(e.target.value)}
                  placeholder="Describe your playlist..."
                  style={{
                    width: '100%', background: '#0a0a0a', border: '1px solid #222',
                    borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14,
                    minHeight: 80, resize: 'vertical', boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid #222',
                    color: '#aaa', borderRadius: 8, padding: '10px 16px',
                    fontSize: 14, cursor: 'pointer', fontWeight: 700
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#e53935', border: 'none',
                    color: '#fff', borderRadius: 8, padding: '10px 20px',
                    fontSize: 14, cursor: 'pointer', fontWeight: 800
                  }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav active="home" />
    </div>
  );
}

