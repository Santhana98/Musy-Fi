# 🎵 Musy-Fi

> **Your Music. Your Vibe.**
>
> A modern cloud-based music streaming platform that enables users to import, organize, and enjoy their personal music collection across devices with seamless playback, cloud storage integration, and Progressive Web App (PWA) support.

---

## 🌐 Live Services

| Service                 | Description                         | URL                                     |
| ----------------------- | ----------------------------------- | --------------------------------------- |
| Musy-Fi Web Application | Main music streaming platform       | https://musy-fi.onrender.com            |
| Musy-Fi Import API      | Media import and processing service | https://musy-fi-import-api.onrender.com |

---

## ✨ Key Features

### 🎵 Music Streaming & Library Management

* Personal music library management
* Playlist creation and organization
* Instant search and song discovery
* Responsive playback controls

### ☁️ Cloud Storage Integration

* Stream music directly from Google Drive
* Secure cloud-based media storage
* Personal library synchronization

### 🎥 Media Import System

* Import media from supported video platforms
* Automatic metadata extraction
* Thumbnail generation and management
* Background processing through dedicated Import API

### 📱 Progressive Web App (PWA)

* Installable on desktop and mobile devices
* App-like user experience
* Home screen support
* Optimized mobile interface

### 🔐 Authentication & Security

* Secure user authentication
* Account management
* Password reset functionality
* Protected user libraries and playlists

### 🎨 Modern User Experience

* Dark-themed music interface
* Mobile-first responsive design
* Fast and lightweight performance
* Optimized playback experience

---

## 🏗️ System Architecture

### Frontend

* Next.js
* React
* TypeScript
* Turbopack

### Backend

* Next.js API Routes
* Prisma ORM
* RESTful Services

### Database

* SQLite (Development)
* PostgreSQL (Production)

### Authentication

* NextAuth.js

### Cloud Services

* Google Drive Integration
* Render Deployment Platform

---

## 🚀 Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secure-random-secret"
```

### 3. Initialize Database

```bash
npx prisma db push
```

### 4. Start Development Server

```bash
npm run dev
```

Visit:

http://localhost:3000

to access the application locally.

---

## 📌 Project Status

Musy-Fi is actively under development with ongoing improvements focused on:

* Media import performance
* Cloud storage integration
* Background playback reliability
* Mobile experience enhancements
* Streaming performance optimization
* User experience and interface improvements

---

## 🤝 Contributing

Contributions, feature requests, and bug reports are welcome. Please create an issue or submit a pull request to help improve Musy-Fi.

---

## 📄 License

This project is intended for personal and educational use. Please ensure compliance with the terms of service of any third-party platforms or services integrated with the application.

<!-- deploy trigger: 2026-06-12 11:42 UTC -->
