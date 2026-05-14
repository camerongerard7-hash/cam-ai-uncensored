# Cam AI Uncensored

Privacy-first, self-hostable conversational AI (free-first stack).

## Stack
- **Web:** Single-file HTML/CSS/JS chat app (no build step, no dependencies)
- **Mobile:** Expo + React Native
- **API:** Express.js backend with Ollama model routing
- **AI:** Groq API (free tier) for cloud inference, Ollama for local models
- **Storage:** localStorage (web), JSON file (API)

## Monorepo
- `apps/web` – Standalone web chat app (Groq API powered)
- `apps/mobile` – iOS app
- `apps/api` – Express.js backend
- `infra` – env and docker helpers
- `docs` – architecture notes

## Quick Start

### Web App (Easiest)
Just open `apps/web/index.html` in any browser. No install, no build step.

- Real AI responses via Groq (Llama 3.3 70B, Mixtral, Gemma 2)
- Chat history saved in browser localStorage
- Customizable system prompt, temperature, max tokens
- Markdown rendering (code blocks, bold, lists)
- Mobile responsive with iOS safe area support
- Dark theme

### API Server
```bash
cd apps/api
npm install
node server.js
```

### Mobile
```bash
cd apps/mobile
npm install
npx expo start
```

Set API URL in `apps/mobile/lib/config.ts`.

## Features
- Chat UI with sidebar, multiple conversations, delete/new chat
- Model selector (Llama 3.3 70B, Llama 3.1 8B, Mixtral, Gemma 2)
- Settings panel: API key, system instructions, temperature, max tokens
- Markdown rendering (code blocks, bold, italic, lists)
- Copy button on AI responses
- Mobile responsive with hamburger menu
- Toast notifications for errors and status

## Notes
This is a starter scaffold for educational/self-hosted use. You are responsible for lawful and safe deployment/use.
