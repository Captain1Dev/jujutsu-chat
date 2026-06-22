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

### Option A — Deploy from repo root (easiest)

| Setting | Value |
|---------|-------|
| **Root Directory** | *(leave blank)* |
| **Build Command** | `npm run build:server` |
| **Start Command** | `npm start` |

The `server/ $` prefix only appears when Root Directory is set to `server`. Leave it blank to avoid that UI.

### Option B — Deploy from `server` folder

| Setting | Value |
|---------|-------|
| **Root Directory** | `server` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

If Render shows `server/ $` before the input, that is just a label — type only `npm install` or `npm start` after the `$`.

### Environment variable (both options)

- `CLIENT_ORIGIN` = `https://your-app.vercel.app`

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
