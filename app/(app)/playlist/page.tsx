'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Song, Playlist } from '@/lib/types';
import { usePlayer } from '@/components/PlayerContext';
import { fetchPlaylistSongs, deletePlaylist, renamePlaylist, removeSongFromPlaylist, updatePlaylistVisibility } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PlaylistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playlistId = searchParams.get('id');

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const { playSong, currentSong, isPlaying } = usePlayer();

  const load = useCallback(async () => {
    if (!playlistId) { setLoading(false); return; }
    try {
      const supabase = createClient();
      const { data: pl } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', playlistId)
        .single();
      const { data: { user } } = await supabase.auth.getUser();
      setIsOwner(user?.id === pl?.user_id);
      setPlaylist(pl);
      setEditName(pl?.name ?? '');
      const data = await fetchPlaylistSongs(playlistId);
      setSongs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => { load(); }, [load]);

  async function handleRename() {
    if (!editName.trim() || editName === playlist?.name || !playlistId) { setEditing(false); return; }
    try {
      await renamePlaylist(playlistId, editName.trim());
      setPlaylist(prev => prev ? { ...prev, name: editName.trim() } : prev);
    } catch (e) { console.error(e); }
    setEditing(false);
  }

  async function handleToggleVisibility() {
    if (!playlistId || !playlist) return;
    setIsUpdatingVisibility(true);
    try {
      const newVisibility = !playlist.is_public;
      await updatePlaylistVisibility(playlistId, newVisibility);
      setPlaylist(prev => prev ? { ...prev, is_public: newVisibility } : prev);
    } catch (e) { console.error(e); }
    finally { setIsUpdatingVisibility(false); }
  }

  async function handleDelete() {
    if (!playlistId || !confirm(`Delete playlist "${playlist?.name}"?`)) return;
    try {
      await deletePlaylist(playlistId);
      router.replace('/library');
    } catch (e) { console.error(e); }
  }

  async function handleRemove(songId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!playlistId) return;
    setRemovingId(songId);
    try {
      await removeSongFromPlaylist(playlistId, songId);
      setSongs(prev => prev.filter(s => s.id !== songId));
    } catch (e) { console.error(e); }
    finally { setRemovingId(null); }
  }

  if (!playlistId) {
    return (
      <div className="empty-state">
        <h3>No playlist selected</h3>
        <button className="btn btn-primary" onClick={() => router.replace('/library')}>Go to Library</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="playing-indicator" style={{ justifyContent: 'center', height: 40, marginBottom: 16 }}>
            <span /><span /><span />
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Loading playlist…</p>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="empty-state">
        <h3>Playlist not found</h3>
        <button className="btn btn-primary" onClick={() => router.replace('/library')}>Go to Library</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <div>
            {editing ? (
              <input
                id="playlist-rename-input"
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setEditing(false); setEditName(playlist.name); } }}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--primary)',
                  borderRadius: 6, color: 'var(--text-primary)', fontSize: '1.4rem',
                  fontWeight: 700, padding: '2px 8px', outline: 'none',
                }}
              />
            ) : (
              <h1 className="page-title" style={{ cursor: isOwner ? 'pointer' : 'default' }} onClick={() => isOwner && setEditing(true)} title={isOwner ? "Click to rename" : ""}>
                {playlist.name}
                {isOwner && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8, display: 'inline' }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                )}
              </h1>
            )}
            <p className="page-subtitle">
              {songs.length === 0 ? 'Empty playlist' : `${songs.length} song${songs.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {songs.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => playSong(songs[0], songs)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Play All
            </button>
          )}
          {isOwner && (
            <>
              <button
                className="btn btn-sm"
                onClick={handleToggleVisibility}
                disabled={isUpdatingVisibility}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                {playlist.is_public ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    Public
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Private
                  </>
                )}
              </button>
              <button id="delete-playlist-btn" className="btn btn-sm" onClick={handleDelete}
                style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {songs.length === 0 && (
        <div className="empty-state animate-fade-in">
          <div className="empty-state-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <h3>This playlist is empty</h3>
          <p>Add songs from your library using the ⋯ menu on each song.</p>
        </div>
      )}

      {songs.length > 0 && (
        <div className="songs-list stagger">
          {songs.map((song, i) => {
            const isCurrentPlaying = currentSong?.id === song.id && isPlaying;
            const isCurrent = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                id={`pl-song-${song.id}`}
                className={`song-list-item animate-fade-in ${isCurrent ? 'playing' : ''}`}
                onClick={() => playSong(song, songs)}
              >
                <div className="song-list-num">
                  {isCurrentPlaying
                    ? <div className="playing-indicator" style={{ height: 16 }}><span /><span /><span /></div>
                    : <span>{i + 1}</span>}
                </div>
                <div className="song-list-cover">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <div className="song-list-info">
                  <div className="song-list-title">{song.title}</div>
                  <div className="song-list-artist">{song.artist}</div>
                </div>
                <div className="song-list-duration">{formatTime(song.duration)}</div>
                {isOwner && (
                  <button
                    id={`pl-remove-${song.id}`}
                    className="btn btn-icon"
                    onClick={e => handleRemove(song.id, e)}
                    disabled={removingId === song.id}
                    title="Remove from playlist"
                    style={{ opacity: 0.5 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PlaylistPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="playing-indicator" style={{ justifyContent: 'center', height: 40 }}><span /><span /><span /></div>
      </div>
    }>
      <PlaylistContent />
    </Suspense>
  );
}
