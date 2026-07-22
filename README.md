# Personal Dashboard (Phase 1 MVP)

A mobile-first personal dashboard: quick-capture inbox, a prioritized task list, and a
home screen with placeholders for future phases (Calendar, Finance, Email). Installable
as a PWA on iPhone. Locked behind a PIN.

## Stack

- **Frontend:** React + Vite, plain CSS (mobile-first), `vite-plugin-pwa` for the
  manifest + service worker
- **Backend:** Node.js + Express, deployed as a single Vercel serverless function
- **Database:** [Turso](https://turso.tech) — a free, hosted, SQLite-compatible
  database (via `@libsql/client`). Locally it falls back to a plain SQLite file with
  zero setup; production needs Turso because Vercel's serverless functions have no
  persistent disk.
- **Auth:** PIN, hashed with bcrypt, verified server-side; a session token is issued
  and stored (in the database, not in server memory, so it survives across serverless
  invocations) and kept in the browser's `localStorage`

## Project layout

```
api/      Single file (index.js) that hands the Express app to Vercel as a serverless function
server/   The Express app itself: routes, DB access, auth — shared by api/ and local dev
client/   React app (Vite)
scripts/  One-off script that generated the PWA icons
```

---

## 1. Run it locally

You need Node.js 18+ installed.

```bash
# from the repo root
npm run install:all   # installs deps for both the root (server) and client/
npm run dev            # runs backend (port 3001) and frontend (port 5173) together
```

Open **http://localhost:5173** in your browser. The Vite dev server proxies `/api`
requests to the Express backend automatically (see `client/vite.config.js`).

The first time you open the app you'll be asked to **create a PIN**. Locally, with no
`TURSO_DATABASE_URL` set, everything (PIN hash, items, sessions) is stored in a plain
SQLite file at `server/data/dashboard.db`, created automatically — no Turso account
needed just to develop.

### Trying it on your iPhone (same Wi-Fi)

1. Find your computer's LAN IP (e.g. `192.168.1.42`).
2. Run `npm run dev` as above.
3. On your iPhone, open Safari to `http://192.168.1.42:5173`.

Note: Safari on iOS only shows the full "Add to Home Screen" installable experience
over **HTTPS** (or `localhost`). A plain `http://` LAN address works for using the
app, but verify the actual install behavior after deploying (below), since your
Vercel URL is HTTPS automatically.

### Running the production build locally (optional)

```bash
npm run build     # builds the React app into client/dist
npm start         # Express serves the API *and* the built frontend on port 3001
```

Visit **http://localhost:3001**.

---

## 2. Deploying to Vercel (free)

Vercel's Hobby tier is free and doesn't require a credit card to sign up. This repo
is already set up for it: `vercel.json` at the root routes `/api/*` to a single
serverless function (`api/index.js`), which just re-exports the same Express app used
locally.

### Step 1 — Create a Turso database (free, no credit card)

Vercel serverless functions don't have persistent disk, so the local SQLite-file
fallback won't reliably keep your data. Turso gives you a real, free, hosted
SQLite-compatible database instead.

1. Go to **https://turso.tech** and sign up (email/GitHub — no card required for the
   free tier).
2. Install their CLI or use the web dashboard to create a database — either works:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login
   turso db create personal-dashboard
   turso db show personal-dashboard --url
   turso db tokens create personal-dashboard
   ```
3. You'll end up with two values you'll need in step 4:
   - A **database URL** (looks like `libsql://personal-dashboard-yourname.turso.io`)
   - An **auth token** (a long string)

### Step 2 — GitHub repo

Good news: this project is already in `cmets99/Claude-code`, a repo under your own
GitHub account (confirmed via the GitHub API — you have admin access to it), on
branch `claude/personal-dashboard-pwa-oyuxvz`. There's no separate "push to your own
repo" step — Vercel can import this repo directly.

One thing to fix by hand: the repo is currently **public**, not private. GitHub's API
doesn't expose a way to flip that from here, so do it yourself:
**github.com/cmets99/Claude-code → Settings → General → Danger Zone → Change
visibility → Private.**

### Step 3 — Sign up for Vercel and import the repo

1. Go to **https://vercel.com/signup** and choose **Continue with GitHub**. Free
   Hobby tier, no credit card required.
2. **Add New… → Project**, then **Import** the GitHub repo you just pushed.
3. Vercel should auto-detect the settings from `vercel.json`:
   - **Root Directory:** repo root (leave as-is — don't set it to `client`)
   - **Build Command:** `npm run build`
   - **Output Directory:** `client/dist`
4. Before clicking Deploy, add environment variables (**Environment Variables**
   section on the same import screen, or later under **Settings → Environment
   Variables**):
   | Name | Value |
   |---|---|
   | `TURSO_DATABASE_URL` | the `libsql://...` URL from Step 1 |
   | `TURSO_AUTH_TOKEN` | the token from Step 1 |
5. Click **Deploy**. First build takes a minute or two.

### Step 4 — Verify it in production

1. Open the `https://your-project.vercel.app` URL Vercel gives you.
2. You should see the **"Set up your PIN"** screen (proof the app loaded and reached
   `/api/auth/status` against your Turso database — if this hangs or errors, double
   check the two environment variables are spelled exactly right and redeploy).
3. Create a PIN, add a quick-capture item, mark it a task, complete it — confirms the
   full read/write path to Turso works.
4. Reload the page (or open it in a private tab) — you should land on **"Enter your
   PIN"**, not the setup screen, and your item should still be there. That confirms
   data is actually persisting (the thing Vercel's local filesystem couldn't do).
5. On your iPhone, open the `vercel.app` URL in Safari → **Share → Add to Home
   Screen**. It should launch full-screen with your app icon, no browser chrome.

That's the whole path, entirely on free tiers: GitHub (free), Vercel Hobby (free),
Turso free tier (500 databases / generous row-read limits, no card required).

---

## Notes on the PIN lock

- The PIN is never stored in plaintext — only a bcrypt hash, in the `settings` table.
- On first load (no PIN set yet), the app prompts you to create one.
- Verifying the PIN issues a random session token, stored in a `sessions` table (not
  server memory — serverless functions don't keep memory between invocations), 30-day
  expiry. The browser keeps it in `localStorage` and sends it as a Bearer token.
- There's no "forgot PIN" flow in this MVP. To reset it in production, open the Turso
  CLI/dashboard and delete the `pin_hash` row from `settings` (or drop all tables to
  start clean). Locally, just delete `server/data/dashboard.db`.
- `/api/auth/verify` locks out after 5 wrong PIN attempts from the same client for 5
  minutes (tracked in a `login_attempts` table) — a 4-digit PIN is only 10,000
  combinations, and this app will sit on a public URL, so unthrottled guessing wasn't
  acceptable.

## Alternative: Railway instead of Vercel

If you'd rather run this as a single always-on Node process instead of serverless
functions (no Turso needed — a local SQLite file persists fine on a real disk),
`railway.json` is still here and works with the same `npm run build` / `npm start`
scripts. Note Railway's free trial credit runs out after a few dollars of usage;
Vercel + Turso, as documented above, is the actually-free-long-term path.

## What's here vs. what's next

Phase 1 (this MVP) covers quick-capture, task management, the PIN lock, and the PWA
shell. The **Calendar**, **Finance**, and **Email** cards on the home screen are
intentionally inert placeholders for later phases.
