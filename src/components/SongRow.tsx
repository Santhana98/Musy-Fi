'use client';

import { useState } from 'react';
import { usePlayer, Song } from '@/context/PlayerContext';

export interface SongRowProps {
  song: Song;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onClick: () => void;
  onDelete: () => void;
  onToggleLike: () => void;
  playlists: any[];
  onAddToPlaylist: (playlistId: string, songId: string) => void;
  isPlaylistView?: boolean;
  onRemoveFromPlaylist?: (songId: string) => void;
}

export default function SongRow({
  song,
  isActive,
  isPlaying,
  onClick,
  onDelete,
  onToggleLike,
  playlists,
  onAddToPlaylist,
  isPlaylistView = false,
  onRemoveFromPlaylist
}: SongRowProps) {
  const { playNextTrack, addToQueue } = usePlayer();
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);

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
            <span style={{ fontSize: 16, color: '#fff' }}>{isPlaying ? '▶' : '⏸'}</span>
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
      
      {/* Like Button */}
      <button onClick={e => { e.stopPropagation(); onToggleLike(); }} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: song.liked ? '#e53935' : '#444', padding: '4px' }}>
        {song.liked ? '❤️' : '🤍'}
      </button>

      {/* Context Menu Trigger */}
      <button onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); setShowPlaylistSubmenu(false); }} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, padding: '4px 8px' }}>⋮</button>
      
      {/* Context Dropdown */}
      {showMenu && (
        <div style={{ 
          position: 'absolute', 
          right: 0, 
          top: '100%', 
          zIndex: 150,
          background: '#151515', 
          border: '1px solid rgba(255,255,255,0.08)', 
          borderRadius: 10, 
          padding: '6px', 
          minWidth: 170, 
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)' 
        }} onClick={e => e.stopPropagation()}>
          {!showPlaylistSubmenu ? (
            <>
              <button onClick={() => { playNextTrack(song); setShowMenu(false); }} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'left', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                ⏭️ Play Next
              </button>
              <button onClick={() => { addToQueue(song); setShowMenu(false); }} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'left', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                ➕ Add to Queue
              </button>
              <button onClick={() => setShowPlaylistSubmenu(true)} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'left', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <span>📚 Add to Playlist</span>
                <span style={{ fontSize: 10, color: '#666' }}>▶</span>
              </button>
              {isPlaylistView && onRemoveFromPlaylist && (
                <button onClick={() => { onRemoveFromPlaylist(song.id); setShowMenu(false); }} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', textAlign: 'left', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ❌ Remove
                </button>
              )}
              <button onClick={() => { setShowMenu(false); onDelete(); }} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', textAlign: 'left', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                🗑️ Remove Library
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setShowPlaylistSubmenu(false)} style={{ width: '100%', padding: '6px 14px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', textAlign: 'left', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 4 }}>
                ◀ Back
              </button>
              {playlists.length === 0 ? (
                <p style={{ color: '#555', fontSize: 12, padding: '8px 14px', margin: 0, fontStyle: 'italic' }}>No playlists</p>
              ) : (
                <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {playlists.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => { onAddToPlaylist(p.id, song.id); setShowMenu(false); setShowPlaylistSubmenu(false); }} 
                      style={{ 
                        width: '100%', padding: '8px 14px', background: 'none', border: 'none', 
                        color: '#fff', cursor: 'pointer', textAlign: 'left', borderRadius: 6, 
                        fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                      }}
                    >
                      📁 {p.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
