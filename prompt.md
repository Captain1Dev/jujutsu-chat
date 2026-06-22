Project: "JutsuChat" - AI-Powered Gesture Video Chat

Act as a Senior Full-Stack WebRTC and Computer Vision Engineer. We are building a web application that combines random peer-to-peer video chatting (like Omegle) with real-time hand tracking. Users will perform specific hand gesture sequences to cast "spells" (visual effects) that appear on both users' screens.

🛠️ Tech Stack

Frontend Framework: React (Vite) + Tailwind CSS

Signaling Server: Node.js + Express + Socket.io

Video/Audio: WebRTC (RTCPeerConnection) + WebRTC Data Channels (for syncing spells)

Hand Tracking: Google MediaPipe Hands (via @mediapipe/hands and @mediapipe/camera_utils)

Visual Effects: Canvas API / CSS overlays (Keep it simple for the MVP)

🏗️ Core Architecture & Mechanics

The Matchmaker: A Socket.io server that places users in a waiting pool and matches two unpartnered users into a private WebRTC room.

The Video Feed: Local video displays in a small corner; the stranger's video takes up the main screen.

The Tracking Loop: MediaPipe reads the local video feed at 30+ FPS.

The Gesture Engine: A heuristic function calculates angles/distances between landmarks to detect 3 basic signs: "Tiger" (hands clasped, index fingers up), "Bird" (palms facing down, thumbs linked), and "Dragon" (fingers interlocked).

The Spell State Machine: An array that pushes detected signs. If the sequence [Tiger -> Bird -> Dragon] is detected within a 3-second window, it triggers a "Fireball".

The Broadcast: Upon casting, the frontend renders a fireball GIF/animation and sends a {"type": "spell", "name": "fireball"} message across the WebRTC Data Channel so the stranger sees it too.

📝 Execution Plan

Do not write all the code at once. We will build this in 4 distinct phases. Acknowledge this prompt by replying with "I am ready. Let's begin Phase 1." and outline the file structure you plan to use. Wait for my command to proceed to each phase.

Phase 1: The Matchmaking & Signaling Server

Set up the Node.js/Socket.io server. Create logic for users to connect, join a "waiting" queue, get matched with another user, and exchange WebRTC SDP offers/answers and ICE candidates.

Phase 2: The React Frontend & WebRTC Connection

Build the React UI. Implement the webcam request, connect to the Socket.io server, handle the WebRTC handshake, and successfully stream local and remote video between two browser tabs. Include a "Next" button to disconnect and find a new stranger.

Phase 3: MediaPipe Hand Tracking

Integrate MediaPipe Hands into the local video feed. Draw the hand landmarks on a hidden canvas to verify it works. Write a gesture detection function that can identify "Open Palm" and "Closed Fist" as a starting proof-of-concept.

Phase 4: The Spell Engine & Data Channels

Build the State Machine to track sequences of gestures. Set up the WebRTC Data Channel. When a sequence is completed, trigger a CSS animation overlay on the video feed and send the event across the Data Channel so the peer sees it simultaneously.