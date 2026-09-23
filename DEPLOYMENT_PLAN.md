# HydroLift Cloud Deployment Plan

Status: **planning only — no code has been changed.** This document exists so
you can review the approach before anything is touched.

## Current state

- GitHub repo already exists: `github.com/malasadongegg/HouseLift` (branch `main`)
- A large amount of local work from this session is **uncommitted and unpushed**
  (theme system, mobile app screens, admin-approval flow, LAN/PWA setup, etc.)
- Everything currently runs only on your laptop:
  - Client (React/Vite) — `npm start` on port 1234
  - Server (Express + WebSocket) — `npm start` on port 3001
  - MySQL 8 — local Windows service
  - ESP32 firmware — hardcoded to talk to `ws://192.168.56.1:3001` (your laptop's LAN IP)
- `.env` files are correctly gitignored — pushing to GitHub will **not** leak secrets.

## Recommended architecture

| Piece | Where | Why |
|---|---|---|
| Frontend (React/Vite) | **Vercel** | Best-in-class for static/Vite builds, generous free tier, auto-deploys on every GitHub push |
| Backend (Express + WebSocket) | **Railway** | Node + WebSocket support works out of the box (Vercel does not support persistent WebSocket servers) |
| Database (MySQL) | **Railway MySQL plugin** | Lives next to the backend in the same project — one dashboard, one bill, easiest to wire up instead of juggling a 3rd separate provider |

Both Vercel and Railway connect directly to your GitHub repo: every `git push`
to `main` automatically rebuilds and redeploys — no more manually restarting
`npm start` on your laptop.

```
                 ┌─────────────────────┐
  git push  ───► │   GitHub (main)      │
                 └─────────┬───────────┘
                            │ auto-deploy on push
             ┌──────────────┼──────────────┐
             ▼                              ▼
     ┌───────────────┐              ┌────────────────────┐
     │    Vercel      │  HTTPS/WSS   │      Railway        │
     │  (client build)│ ───────────► │  Express + WS server │
     │ hydrolift.vercel.app          │  + MySQL plugin      │
     └───────────────┘              └────────────────────┘
             ▲                              ▲
             │ HTTPS (any device, any Wi-Fi) │ WSS (needs internet)
        Phone / laptop / tablet         ESP32 firmware
        browser, anywhere                (physical pet house)
```

## Required code changes (not applied yet)

These are the actual edits needed once you say go — listed here so you can see
the full scope before approving:

1. **`client/src/lib/axios.js`** and **`client/src/hooks/useServerSocket.js`**
   Currently derive the API/WebSocket host from `window.location.hostname` —
   that trick only works because your laptop currently serves *both* the
   frontend and backend on the same machine, different ports. On Vercel +
   Railway they'll be on two different domains, so these need to go back to
   using a build-time `VITE_API_URL` env var (Vercel) instead of auto-detecting
   the host, with `https:` → `wss:` handled explicitly.

2. **`server/src/server.js`** (CORS)
   Set `ALLOWED_ORIGIN` to your real Vercel domain once known. The existing
   `isLocalNetworkOrigin()` check can stay as-is so local dev on your laptop
   still keeps working alongside the deployed version.

3. **`server/database/db.js`**
   Managed MySQL providers sometimes require `ssl: true` (or a specific SSL
   mode) for external connections — needs a one-line check/adjustment once we
   see Railway's actual connection details. Everything else is already
   env-var driven, so no other changes expected here.

4. **`main.cpp`** (ESP32 firmware)
   `SERVER_URL` / `API_URL` are hardcoded to `192.168.56.1` (your laptop's LAN
   IP). These need to point to the Railway backend's public `wss://...` /
   `https://...` address instead, and the ESP32 needs to be on a Wi-Fi network
   with real internet access (not just your laptop's local network) to reach
   it. This is the biggest behavior change: right now the sensor and the
   dashboard both only need your home Wi-Fi; after this, the physical pet
   house device needs internet connectivity 24/7.

## Step-by-step setup order

1. **Commit & push** the current uncommitted work to GitHub (`main`). I'll ask
   you to confirm before this step specifically, since pushing is a shared,
   visible action.
2. **Create the Railway project** → add the MySQL plugin → note the generated
   `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_DATABASE` / port.
3. **Run the existing migrations** (`server/database/migrations/*.js`) against
   that hosted database once, to create the schema.
4. **Deploy the backend to Railway** from the GitHub repo, root directory
   `/server`. Set env vars: the DB_* values from step 2, `ACCESSTOKEN_SECRET`,
   `REFRESHTOKEN_SECRET`, `EMAIL_*` (your Gmail app password), and a
   placeholder `ALLOWED_ORIGIN` (updated in step 6).
5. **Deploy the frontend to Vercel** from the GitHub repo, root directory
   `/client`, build command `npm run build`. Set `VITE_API_URL` to the
   Railway backend's public URL.
6. **Circle back**: update `ALLOWED_ORIGIN` on Railway to the real Vercel
   domain from step 5, redeploy the backend.
7. **Reflash the ESP32** with the updated `main.cpp` pointing at the Railway
   backend, connected to a Wi-Fi network with internet access.
8. **Test end-to-end** — log in from a phone on mobile data (not your home
   Wi-Fi) to confirm it's really internet-reachable, and confirm the ESP32
   sensor readings still reach the dashboard live.

## Things to know before committing to this

- **Free tier limits**: Railway's free tier runs on a monthly usage credit
  (not unlimited) and Vercel's free tier is generous for a project this size,
  but both are worth double-checking against your school project's expected
  traffic/duration.
- **The ESP32 must have internet access**, not just LAN, once the backend
  moves to the cloud — worth confirming your deployment site's Wi-Fi allows
  that before reflashing.
- This plan keeps your **local dev workflow unchanged** — you can keep
  developing and testing on `localhost`/LAN exactly as now; the cloud
  deployment is additive, driven by the same codebase.

## Not done yet

No files have been edited and nothing has been pushed. Let me know which
step to start with — likely order would be: confirm the hosting choice above
→ commit & push → Railway setup → Vercel setup → firmware update.
