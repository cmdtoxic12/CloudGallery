# ☁️ CloudGallery v2.1 — Modern Event Photo Gallery

React + Vite + Tailwind CSS + TypeScript frontend with Express + PostgreSQL + Cloudinary backend.

**Upload Once → Store Safely → Share One Link → Everyone Views**

## ✨ Features (v2.1)

### Core
- User authentication (Register / Login / JWT)
- Create event galleries (Public / Private / Password-protected)
- Multi-photo upload with drag & drop + progress
- Cloudinary storage + automatic thumbnails
- Responsive photo grid + full lightbox (keyboard nav)
- Shareable gallery links
- Favorites, view/download tracking
- Dark / Light theme
- Dashboard with storage & stats

### New in v2.1
- **Bulk ZIP download** — download selected photos or entire gallery as ZIP
- **Soft delete + Trash** — recover photos or permanently purge
- **Permanent Cloudinary cleanup** — gallery delete and purge remove assets from Cloudinary
- **Email verification** — token-based (SMTP or console log in dev)
- **Password reset** — forgot password + secure reset link
- **Edit gallery** — update name, description, location, date, visibility, password
- **Bulk select** — trash, restore, purge, or download multiple photos

## 🛠 Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 19, Vite, TypeScript, Tailwind CSS, TanStack Query, Zustand |
| Backend    | Node.js + Express.js |
| Database   | PostgreSQL (Supabase / Neon / local) |
| Storage    | Cloudinary |
| Auth       | JWT + bcrypt |
| Email      | Nodemailer (SMTP optional) |
| ZIP        | archiver |

## 🚀 Quick Start

```bash
cd cloud-gallery
npm install
cd client && npm install && cd ..

cp .env.example .env
# Set DATABASE_URL, JWT_SECRET, Cloudinary keys
# Optional: SMTP_* for real emails

psql $DATABASE_URL -f database/schema.sql

npm run dev:server   # :5000
npm run dev:client   # :5173 (proxies /api)
```

## 📡 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register (+ send verification; blocked when public registration is closed) |
| GET | /api/settings/registration | Read public registration status |
| GET | /api/settings/admin | Read admin registration settings (admin only) |
| PUT | /api/settings/registration | Open/close public registration (admin only) |
| POST | /api/auth/verify-email | Verify email token |
| POST | /api/auth/forgot-password | Request reset link |
| POST | /api/auth/reset-password | Reset with token |
| POST | /api/photos/bulk-download | ZIP of selected / gallery |
| POST | /api/photos/bulk-delete | Soft-delete many |
| POST | /api/photos/purge | Permanent delete + Cloudinary |
| POST | /api/photos/restore | Restore from trash |
| PUT | /api/galleries/:id | Edit gallery |
| DELETE | /api/galleries/:id | Permanent delete gallery + assets |

## 🔐 Email setup

Without SMTP config, verification and reset emails are **logged to the server console** (dev-friendly).

To send real email, set in `.env`:

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_xxxx
EMAIL_FROM=CloudGallery <noreply@yourdomain.com>
CLIENT_URL=https://your-frontend.com
```


## 🌐 Deployment (Vercel + Render)

See **[DEPLOY.md](./DEPLOY.md)** for step-by-step instructions:

1. Postgres (Neon / Supabase) + run `database/schema.sql`
2. Cloudinary keys
3. **Render** → Web Service for the Express API
4. **Vercel** → Project with Root Directory = `client`, env `VITE_API_URL=https://your-api.onrender.com/api`
5. Set Render `CLIENT_URL` to your Vercel URL

## 📄 License

MIT
