# ☁️ CloudGalary — Cloud Event Photo Gallery & Sharing Platform

A modern cloud-based photo gallery platform where users can upload, organize, preserve, view, and share high-quality event photographs through simple links.

**Upload Once → Store Safely → Share One Link → Everyone Views**

---

## ✨ Features

- ✅ User authentication (Register / Login / JWT)
- ✅ Create event galleries (Public / Private / Password-protected)
- ✅ Multi-photo upload with drag & drop + progress
- ✅ Cloudinary cloud image storage + automatic thumbnails
- ✅ Beautiful responsive photo grid + lightbox viewer
- ✅ Shareable gallery links + WhatsApp share
- ✅ Favorites, download tracking, view analytics
- ✅ Dark / Light theme
- ✅ Mobile-first responsive UI
- ✅ Dashboard with storage & stats

---

## 🛠 Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | HTML5, CSS3, Vanilla JavaScript     |
| Backend      | Node.js + Express.js                |
| Database     | PostgreSQL (or Supabase)            |
| Storage      | Cloudinary                          |
| Auth         | JWT + bcrypt                        |
| Deployment   | Render / Railway (API) + any static host |

---

## 📁 Project Structure

```
cloudgalary/
├── client/                 # Frontend (static)
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── create-gallery.html
│   ├── gallery.html
│   ├── css/
│   └── js/
├── server/                 # Backend API
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   └── routes/
├── database/
│   └── schema.sql
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 Local Development Setup

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database (local or [Supabase](https://supabase.com) free tier)
- Free [Cloudinary](https://cloudinary.com) account

### 2. Clone / Extract & Install

```bash
cd cloudgalary
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5500

JWT_SECRET=change_this_to_a_long_random_string_at_least_32_chars
JWT_EXPIRES_IN=7d

DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

MAX_FILE_SIZE_MB=15
MAX_FILES_PER_UPLOAD=20
```

### 4. Initialize Database

Connect to your PostgreSQL database and run the schema:

```bash
psql $DATABASE_URL -f database/schema.sql
```

Or in Supabase: open the SQL Editor and paste the contents of `database/schema.sql`.

### 5. Start the Server

```bash
npm run dev
# or
npm start
```

API runs at: `http://localhost:5000`

### 6. Serve the Frontend

Open the `client/` folder with any static server, for example:

```bash
# Using VS Code Live Server extension, or:
npx serve client -p 5500
```

Open `http://localhost:5500` in your browser.

> The frontend automatically points to `http://localhost:5000/api` when running on localhost.

---

## 🌐 Production Deployment

### Option A — Single Server (Recommended for simplicity)

Deploy the whole project to **Render**, **Railway**, or **Fly.io**.

1. Push the repo to GitHub.
2. Create a new Web Service.
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add all environment variables from `.env`.
6. Run the schema SQL once against your production database.
7. The Express server will serve both the API (`/api/*`) and the static frontend.

### Option B — Split Frontend / Backend

**Backend (Render / Railway):**
- Root directory: project root
- Start: `npm start`
- Add env vars (especially `CLIENT_URL` = your frontend URL)

**Frontend (Netlify / Vercel / Cloudflare Pages):**
- Publish directory: `client`
- In `client/js/api.js` the API base automatically becomes `/api` when not on localhost.
- If frontend and backend are on different domains, update `API_BASE` in `api.js` to your backend URL, e.g.:

```js
const API_BASE = 'https://your-api.onrender.com/api';
```

Also add your frontend domain to the CORS allowed origins in `server/server.js`.

### Database

- **Supabase** (easiest): Create a free project → copy the connection string → paste into `DATABASE_URL`.
- Or any managed PostgreSQL (Neon, Railway, Render Postgres, etc.).

### Cloudinary

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Dashboard → copy Cloud Name, API Key, API Secret
3. Paste into environment variables

---

## 📡 Main API Endpoints

| Method | Endpoint                        | Auth | Description                |
|--------|---------------------------------|------|----------------------------|
| POST   | /api/auth/register              | No   | Create account             |
| POST   | /api/auth/login                 | No   | Login                      |
| GET    | /api/auth/me                    | Yes  | Current user               |
| GET    | /api/galleries                  | Yes  | List my galleries          |
| POST   | /api/galleries                  | Yes  | Create gallery             |
| GET    | /api/galleries/slug/:slug       | Opt  | Public gallery by slug     |
| GET    | /api/galleries/stats            | Yes  | Dashboard stats            |
| POST   | /api/photos/upload              | Yes  | Upload photos (multipart)  |
| GET    | /api/photos/gallery/:galleryId  | Opt  | List photos                |
| DELETE | /api/photos/:id                 | Yes  | Soft-delete photo          |
| POST   | /api/photos/:id/favorite        | Yes  | Toggle favorite            |

---

## 🔐 Security Notes

- Passwords are hashed with bcrypt (cost 12)
- JWT tokens for protected routes
- File type + size validation on upload
- Rate limiting on auth endpoints
- Helmet security headers
- Never expose Cloudinary secrets in frontend code
- Private & password galleries enforced on the backend

---

## 📱 Usage Flow

1. Register / Login
2. Create a new Event Gallery
3. Upload photos (drag & drop supported)
4. Click **Share** → copy link or send via WhatsApp
5. Guests open the link and view / download photos (no account required for public galleries)

---

## 🧪 Quick Test Checklist

- [ ] Register a new user
- [ ] Login
- [ ] Create a public gallery
- [ ] Upload several photos
- [ ] Open the share link in an incognito window
- [ ] Create a password-protected gallery and unlock it
- [ ] Toggle dark mode
- [ ] Favorite a photo
- [ ] Download a photo

---

## 📄 License

MIT — feel free to use this project for learning or production.

---

**Built with ❤️ for photographers, schools, churches, wedding planners & families.**
