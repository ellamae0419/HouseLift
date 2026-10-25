# Hosting setup: InfinityFree (website) + Render (backend) + hosted MySQL

InfinityFree only hosts the website files. The backend (Express + WebSocket)
runs on Render, and the database is a free MySQL from TiDB Cloud or Aiven.

## 1. Database (TiDB Cloud or Aiven)
1. Create a free MySQL database. Note host, port, user, password, database name.
2. Run the migrations in `server/database/migrations` against it.

## 2. Backend on Render
1. New > Blueprint > pick this GitHub repo (it reads `render.yaml`).
2. Fill in the secrets: the DB_* values, ACCESSTOKEN_SECRET, REFRESHTOKEN_SECRET,
   Mailjet keys.
3. `ALLOWED_ORIGIN` and `CLIENT_URL` = `https://houselift.free.nf`
   (no trailing slash; use `http://` if you haven't enabled SSL on InfinityFree).
4. Note the Render URL, e.g. `https://houselift.onrender.com`.

## 3. Website on InfinityFree
1. In `client`, create `.env.production`:
   ```
   VITE_APP_NAME="HydroLift"
   VITE_API_URL="https://<your-render-url>"
   VITE_DIRECT_API=true
   ```
2. `npm run build` in `client`.
3. In the InfinityFree control panel open the File Manager (or FTP) and upload
   everything inside `client/dist` (including `.htaccess`) into `htdocs`.

## 4. ESP32
Change `SERVER_URL` (`wss://<render-host>`) and `API_URL` (`https://<render-host>`)
in `main.cpp` and `arduino/HouseLift/HouseLift.ino`, then reflash.

## Notes
- Render's free plan sleeps after ~15 minutes idle; the first request wakes it.
- The login cookie is cross-site (houselift.free.nf vs onrender.com). Browsers
  that block third-party cookies (Safari, Brave) may log users out on refresh.
  A custom domain shared by both sides avoids this.
