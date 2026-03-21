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

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Cam AI</title>
  <style>
    body{font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;max-width:720px;margin:0 auto;padding:16px;background:#0b0b0c;color:#f5f5f5}
    .msg{padding:10px 12px;border-radius:10px;margin:8px 0;white-space:pre-wrap}
    .u{background:#1f2937}.a{background:#111827;border:1px solid #374151}
    input,button{font-size:16px}
    #row{display:flex;gap:8px;position:sticky;bottom:0;background:#0b0b0c;padding-top:10px}
    #t{flex:1;padding:12px;border-radius:10px;border:1px solid #374151;background:#111827;color:#fff}
    button{padding:12px 14px;border-radius:10px;border:0;background:#2563eb;color:white}
  </style>
</head>
<body>
  <h2>Cam AI Uncensored</h2>
  <div id="chat"></div>
  <div id="row"><input id="t" placeholder="Say something..." /><button id="s">Send</button></div>
  <script>
    const chat=document.getElementById('chat');
    const t=document.getElementById('t');
    const sid='iphone-'+Math.random().toString(36).slice(2,8);
    function add(role,text){const d=document.createElement('div');d.className='msg '+(role==='user'?'u':'a');d.textContent=(role==='user'?'You: ':'Cam: ')+text;chat.appendChild(d);window.scrollTo(0,document.body.scrollHeight);}
    async function send(){const m=t.value.trim();if(!m)return;add('user',m);t.value='';
      const r=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,message:m})});
      const j=await r.json();add('assistant',j.reply||'No reply');}
    document.getElementById('s').onclick=send;t.addEventListener('keydown',e=>{if(e.key==='Enter')send();});
  </script>
</body></html>`);
});

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
