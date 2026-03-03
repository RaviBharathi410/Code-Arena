# Voice Activated Code Battle Arena

A production-grade, real-time competitive coding platform featuring voice-to-code interaction, handwriting recognition, and AI-based ranking.

## Features
- **Real-time Battles**: Low-latency code synchronization using Socket.IO.
- **Voice-to-Code**: Advanced speech recognition to generate code snippets.
- **Handwriting Recognition**: AI-powered OCR for handwritten code on canvas.
- **Tournament System**: Automated bracket management and global leaderboards.
- **Sandboxed Execution**: Secure code execution via Judge0 API.
- **Gamification**: XP, Levels, and collectible badges.

## Tech Stack
- **Frontend**: React, Monorepo, Socket.IO Client, Monaco Editor, Framer Motion.
- **Backend**: Node.js, Express, Socket.IO, PostgreSQL, Drizzle ORM.
- **AI Service**: Python, FastAPI, TensorFlow/PyTorch.
- **Infrastructure**: Redis (Caching/Matchmaking), Docker (Sandboxing).

## Getting Started
1. Run `npm install` in the root.
2. Setup PostgreSQL and update `.env` in `apps/server`.
3. Run `npm run dev` to start both frontend and backend.
