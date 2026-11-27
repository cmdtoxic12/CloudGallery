# CloudGallery — Deploy to Vercel + Render

Recommended split setup:

| Piece | Platform | Why |
|-------|----------|-----|
| Frontend (React/Vite) | **Vercel** | Free, fast CDN, SPA support |
| Backend (Express API) | **Render** | Free web service, easy Node deploy |
| Database | **Neon** or **Supabase** or Render Postgres | Managed Postgres |
| Images | **Cloudinary** | Already integrated |

---

## 1. Database (do this first)

### Option A — Neon (recommended free tier)
1. Go to [neon.tech](https://neon.tech) → create project
2. Copy the connection string → `DATABASE_URL`

### Option B — Supabase
1. [supabase.com](https://supabase.com) → New project
2. Project Settings → Database → Connection string (URI)
3. Use the **Transaction** or **Session** pooler string as `DATABASE_URL`

### Run schema
In Neon SQL Editor, Supabase SQL Editor, or `psql`:

```bash
# paste contents of database/schema.sql and run
```

---

## 2. Cloudinary

1. [cloudinary.com](https://cloudinary.com) → free account
2. Dashboard → copy **Cloud name**, **API Key**, **API Secret**

---

## 3. Deploy API on Render

1. Push this repo to GitHub (or upload the zip and create a repo).
2. [render.com](https://render.com) → **New** → **Web Service**
3. Connect the GitHub repo
4. Settings:

| Field | Value |
|-------|--------|
| **Name** | `cloudgallery-api` |
| **Root Directory** | leave empty (repo root) |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance** | Free |

5. **Environment Variables** (Environment tab):

```
NODE_ENV=production
PORT=10000
JWT_SECRET=<long-random-string-at-least-32-chars>
JWT_EXPIRES_IN=7d
DATABASE_URL=<your-postgres-connection-string>
CLOUDINARY_CLOUD_NAME=<from-cloudinary>
CLOUDINARY_API_KEY=<from-cloudinary>
CLOUDINARY_API_SECRET=<from-cloudinary>
CLIENT_URL=https://your-vercel-app.vercel.app
MAX_FILE_SIZE_MB=15
MAX_FILES_PER_UPLOAD=20
```

Optional (real emails):

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_xxxx
EMAIL_FROM=CloudGallery <noreply@yourdomain.com>
```

6. Click **Create Web Service**
7. Wait for deploy → copy the URL, e.g.  
   `https://cloudgallery-api.onrender.com`

8. Test: open  
   `https://cloudgallery-api.onrender.com/api/health`  
   You should see `{ "success": true, ... }`

> **Note:** Free Render services spin down after ~15 min idle. First request after sleep can take 30–60s.

---

## 4. Deploy frontend on Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import the same GitHub repo
2. Configure:

| Field | Value |
|-------|--------|
| **Framework Preset** | Vite |
| **Root Directory** | `client` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

3. **Environment Variables**:

```
VITE_API_URL=https://cloudgallery-api.onrender.com/api
```

(Replace with your real Render URL. Must end with `/api`.)

4. Deploy
5. Copy the Vercel URL, e.g. `https://cloudgallery.vercel.app`

---

## 5. Wire the two sides together

1. **Render** → Environment → set:
   ```
   CLIENT_URL=https://cloudgallery.vercel.app
   ```
   (no trailing slash)

2. Redeploy the Render service (or it may pick up on next restart).

3. On Vercel, confirm `VITE_API_URL` points at the Render API.

4. Open the Vercel site → Register → create a gallery → upload a photo.

---

## 6. Checklist

- [ ] Postgres schema applied (`database/schema.sql`)
- [ ] Cloudinary keys set on Render
- [ ] `JWT_SECRET` is long and random
- [ ] Render `/api/health` works
- [ ] Vercel `VITE_API_URL` = `https://<render-host>/api`
- [ ] Render `CLIENT_URL` = `https://<vercel-host>`
- [ ] Register / login / upload / share work end-to-end

---

## Alternative: single service on Render only

If you prefer one URL (API + static SPA):

1. On your machine:
   ```bash
   cd client && npm install && npm run build && cd ..
   ```
2. Commit `client/dist` **or** set Render build command to:
   ```bash
   npm install && cd client && npm install && npm run build && cd ..
   ```
3. Start command: `npm start`
4. The Express server already serves `client/dist` and falls back to SPA routes.
5. Set `CLIENT_URL` to the same Render URL.
6. No Vercel needed; skip `VITE_API_URL` (frontend will call `/api` on same origin).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS errors | Set `CLIENT_URL` on Render to exact Vercel origin (https, no trailing slash) |
| API 404 from frontend | Check `VITE_API_URL` includes `/api` and was set **before** build |
| DB connection failed | Use pooled connection string; enable SSL (Neon/Supabase already do) |
| Uploads fail | Confirm Cloudinary env vars; check file size limits |
| Emails not sent | Without SMTP, links are printed in Render logs → Logs tab |
| Cold starts | Free Render sleeps; upgrade or use a keep-alive ping |

---

## Useful links

- Health: `https://<render>/api/health`
- Schema: `database/schema.sql`
- Env template: `.env.example`


## Admin-controlled public registration

CloudGallery supports an administrator-controlled public registration switch.

1. In your PostgreSQL database (the same database used by Render), run `database/migrations/2026-11-27-registration-settings.sql` once. This creates the persistent setting and defaults registration to OPEN. The same table/seed is also included in `database/schema.sql` for fresh installations.
2. In Render → your CloudGallery API service → Environment, add `ADMIN_EMAIL` with the exact email address of your existing CloudGallery administrator account. Do not use an email address that is not already controlled by you.
3. Redeploy/restart the Render service.
4. Sign in to CloudGallery using that account and open Dashboard. The administrator will see the **Public registration** control and can open or close registration.

When registration is closed, the backend rejects `POST /api/auth/register` with HTTP 403, even if a visitor calls the API directly. Existing users can still log in, verify email, reset passwords, and use shared galleries. The public gallery route does not show the **Get Started** registration button.

The admin check is enforced by the Render API using `ADMIN_EMAIL`; hiding the dashboard control in the browser is not the security boundary.
