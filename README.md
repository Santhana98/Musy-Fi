
# 🎧 Musi-Fi

> **Your Music. Your Vibe.**  
> A lightweight, gorgeous, and fully self-hosted personal cloud music player. 

---

### ✨ Features
* ☁️ **Dual-Storage Streaming:** Stream directly from your own **Google Drive** or host audio files locally on the server.
* 🎥 **YouTube & Vimeo Imports:** Paste video links to instantly convert them into audio streams with auto-parsed thumbnails.
* 📱 **PWA Standalone App:** Install it as a native app on your phone, home screen, or tablet.
* 🎨 **Aesthetic Dark Mode:** Sleek lofi cassette backgrounds with energetic Musi-Fi crimson-red (`#D62828`) highlights.
* 🔒 **Secure Auth:** Direct credentials account login with secure password reset options.

---

### 🛠️ Tech Stack
* **Frontend/Backend:** Next.js (React & Turbopack)
* **Database Manager:** Prisma
* **Database Engine:** SQLite (Local) / PostgreSQL (Cloud ready, e.g. Supabase)
* **Auth System:** Next-Auth

---

### 🚀 Quick Start (Local Setup)

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env.local` file in the root folder:
   ```env
   DATABASE_URL="file:./prisma/dev.db" # Or your cloud PostgreSQL URL
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="any-secure-random-key"
   ```

3. **Initialize Database & Run:**
   ```bash
   npx prisma db push
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to start jamming! 🎶
```
 

Your local repository is fully prepared, styled with your brand values (the bold **Musi-Fi red** and custom typography tags), and outfitted with a clean, high-impact `README.md` that is ready to present on GitHub! 

Please let me know if you need any assistance when setting up your Supabase credentials or deploying your live site to Vercel!
