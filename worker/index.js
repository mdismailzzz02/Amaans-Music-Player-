/**
 * Cloudflare Worker — R2 upload/delete proxy
 * Verifies Supabase JWT, then performs R2 operations using native bindings.
 *
 * Routes:
 *   POST   /upload   — upload audio file to R2
 *   DELETE /delete   — delete a file from R2
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-File-Key, X-File-Type',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    // ── Auth: verify Supabase JWT ─────────────────────────────────────────────
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.slice(7);
    const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY,
      },
    });

    if (!userRes.ok) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { id: userId } = await userRes.json();

    // ── POST /upload ──────────────────────────────────────────────────────────
    if (url.pathname === '/upload' && request.method === 'POST') {
      const fileKey = request.headers.get('X-File-Key');
      const contentType = request.headers.get('X-File-Type') || 'audio/mpeg';

      if (!fileKey) return json({ error: 'X-File-Key header required' }, 400);

      // Only allow users to upload to their own folder (songs/{userId}/ or {userId}/)
      const isAllowed = fileKey.startsWith(`songs/${userId}/`) || fileKey.startsWith(`${userId}/`);
      if (!isAllowed) {
        return json({ error: 'Forbidden' }, 403);
      }

      const body = await request.arrayBuffer();

      await env.R2_BUCKET.put(fileKey, body, {
        httpMetadata: { contentType },
      });

      return json({ key: fileKey });
    }

    // ── DELETE /delete ────────────────────────────────────────────────────────
    if (url.pathname === '/delete' && request.method === 'DELETE') {
      const fileKey = request.headers.get('X-File-Key');
      if (!fileKey) return json({ error: 'X-File-Key header required' }, 400);

      // Only allow users to delete their own files (songs/{userId}/ or {userId}/)
      const isAllowed = fileKey.startsWith(`songs/${userId}/`) || fileKey.startsWith(`${userId}/`);
      if (!isAllowed) {
        return json({ error: 'Forbidden' }, 403);
      }

      await env.R2_BUCKET.delete(fileKey);
      return json({ success: true });
    }

    return json({ error: 'Not found' }, 404);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
