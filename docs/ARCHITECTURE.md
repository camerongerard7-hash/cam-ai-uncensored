# Architecture

- Mobile app sends messages to FastAPI `/chat`
- API stores messages in SQLite
- API forwards prompt to Ollama local model
- Response returned to mobile and persisted

Future upgrades:
- streaming responses
- auth
- retrieval memory
- push notifications for follow-ups
