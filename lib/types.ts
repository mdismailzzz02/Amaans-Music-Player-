export interface Song {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  file_key: string;
  cover_key: string | null;
  file_size: number;
  play_count: number;
  created_at: string;
  updated_at: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  song_count?: number;
}

export interface PlaylistSong {
  id: string;
  playlist_id: string;
  song_id: string;
  position: number;
  added_at: string;
  song?: Song;
}

export interface LikedSong {
  id: string;
  user_id: string;
  song_id: string;
  created_at: string;
  song?: Song;
}
