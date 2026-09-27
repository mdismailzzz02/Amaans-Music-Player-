'use client';

import { usePlayer } from './PlayerContext';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Player() {
  const {
    currentSong, isPlaying, currentTime, duration, volume,
    togglePlay, seek, setVolume, playNext, playPrev,
    playError, clearPlayError,
  } = usePlayer();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentSong) {
    return (
      <div className="player-bar" style={{ justifyContent: 'center', color: 'var(--text-muted)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        <span style={{ fontSize: '0.85rem' }}>Select a song to start playing</span>
      </div>
    );
  }

  return (
    <div className="player-bar" style={{ flexDirection: 'column', gap: 0, padding: 0 }}>
      {/* Error banner */}
      {playError && (
        <div style={{
          width: '100%',
          background: 'rgba(239,68,68,0.15)',
          borderBottom: '1px solid rgba(239,68,68,0.3)',
          color: '#fca5a5',
          fontSize: '0.78rem',
          padding: '6px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ flex: 1 }}>{playError}</span>
          <button onClick={clearPlayError} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '0 4px', fontSize: '1rem', lineHeight: 1 }} aria-label="Dismiss error">×</button>
        </div>
      )}
      <div className="player-bar" style={{ width: '100%', boxShadow: 'none', borderTop: 'none' }}>
      {/* Song info */}
      <div className="player-song-info">
        <div className={`player-cover ${isPlaying ? 'playing' : ''}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="player-song-title">{currentSong.title}</div>
          <div className="player-song-artist">{currentSong.artist}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="player-controls">
        <div className="player-buttons">
          {/* Prev */}
          <button id="player-prev" className="player-btn" onClick={playPrev} aria-label="Previous song">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button id="player-play-pause" className="player-btn player-btn-play" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          {/* Next */}
          <button id="player-next" className="player-btn" onClick={playNext} aria-label="Next song">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Seek bar */}
        <div className="player-progress">
          <span className="player-time">{formatTime(currentTime)}</span>
          <input
            id="player-seek"
            type="range"
            min={0}
            max={duration || 0}
            step={0.5}
            value={currentTime}
            onChange={e => seek(parseFloat(e.target.value))}
            style={{ flex: 1, background: `linear-gradient(to right, #7c3aed ${progress}%, rgba(255,255,255,0.1) ${progress}%)` }}
            aria-label="Seek"
          />
          <span className="player-time">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="player-volume">
        <button
          id="player-mute"
          className="player-btn"
          onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
          aria-label="Toggle mute"
          style={{ width: 28, height: 28 }}
        >
          {volume === 0 ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
        <input
          id="player-volume"
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          style={{
            width: 80,
            background: `linear-gradient(to right, rgba(255,255,255,0.5) ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)`
          }}
          aria-label="Volume"
        />
      </div>
    </div>
    </div>
  );
}
