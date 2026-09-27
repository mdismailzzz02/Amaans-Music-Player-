# 🎵 Amaan's Music Player

A premium personal music streaming app — upload your MP3s, stream them anywhere, and manage your library with a sleek modern interface.

**Live Demo:** [amaans-music-app.onrender.com](https://amaans-music-app.onrender.com)

---

## ✨ Features

- 🔐 **Auth** — Sign up / log in with Supabase email auth
- 📤 **Upload** — Drag & drop MP3 uploads via Cloudflare Worker → R2
- 🎧 **Stream** — Instant playback directly from Cloudflare R2 public CDN
- 📚 **Library** — Grid & list views, delete songs, play count tracking
- 🌍 **Public/Private** — Toggle your library visibility for sharing
- 🎛️ **Player** — Persistent bottom player with seek, volume, prev/next

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (static export) |
| Auth & Database | Supabase |
| File Storage | Cloudflare R2 |
| Upload/Delete Proxy | Cloudflare Worker |
| Hosting | Render (static site) |

---

## 🚀 Self-Hosting

### 1. Clone the repo

```bash
git clone https://github.com/mdismailzzz02/Amaans-Music-Player-.git
cd Amaans-Music-Player-
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor
3. Copy your project URL and anon key

### 3. Set up Cloudflare R2

1. Create an R2 bucket (e.g. `storage-1`) with public access enabled
2. Deploy the Cloudflare Worker in the `worker/` folder:
   ```bash
   cd worker
   npx wrangler deploy
   ```

### 4. Configure environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxx.r2.dev
NEXT_PUBLIC_WORKER_URL=https://your-worker.workers.dev
```

### 5. Run locally

```bash
npm run dev
```

### 6. Deploy to Render

1. Push to GitHub
2. New → Static Site on [render.com](https://render.com)
3. Set the same 4 env vars above
4. **Publish directory:** `dist`
5. **Build command:** `npm install && npm run build`

---

## 📁 Project Structure

```
├── app/
│   ├── (app)/
│   │   ├── library/      # Main music library page
│   │   └── upload/       # Upload page
│   ├── login/            # Login page
│   └── signup/           # Signup page
├── components/
│   ├── Player.tsx         # Bottom audio player bar
│   ├── PlayerContext.tsx  # Global player state
│   └── Sidebar.tsx        # Navigation sidebar
├── lib/
│   ├── api.ts             # Supabase & R2 API functions
│   └── supabase/          # Supabase client setup
├── worker/
│   └── index.js           # Cloudflare Worker (upload/delete proxy)
├── supabase/
│   └── schema.sql         # Database schema & RLS policies
└── render.yaml            # Render deployment config
```

---

## 📄 License

MIT
