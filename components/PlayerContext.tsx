'use client';

import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import type { Song } from '@/lib/types';
import { getStreamUrl } from '@/lib/api';

interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playError: string | null; // set when the current track cannot be loaded
}

interface PlayerContextValue extends PlayerState {
  playSong: (song: Song, queue?: Song[]) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  playNext: () => void;
  playPrev: () => void;
  clearPlayError: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [playError, setPlayError] = useState<string | null>(null);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.8;
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('durationchange', () => setDuration(audio.duration));
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      // Auto-play next
      setQueue(prev => {
        const idx = prev.findIndex(s => s.id === audio.dataset.songId);
        if (idx !== -1 && idx < prev.length - 1) {
          // Trigger next song
          setTimeout(() => {
            const nextSong = prev[idx + 1];
            loadAndPlay(nextSong, prev);
          }, 100);
        }
        return prev;
      });
    });
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('error', () => {
      // MediaError codes: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED
      const code = audio.error?.code;
      const msg = code === 4
        ? 'Track file not found or format unsupported. It may have been deleted from storage.'
        : `Playback error (code ${code ?? 'unknown'}). Check your connection.`;
      setPlayError(msg);
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const loadAndPlay = useCallback(async (song: Song, songQueue: Song[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentSong(song);
    setQueue(songQueue);
    setCurrentTime(0);
    setDuration(0);

    setPlayError(null);
    try {
      const url = await getStreamUrl(song.id, song.file_key);

      if (!url || !url.startsWith('http')) {
        setPlayError('Could not resolve a valid stream URL for this track.');
        console.error('Invalid stream URL for song:', song.title, url);
        return;
      }

      audio.src = url;
      audio.dataset.songId = song.id;
      audio.load();
      // The 'error' event listener above will handle load failures (404, decode errors, etc.)
      audio.play().catch((err: Error) => {
        if (err.name !== 'AbortError') {
          // AbortError is expected when src changes mid-play; ignore it
          console.error('Playback error:', err);
        }
      });
    } catch (err) {
      console.error('Failed to get stream URL:', err);
    }
  }, []);

  const playSong = useCallback((song: Song, songQueue?: Song[]) => {
    const q = songQueue ?? [song];
    loadAndPlay(song, q);
  }, [loadAndPlay]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((vol: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = vol;
    setVolumeState(vol);
  }, []);

  const playNext = useCallback(() => {
    if (!currentSong || queue.length === 0) return;
    const idx = queue.findIndex(s => s.id === currentSong.id);
    if (idx !== -1 && idx < queue.length - 1) {
      loadAndPlay(queue[idx + 1], queue);
    }
  }, [currentSong, queue, loadAndPlay]);

  const playPrev = useCallback(() => {
    if (!currentSong || queue.length === 0) return;
    const audio = audioRef.current;
    // If > 3s in, restart; else go to previous
    if (audio && audio.currentTime > 3) {
      seek(0);
      return;
    }
    const idx = queue.findIndex(s => s.id === currentSong.id);
    if (idx > 0) {
      loadAndPlay(queue[idx - 1], queue);
    }
  }, [currentSong, queue, loadAndPlay, seek]);

  const clearPlayError = useCallback(() => setPlayError(null), []);

  return (
    <PlayerContext.Provider value={{
      currentSong, queue, isPlaying,
      currentTime, duration, volume,
      playError,
      playSong, togglePlay, seek, setVolume,
      playNext, playPrev,
      clearPlayError,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
