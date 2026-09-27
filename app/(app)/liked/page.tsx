'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Song } from '@/lib/types';
import { usePlayer } from '@/components/PlayerContext';
import { fetchLikedSongs, unlikeSong } from '@/lib/api';

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LikedSongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlikingId, setUnlikingId] = useState<string | null>(null);
  const { playSong, currentSong, isPlaying } = usePlayer();

  const load = useCallback(async () => {
    try {
      const data = await fetchLikedSongs();
      setSongs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUnlike(songId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setUnlikingId(songId);
    try {
      await unlikeSong(songId);
      setSongs(prev => prev.filter(s => s.id !== songId));
    } catch (e) {
      console.error(e);
    } finally {
      setUnlikingId(null);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="playing-indicator" style={{ justifyContent: 'center', height: 40, marginBottom: 16 }}>
            <span /><span /><span />
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Loading liked songs…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: 'linear-gradient(135deg, #e11d48, #9f1239)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <div>
            <h1 className="page-title">Liked Songs</h1>
            <p className="page-subtitle">
              {songs.length === 0 ? 'No liked songs yet' : `${songs.length} song${songs.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        {songs.length > 0 && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => playSong(songs[0], songs)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Play All
          </button>
        )}
      </div>

      {/* Empty */}
      {songs.length === 0 && (
        <div className="empty-state animate-fade-in">
          <div className="empty-state-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <h3>No liked songs yet</h3>
          <p>Heart songs in your library to save them here.</p>
        </div>
      )}

      {/* Song list */}
      {songs.length > 0 && (
        <div className="songs-list stagger">
          {songs.map((song, i) => {
            const isCurrentPlaying = currentSong?.id === song.id && isPlaying;
            const isCurrent = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                id={`liked-${song.id}`}
                className={`song-list-item animate-fade-in ${isCurrent ? 'playing' : ''}`}
                onClick={() => playSong(song, songs)}
              >
                <div className="song-list-num">
                  {isCurrentPlaying ? (
                    <div className="playing-indicator" style={{ height: 16 }}>
                      <span /><span /><span />
                    </div>
                  ) : (
                    <span>{i + 1}</span>
                  )}
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
                {/* Unlike button */}
                <button
                  id={`unlike-${song.id}`}
                  className="btn btn-icon"
                  onClick={(e) => handleUnlike(song.id, e)}
                  disabled={unlikingId === song.id}
                  title="Remove from liked"
                  style={{ color: '#e11d48' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
