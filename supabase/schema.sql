-- ============================================================
-- Amaan's Music App — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Songs table: stores metadata for uploaded MP3s
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT DEFAULT 'Unknown Artist',
  album TEXT DEFAULT 'Unknown Album',
  duration INTEGER DEFAULT 0,         -- in seconds
  file_key TEXT NOT NULL,             -- R2 object key (e.g. "songs/user-id/uuid.mp3")
  cover_key TEXT,                     -- R2 cover image key (optional)
  file_size BIGINT DEFAULT 0,         -- bytes
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Profiles table: stores user settings
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Profiles are viewable by everyone
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Policy: Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy: users can view own songs or public songs
DROP POLICY IF EXISTS "Users can view own songs" ON songs;
DROP POLICY IF EXISTS "Users can view own songs or public songs" ON songs;
CREATE POLICY "Users can view own songs or public songs"
  ON songs FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = songs.user_id AND profiles.is_public = true
    )
  );

-- Policy: users can only INSERT their own songs
DROP POLICY IF EXISTS "Users can insert own songs" ON songs;
CREATE POLICY "Users can insert own songs"
  ON songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: users can only UPDATE their own songs
DROP POLICY IF EXISTS "Users can update own songs" ON songs;
CREATE POLICY "Users can update own songs"
  ON songs FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: users can only DELETE their own songs
DROP POLICY IF EXISTS "Users can delete own songs" ON songs;
CREATE POLICY "Users can delete own songs"
  ON songs FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS songs_updated_at ON songs;
CREATE TRIGGER songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Liked Songs
-- ============================================================

CREATE TABLE IF NOT EXISTS liked_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);

ALTER TABLE liked_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own likes" ON liked_songs;
CREATE POLICY "Users manage own likes"
  ON liked_songs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Playlists
-- ============================================================

CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own playlists" ON playlists;
CREATE POLICY "Users manage own playlists"
  ON playlists FOR ALL
  USING (auth.uid() = user_id OR is_public = true)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS playlists_updated_at ON playlists;
CREATE TRIGGER playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Playlist Songs (junction table)
-- ============================================================

CREATE TABLE IF NOT EXISTS playlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, song_id)
);

ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own playlist songs" ON playlist_songs;
CREATE POLICY "Users manage own playlist songs"
  ON playlist_songs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_songs.playlist_id
        AND (playlists.user_id = auth.uid() OR playlists.is_public = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_songs.playlist_id
        AND playlists.user_id = auth.uid()
    )
  );

