# 🚂 MST Tengapal — Cloud Deployment Guide on Railway

This guide walks you through deploying **MST Tengapal Business Assistant** to [Railway](https://railway.com) in 5 minutes.

Once deployed, the app will run **24/7 on a secure public HTTPS domain** (e.g. `https://mst-tengapal-app-production-13910930.up.railway.app`), accessible from your iPhone anywhere without needing your Mac mini or any VPN.

---

## 🏗️ Cloud Architecture on Railway

```
[ iPhone / Safari (Anywhere) ]
               │
               ▼ (Public HTTPS)
┌────────────────────────────────────────────────────────┐
│  Railway Web Service                                   │
│  • React 19 Frontend (PWA standalone, Apple icons)     │
│  • NestJS Backend API (/api/*)                         │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────┐  ┌───────────────────────┐
│ Railway Managed PostgreSQL   │  │ Free Cloud AI (Groq)  │
│ • Automatic backups          │  │ • 300+ tokens/second  │
│ • 15 Malappuram areas seeded │  │ • LLaMA 3.3 70B       │
│ • Admin account ready        │  │ • Free tier ($0)      │
└──────────────────────────────┘  └───────────────────────┘
```

---

## ⚡ Deployment in 3 Easy Steps

### Step 1: Get a Free Groq Cloud AI Key (30 Seconds)
Since Railway does not have your Mac's M4 GPU, we use **Groq** for instant, free AI inference:
1. Go to **[console.groq.com](https://console.groq.com)** and sign in (with Google or GitHub).
2. Click **API Keys** $\rightarrow$ **Create API Key**.
3. Copy your key (starts with `gsk_...`).

*(Groq is 100% free with generous daily limits, running LLaMA 3.3 70B in under 0.4 seconds).*

---

### Step 2: Deploy to Railway via Web Dashboard (Recommended)

1. **Push your code to GitHub**:
   - Create a private repository on [GitHub](https://github.com).
   - Push your `mst-ai-assistant` folder to GitHub.

2. **Create a New Project on Railway**:
   - Go to **[railway.com](https://railway.com)** and log in with GitHub.
   - Click **"New Project"**.
   - Select **"Deploy from GitHub repo"** and choose your `mst-ai-assistant` repository.

3. **Add PostgreSQL Database**:
   - In your Railway project canvas, click **"New"** (or press `Cmd/Ctrl + K`).
   - Select **"Database"** $\rightarrow$ **"Add PostgreSQL"**.
   - Railway will provision your managed PostgreSQL database in seconds.

4. **Configure Environment Variables**:
   - Click on your application service card $\rightarrow$ Go to the **Variables** tab.
   - Add the following variables:
     | Variable | Value | Notes |
     | :--- | :--- | :--- |
     | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | *(Railway auto-fills this from the database!)* |
     | `NODE_ENV` | `production` | |
     | `JWT_SECRET` | `mst-tengapal-production-secret-2026` | *(Any long random string)* |
     | `APP_PIN` | `1234` | *(Your 4-digit mobile unlock code)* |
     | `QUICK_ACCESS_ENABLED` | `true` | *(Enables ⚡ One-Tap Quick Unlock)* |
     | `AI_PROVIDER` | `groq` | |
     | `GROQ_API_KEY` | `gsk_...` | *(The key from Step 1)* |
     | `AI_MODEL` | `qwen/qwen3.8-27b` | *(Fastest 27B model on Groq)* |

5. **Generate Public Domain**:
   - Go to the **Settings** tab of your application service.
   - Under **Networking** $\rightarrow$ Click **"Generate Domain"**.
   - Railway will assign a free public HTTPS URL (e.g. `https://mst-tengapal-production.up.railway.app`).

---

### Step 3: Open and Install on your iPhone

1. On your iPhone, open Safari and navigate to your Railway URL:
   `https://your-app-name.up.railway.app`
2. Tap the **Share** button in Safari $\rightarrow$ tap **"Add to Home Screen"** $\rightarrow$ tap **"Add"**.
3. Open the **MST Tengapal** app from your Home Screen.
4. Tap **"⚡ One-Tap Quick Unlock"** (or enter PIN `1234`).
5. You are live 24/7!

---

## 💻 Alternative: Deploying via Railway CLI

If you prefer deploying directly from your Mac terminal without pushing to GitHub first:

```bash
# 1. Install Railway CLI
brew install railway

# 2. Log in
railway login

# 3. Initialize project and link database
railway init
railway add --database postgres

# 4. Set your Groq API key and variables
railway variables set AI_PROVIDER=groq GROQ_API_KEY=gsk_your_key_here APP_PIN=1234

# 5. Deploy with one command!
railway up
```

---

## 🛡️ Automatic Database Seeding & Safety
When Railway builds the Docker image:
- `docker-entrypoint.sh` runs `npx prisma migrate deploy` automatically.
- It seeds the **15 Malappuram areas**, core products (200ml, 500g, 1kg), and the admin account `raihan`.
- It **never** creates fake customers or mock orders.
