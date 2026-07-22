# Personal Dashboard (Phase 1 MVP)

A mobile-first personal dashboard: quick-capture inbox, a prioritized task list, and a
home screen with placeholders for future phases (Calendar, Finance, Email). Installable
as a PWA on iPhone. Locked behind a PIN.

## Stack

- **Frontend:** React + Vite, plain CSS (mobile-first), `vite-plugin-pwa` for the
  manifest + service worker
- **Backend:** Node.js + Express
- **Database:** SQLite (single file, via `better-sqlite3`) — no external setup
- **Auth:** PIN, hashed with bcrypt, verified server-side; a session token is issued
  and stored in the browser

## Project layout

```
server/   Express API + SQLite (also serves the built frontend in production)
client/   React app (Vite)
scripts/  One-off script that generated the PWA icons
```

---

## 1. Run it locally

You need Node.js 18+ installed.

```bash
# from the repo root
npm run install:all   # installs deps for both server/ and client/
npm run dev            # runs backend (port 3001) and frontend (port 5173) together
```

Open **http://localhost:5173** in your browser. The Vite dev server proxies `/api`
requests to the Express backend automatically (see `client/vite.config.js`).

The first time you open the app you'll be asked to **create a PIN** — that's stored
(hashed) in the SQLite file at `server/data/dashboard.db`, which is created
automatically on first run.

### Trying it on your iPhone (same Wi-Fi)

1. Find your computer's LAN IP (e.g. `192.168.1.42`).
2. Run `npm run dev` as above.
3. On your iPhone, open Safari to `http://192.168.1.42:5173`.

Note: Safari on iOS only registers **service workers** and shows the full "Add to
Home Screen" installable experience over **HTTPS** (or `localhost`). A plain `http://`
LAN address will let you use the app and see the UI, but the offline/PWA install
behavior is best verified after you deploy it (step 2 below), since your deployed
URL will be HTTPS automatically.

### Running the production build locally (optional)

This is closer to what actually ships:

```bash
npm run build     # builds the React app into client/dist
npm start         # Express serves the API *and* the built frontend on port 3001
```

Visit **http://localhost:3001**.

---

## 2. Deploying

There are two straightforward options. **Railway is recommended** because this app's
SQLite file needs to live on a real, persistent disk — Vercel's serverless functions
don't guarantee that (more below).

### Option A — Railway (recommended, single service)

Railway runs this as one always-on Node process, so the SQLite file just sits on disk
like it would on your own machine.

1. Push this repo to GitHub (if you haven't already).
2. In Railway: **New Project → Deploy from GitHub repo** → pick this repo.
3. Railway will detect `railway.json` and Nixpacks will run:
   - Build: `npm run build` (installs both server & client deps, builds the React app)
   - Start: `npm start` (Express serves the API + the built frontend on `$PORT`)
4. **Add a persistent Volume** (Railway dashboard → your service → *Volumes*) mounted
   at, say, `/data`. Then set an environment variable:
   ```
   DB_PATH=/data/dashboard.db
   ```
   This ensures your tasks/PIN survive redeploys. If you skip this, the app still
   works, but a redeploy can reset the database.
5. Once deployed, open the Railway-provided HTTPS URL on your iPhone in Safari, tap
   **Share → Add to Home Screen**. It'll launch full-screen with no browser chrome.

That's it — one service, one URL, minimal config.

### Option B — Vercel (frontend) + Railway (backend)

If you'd rather host the frontend on Vercel:

1. Deploy the backend on Railway as in steps 1–4 above (or Render/Fly — anywhere
   with a persistent disk works). Note its URL, e.g. `https://your-app.up.railway.app`.
2. In Vercel: **New Project**, import this repo, and set:
   - **Root Directory:** `client`
   - **Build Command:** `npm run build` (Vercel auto-detects Vite)
   - **Output Directory:** `dist`
   - **Environment Variable:** `VITE_API_URL=https://your-app.up.railway.app`
3. Deploy. `client/vercel.json` handles SPA routing fallback.

**Why not run the backend on Vercel too?** Vercel's Node functions are serverless —
each invocation can run in a fresh, ephemeral filesystem, so a SQLite file written
during one request isn't guaranteed to be there on the next. That's fine for
stateless APIs but wrong for a database file you want to keep. If you want everything
on Vercel eventually, the Phase 2 move would be swapping SQLite for a hosted DB
(Vercel Postgres, Turso, etc.) — not needed for this MVP.

---

## Notes on the PIN lock

- The PIN is never stored in plaintext — only a bcrypt hash, in the `settings` table.
- On first load (no PIN set yet), the app prompts you to create one.
- Verifying the PIN issues a random session token (kept in-memory server-side, 30-day
  expiry) that the browser stores in `localStorage` and sends as a Bearer token.
  Restarting the server invalidates all sessions — acceptable for a single-user app.
- There's no "forgot PIN" flow in this MVP. To reset it, stop the server and delete
  the `settings` row (or the whole `.db` file, which also clears your items).

## What's here vs. what's next

Phase 1 (this MVP) covers quick-capture, task management, the PIN lock, and the PWA
shell. The **Calendar**, **Finance**, and **Email** cards on the home screen are
intentionally inert placeholders for later phases.
