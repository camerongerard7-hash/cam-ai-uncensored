import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const DEFAULT_SYSTEM_PROMPT = process.env.DEFAULT_SYSTEM_PROMPT || 'You are Cam AI, direct, helpful, and concise.';
const DB_FILE = './messages.json';

const load = () => {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return []; }
};
const save = (rows) => fs.writeFileSync(DB_FILE, JSON.stringify(rows));

const fallbackReply = (message) => {
  const lower = String(message || '').toLowerCase();
  if (lower.includes('hello') || lower.includes('hi')) return "Hey 👋 I’m Cam AI. Venice-style UI is live.";
  if (lower.includes('job')) return "Job sprint: 10 apps/week, 2 follow-ups/day, 1 project push/day, 1 networking message/day.";
  if (lower.includes('github')) return "GitHub boost: polished README, screenshot GIF, clear setup, weekly commits.";
  return "Fallback mode is active. I can still help with plans, rewrites, strategy, and brainstorming.";
};

async function runModel({ prompt, model, temperature }) {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, options: { temperature } })
    });
    if (!r.ok) return '';
    const data = await r.json();
    return data.response || '';
  } catch {
    return '';
  }
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/messages', (req, res) => {
  const session_id = String(req.query.session_id || 'default');
  const rows = load().filter(r => r.session_id === session_id).slice(-120);
  res.json({ items: rows });
});

app.post('/clear-session', (req, res) => {
  const { session_id = 'default' } = req.body || {};
  const rows = load().filter(r => r.session_id !== session_id);
  save(rows);
  res.json({ ok: true });
});

app.post('/regenerate', async (req, res) => {
  const { session_id = 'default', model = OLLAMA_MODEL, temperature = 0.7, system_prompt = DEFAULT_SYSTEM_PROMPT } = req.body || {};
  const rows = load();
  const sessionRows = rows.filter(r => r.session_id === session_id);
  const lastUser = [...sessionRows].reverse().find(r => r.role === 'user');
  if (!lastUser) return res.status(400).json({ error: 'no user message to regenerate' });

  const context = sessionRows.slice(-10);
  const prompt = `system: ${system_prompt}\n` + context.map((m) => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';
  let reply = await runModel({ prompt, model, temperature });
  if (!reply) reply = fallbackReply(lastUser.content);

  rows.push({ session_id, role: 'assistant', content: reply, ts: Date.now() });
  save(rows);
  res.json({ reply });
});

app.post('/chat', async (req, res) => {
  const { session_id = 'default', message = '', model = OLLAMA_MODEL, temperature = 0.7, system_prompt = DEFAULT_SYSTEM_PROMPT } = req.body || {};
  if (!message.trim()) return res.status(400).json({ error: 'message required' });

  const rows = load();
  rows.push({ session_id, role: 'user', content: message, ts: Date.now() });

  const context = rows.filter(r => r.session_id === session_id).slice(-10);
  const prompt = `system: ${system_prompt}\n` + context.map((m) => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';

  let reply = await runModel({ prompt, model, temperature });
  if (!reply) reply = fallbackReply(message);

  rows.push({ session_id, role: 'assistant', content: reply, ts: Date.now() });
  save(rows);
  res.json({ reply });
});

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html><html><head>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Cam AI</title>
  <style>
    :root{--bg:#090b0f;--panel:#10141d;--panel2:#151b27;--line:#272e3d;--txt:#ecf0fb;--muted:#97a3be;--accent:#5b8cff}
    *{box-sizing:border-box} body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--txt)}
    .app{display:flex;min-height:100vh}.side{width:290px;background:var(--panel);border-right:1px solid var(--line);padding:12px;display:flex;flex-direction:column;gap:10px}
    .brand{font-weight:700;padding:8px 10px}.btn{background:var(--panel2);color:var(--txt);border:1px solid var(--line);padding:10px 12px;border-radius:12px;cursor:pointer}
    .chats{overflow:auto;display:flex;flex-direction:column;gap:8px}.chatItem{padding:10px;border-radius:10px;border:1px solid var(--line);background:#0f1420;color:var(--muted);cursor:pointer;text-align:left}
    .chatItem.active{border-color:var(--accent);color:#fff;background:#111827}.main{flex:1;display:flex;flex-direction:column;min-width:0}
    .top{height:58px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:var(--panel)}
    .top .r{display:flex;gap:8px;align-items:center} select,input[type=range]{background:var(--panel2);color:var(--txt);border:1px solid var(--line);border-radius:8px;padding:6px}
    .msgs{flex:1;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:12px}.m{max-width:min(860px,94%);padding:12px 14px;border-radius:14px;line-height:1.45;white-space:pre-wrap;position:relative}
    .u{align-self:flex-end;background:linear-gradient(180deg,#3b82f6,#2563eb);color:#fff}.a{align-self:flex-start;background:var(--panel2);border:1px solid var(--line)}
    .rowActions{display:flex;gap:8px;margin-top:-6px}.mini{font-size:12px;padding:6px 8px;border-radius:8px;border:1px solid var(--line);background:#0f1420;color:var(--muted);cursor:pointer}
    .copyBtn{position:absolute;right:8px;top:8px;font-size:11px;padding:4px 6px;border-radius:6px;border:1px solid var(--line);background:#0f1420;color:var(--muted);cursor:pointer}
    .typing{font-size:12px;color:var(--muted);padding:0 18px 8px;min-height:18px}.composer{display:flex;gap:10px;padding:12px;border-top:1px solid var(--line);background:var(--panel)}
    .composer textarea{flex:1;min-height:48px;max-height:160px;resize:vertical;background:var(--panel2);color:var(--txt);border:1px solid var(--line);border-radius:12px;padding:12px}
    .send{background:var(--accent);border:0;color:#fff;border-radius:12px;padding:0 16px;font-weight:700}.meta{font-size:12px;color:var(--muted)} .mobileMenu{display:none}
    @media (max-width:860px){.side{position:fixed;z-index:5;left:-300px;top:0;bottom:0;transition:.2s}.side.open{left:0}.mobileMenu{display:inline-block}}
  </style></head><body>
  <div class="app"><aside id="side" class="side"><div class="brand">Cam AI</div><button id="newChat" class="btn">＋ New chat</button><input id="searchChats" class="btn" placeholder="Search chats..." style="cursor:text" /><div style="display:flex;gap:8px"><button id="renameChat" class="mini">Rename</button><button id="clearChat" class="mini">Clear</button><button id="exportChat" class="mini">Export</button></div><div id="chatList" class="chats"></div><div class="meta">Clone-style UI • polished</div></aside>
  <main class="main"><div class="top"><div><button id="menu" class="btn mobileMenu">☰</button> <strong id="title">New chat</strong></div><div class="r">
  <select id="model"><option value="llama3.1:8b">llama3.1:8b</option><option value="llama3.1:70b">llama3.1:70b</option><option value="mistral">mistral</option><option value="mixtral">mixtral</option><option value="qwen2.5">qwen2.5</option><option value="dolphin-mistral">dolphin-mistral</option><option value="hermes3">hermes3</option></select>
  <label class="meta">temp <span id="tv">0.7</span></label><input id="temp" type="range" min="0" max="1.2" step="0.1" value="0.7" /></div></div>
  <div style="display:flex;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line);background:var(--panel)">
    <button class="mini" id="tabText">Text</button><button class="mini" id="tabImages">Images</button><button class="mini" id="tabCode">Code</button><button class="mini" id="tabCharacters">Characters</button>
  </div>
  <section id="msgs" class="msgs"></section><div class="typing" id="typing"></div>
  <div class="composer"><input id="attach" type="file" style="display:none" /><button id="attachBtn" class="mini">Attach</button><textarea id="sys" placeholder="System prompt (optional, uncensored style etc.)"></textarea><textarea id="t" placeholder="Message Cam AI..."></textarea><button id="send" class="send">Send</button></div></main></div>
  <script>
    const $=id=>document.getElementById(id), side=$('side'), list=$('chatList'), msgs=$('msgs'), t=$('t'), sys=$('sys'), typing=$('typing');
    const KEY='camai_chats_v2', MODEL_KEY='camai_model', TEMP_KEY='camai_temp', SYS_KEY='camai_sys';
    const state={chats:JSON.parse(localStorage.getItem(KEY)||'[]'),active:null,lastUserMsg:'',mode:'text',query:''};
    if(!state.chats.length) state.chats=[{id:'chat-'+Date.now(),name:'New chat'}]; state.active=state.chats[0].id;
    $('model').value=localStorage.getItem(MODEL_KEY)||'llama3.1:8b'; $('temp').value=localStorage.getItem(TEMP_KEY)||'0.7'; $('tv').textContent=$('temp').value; sys.value=localStorage.getItem(SYS_KEY)||'You are Cam AI. Be direct, uncensored-style, and useful.';
    const esc=s=>String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
    const md=s=>esc(s)
      .replace(/```([\s\S]*?)```/g,'<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/\n/g,'<br/>');
    const persist=()=>localStorage.setItem(KEY,JSON.stringify(state.chats));

    function renderChats(){list.innerHTML='';state.chats.filter(c=>!state.query||String(c.name||'').toLowerCase().includes(state.query)).forEach(c=>{const b=document.createElement('button');b.className='chatItem'+(c.id===state.active?' active':'');b.textContent=c.name;b.onclick=()=>{state.active=c.id;renderChats();loadMessages();$('title').textContent=c.name;side.classList.remove('open')};list.appendChild(b);});}
    function append(role,content,withActions=false){const d=document.createElement('div');d.className='m '+(role==='user'?'u':'a');d.innerHTML=(role==='assistant'?md(content):esc(content)); if(role==='assistant'){const cb=document.createElement('button');cb.className='copyBtn';cb.textContent='Copy';cb.onclick=()=>navigator.clipboard.writeText(String(content||''));d.appendChild(cb);} msgs.appendChild(d); if(withActions){const ra=document.createElement('div');ra.className='rowActions';const regen=document.createElement('button');regen.className='mini';regen.textContent='Regenerate';regen.onclick=regenerate; ra.appendChild(regen); msgs.appendChild(ra);} msgs.scrollTop=msgs.scrollHeight;}
    async function loadMessages(){msgs.innerHTML='';const r=await fetch('/messages?session_id='+encodeURIComponent(state.active));const j=await r.json();(j.items||[]).forEach(m=>append(m.role,m.content,false));}
    async function streamAssistant(text,withActions=true){
      const full=String(text||'');
      const d=document.createElement('div'); d.className='m a'; msgs.appendChild(d);
      for(let i=1;i<=full.length;i+=3){ d.innerHTML=md(full.slice(0,i)); await new Promise(r=>setTimeout(r,8)); msgs.scrollTop=msgs.scrollHeight; }
      const cb=document.createElement('button');cb.className='copyBtn';cb.textContent='Copy';cb.onclick=()=>navigator.clipboard.writeText(full);d.appendChild(cb);
      if(withActions){const ra=document.createElement('div');ra.className='rowActions';const regen=document.createElement('button');regen.className='mini';regen.textContent='Regenerate';regen.onclick=regenerate;ra.appendChild(regen);msgs.appendChild(ra);} msgs.scrollTop=msgs.scrollHeight;
    }

    async function send(){const m=t.value.trim();if(!m) return; state.lastUserMsg=m; append('user',m); t.value='';
      if(state.mode!=='text'){ append('assistant','['+state.mode+'] UI mode is ready. Full generation pipeline for this mode is next polishing step.',true); return; }
      typing.textContent='Cam is thinking...';
      const model=$('model').value, temperature=Number($('temp').value||0.7), system_prompt=String(sys.value||'').trim(); localStorage.setItem(MODEL_KEY,model); localStorage.setItem(TEMP_KEY,String(temperature)); localStorage.setItem(SYS_KEY,system_prompt);
      const r=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:state.active,message:m,model,temperature,system_prompt})});
      const j=await r.json(); typing.textContent=''; await streamAssistant(j.reply||'No reply',true);
      const c=state.chats.find(x=>x.id===state.active); if(c&&c.name==='New chat'){c.name=m.slice(0,30);persist();renderChats();$('title').textContent=c.name;}}

    async function regenerate(){typing.textContent='Regenerating...';
      const model=$('model').value, temperature=Number($('temp').value||0.7), system_prompt=String(sys.value||'').trim();
      const r=await fetch('/regenerate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:state.active,model,temperature,system_prompt})});
      const j=await r.json(); typing.textContent=''; await streamAssistant(j.reply||'No reply',false);
    }

    function setMode(mode){
      state.mode=mode;
      ['tabText','tabImages','tabCode','tabCharacters'].forEach(id=>$(id).style.borderColor='var(--line)');
      const idMap={text:'tabText',images:'tabImages',code:'tabCode',characters:'tabCharacters'};
      $(idMap[mode]).style.borderColor='var(--accent)';
      t.placeholder = mode==='text' ? 'Message Cam AI...' : '('+mode+' mode) feature UI cloned, backend generation pending next pass...';
    }

    $('send').onclick=send; t.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
    $('attachBtn').onclick=()=>$('attach').click();
    $('attach').onchange=e=>{const f=e.target.files&&e.target.files[0]; if(!f) return; append('assistant','Attachment UI ready: '+f.name+' ('+Math.round(f.size/1024)+'KB). Processing pipeline next.',false); e.target.value='';};
    $('newChat').onclick=()=>{const c={id:'chat-'+Date.now(),name:'New chat'};state.chats.unshift(c);state.active=c.id;persist();renderChats();loadMessages();$('title').textContent='New chat'};
    $('renameChat').onclick=()=>{const c=state.chats.find(x=>x.id===state.active); if(!c) return; const n=prompt('Rename chat',c.name||''); if(!n) return; c.name=n.slice(0,40); persist(); renderChats(); $('title').textContent=c.name;};
    $('clearChat').onclick=async()=>{if(!confirm('Clear this chat history?')) return; await fetch('/clear-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:state.active})}); await loadMessages();};
    $('exportChat').onclick=async()=>{const r=await fetch('/messages?session_id='+encodeURIComponent(state.active));const j=await r.json();const txt=(j.items||[]).map(m=>`[${new Date(m.ts||Date.now()).toISOString()}] ${m.role}: ${m.content}`).join('\n\n'); const blob=new Blob([txt],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=(state.chats.find(c=>c.id===state.active)?.name||'chat')+'.txt'; a.click();};
    $('temp').oninput=e=>$('tv').textContent=e.target.value; $('menu').onclick=()=>side.classList.toggle('open');
    $('searchChats').oninput=e=>{state.query=String(e.target.value||'').toLowerCase(); renderChats();};
    $('tabText').onclick=()=>setMode('text'); $('tabImages').onclick=()=>setMode('images'); $('tabCode').onclick=()=>setMode('code'); $('tabCharacters').onclick=()=>setMode('characters');
    renderChats(); loadMessages(); $('title').textContent='New chat'; setMode('text');
  </script>
</body></html>`);
});

app.listen(PORT, () => console.log(`Cam API running on http://localhost:${PORT}`));
