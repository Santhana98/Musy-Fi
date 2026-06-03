'use client';

import React, { useEffect, useState } from 'react';
import { usePlayer, ActiveView } from '@/context/PlayerContext';
import { 
  Home, 
  Search, 
  Library, 
  Heart, 
  UploadCloud, 
  Settings, 
  Plus, 
  Music, 
  Disc,
  FolderOpen
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

interface SidebarPlaylist {
  id: string;
  name: string;
  songCount: number;
}

export default function Sidebar() {
  const { activeView, setActiveView, activePlaylistId } = usePlayer();
  const { data: session } = useSession();
  const [playlists, setPlaylists] = useState<SidebarPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');

  // Fetch playlists
  const fetchPlaylists = async () => {
    if (!session) return;
    try {
      setLoading(true);
      const res = await fetch('/api/playlists');
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists || []);
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, [session, activeView]);

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
        fetchPlaylists();
        // Automatically view the newly created playlist
        setActiveView('playlists', data.playlist.id);
      }
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
  };

  const navItems = [
    { view: 'home' as ActiveView, label: 'Home', icon: Home },
    { view: 'search' as ActiveView, label: 'Search', icon: Search },
    { view: 'liked-songs' as ActiveView, label: 'Liked Songs', icon: Heart, iconColor: 'text-red-500 fill-red-500' },
    { view: 'upload' as ActiveView, label: 'Upload & Add', icon: UploadCloud },
    { view: 'settings' as ActiveView, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="hidden md:flex w-64 bg-bg-sidebar flex-col h-full border-r border-border-muted select-none">
      {/* Brand Logo */}
      <div className="p-6 flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('home')}>
        <img src="/logo.jpg" alt="Musi-Fi Logo" className="w-8 h-8 rounded-full object-cover animate-spin" style={{ animationDuration: '15s' }} />
        <span className="text-xl font-bold tracking-tight text-[#D62828]">Musi-Fi</span>
      </div>

      {/* Primary Navigation */}
      <div className="px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.view && !activePlaylistId;
            return (
              <li key={item.view}>
                <button
                  onClick={() => setActiveView(item.view, null)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 group ${
                    isActive 
                      ? 'bg-bg-active text-white' 
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${item.iconColor || ''}`} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Library Section */}
      <div className="flex-1 flex flex-col mt-6 overflow-hidden border-t border-zinc-900">
        <div className="flex items-center justify-between px-6 py-4 text-zinc-400">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Library className="w-4 h-4" />
            <span>Playlists</span>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-900 rounded-full transition-all"
            title="Create Playlist"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Playlists List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {loading && playlists.length === 0 ? (
            <div className="px-4 py-2 text-xs text-zinc-500 animate-pulse">Loading playlists...</div>
          ) : playlists.length === 0 ? (
            <div className="px-4 py-3 text-xs text-zinc-500 flex flex-col gap-2 items-center text-center">
              <FolderOpen className="w-8 h-8 opacity-40" />
              <span>No playlists yet. Create one to get started!</span>
            </div>
          ) : (
            playlists.map((playlist) => {
              const isActive = activeView === 'playlists' && activePlaylistId === playlist.id;
              return (
                <button
                  key={playlist.id}
                  onClick={() => setActiveView('playlists', playlist.id)}
                  className={`w-full text-left flex items-center justify-between px-4 py-2.5 rounded-md text-sm font-medium transition-all group ${
                    isActive 
                      ? 'bg-bg-active text-spotify-green' 
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40'
                  }`}
                >
                  <span className="truncate pr-2">{playlist.name}</span>
                  <span className="text-xs text-zinc-500 group-hover:text-zinc-300 font-normal">
                    {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Create Playlist Modal (Overlay) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-bg-card border border-border-muted p-6 rounded-lg w-full max-w-sm glass-panel shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Create New Playlist</h3>
            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">Playlist Name</label>
                <input
                  type="text"
                  required
                  placeholder="My awesome playlist"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-spotify-green"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">Description (Optional)</label>
                <textarea
                  placeholder="Give your playlist a description"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-spotify-green resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPlaylistName('');
                    setNewPlaylistDesc('');
                  }}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-spotify-green hover:bg-spotify-green-hover text-black font-semibold text-sm px-4 py-2 rounded transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
