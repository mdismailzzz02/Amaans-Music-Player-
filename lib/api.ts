/**
 * lib/api.ts
 * Client-side API functions — pure static frontend.
 *
 * Storage: Cloudflare R2
 *   - Streaming: Direct public R2 URL (bucket is public)
 *   - Upload/Delete: Via Cloudflare Worker (auth-gated, free)
 *
 * Database: Supabase (direct client SDK)
 */

import { createClient } from '@/lib/supabase/client';
import type { Song } from '@/lib/types';

const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').trim().replace(/\/$/, '');
const WORKER_URL = (process.env.NEXT_PUBLIC_WORKER_URL ?? '').trim().replace(/\/$/, '');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return session.access_token;
}

// ─── Songs ────────────────────────────────────────────────────────────────────

export async function fetchSongs(): Promise<Song[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteSong(id: string, fileKey: string): Promise<void> {
  const supabase = createClient();
  const token = await getAuthToken();

  // Delete from R2 via Worker
  const res = await fetch(`${WORKER_URL}/delete`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-File-Key': fileKey,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.warn('R2 delete failed (continuing):', err);
  }

  // Delete from DB
  const { error } = await supabase.from('songs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function uploadSong(
  file: File,
  metadata: { title: string; artist: string; album: string; duration: number },
  onProgress?: (pct: number) => void
): Promise<Song> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  const token = await getAuthToken();

  onProgress?.(10);

  // Generate a unique storage key matching the bucket structure: songs/{userId}/{uuid}.{ext}
  const ext = file.name.split('.').pop() || 'mp3';
  const uuid = crypto.randomUUID();
  const fileKey = `songs/${user.id}/${uuid}.${ext}`;

  onProgress?.(20);

  // Upload to R2 via Worker
  const uploadRes = await fetch(`${WORKER_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-File-Key': fileKey,
      'X-File-Type': file.type || 'audio/mpeg',
    },
    body: file,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error ?? 'Upload to R2 failed');
  }

  onProgress?.(80);

  // Save metadata to Supabase DB
  const { data: song, error: dbError } = await supabase
    .from('songs')
    .insert({
      user_id: user.id,
      title: metadata.title,
      artist: metadata.artist || 'Unknown Artist',
      album: metadata.album || 'Unknown Album',
      duration: metadata.duration,
      file_key: fileKey,
      file_size: file.size,
    })
    .select()
    .single();

  if (dbError) {
    // Cleanup orphaned R2 file
    await fetch(`${WORKER_URL}/delete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'X-File-Key': fileKey },
    }).catch(() => {});
    throw new Error(dbError.message);
  }

  onProgress?.(100);
  return song;
}

// ─── Streaming ────────────────────────────────────────────────────────────────

export async function getStreamUrl(songId: string, fileKey: string): Promise<string> {
  const supabase = createClient();

  // Increment play count (fire and forget)
  supabase
    .from('songs')
    .select('play_count')
    .eq('id', songId)
    .single()
    .then(({ data }) => {
      if (data) {
        supabase
          .from('songs')
          .update({ play_count: (data.play_count ?? 0) + 1 })
          .eq('id', songId)
          .then(() => {});
      }
    });

  // All objects in the bucket live under songs/ — ensure the prefix is present
  const storageKey = fileKey.startsWith('songs/') ? fileKey : `songs/${fileKey}`;

  if (!R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL not configured');
  return `${R2_PUBLIC_URL}/${storageKey}`;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchProfile(): Promise<Profile> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  // Upsert to avoid race conditions where two concurrent calls both try to insert
  const { data: profile, error: upsertError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, is_public: false }, { onConflict: 'id', ignoreDuplicates: true })
    .select()
    .maybeSingle();

  if (profile) return profile;

  // ignoreDuplicates means existing rows aren't returned — do a plain fetch fallback
  if (!upsertError) {
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    return existing;
  }

  throw new Error(upsertError.message);
}

export async function updateProfile(data: Partial<{ is_public: boolean }>): Promise<Profile> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: user.id, ...data })
        .select()
        .single();
      if (insertError) throw new Error(insertError.message);
      return newProfile;
    }
    throw new Error(error.message);
  }

  return profile;
}
