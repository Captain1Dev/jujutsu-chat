# JutsuChat

Random peer-to-peer video chat with real-time hand tracking and gesture-based spells.

## Stack

- **Frontend:** React (Vite) + Tailwind CSS + MediaPipe Hands
- **Signaling:** Node.js + Express + Socket.io
- **Video:** WebRTC + Data Channels

## Local development

```bash
# Terminal 1 — signaling server
cd server
npm install
npm start

# Terminal 2 — React client
cd client
npm install
cp .env.example .env
npm run dev
```

Open two tabs at `http://localhost:5173`.

### Cast Fireball

Within 3 seconds, perform:

1. **Tiger** — index finger only
2. **Bird** — open palm
3. **Dragon** — peace sign

## Deploy to Vercel (frontend)

This repo is configured for Vercel via `vercel.json`.

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Use these settings (auto-detected from `vercel.json`):
   - **Install Command:** `npm install --prefix client`
   - **Build Command:** `npm run build --prefix client`
   - **Output Directory:** `client/dist`
4. Add environment variable:
   - `VITE_SERVER_URL` = your signaling server URL (see below)

> **Note:** Vercel hosts the static React app only. The Socket.io signaling server must run elsewhere (Render, Railway, Fly.io, etc.).

## Deploy signaling server (Render)

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect this GitHub repo
3. Set **Root Directory** to `server`
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. Add environment variable:
   - `CLIENT_ORIGIN` = `https://your-app.vercel.app` (comma-separate multiple origins if needed)

Or use the included `render.yaml` blueprint.

## Environment variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SERVER_URL` | Vercel (client) | Signaling server URL |
| `CLIENT_ORIGIN` | Render (server) | Allowed frontend origin(s) |
| `PORT` | Render (server) | Server port (Render sets automatically) |

## Project structure

```
jujutsu-chat/
├── client/          # React frontend (deploy to Vercel)
├── server/          # Socket.io signaling (deploy to Render)
├── vercel.json      # Vercel configuration
└── render.yaml      # Render blueprint for server
```
