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

app.get('/messages', (req, res) => {
  const session_id = String(req.query.session_id || 'default');
  const rows = load().filter(r => r.session_id === session_id).slice(-100);
  res.json({ items: rows });
});

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Cam AI</title>
  <style>
    :root{--bg:#0a0c10;--panel:#0f1218;--panel2:#131722;--line:#252b3a;--txt:#e8ecf8;--muted:#95a0b8;--accent:#5b8cff}
    *{box-sizing:border-box} body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--txt)}
    .app{display:flex;min-height:100vh}
    .side{width:280px;background:var(--panel);border-right:1px solid var(--line);padding:12px;display:flex;flex-direction:column;gap:10px}
    .brand{font-weight:700;letter-spacing:.2px;padding:6px 8px}
    .btn{background:var(--panel2);color:var(--txt);border:1px solid var(--line);padding:10px 12px;border-radius:10px;cursor:pointer}
    .chats{overflow:auto;display:flex;flex-direction:column;gap:8px}
    .chatItem{padding:10px;border-radius:10px;border:1px solid var(--line);background:#0d1118;color:var(--muted);cursor:pointer}
    .chatItem.active{border-color:var(--accent);color:#fff}
    .main{flex:1;display:flex;flex-direction:column;min-width:0}
    .top{height:56px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:var(--panel)}
    .top .r{display:flex;gap:8px;align-items:center}
    select,input[type=range]{background:var(--panel2);color:var(--txt);border:1px solid var(--line);border-radius:8px;padding:6px}
    .msgs{flex:1;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:12px}
    .m{max-width:min(820px,92%);padding:12px 14px;border-radius:14px;line-height:1.4;white-space:pre-wrap}
    .u{align-self:flex-end;background:linear-gradient(180deg,#3b82f6,#2563eb);color:#fff}
    .a{align-self:flex-start;background:var(--panel2);border:1px solid var(--line)}
    .typing{font-size:12px;color:var(--muted);padding:0 18px 8px}
    .composer{display:flex;gap:10px;padding:12px;border-top:1px solid var(--line);background:var(--panel)}
    .composer textarea{flex:1;min-height:44px;max-height:140px;resize:vertical;background:var(--panel2);color:var(--txt);border:1px solid var(--line);border-radius:12px;padding:12px}
    .send{background:var(--accent);border:0;color:#fff;border-radius:12px;padding:0 16px;font-weight:600}
    .meta{font-size:12px;color:var(--muted)}
    .mobileMenu{display:none}
    @media (max-width:840px){
      .side{position:fixed;z-index:5;left:-290px;top:0;bottom:0;transition:.2s}
      .side.open{left:0}
      .mobileMenu{display:inline-block}
    }
  </style>
</head>
<body>
  <div class="app">
    <aside id="side" class="side">
      <div class="brand">Cam AI</div>
      <button id="newChat" class="btn">＋ New chat</button>
      <div id="chatList" class="chats"></div>
      <div class="meta">Venice-style layout • mobile-ready</div>
    </aside>
    <main class="main">
      <div class="top">
        <div><button id="menu" class="btn mobileMenu">☰</button> <strong id="title">New chat</strong></div>
        <div class="r">
          <select id="model">
            <option value="llama3.1:8b">llama3.1:8b</option>
            <option value="mistral">mistral</option>
            <option value="qwen2.5">qwen2.5</option>
          </select>
          <label class="meta">temp <span id="tv">0.7</span></label>
          <input id="temp" type="range" min="0" max="1.2" step="0.1" value="0.7" />
        </div>
      </div>
      <section id="msgs" class="msgs"></section>
      <div id="typing" class="typing"></div>
      <div class="composer">
        <textarea id="t" placeholder="Message Cam AI..."></textarea>
        <button id="send" class="send">Send</button>
      </div>
    </main>
  </div>

<script>
  const $=id=>document.getElementById(id);
  const side=$('side'), list=$('chatList'), msgs=$('msgs'), t=$('t'), typing=$('typing');
  const KEY='camai_chats_v1';
  const state={chats:JSON.parse(localStorage.getItem(KEY)||'[]'),active:null};
  if(!state.chats.length){state.chats=[{id:'chat-'+Date.now(),name:'New chat'}]}
  state.active=state.chats[0].id;

  function persist(){localStorage.setItem(KEY,JSON.stringify(state.chats));}
  function esc(s){return String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));}
  function renderChats(){
    list.innerHTML='';
    state.chats.forEach(c=>{
      const d=document.createElement('button');d.className='chatItem'+(c.id===state.active?' active':'');d.textContent=c.name;d.onclick=()=>{state.active=c.id;renderChats();loadMessages();$('title').textContent=c.name;side.classList.remove('open')};
      list.appendChild(d);
    });
  }
  function append(role,content){
    const d=document.createElement('div');d.className='m '+(role==='user'?'u':'a');d.innerHTML=esc(content);msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;
  }
  async function loadMessages(){
    msgs.innerHTML='';
    const r=await fetch('/messages?session_id='+encodeURIComponent(state.active));
    const j=await r.json();
    (j.items||[]).forEach(m=>append(m.role,m.content));
  }

  async function send(){
    const m=t.value.trim(); if(!m) return;
    append('user',m); t.value=''; typing.textContent='Cam is thinking...';
    const model=$('model').value, temperature=Number($('temp').value||0.7);
    const r=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:state.active,message:m,model,temperature})});
    const j=await r.json();
    typing.textContent=''; append('assistant',j.reply||'No reply');

    const c=state.chats.find(x=>x.id===state.active);
    if(c && c.name==='New chat') { c.name=m.slice(0,28); persist(); renderChats(); $('title').textContent=c.name; }
  }

  $('send').onclick=send;
  t.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
  $('newChat').onclick=()=>{const c={id:'chat-'+Date.now(),name:'New chat'};state.chats.unshift(c);state.active=c.id;persist();renderChats();loadMessages();$('title').textContent='New chat'};
  $('temp').oninput=e=>$('tv').textContent=e.target.value;
  $('menu').onclick=()=>side.classList.toggle('open');

  renderChats(); loadMessages(); $('title').textContent='New chat';
</script>
</body></html>`);
});

app.post('/chat', async (req, res) => {
  const { session_id = 'default', message = '', model = OLLAMA_MODEL, temperature = 0.7 } = req.body || {};
  if (!message.trim()) return res.status(400).json({ error: 'message required' });

  const rows = load();
  rows.push({ session_id, role: 'user', content: message, ts: Date.now() });

  const context = rows.filter(r => r.session_id === session_id).slice(-10);
  const prompt = context.map((m) => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';

  let reply = '';
  try {
    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, options: { temperature } })
    });
    if (r.ok) {
      const data = await r.json();
      reply = data.response || '';
    }
  } catch {}

  if (!reply) {
    const lower = String(message || '').toLowerCase();
    if (lower.includes('hello') || lower.includes('hi')) reply = "Hey 👋 I’m Cam AI. Venice-style UI is now live.";
    else if (lower.includes('job')) reply = "Job sprint: 10 apps/week, 2 follow-ups/day, 1 project push/day, 1 networking message/day.";
    else if (lower.includes('github')) reply = "GitHub boost: polished README, screenshot GIF, clear setup, weekly commits.";
    else reply = "Fallback mode is active. I can still help with plans, rewrites, strategy, and brainstorming instantly.";
  }

  rows.push({ session_id, role: 'assistant', content: reply, ts: Date.now() });
  save(rows);
  res.json({ reply });
});

app.listen(PORT, () => console.log(`Cam API running on http://localhost:${PORT}`));
