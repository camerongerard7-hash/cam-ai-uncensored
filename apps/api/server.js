import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const DB_FILE = './messages.json';

const load = () => {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return []; }
};
const save = (rows) => fs.writeFileSync(DB_FILE, JSON.stringify(rows));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/chat', async (req, res) => {
  const { session_id = 'default', message = '' } = req.body || {};
  if (!message.trim()) return res.status(400).json({ error: 'message required' });

  const rows = load();
  rows.push({ session_id, role: 'user', content: message, ts: Date.now() });

  const context = rows.filter(r => r.session_id === session_id).slice(-10);
  const prompt = context.map((m) => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';

  let reply = 'Model backend unavailable. Please verify Ollama is running.';
  try {
    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false })
    });
    if (r.ok) {
      const data = await r.json();
      reply = data.response || reply;
    }
  } catch {}

  rows.push({ session_id, role: 'assistant', content: reply, ts: Date.now() });
  save(rows);
  res.json({ reply });
});

app.listen(PORT, () => console.log(`Cam API running on http://localhost:${PORT}`));
