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
  FolderOpen,
  Library,
  Pencil,
  ArrowLeft,
  MinusCircle,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Menu,
  List,
  Shuffle,
  Download,
  Share2,
  MoreHorizontal
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
    addToQueue,
    userTheme,
    loadingTheme,
    setUserTheme,
    playbackMode,
    setPlaybackMode
  } = usePlayer();

  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [playlistDetail, setPlaylistDetail] = useState<PlaylistDetail | null>(null);
  const [playlistsList, setPlaylistsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Playlist Creation and Collapsing States (Mobile support)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [isPlaylistsCollapsed, setIsPlaylistsCollapsed] = useState(false);

  // File Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Link Paste State
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkArtist, setLinkArtist] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkImportStatus, setLinkImportStatus] = useState('');

  // Dynamic playlists dropdown inside song rows
  const [activeDropdownRow, setActiveDropdownRow] = useState<string | null>(null);

  // Playlist edit & add state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [isEditingPlaylist, setIsEditingPlaylist] = useState(false);
  const [editSongs, setEditSongs] = useState<Song[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const touchStartIndexRef = useRef<number | null>(null);

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
  const fetchPlaylistDetail = async (id: string, silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/playlists/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPlaylistDetail(data.playlist || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
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

    // Determine mime type dynamically to support MP3, WAV, M4A, AAC
    const getMimeType = (fileName: string, fileType: string) => {
      if (fileType && fileType.startsWith('audio/') && fileType !== 'audio/mpeg') {
        return fileType;
      }
      const ext = fileName.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'mp3': return 'audio/mpeg';
        case 'wav': return 'audio/wav';
        case 'm4a': return 'audio/mp4';
        case 'aac': return 'audio/aac';
        default: return fileType || 'audio/mpeg';
      }
    };
    const fileMimeType = getMimeType(file.name, file.type);

    try {
      setUploading(true);
      setUploadProgress(5);
      
      const accessToken = (session?.user as any)?.accessToken;
      if (accessToken) {
        // 1. Get the user's Google Drive Musy-Fi folder ID from backend
        setUploadProgress(10);
        const folderRes = await fetch('/api/songs/upload');
        if (!folderRes.ok) {
          throw new Error('Failed to get Google Drive folder ID');
        }
        const { folderId } = await folderRes.json();

        // 2. Initiate Google Drive Resumable Upload Session
        setUploadProgress(15);
        const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': fileMimeType,
            'X-Upload-Content-Length': file.size.toString()
          },
          body: JSON.stringify({
            name: file.name,
            parents: [folderId]
          })
        });

        if (!initRes.ok) {
          throw new Error('Failed to start Google Drive upload session');
        }

        const uploadUrl = initRes.headers.get('Location');
        if (!uploadUrl) {
          throw new Error('Google did not return an upload URL');
        }

        // 3. Perform Resumable Upload directly from browser with progress tracking
        setUploadProgress(20);
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Range', `bytes 0-${file.size - 1}/${file.size}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 60) + 20; // 20% to 80%
            setUploadProgress(percent);
          }
        };

        const uploadPromise = new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(`Google Drive upload failed: ${xhr.statusText}`));
            }
          };
          xhr.onerror = () => reject(new Error('Network error during Google Drive upload'));
          xhr.send(file);
        });

        const googleFile = await uploadPromise as any;
        const fileId = googleFile.id;

        // 4. Confirm the upload with our backend server (saves to DB and parses ID3 tags)
        setUploadProgress(85);
        const confirmRes = await fetch('/api/songs/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileId }),
        });

        if (!confirmRes.ok) {
          throw new Error('Failed to register the uploaded file with the server');
        }

        setUploadProgress(100);
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          fetchAllSongs();
          setActiveView('home');
        }, 500);

      } else {
        // Fallback: Local upload for credentials login
        // Hard Vercel Payload Limit Check (4.5 MB)
        if (file.size > 4.5 * 1024 * 1024) {
          alert('Vercel limits standard file uploads to 4.5MB. Please log in with Google to upload larger files directly to your Google Drive!');
          setUploading(false);
          return;
        }

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
      }
    } catch (err: any) {
      console.error('Error uploading file:', err);
      alert(err.message || 'An error occurred during file upload.');
      setUploading(false);
    }
  };

  // Handle Playlist Creation (Mobile support)
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
        fetchPlaylists(); // Refresh local list
        // Automatically view the newly created playlist
        setActiveView('playlists', data.playlist.id);
      }
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
  };

  // Handle Link Submission (YouTube/Vimeo)
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    try {
      setLinkLoading(true);
      setLinkImportStatus('Adding to Library... 🚀');

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
      setLinkImportStatus('');
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
          fetchPlaylistDetail(playlistId, true);
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
        fetchPlaylistDetail(playlistId, true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Reordered Playlist songs to Database
  const handleSavePlaylistOrder = async () => {
    if (!playlistDetail) return;
    try {
      setSavingOrder(true);
      const res = await fetch(`/api/playlists/${playlistDetail.id}/songs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songIds: editSongs.map((s) => s.id),
        }),
      });

      if (res.ok) {
        setIsEditingPlaylist(false);
        fetchPlaylistDetail(playlistDetail.id, true);
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

  // Reorder local edit list via drag events
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

  // Mobile reorder helpers
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

  // Touch event handlers for mobile reordering
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

  // Determine personalized background
  const getBackgroundImage = () => {
    if (userTheme === 'male') {
      return 'linear-gradient(to bottom, rgba(7, 7, 8, 0.65), rgba(7, 7, 8, 0.95)), url(/bg-male.jpg)';
    } else if (userTheme === 'female') {
      return 'linear-gradient(to bottom, rgba(7, 7, 8, 0.65), rgba(7, 7, 8, 0.95)), url(/bg-female.jpg)';
    }
    return isHome 
      ? 'linear-gradient(to bottom, rgba(7, 7, 8, 0.65), rgba(7, 7, 8, 0.9)), url(/bg-home-sunset.jpg)' 
      : 'none';
  };

  return (
    <div 
      className={`flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-36 md:pb-24 relative select-none bg-cover bg-center bg-no-repeat transition-all duration-500 ease-in-out ${
        userTheme || isHome ? '' : 'bg-gradient-to-b from-zinc-900 to-bg-base'
      }`}
      style={{ backgroundImage: getBackgroundImage() }}
    >
      
      {/* Theme Selection Modal for First Login */}
      {session && !loadingTheme && !userTheme && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-bg-card border border-border-muted p-8 rounded-lg w-full max-w-lg glass-panel shadow-2xl text-center space-y-6 animate-scale-up">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Choose Your Experience</h2>
              <p className="text-sm text-zinc-400">Select a theme to personalize your Musy-Fi dashboard background.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-6 pt-4">
              {/* Male Theme Option */}
              <div
                onClick={() => setUserTheme('male')}
                className="flex flex-col items-center gap-4 p-6 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-xl cursor-pointer border border-zinc-800 hover:border-spotify-green transition-all duration-300 group shadow-lg"
              >
                <div className="text-5xl group-hover:scale-110 transition-transform">👨</div>
                <div className="text-base font-bold text-white group-hover:text-spotify-green transition-colors">Male Theme</div>
                <p className="text-xs text-zinc-500">Nature landscape illustration</p>
              </div>

              {/* Female Theme Option */}
              <div
                onClick={() => setUserTheme('female')}
                className="flex flex-col items-center gap-4 p-6 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-xl cursor-pointer border border-zinc-800 hover:border-spotify-green transition-all duration-300 group shadow-lg"
              >
                <div className="text-5xl group-hover:scale-110 transition-transform">👩</div>
                <div className="text-base font-bold text-white group-hover:text-spotify-green transition-colors">Female Theme</div>
                <p className="text-xs text-zinc-500">Minimalist musical illustration</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 1. HOME VIEW */}
      {activeView === 'home' && (
        <div className="space-y-8 animate-fade-in">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-extrabold text-white">Welcome back</h1>
              <button
                onClick={() => setShowCreateModal(true)}
                className="md:hidden flex items-center justify-center bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white p-2.5 rounded-full transition-all active:scale-95 shadow-md"
                title="Create Playlist"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
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
                <div className="grid grid-cols-[24px_1fr_auto] md:grid-cols-[16px_1fr_120px_48px] gap-2 md:gap-4 px-2 md:px-4 py-2 text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-900">
                  <div>#</div>
                  <div>Title</div>
                  <div className="hidden md:block">Source</div>
                  <div className="flex justify-end"><Clock className="w-4 h-4" /></div>
                </div>

                {/* Song list */}
                {allSongs.slice(0, 10).map((song, idx) => {
                  const isCurrent = currentTrack?.id === song.id;
                  return (
                    <div
                      key={song.id}
                      onClick={() => playTrack(song, allSongs)}
                      className={`grid grid-cols-[24px_1fr_auto] md:grid-cols-[16px_1fr_120px_48px] gap-2 md:gap-4 px-2 md:px-4 py-2.5 rounded-md items-center group cursor-pointer transition-colors ${
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

                      {/* Source tag (hidden on mobile) */}
                      <div className="hidden md:flex text-xs font-semibold items-center gap-1.5 text-zinc-400 capitalize">
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
                      <div className="text-xs text-zinc-400 font-medium flex items-center justify-end gap-2 md:gap-3">
                        <button
                          onClick={(e) => handleLikeToggle(song.id, e)}
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-zinc-400 hover:text-white transition-opacity p-1"
                        >
                          <Heart className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSong(song.id, e)}
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity p-1"
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

            {/* Mobile collapsible Playlists Section */}
            <div className="md:hidden mt-8">
              <div 
                onClick={() => setIsPlaylistsCollapsed(!isPlaylistsCollapsed)}
                className="flex items-center justify-between py-2 border-b border-zinc-900 cursor-pointer"
              >
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Library className="w-5 h-5 text-spotify-green" />
                  Your Playlists
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateModal(true);
                    }}
                    className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-900 rounded-full transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <ChevronRight className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${!isPlaylistsCollapsed ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {!isPlaylistsCollapsed && (
                <div className="mt-3 space-y-2 animate-fade-in">
                  {playlistsList.length === 0 ? (
                    <div className="p-4 rounded-lg bg-zinc-900/30 text-center text-zinc-500 text-xs">
                      No playlists yet. Tap the + icon to create one!
                    </div>
                  ) : (
                    playlistsList.map((playlist) => (
                      <div
                        key={playlist.id}
                        onClick={() => setActiveView('playlists', playlist.id)}
                        className="flex items-center justify-between p-3 bg-zinc-900/40 hover:bg-zinc-900/80 rounded-lg cursor-pointer border border-zinc-950/20"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                            {playlist.coverImage ? (
                              <img src={playlist.coverImage} alt={playlist.name} className="w-full h-full object-cover" />
                            ) : (
                              <ListMusic className="w-5 h-5 text-zinc-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{playlist.name}</p>
                            <p className="text-xs text-zinc-500">{playlist.description || 'No description'}</p>
                          </div>
                        </div>
                        <span className="text-xs text-zinc-500 flex-shrink-0">
                          {playlist.songs?.length || playlist.songCount || 0} songs
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

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
              <div className="grid grid-cols-[24px_1fr_auto] md:grid-cols-[16px_1fr_120px_48px] gap-2 md:gap-4 px-2 md:px-4 py-2 text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-900">
                <div>#</div>
                <div>Title</div>
                <div className="hidden md:block">Source</div>
                <div className="flex justify-end"><Clock className="w-4 h-4" /></div>
              </div>

              {likedSongs.map((song, idx) => {
                const isCurrent = currentTrack?.id === song.id;
                return (
                  <div
                    key={song.id}
                    onClick={() => playTrack(song, likedSongs)}
                    className={`grid grid-cols-[24px_1fr_auto] md:grid-cols-[16px_1fr_120px_48px] gap-2 md:gap-4 px-2 md:px-4 py-2.5 rounded-md items-center group cursor-pointer transition-colors ${
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

                    <div className="hidden md:flex text-xs text-zinc-400 capitalize">
                      {song.type === 'youtube' ? 'YouTube' : song.type === 'google' ? 'Google Drive' : 'Local File'}
                    </div>

                    <div className="text-xs text-zinc-400 font-medium flex items-center justify-end gap-2 md:gap-3">
                      <button
                        onClick={(e) => handleLikeToggle(song.id, e)}
                        className="text-spotify-green fill-spotify-green p-1"
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
              {isEditingPlaylist ? (
                <div className="space-y-6 animate-fade-in max-w-2xl mx-auto pt-4 select-none">
                  {/* Header Row */}
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                    <button
                      type="button"
                      onClick={() => setIsEditingPlaylist(false)}
                      className="p-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-full border border-zinc-800/40 text-zinc-400 hover:text-white transition-all active:scale-95 cursor-pointer"
                      title="Cancel and Go Back"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-base md:text-lg font-bold text-white uppercase tracking-wider">Edit playlist</h2>
                    <button
                      type="button"
                      onClick={handleSavePlaylistOrder}
                      disabled={savingOrder}
                      className="text-sm font-bold text-spotify-green hover:text-spotify-green-hover disabled:text-zinc-600 transition-colors cursor-pointer"
                    >
                      {savingOrder ? 'Saving...' : 'Save'}
                    </button>
                  </div>

                  {/* Songs list */}
                  {editSongs.length === 0 ? (
                    <div className="p-12 text-center text-zinc-550 border border-dashed border-zinc-900 rounded-xl bg-zinc-950/20">
                      No songs in this playlist.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-900/40 pt-2 bg-zinc-950/40 rounded-xl p-2 border border-zinc-900/60">
                      {editSongs.map((song, index) => {
                        const isDragged = draggedIndex === index;
                        return (
                          <div
                            key={song.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`edit-song-item flex items-center justify-between p-3 transition-all select-none ${
                              isDragged 
                                ? 'bg-zinc-900 border-y border-spotify-green/40 scale-[1.01] shadow-2xl' 
                                : 'hover:bg-zinc-900/30'
                            }`}
                            data-index={index}
                          >
                            {/* Left Side: Delete/Remove Circle & Song Info */}
                            <div className="flex items-center gap-3.5 truncate flex-1 pr-4">
                              <button
                                type="button"
                                onClick={() => handleRemoveLocalSong(index)}
                                className="text-zinc-500 hover:text-red-500 active:scale-90 transition-all flex-shrink-0 cursor-pointer p-0.5"
                                title="Remove from playlist"
                              >
                                <MinusCircle className="w-5 h-5" />
                              </button>
                              
                              <img
                                src={song.thumbnail || PLAYLIST_FALLBACK_IMAGE}
                                alt={song.title}
                                className="w-10 h-10 rounded object-cover border border-zinc-900 flex-shrink-0 shadow-md"
                                onError={(e) => {
                                  e.currentTarget.src = PLAYLIST_FALLBACK_IMAGE;
                                }}
                              />
                              
                              <div className="truncate">
                                <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                                <p className="text-xs text-zinc-400 truncate mt-0.5">{song.artist}</p>
                              </div>
                            </div>

                            {/* Right Side: Reordering Buttons & Drag Handle */}
                            <div className="flex items-center gap-2 text-zinc-500 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveUp(index)}
                                disabled={index === 0}
                                className="p-1 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-500 transition-colors cursor-pointer md:block hidden"
                                title="Move Up"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveDown(index)}
                                disabled={index === editSongs.length - 1}
                                className="p-1 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-500 transition-colors cursor-pointer md:block hidden"
                                title="Move Down"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <div 
                                className="p-2 text-zinc-500 hover:text-white cursor-grab active:cursor-grabbing flex-shrink-0"
                                style={{ touchAction: 'none' }}
                                onTouchStart={(e) => handleTouchStart(e, index)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                title="Drag to reorder"
                              >
                                <Menu className="w-5 h-5" />
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

                  {/* Row 1: Action Play, Shuffle & Meta Rows */}
                  <div className="flex items-center justify-between py-4 border-b border-zinc-900/30">
                    {/* Left Actions (Download, Share, More) */}
                    <div className="flex items-center gap-2.5 text-zinc-400">
                      <button 
                        type="button"
                        className="p-2 hover:text-white hover:bg-zinc-800/40 rounded-full transition-all active:scale-95 cursor-pointer"
                        title="Download Playlist"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button 
                        type="button"
                        className="p-2 hover:text-white hover:bg-zinc-800/40 rounded-full transition-all active:scale-95 cursor-pointer"
                        title="Share Playlist"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button 
                        type="button"
                        className="p-2 hover:text-white hover:bg-zinc-800/40 rounded-full transition-all active:scale-95 cursor-pointer"
                        title="More Options"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Right Actions (Shuffle, Play) */}
                    <div className="flex items-center gap-4">
                      {/* Shuffle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPlaybackMode(playbackMode === 'shuffle' ? 'normal' : 'shuffle');
                        }}
                        className={`p-2 transition-all active:scale-95 cursor-pointer ${
                          playbackMode === 'shuffle' 
                            ? 'text-spotify-green hover:text-spotify-green-hover' 
                            : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Shuffle Playlist"
                      >
                        <Shuffle className="w-5.5 h-5.5" />
                      </button>

                      {/* Play Button */}
                      {playlistDetail.songs.length > 0 && (
                        <button
                          onClick={() => playTrack(playlistDetail.songs[0], playlistDetail.songs)}
                          className="bg-spotify-green hover:bg-spotify-green-hover p-4 rounded-full text-black hover:scale-105 active:scale-95 transition-all shadow-lg"
                        >
                          {isPlaying && playlistDetail.songs.some(s => s.id === currentTrack?.id) ? (
                            <Pause className="w-6 h-6 fill-black" />
                          ) : (
                            <Play className="w-6 h-6 fill-black ml-0.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Pill capsule action buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 py-3 border-b border-zinc-900/40 mb-2">
                    {/* Add Songs Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setAddSearchQuery('');
                        setShowAddModal(true);
                      }}
                      className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>

                    {/* Edit Playlist Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditSongs(playlistDetail.songs);
                        setIsEditingPlaylist(true);
                      }}
                      className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all cursor-pointer active:scale-95"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* Sort Button */}
                    <button
                      type="button"
                      className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 text-zinc-350 hover:text-white text-xs font-semibold px-4 py-2 rounded-full transition-all cursor-pointer active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h10" />
                      </svg>
                      <span>Sort</span>
                    </button>

                    {/* Name & Details Button */}
                    <button
                      type="button"
                      className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 text-zinc-350 hover:text-white text-xs font-semibold px-4 py-2 rounded-full transition-all cursor-pointer active:scale-95"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Name & details</span>
                    </button>
                  </div>

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
                      <div className="grid grid-cols-[24px_1fr_auto] md:grid-cols-[16px_1fr_120px_48px] gap-2 md:gap-4 px-2 md:px-4 py-2 text-zinc-400 text-xs font-semibold uppercase border-b border-zinc-900">
                        <div>#</div>
                        <div>Title</div>
                        <div className="hidden md:block">Source</div>
                        <div className="flex justify-end"><Clock className="w-4 h-4" /></div>
                      </div>

                      {playlistDetail.songs.map((song, idx) => {
                        const isCurrent = currentTrack?.id === song.id;
                        return (
                          <div
                            key={song.id}
                            onClick={() => playTrack(song, playlistDetail.songs)}
                            className={`grid grid-cols-[24px_1fr_auto] md:grid-cols-[16px_1fr_120px_48px] gap-2 md:gap-4 px-2 md:px-4 py-2.5 rounded-md items-center group cursor-pointer transition-colors ${
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

                            <div className="hidden md:flex text-xs text-zinc-400 capitalize">
                              {song.type === 'youtube' ? 'YouTube' : song.type === 'google' ? 'Google Drive' : 'Local File'}
                            </div>

                            <div className="text-xs text-zinc-400 font-medium flex items-center justify-end gap-2 md:gap-3">
                              <button
                                onClick={(e) => handleLikeToggle(song.id, e)}
                                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-zinc-400 hover:text-white p-1"
                              >
                                <Heart className={`w-4 h-4 ${song.isLiked ? 'text-spotify-green fill-spotify-green' : ''}`} />
                              </button>
                              <button
                                onClick={(e) => handleRemoveSongFromPlaylist(playlistDetail.id, song.id, e)}
                                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-zinc-400 hover:text-red-500 p-1"
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
              )}
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
            <h1 className="text-2xl font-bold text-white mb-2">Add Music to Musy-Fi</h1>
            <p className="text-xs text-zinc-400">Import your audio files (MP3s) directly to your cloud storage or paste video streaming links.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* MP3 Drag & Drop Uploader */}
            <div className="bg-zinc-900/60 p-6 rounded-lg border border-zinc-800 flex flex-col justify-between items-center text-center group relative overflow-hidden">
              <input
                type="file"
                ref={fileInputRef}
                accept="audio/*, .mp3, .wav, .m4a, .aac"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <div className="py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 group-hover:border-spotify-green transition-all mx-auto">
                  <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-spotify-green transition-colors" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Upload Audio File</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[200px] mx-auto">Supports standard MP3, WAV, M4A, and AAC formats. Uploads directly to Google Drive when connected.</p>
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
                    <span>{linkImportStatus || 'Locking this track into your cloud...'}</span>
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

          {/* Theme Selection Settings Card */}
          <div className="bg-zinc-900/60 rounded-lg border border-zinc-800 p-6 space-y-6">
            <h3 className="text-sm font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
              <Disc className="w-4 h-4 text-spotify-green animate-spin" style={{ animationDuration: '6s' }} />
              <span>Personalized Theme Settings</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-sm font-bold text-white">Choose Theme Background</span>
                <p className="text-xs text-zinc-400 max-w-md">
                  Personalize the interface with your preferred artwork. This changes the background for Welcome Back, Library, Playlists, and Dashboard.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setUserTheme('male')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                    userTheme === 'male'
                      ? 'bg-spotify-green border-spotify-green text-black'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  <span>👨</span>
                  <span>Male Theme</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserTheme('female')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                    userTheme === 'female'
                      ? 'bg-spotify-green border-spotify-green text-black'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  <span>👩</span>
                  <span>Female Theme</span>
                </button>
              </div>
            </div>
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
              💡 **Fallback Active**: If you log in via standard Credentials or don't set up OAuth Client IDs, Musy-Fi automatically stores your MP3 uploads inside a local server folder `local_storage`. This enables immediate zero-setup testing!
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

      {/* Add Songs Modal (Overlay) */}
      {showAddModal && playlistDetail && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
              <div>
                <h3 className="text-lg font-bold text-white">Add Songs</h3>
                <p className="text-xs text-zinc-400">to {playlistDetail.name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setAddSearchQuery('');
                }}
                className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-900 rounded-full transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="my-4 relative">
              <input
                type="text"
                placeholder="Search for songs or artists..."
                value={addSearchQuery}
                onChange={(e) => setAddSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:border-spotify-green transition-all"
              />
              {addSearchQuery && (
                <button
                  type="button"
                  onClick={() => setAddSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Songs List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[300px]">
              {allSongs.filter(song => {
                if (!addSearchQuery) return true;
                const q = addSearchQuery.toLowerCase();
                return (
                  song.title.toLowerCase().includes(q) ||
                  song.artist.toLowerCase().includes(q)
                );
              }).length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  No matching songs found in library.
                </div>
              ) : (
                allSongs
                  .filter(song => {
                    if (!addSearchQuery) return true;
                    const q = addSearchQuery.toLowerCase();
                    return (
                      song.title.toLowerCase().includes(q) ||
                      song.artist.toLowerCase().includes(q)
                    );
                  })
                  .map((song) => {
                    const isAdded = playlistDetail.songs.some((ps) => ps.id === song.id);
                    return (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-2.5 bg-zinc-900/40 rounded-lg hover:bg-zinc-900/80 border border-zinc-900/20 hover:border-zinc-800/40 transition-all group"
                      >
                        {/* Song Info */}
                        <div className="flex items-center gap-3 truncate flex-1 pr-4">
                          <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center overflow-hidden border border-zinc-800 flex-shrink-0">
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

                        {/* Add/Remove Action Button */}
                        {isAdded ? (
                          <button
                            type="button"
                            onClick={(e) => handleRemoveSongFromPlaylist(playlistDetail.id, song.id, e)}
                            className="flex items-center gap-1.5 border border-spotify-green/30 bg-spotify-green/10 text-spotify-green hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all group-hover:scale-105 active:scale-95 cursor-pointer"
                            title="Remove from playlist"
                          >
                            <Check className="w-3.5 h-3.5 block group-hover:hidden" />
                            <span className="block group-hover:hidden">Added</span>
                            <MinusCircle className="w-3.5 h-3.5 hidden group-hover:block" />
                            <span className="hidden group-hover:block">Remove</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddSongToPlaylist(playlistDetail.id, song.id)}
                            className="flex items-center gap-1.5 border border-zinc-700 hover:border-white text-white hover:bg-white hover:text-black text-xs font-bold px-3.5 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Done Button */}
            <div className="pt-4 border-t border-zinc-900 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setAddSearchQuery('');
                }}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm px-6 py-2.5 rounded-full transition-all active:scale-95 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
