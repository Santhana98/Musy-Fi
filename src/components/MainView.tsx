'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePlayer, Song, ActiveView } from '@/context/PlayerContext';
import { useSession } from 'next-auth/react';
import { 
  Play, 
  Pause, 
  Clock, 
  Trash2, 
  Heart, 
  Plus, 
  UploadCloud, 
  Link2, 
  Music, 
  Youtube, 
  Film,
  Disc, 
  Calendar,
  Settings as SettingsIcon,
  ChevronRight,
  ListMusic,
  FolderOpen
} from 'lucide-react';

interface MainViewProps {
  searchQuery: string;
}

const PLAYLIST_FALLBACK_IMAGE = '/assets/images/18.jpg';

interface PlaylistDetail {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  songs: Song[];
}

export default function MainView({ searchQuery }: MainViewProps) {
  const { data: session } = useSession();
  const { 
    activeView, 
    activePlaylistId, 
    setActiveView, 
    playTrack, 
    currentTrack, 
    isPlaying,
    togglePlay,
    addToQueue
  } = usePlayer();

  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [playlistDetail, setPlaylistDetail] = useState<PlaylistDetail | null>(null);
  const [playlistsList, setPlaylistsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // File Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Link Paste State
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkArtist, setLinkArtist] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);

  // Dynamic playlists dropdown inside song rows
  const [activeDropdownRow, setActiveDropdownRow] = useState<string | null>(null);

  // Fetch all user songs
  const fetchAllSongs = async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/songs');
      if (res.ok) {
        const data = await res.json();
        setAllSongs(data.songs || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch liked songs
  const fetchLikedSongs = async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/songs/like');
      if (res.ok) {
        const data = await res.json();
        setLikedSongs(data.songs || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch playlists list
  const fetchPlaylists = async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/playlists');
      if (res.ok) {
        const data = await res.json();
        setPlaylistsList(data.playlists || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch playlist details
  const fetchPlaylistDetail = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/playlists/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPlaylistDetail(data.playlist || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger loads on view changes
  useEffect(() => {
    if (!session) return;
    
    if (activeView === 'home') {
      fetchAllSongs();
      fetchPlaylists();
    } else if (activeView === 'liked-songs') {
      fetchLikedSongs();
    } else if (activeView === 'playlists' && activePlaylistId) {
      fetchPlaylistDetail(activePlaylistId);
      fetchAllSongs(); // fetch options to add to playlist
    } else if (activeView === 'search') {
      fetchAllSongs();
      fetchPlaylists();
    }
  }, [session, activeView, activePlaylistId]);

  // Handle Like Toggle
  const handleLikeToggle = async (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/songs/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      });
      if (res.ok) {
        // Refresh active views
        if (activeView === 'liked-songs') {
          fetchLikedSongs();
        } else if (activeView === 'playlists' && activePlaylistId) {
          fetchPlaylistDetail(activePlaylistId);
        } else {
          fetchAllSongs();
        }
      }
    } catch (err) {
      console.error('Error liking song:', err);
    }
  };

  // Handle Song Delete
  const handleDeleteSong = async (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this track from your library?')) return;

    try {
      const res = await fetch(`/api/songs/${songId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchAllSongs();
        fetchLikedSongs();
        if (activeView === 'playlists' && activePlaylistId) {
          fetchPlaylistDetail(activePlaylistId);
        }
      }
    } catch (err) {
      console.error('Error deleting song:', err);
    }
  };

  // Handle MP3 File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      setUploading(true);
      setUploadProgress(10);
      
      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress(40);

      const res = await fetch('/api/songs/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(80);

      if (res.ok) {
        setUploadProgress(100);
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          fetchAllSongs();
          setActiveView('home');
        }, 500);
      } else {
        const data = await res.json();
        alert(data.error || 'Upload failed');
        setUploading(false);
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('An error occurred during file upload.');
      setUploading(false);
    }
  };

  // Handle Link Submission (YouTube/Vimeo)
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    try {
      setLinkLoading(true);
      const res = await fetch('/api/songs/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: linkUrl,
          title: linkTitle || undefined,
          artist: linkArtist || undefined,
        }),
      });

      if (res.ok) {
        setLinkUrl('');
        setLinkTitle('');
        setLinkArtist('');
        fetchAllSongs();
        setActiveView('home');
      } else {
        const data = await res.json();
        alert(data.error || 'Link addition failed');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred adding the URL link.');
    } finally {
      setLinkLoading(false);
    }
  };

  // Add Song to Playlist
  const handleAddSongToPlaylist = async (playlistId: string, songId: string) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      });
      if (res.ok) {
        setActiveDropdownRow(null);
        if (activeView === 'playlists' && activePlaylistId === playlistId) {
          fetchPlaylistDetail(playlistId);
        } else {
          alert('Song added to playlist!');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Remove Song from Playlist
  const handleRemoveSongFromPlaylist = async (playlistId: string, songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs?songId=${songId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchPlaylistDetail(playlistId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Format Duration helper (seconds -> mm:ss)
  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filtered Songs for Search
  const filteredSongs = allSongs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPlaylists = playlistsList.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isHome = activeView === 'home';

  return (
    <div 
      className={`flex-1 overflow-y-auto px-8 py-6 pb-24 relative select-none bg-cover bg-center bg-no-repeat ${
        isHome ? '' : 'bg-gradient-to-b from-zinc-900 to-bg-base'
      }`}
      style={isHome ? { backgroundImage: 'linear-gradient(to bottom, rgba(7, 7, 8, 0.65), rgba(7, 7, 8, 0.9)), url(/bg-home-sunset.jpg)' } : {}}
    >
      
      {/* 1. HOME VIEW */}
      {activeView === 'home' && (
        <div className="space-y-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-6">Welcome back</h1>
            
            {/* Playlists grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {playlistsList.slice(0, 6).map((playlist) => (
                <div
                  key={playlist.id}
                  onClick={() => setActiveView('playlists', playlist.id)}
                  className="flex items-center bg-zinc-900/60 hover:bg-zinc-800/80 rounded-md overflow-hidden transition-all duration-300 group cursor-pointer border border-zinc-950/20 shadow-md relative"
                >
                  <div className="w-16 h-16 bg-zinc-800 flex-shrink-0 flex items-center justify-center border-r border-zinc-900">
                    {playlist.coverImage ? (
                      <img src={playlist.coverImage} alt={playlist.name} className="w-full h-full object-cover" />
                    ) : (
                      <ListMusic className="w-6 h-6 text-zinc-400" />
                    )}
                  </div>
                  <div className="p-4 flex-1 truncate font-semibold text-white text-sm">
                    {playlist.name}
                  </div>
                  
                  {/* Hover play button */}
                  <button className="absolute right-4 bg-spotify-green hover:bg-spotify-green-hover p-3 rounded-full text-black opacity-0 scale-90 translate-x-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-300 shadow-xl z-10">
                    <Play className="w-4 h-4 fill-black" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Uploaded Tracklist */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Your Music Library</h2>
            
            {allSongs.length === 0 ? (
              <div className="glass-panel p-8 rounded-lg flex flex-col items-center justify-center text-zinc-500 gap-4 text-center">
                <Music className="w-12 h-12 opacity-40 text-spotify-green" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Your library is empty</h3>
                  <p className="text-xs text-zinc-400">Upload MP3 tracks or paste YouTube links to populate your cloud player.</p>
                </div>
                <button
                  onClick={() => setActiveView('upload')}
                  className="bg-white hover:scale-105 text-black font-semibold text-xs px-4 py-2.5 rounded-full transition-all"
                >
                  Add Songs Now
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Header row */}
                <div className="grid grid-cols-[16px_1fr_120px_48px] gap-4 px-4 py-2 text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-900">
                  <div>#</div>
                  <div>Title</div>
                  <div>Source</div>
                  <div className="flex justify-end"><Clock className="w-4 h-4" /></div>
                </div>

                {/* Song list */}
                {allSongs.slice(0, 10).map((song, idx) => {
                  const isCurrent = currentTrack?.id === song.id;
                  return (
                    <div
                      key={song.id}
                      onClick={() => playTrack(song, allSongs)}
                      className={`grid grid-cols-[16px_1fr_120px_48px] gap-4 px-4 py-2.5 rounded-md items-center group cursor-pointer transition-colors ${
                        isCurrent ? 'bg-zinc-800/40' : 'hover:bg-zinc-900/50'
                      }`}
                    >
                      <div className="text-sm text-zinc-500">
                        {isCurrent && isPlaying ? (
                          <div className="flex gap-0.5 items-end h-3.5 w-3.5 pb-0.5">
                            <span className="equalizer-bar w-0.5 bg-spotify-green h-1"></span>
                            <span className="equalizer-bar w-0.5 bg-spotify-green h-2"></span>
                            <span className="equalizer-bar w-0.5 bg-spotify-green h-1.5"></span>
                          </div>
                        ) : (
                          <span className="group-hover:hidden">{idx + 1}</span>
                        )}
                        <Play className="w-3.5 h-3.5 text-white fill-white hidden group-hover:block" />
                      </div>
                      
                      {/* Track Details */}
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-10 h-10 bg-zinc-800 rounded flex-shrink-0 flex items-center justify-center border border-zinc-900 overflow-hidden">
                          <img
                            src={song.thumbnail || PLAYLIST_FALLBACK_IMAGE}
                            alt={song.title}
                            className="w-full h-full object-cover"
                            onError={(event) => {
                              event.currentTarget.src = PLAYLIST_FALLBACK_IMAGE;
                            }}
                          />
                        </div>
                        <div className="truncate">
                          <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-spotify-green' : 'text-white'}`}>
                            {song.title}
                          </p>
                          <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
                        </div>
                      </div>

                      {/* Source tag */}
                      <div className="text-xs font-semibold flex items-center gap-1.5 text-zinc-400 capitalize">
                        {song.type === 'youtube' ? (
                          <span className="flex items-center gap-1 text-red-500 bg-red-950/20 px-2 py-0.5 rounded border border-red-900/30">
                            <Youtube className="w-3.5 h-3.5" />
                            YouTube
                          </span>
                        ) : song.type === 'google' ? (
                          <span className="flex items-center gap-1 text-blue-500 bg-blue-950/20 px-2 py-0.5 rounded border border-blue-900/30">
                            <Disc className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
                            G-Drive
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-zinc-400 bg-zinc-950/40 px-2 py-0.5 rounded border border-zinc-900">
                            <Music className="w-3.5 h-3.5" />
                            Local File
                          </span>
                        )}
                      </div>

                      {/* Controls / Time */}
                      <div className="text-xs text-zinc-400 font-medium flex items-center justify-end gap-3">
                        <button
                          onClick={(e) => handleLikeToggle(song.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition-opacity"
                        >
                          <Heart className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSong(song.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity"
                          title="Delete song"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-right">{formatDuration(song.duration)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. SEARCH VIEW */}
      {activeView === 'search' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Search Library</h1>
            <p className="text-xs text-zinc-400">Find files and playlists from your uploaded collections.</p>
          </div>

          {searchQuery.trim() === '' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
              <div 
                onClick={() => setActiveView('liked-songs')}
                className="h-32 bg-gradient-to-br from-purple-800 to-indigo-900 rounded-lg p-5 flex flex-col justify-between cursor-pointer hover:brightness-110 transition-all shadow-lg"
              >
                <span className="text-xl font-bold text-white">Liked Songs</span>
                <Heart className="w-12 h-12 text-white/20 self-end fill-white/10" />
              </div>
              <div 
                onClick={() => setActiveView('upload')}
                className="h-32 bg-gradient-to-br from-emerald-800 to-teal-900 rounded-lg p-5 flex flex-col justify-between cursor-pointer hover:brightness-110 transition-all shadow-lg"
              >
                <span className="text-xl font-bold text-white">Upload New Track</span>
                <UploadCloud className="w-12 h-12 text-white/20 self-end" />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Songs results */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3">Songs</h3>
                {filteredSongs.length === 0 ? (
                  <p className="text-sm text-zinc-500">No songs match your search query.</p>
                ) : (
                  <div className="space-y-1">
                    {filteredSongs.map((song, idx) => (
                      <div
                        key={song.id}
                        onClick={() => playTrack(song, filteredSongs)}
                        className={`flex items-center justify-between px-4 py-2 rounded hover:bg-zinc-900/60 group cursor-pointer transition-colors ${
                          currentTrack?.id === song.id ? 'bg-zinc-800/30' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-10 h-10 bg-zinc-800 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {song.thumbnail ? (
                              <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                            ) : (
                              <Music className="w-4 h-4 text-zinc-400" />
                            )}
                          </div>
                          <div className="truncate">
                            <p className={`text-sm font-semibold truncate ${currentTrack?.id === song.id ? 'text-spotify-green' : 'text-white'}`}>
                              {song.title}
                            </p>
                            <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={(e) => handleLikeToggle(song.id, e)}
                            className="text-zinc-400 hover:text-white"
                          >
                            <Heart className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-zinc-400 font-medium">{formatDuration(song.duration)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Playlists results */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3">Playlists</h3>
                {filteredPlaylists.length === 0 ? (
                  <p className="text-sm text-zinc-500">No playlists match your search query.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {filteredPlaylists.map((playlist) => (
                      <div
                        key={playlist.id}
                        onClick={() => setActiveView('playlists', playlist.id)}
                        className="bg-zinc-900 p-4 rounded-md hover:bg-zinc-800/80 cursor-pointer transition-all duration-200 border border-zinc-900 group"
                      >
                        <div className="w-full aspect-square bg-zinc-800 rounded-md mb-3 flex items-center justify-center overflow-hidden border border-zinc-950">
                          {playlist.coverImage ? (
                            <img src={playlist.coverImage} alt={playlist.name} className="w-full h-full object-cover" />
                          ) : (
                            <ListMusic className="w-12 h-12 text-zinc-500" />
                          )}
                        </div>
                        <h4 className="font-semibold text-sm text-white truncate mb-1">{playlist.name}</h4>
                        <span className="text-xs text-zinc-400">{playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. LIKED SONGS VIEW */}
      {activeView === 'liked-songs' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Panel */}
          <div className="flex items-end gap-6 bg-gradient-to-t from-zinc-900 to-indigo-900/60 -mx-8 -mt-6 p-8 pt-12 border-b border-zinc-900">
            <div className="w-36 h-36 bg-gradient-to-br from-indigo-700 to-purple-800 rounded shadow-2xl flex items-center justify-center border border-indigo-500/30">
              <Heart className="w-16 h-16 text-white fill-white" />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-zinc-300">Playlist</span>
              <h1 className="text-4xl font-extrabold text-white">Liked Songs</h1>
              <p className="text-xs text-zinc-400">
                {session?.user?.name || session?.user?.email} • {likedSongs.length} {likedSongs.length === 1 ? 'song' : 'songs'}
              </p>
            </div>
          </div>

          {/* Action Row */}
          {likedSongs.length > 0 && (
            <div className="flex items-center gap-4 py-4">
              <button
                onClick={() => playTrack(likedSongs[0], likedSongs)}
                className="bg-spotify-green hover:bg-spotify-green-hover p-4 rounded-full text-black hover:scale-105 transition-transform"
                title="Play liked songs"
              >
                {isPlaying && likedSongs.some(s => s.id === currentTrack?.id) ? (
                  <Pause className="w-6 h-6 fill-black" />
                ) : (
                  <Play className="w-6 h-6 fill-black ml-0.5" />
                )}
              </button>
            </div>
          )}

          {/* Song list */}
          {likedSongs.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-4">
              <Heart className="w-16 h-16 text-zinc-700 fill-zinc-800" />
              <div>
                <h3 className="text-white font-semibold mb-1 font-lg">Songs you like will appear here</h3>
                <p className="text-xs text-zinc-400">Click the heart icon on any song row inside Home or Search tabs to add tracks.</p>
              </div>
              <button
                onClick={() => setActiveView('home')}
                className="bg-white hover:scale-105 text-black font-semibold text-xs px-4 py-2.5 rounded-full transition-all mt-2"
              >
                Browse Songs
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[16px_1fr_120px_48px] gap-4 px-4 py-2 text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-900">
                <div>#</div>
                <div>Title</div>
                <div>Source</div>
                <div className="flex justify-end"><Clock className="w-4 h-4" /></div>
              </div>

              {likedSongs.map((song, idx) => {
                const isCurrent = currentTrack?.id === song.id;
                return (
                  <div
                    key={song.id}
                    onClick={() => playTrack(song, likedSongs)}
                    className={`grid grid-cols-[16px_1fr_120px_48px] gap-4 px-4 py-2.5 rounded-md items-center group cursor-pointer transition-colors ${
                      isCurrent ? 'bg-zinc-800/40' : 'hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className="text-sm text-zinc-500">
                      {isCurrent && isPlaying ? (
                        <div className="flex gap-0.5 items-end h-3.5 w-3.5 pb-0.5">
                          <span className="equalizer-bar w-0.5 bg-spotify-green h-1"></span>
                          <span className="equalizer-bar w-0.5 bg-spotify-green h-2"></span>
                          <span className="equalizer-bar w-0.5 bg-spotify-green h-1.5"></span>
                        </div>
                      ) : (
                        <span className="group-hover:hidden">{idx + 1}</span>
                      )}
                      <Play className="w-3.5 h-3.5 text-white fill-white hidden group-hover:block" />
                    </div>

                    <div className="flex items-center gap-3 truncate">
                      <div className="w-10 h-10 bg-zinc-800 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                        <img
                          src={song.thumbnail || PLAYLIST_FALLBACK_IMAGE}
                          alt={song.title}
                          className="w-full h-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = PLAYLIST_FALLBACK_IMAGE;
                          }}
                        />
                      </div>
                      <div className="truncate">
                        <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-spotify-green' : 'text-white'}`}>
                          {song.title}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-400 capitalize">
                      {song.type === 'youtube' ? 'YouTube' : song.type === 'google' ? 'Google Drive' : 'Local File'}
                    </div>

                    <div className="text-xs text-zinc-400 font-medium flex items-center justify-end gap-3">
                      <button
                        onClick={(e) => handleLikeToggle(song.id, e)}
                        className="text-spotify-green fill-spotify-green"
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-right">{formatDuration(song.duration)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. PLAYLIST DETAIL VIEW */}
      {activeView === 'playlists' && activePlaylistId && (
        <div className="space-y-6 animate-fade-in">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-zinc-500 animate-pulse">Loading playlist details...</div>
          ) : playlistDetail ? (
            <>
              {/* Playlist Header Panel */}
              <div className="flex items-end gap-6 bg-gradient-to-t from-zinc-900 to-zinc-800/40 -mx-8 -mt-6 p-8 pt-12 border-b border-zinc-900 relative">
                <div className="w-36 h-36 bg-zinc-850 rounded shadow-2xl flex items-center justify-center border border-zinc-700/30 overflow-hidden">
                  {playlistDetail.coverImage ? (
                    <img src={playlistDetail.coverImage} alt={playlistDetail.name} className="w-full h-full object-cover" />
                  ) : (
                    <ListMusic className="w-16 h-16 text-zinc-500" />
                  )}
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-zinc-300">Playlist</span>
                  <h1 className="text-4xl font-extrabold text-white">{playlistDetail.name}</h1>
                  {playlistDetail.description && (
                    <p className="text-sm text-zinc-400">{playlistDetail.description}</p>
                  )}
                  <p className="text-xs text-zinc-400">
                    {session?.user?.name || session?.user?.email} • {playlistDetail.songs.length} {playlistDetail.songs.length === 1 ? 'song' : 'songs'}
                  </p>
                </div>

                {/* Delete playlist option */}
                <button
                  onClick={async () => {
                    if (confirm('Delete this playlist?')) {
                      const res = await fetch(`/api/playlists/${playlistDetail.id}`, { method: 'DELETE' });
                      if (res.ok) setActiveView('home');
                    }
                  }}
                  className="absolute right-8 top-8 text-zinc-400 hover:text-red-500 p-2 hover:bg-zinc-800/40 rounded-full transition-all"
                  title="Delete playlist"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Action play row */}
              {playlistDetail.songs.length > 0 && (
                <div className="flex items-center gap-4 py-4">
                  <button
                    onClick={() => playTrack(playlistDetail.songs[0], playlistDetail.songs)}
                    className="bg-spotify-green hover:bg-spotify-green-hover p-4 rounded-full text-black hover:scale-105 transition-transform"
                  >
                    {isPlaying && playlistDetail.songs.some(s => s.id === currentTrack?.id) ? (
                      <Pause className="w-6 h-6 fill-black" />
                    ) : (
                      <Play className="w-6 h-6 fill-black ml-0.5" />
                    )}
                  </button>
                </div>
              )}

              {/* Track list */}
              {playlistDetail.songs.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 flex flex-col items-center gap-3 border border-dashed border-zinc-800 rounded-lg">
                  <FolderOpen className="w-12 h-12 text-zinc-700" />
                  <div>
                    <h3 className="text-white font-semibold mb-1">Playlist is empty</h3>
                    <p className="text-xs text-zinc-400">Add tracks from your cloud library below.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-[16px_1fr_120px_48px] gap-4 px-4 py-2 text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-900">
                    <div>#</div>
                    <div>Title</div>
                    <div>Source</div>
                    <div className="flex justify-end"><Clock className="w-4 h-4" /></div>
                  </div>

                  {playlistDetail.songs.map((song, idx) => {
                    const isCurrent = currentTrack?.id === song.id;
                    return (
                      <div
                        key={song.id}
                        onClick={() => playTrack(song, playlistDetail.songs)}
                        className={`grid grid-cols-[16px_1fr_120px_48px] gap-4 px-4 py-2.5 rounded-md items-center group cursor-pointer transition-colors ${
                          isCurrent ? 'bg-zinc-800/40' : 'hover:bg-zinc-900/50'
                        }`}
                      >
                        <div className="text-sm text-zinc-500">
                          {isCurrent && isPlaying ? (
                            <div className="flex gap-0.5 items-end h-3.5 w-3.5 pb-0.5">
                              <span className="equalizer-bar w-0.5 bg-spotify-green h-1"></span>
                              <span className="equalizer-bar w-0.5 bg-spotify-green h-2"></span>
                              <span className="equalizer-bar w-0.5 bg-spotify-green h-1.5"></span>
                            </div>
                          ) : (
                            <span className="group-hover:hidden">{idx + 1}</span>
                          )}
                          <Play className="w-3.5 h-3.5 text-white fill-white hidden group-hover:block" />
                        </div>

                        <div className="flex items-center gap-3 truncate">
                          <div className="w-10 h-10 bg-zinc-800 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                              src={song.thumbnail || PLAYLIST_FALLBACK_IMAGE}
                              alt={song.title}
                              className="w-full h-full object-cover"
                              onError={(event) => {
                                event.currentTarget.src = PLAYLIST_FALLBACK_IMAGE;
                              }}
                            />
                          </div>
                          <div className="truncate">
                            <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-spotify-green' : 'text-white'}`}>
                              {song.title}
                            </p>
                            <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
                          </div>
                        </div>

                        <div className="text-xs text-zinc-400 capitalize">
                          {song.type === 'youtube' ? 'YouTube' : song.type === 'google' ? 'Google Drive' : 'Local File'}
                        </div>

                        <div className="text-xs text-zinc-400 font-medium flex items-center justify-end gap-3">
                          <button
                            onClick={(e) => handleLikeToggle(song.id, e)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white"
                          >
                            <Heart className={`w-4 h-4 ${song.isLiked ? 'text-spotify-green fill-spotify-green' : ''}`} />
                          </button>
                          <button
                            onClick={(e) => handleRemoveSongFromPlaylist(playlistDetail.id, song.id, e)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500"
                            title="Remove from playlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-right">{formatDuration(song.duration)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Songs Section */}
              <div className="pt-10 border-t border-zinc-900 mt-10">
                <h3 className="text-lg font-bold text-white mb-2">Recommended Tracks</h3>
                <p className="text-xs text-zinc-400 mb-6">Select tracks from your library to add to this playlist.</p>

                {allSongs.filter(s => !playlistDetail.songs.some(ps => ps.id === s.id)).length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No remaining songs in library to add. Go to "Upload" to add more!</p>
                ) : (
                  <div className="space-y-1">
                    {allSongs
                      .filter(s => !playlistDetail.songs.some(ps => ps.id === s.id))
                      .slice(0, 5)
                      .map((song) => (
                        <div
                          key={song.id}
                          className="flex items-center justify-between p-3 bg-zinc-900/40 rounded hover:bg-zinc-900/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center overflow-hidden">
                              {song.thumbnail ? (
                                <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                              ) : (
                                <Music className="w-4 h-4 text-zinc-400" />
                              )}
                            </div>
                            <div className="truncate">
                              <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                              <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddSongToPlaylist(playlistDetail.id, song.id)}
                            className="flex items-center gap-1.5 border border-zinc-700 hover:border-white text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-500">
              <span>Playlist could not be loaded.</span>
            </div>
          )}
        </div>
      )}

      {/* 5. UPLOAD VIEW */}
      {activeView === 'upload' && (
        <div className="space-y-8 animate-fade-in max-w-2xl mx-auto pt-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Add Music to Musi-Fi</h1>
            <p className="text-xs text-zinc-400">Import your audio files (MP3s) directly to your cloud storage or paste video streaming links.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* MP3 Drag & Drop Uploader */}
            <div className="bg-zinc-900/60 p-6 rounded-lg border border-zinc-800 flex flex-col justify-between items-center text-center group relative overflow-hidden">
              <input
                type="file"
                ref={fileInputRef}
                accept="audio/mp3, audio/mpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <div className="py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 group-hover:border-spotify-green transition-all mx-auto">
                  <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-spotify-green transition-colors" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Upload Audio File</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[200px] mx-auto">Supports standard MP3 formats. Uploads directly to Google Drive when connected.</p>
                </div>
              </div>

              {uploading ? (
                <div className="w-full space-y-2 pt-4 border-t border-zinc-800">
                  <div className="flex justify-between text-xs font-semibold text-zinc-400">
                    <span>Uploading track...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-spotify-green h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white hover:scale-105 text-black font-semibold text-xs px-6 py-2.5 rounded-full transition-all mt-4 w-full shadow-lg"
                >
                  Choose File
                </button>
              )}
            </div>

            {/* Paste Embed Link Uploader */}
            <div className="bg-zinc-900/60 p-6 rounded-lg border border-zinc-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <Link2 className="w-4 h-4 text-spotify-green" />
                <span>Embed Audio Source</span>
              </h3>
              
              <form onSubmit={handleLinkSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">YouTube / Vimeo URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-spotify-green placeholder-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Track Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="E.g. Chill Beats"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-spotify-green placeholder-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Artist Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="E.g. Lofi Recs"
                    value={linkArtist}
                    onChange={(e) => setLinkArtist(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-spotify-green placeholder-zinc-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={linkLoading}
                  className="bg-spotify-green hover:bg-spotify-green-hover disabled:bg-zinc-700 text-black font-semibold text-xs px-6 py-2.5 rounded-full transition-all w-full mt-4 flex items-center justify-center gap-2"
                >
                  {linkLoading ? (
                    <span>Adding track...</span>
                  ) : (
                    <>
                      <Youtube className="w-4 h-4" />
                      <span>Add to Library</span>
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* 6. SETTINGS VIEW */}
      {activeView === 'settings' && (
        <div className="space-y-8 animate-fade-in max-w-2xl mx-auto pt-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
            <p className="text-xs text-zinc-400">Configure your cloud connections and account details.</p>
          </div>

          {/* Storage Connection Status Card */}
          <div className="bg-zinc-900/60 rounded-lg border border-zinc-800 p-6 space-y-6">
            <h3 className="text-sm font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-spotify-green" />
              <span>Cloud Storage Connectors</span>
            </h3>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-sm font-bold text-white">Google Drive API</span>
                <p className="text-xs text-zinc-400 max-w-md">
                  Upload MP3 files directly to your Google Drive. We store only track metadata in our databases, ensuring zero hosting costs and full ownership.
                </p>
              </div>

              {/* Status Badge */}
              {session?.user ? (
                // Google Account details
                <div className="flex flex-col items-end gap-1.5">
                  <span className="bg-emerald-950/40 text-emerald-500 border border-emerald-900/50 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
                    Connected
                  </span>
                </div>
              ) : (
                <button
                  disabled
                  className="bg-zinc-800 text-zinc-500 text-xs font-bold px-4 py-2 rounded-full cursor-not-allowed"
                >
                  Configure via Login
                </button>
              )}
            </div>

            {/* Storage Info Fallback */}
            <div className="bg-zinc-950/80 p-4 rounded border border-zinc-900 text-xs text-zinc-500">
              💡 **Fallback Active**: If you log in via standard Credentials or don't set up OAuth Client IDs, Musi-Fi automatically stores your MP3 uploads inside a local server folder `local_storage`. This enables immediate zero-setup testing!
            </div>
          </div>

          {/* Account Profile Details */}
          <div className="bg-zinc-900/60 rounded-lg border border-zinc-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-spotify-green" />
              <span>User Profile Info</span>
            </h3>
            
            {session ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Account Type:</span>
                  <span className="text-white font-semibold capitalize">{session.user?.image ? 'Google OAuth Account' : 'Credentials Credentials'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Registered Email:</span>
                  <span className="text-white font-semibold">{session.user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Database Engine:</span>
                  <span className="text-white font-semibold">SQLite (PostgreSQL Ready)</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Not authenticated. Log in from the login page.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
