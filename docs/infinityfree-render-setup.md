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
   `ALLOWED_ORIGIN` may list more than one website address, separated by commas
   (see "Your own domain for the shop" below). `CLIENT_URL` stays a single main address:
   it is the link put in emails.
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

## The shop is a separate website

The selling page and the inquiry form are their own website, apart from the dashboard
site. They share the same backend (Render) and database, but each has its own address,
its own hosting and its own build:

| | Dashboard site | Shop site |
|---|---|---|
| Opens | login, dashboard, activation, admin | the selling pages (`/`, `/about`, `/product`, `/how-it-works`, `/specifications`, `/faq`, `/contact`) and the inquiry form `/inquire` |
| Build | `npm run build` in `client` -> `client/dist` | `npm run build:shop` in `client` -> `client/dist-shop` |
| Lives at | `https://houselift.free.nf` | its own address, e.g. `https://your-shop-domain.com` |

**Where the shop is published now:** https://hydrolift-shop.vercel.app (the Vercel project
`hydrolift-shop`, under the same Vercel account as the old `hydrolift` project). It is a
free `.vercel.app` address; a custom domain can be added to that project later. To publish a
new version: run `npm run build:shop` in `client`, copy the contents of `client/dist-shop`
into a folder named `hydrolift-shop`, and run `vercel deploy --prod --yes` inside it (the
folder name is what ties it to the right project, so it never replaces the dashboard site).
The shop's two server endpoints (`/shop/product` and `/shop/inquiries`) are open to any website, because they use no logins or cookies, so the shop works from this address (or any other) without changing Render's settings.

The two sites link to each other: the shop's "Log in" goes to the dashboard site
(`VITE_APP_URL`), and the dashboard's login page links to the shop (`VITE_SHOP_URL`).

To put the shop online:

1. **Get an address and hosting for the shop.** Create a second hosting site in
   InfinityFree (its own free subdomain, or your own domain). A custom domain means buying
   it from a domain seller with your own payment; then add it in the InfinityFree client
   area under Domains. InfinityFree asks you to use its nameservers or add a CNAME record at
   your domain seller (DNS can take up to 72 hours). Turn on its free HTTPS certificate
   (https://app.infinityfree.net/ssls) before real visitors, because the inquiry form sends a
   name and a phone number.
2. **Tell the dashboard site where the shop is.** In `client/.env.production` add
   `VITE_SHOP_URL="https://your-shop-domain.com"`, then rebuild (`npm run build`) and
   upload `client/dist` to the dashboard site as before. (`VITE_APP_URL` for the shop is
   already set to `https://houselift.free.nf` in the same file.)
3. **Build the shop:** `npm run build:shop`. Upload everything inside `client/dist-shop`
   (including `.htaccess`) into the shop site's `htdocs`.
4. **Nothing to change on the backend for the shop's address.** The shop's endpoints accept any
   website. `ALLOWED_ORIGIN` on Render still lists only the dashboard site (`https://houselift.free.nf`),
   and `CLIENT_URL` is the link used in emails.
5. **Make sure the backend and database have the shop code.** Run
   `server/database/setup-and-check.sql` in the TiDB SQL editor, and deploy the latest server
   to Render. Without this the inquiry form cannot save inquiries. This needs the `inquiries` table (`server/database/add-inquiries.sql` adds just that).
6. **Check it:** open the shop address and send a test inquiry, then find it under
   "Inquiries" on the dashboard site. To try a sale, click "Register buyer" on it: that makes
   the account, records the ID and gives a serial code.

On your own computer both sites start with `scripts/start-local.ps1`: dashboard at
http://localhost:1234 and shop at http://localhost:1235.

## Notes
- Render's free plan sleeps after ~15 minutes idle; the first request wakes it.
- The login cookie is cross-site (houselift.free.nf vs onrender.com). Browsers
  that block third-party cookies (Safari, Brave) may log users out on refresh.
  A custom domain shared by both sides avoids this.
