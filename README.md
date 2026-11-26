# JutsuChat

**Random peer-to-peer video chat where you cast spells with your hands.**

Get matched with a stranger, then perform a sequence of hand signs on camera (e.g. *Tiger → Bird → Dragon*). The browser recognizes the signs in real time with computer vision, and the spell effect appears on **both** users' screens instantly.

![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![WebRTC](https://img.shields.io/badge/WebRTC-333333?logo=webrtc&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe_Hands-0097A7?logo=google&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socketdotio&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)

## How it works

```
 Browser A                       Signaling server                      Browser B
 ─────────                       ────────────────                      ─────────
 camera ─► MediaPipe Hands       Socket.io matchmaker                  camera ─► MediaPipe Hands
           │ 21 landmarks/hand   (FIFO queue → private room)                     │
           ▼                     relays offer / answer / ICE                     ▼
 gesture scorer ─► stabilizer ─► spell engine                          gesture scorer ─► ...
                                     │
                                     └──── WebRTC data channel ("spells") ────►  effect overlay
 ◄════════════════════ peer-to-peer audio/video (WebRTC) ════════════════════►
```

- **Matchmaking & signaling** — A Node/Socket.io server keeps a FIFO waiting queue, pairs users into private rooms, assigns offerer/answerer roles, and relays SDP offers/answers and ICE candidates. A **Next** button tears down the room and re-queues both users. Media never touches the server.
- **Gesture recognition** — Each frame, MediaPipe returns 21 3D landmarks per hand. Custom scorers compute a confidence for every sign from finger extension/curl, knuckle orientation, and two-hand geometry (interlocking fingers for *Snake*, horns for *Ram*, etc.). A sign only wins if it clears a minimum score **and** beats the runner-up by a margin.
- **Noise filtering** — A frame-based stabilizer requires a sign to persist for ~10 frames before it's confirmed and ~6 frames before it's released, so jittery tracking doesn't produce false casts.
- **Spell engine** — A small state machine matches confirmed signs against multiple recipes at once within a 3-second window, de-duplicating held signs, and prunes recipes as the sequence diverges.
- **Real-time sync** — When a spell completes, it's broadcast over an ordered WebRTC data channel so both peers render the effect together with no server round-trip.

## Spells

| Spell | Sequence |
|-------|----------|
| 🔥 Fireball | Tiger → Bird → Dragon |
| 🌊 Water Dragon | Tiger → Snake → Ram |
| 🪨 Earth Wall | Boar → Dragon → Bird |

## Stack

- **Frontend:** React 19 (Vite) + Tailwind CSS + MediaPipe Hands
- **Signaling:** Node.js + Express + Socket.io
- **Video:** WebRTC (`RTCPeerConnection`) + Data Channels
- **Hosting:** Vercel (client) + Render (signaling server)

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
