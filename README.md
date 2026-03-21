# Cam AI Uncensored

Privacy-first, self-hostable conversational AI for iOS (free-first stack).

## Stack
- **Mobile:** Expo + React Native
- **API:** FastAPI (Python)
- **Model routing:** Ollama local (default), optional cloud fallback
- **Storage:** SQLite

## Monorepo
- `apps/mobile` – iOS app
- `apps/api` – FastAPI backend
- `packages/shared` – shared types/contracts
- `infra` – env and docker helpers
- `docs` – architecture notes

## Quick Start
### 1) API
```bash
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2) Mobile
```bash
cd apps/mobile
npm install
npx expo start
```

Set API URL in `apps/mobile/lib/config.ts`.

## MVP Features
- Chat UI with streaming-ready API interface
- `/health` and `/chat` endpoints
- Local model via Ollama (`llama3.1:8b` default)
- SQLite chat history

## Notes
This is a starter scaffold for educational/self-hosted use. You are responsible for lawful and safe deployment/use.
