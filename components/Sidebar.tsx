'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { fetchPlaylists, createPlaylist } from '@/lib/api';
import type { Playlist } from '@/lib/types';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? '');
    });
    fetchPlaylists().then(setPlaylists).catch(() => {});
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  async function handleCreatePlaylist() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const playlist = await createPlaylist(name);
      setPlaylists(prev => [playlist, ...prev]);
      setNewName('');
      setShowNewPlaylist(false);
      router.push(`/playlist?id=${playlist.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  const initials = userEmail ? userEmail[0].toUpperCase() : '?';

  const navItems = [
    {
      href: '/library',
      label: 'Library',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M12 6v6" /><path d="M9 9h6" />
        </svg>
      ),
    },
    {
      href: '/liked',
      label: 'Liked Songs',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill={pathname === '/liked' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
    },
    {
      href: '/upload',
      label: 'Upload',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <span className="sidebar-logo-text">Amaan&apos;s Music</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Playlists section */}
      <div style={{ padding: '12px 12px 4px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Playlists
          </span>
          <button
            id="new-playlist-btn"
            onClick={() => setShowNewPlaylist(v => !v)}
            title="New playlist"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* New playlist input */}
        {showNewPlaylist && (
          <div style={{ marginBottom: 8 }}>
            <input
              id="new-playlist-input"
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreatePlaylist(); if (e.key === 'Escape') { setShowNewPlaylist(false); setNewName(''); } }}
              placeholder="Playlist name…"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.82rem',
                padding: '5px 8px', outline: 'none',
              }}
            />
            <button
              onClick={handleCreatePlaylist}
              disabled={creating || !newName.trim()}
              style={{
                marginTop: 4, width: '100%', padding: '4px 0',
                background: 'var(--primary)', border: 'none', borderRadius: 6,
                color: 'white', fontSize: '0.78rem', cursor: 'pointer',
                opacity: (creating || !newName.trim()) ? 0.5 : 1,
              }}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        )}

        {/* Playlist list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {playlists.length === 0 && !showNewPlaylist && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '4px 4px' }}>No playlists yet</span>
          )}
          {playlists.map(pl => (
            <Link
              key={pl.id}
              href={`/playlist?id=${pl.id}`}
              className={`sidebar-nav-item ${pathname.startsWith('/playlist') ? 'active' : ''}`}
              style={{ fontSize: '0.83rem', padding: '6px 8px', gap: 8 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.6 }}>
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* User section */}
      <div className="sidebar-bottom">
        <div className="sidebar-user" onClick={handleSignOut} title="Sign out">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-email">{userEmail}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Sign out</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
      </div>
    </aside>
  );
}
