/* Smart Livestock Disease Detection and Alert System
   Data layer works with localStorage OR Supabase (set keys in config.js). */
const C = window.APP_CONFIG || {};
const sb = (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) ? supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const ICON = {Cow:'🐄',Buffalo:'🐃',Goat:'🐐',Sheep:'🐑',Pig:'🐖',Horse:'🐎'};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS = (k, v) => v === undefined ? JSON.parse(localStorage.getItem('sl_' + k) || 'null') : localStorage.setItem('sl_' + k, JSON.stringify(v));
const day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- Data layer (same API for both backends) ---------- */
const db = {
  async all(t) {
    if (sb) { const {data, error} = await sb.from(t).select('*').order('created_at', {ascending:false}); if (error) throw error; return data; }
    return LS(t) || [];
  },
  async save(t, o) {
    if (sb) { const q = o.id ? sb.from(t).update(o).eq('id', o.id) : sb.from(t).insert(o); const {error} = await q; if (error) throw error; return; }
    const a = LS(t) || [];
    if (o.id) a[a.findIndex(x => x.id == o.id)] = o; else a.unshift({...o, id: uid(), created_at: new Date().toISOString()});
    LS(t, a);
  },
  async del(t, id) {
    if (sb) { const {error} = await sb.from(t).delete().eq('id', id); if (error) throw error; return; }
    LS(t, (LS(t) || []).filter(x => x.id != id));
  }
};

/* ---------- Sample data (seeded once) ---------- */
async function seed() {
  if ((await db.all('animals')).length || LS('seeded_' + (LS('session') || ''))) return;
  const h = (t, w, n) => [{date: day(-30), temp: t, weight: w - 4, note: 'Routine check'}, {date: day(-15), temp: t, weight: w - 2, note: 'Routine check'}, {date: day(-2), temp: t, weight: w, note: n}];
  const A = [
    ['C-101','Lakshmi','Cow',4,'Holstein Friesian','Female',520,'Barn A','FMD + HS',day(40),'Healthy',38.5,'Green fodder 20kg, concentrate 4kg',h(38.5,520,'Normal')],
    ['C-102','Gauri','Cow',5,'Gir','Female',430,'Barn A','FMD',day(-10),'Diseased',40.1,'Dry fodder 8kg, mineral mix',h(40.1,430,'Reduced milk, swelling')],
    ['B-201','Kali','Buffalo',6,'Murrah','Female',610,'Barn B','HS + BQ',day(25),'Healthy',38.2,'Green fodder 25kg, oil cake 3kg',h(38.2,610,'Normal')],
    ['B-202','Moti','Buffalo',3,'Jaffarabadi','Male',540,'Barn B','FMD',day(5),'Pending',38.9,'Green fodder 18kg',h(38.9,540,'Check due')],
    ['G-301','Chhoti','Goat',2,'Jamnapari','Female',45,'Shed 1','PPR',day(60),'Healthy',39.1,'Hay 2kg, grains 300g',h(39.1,45,'Normal')],
    ['G-302','Bitti','Goat',1,'Beetal','Female',28,'Shed 1','PPR',day(-5),'Pending',39.4,'Hay 1.5kg',h(39.4,28,'Vaccine overdue')],
    ['S-401','Dolly','Sheep',3,'Merino','Female',55,'Shed 2','Sheep pox',day(90),'Healthy',39.0,'Pasture + grains 400g',h(39,55,'Normal')],
    ['C-103','Radha','Cow',2,'Sahiwal','Female',310,'Barn A','FMD + HS',day(70),'Healthy',38.4,'Green fodder 15kg',h(38.4,310,'Normal')]
  ].map(([tag,name,type,age,breed,gender,weight,location,vaccine,next_vaccine,status,temp,feed,history]) => ({tag,name,type,age,breed,gender,weight,location,vaccine,next_vaccine,status,temp,feed,history}));
  const L = [
    ['C-102','Mastitis','High','Swelling and reduced milk. Consult a vet today.',-1,false],
    ['G-302','Peste des petits ruminants (PPR)','Medium','Fever and nasal discharge. Vaccine overdue.',-6,false],
    ['B-202','Mild Digestive Upset','Low','Appetite loss reported. Monitor 48h.',-20,true],
    ['C-101','Bovine Respiratory Disease','Medium','Coughing reported. Resolved after treatment.',-40,true],
    ['S-401','Mild Digestive Upset','Low','Loose stool. Resolved.',-70,true]
  ].map(([animal_tag,disease,risk,message,d,read]) => ({animal_tag,disease,risk,message,read,created_at:new Date(Date.now()+d*864e5).toISOString()}));
  if (sb) { await sb.from('animals').insert(A); await sb.from('alerts').insert(L); }
  else { LS('animals', A.map(a => ({...a, id: uid(), created_at: new Date().toISOString()}))); LS('alerts', L.map(a => ({...a, id: uid()}))); }
  LS('seeded_' + (LS('session') || ''), 1);
}

/* ---------- UI helpers ---------- */
function toast(m, bad) { const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = m; $('#toasts').append(t); setTimeout(() => t.remove(), 3500); }
function screen(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id == id)); window.scrollTo(0, 0); }
const profile = () => LS('profile') || {name:'Farmer', phone:'', farm:'', location:'', email: LS('session') || ''};
const ch = {};
function chart(id, type, data, opt = {}) { ch[id]?.destroy(); const el = $('#' + id); if (el) ch[id] = new Chart(el, {type, data, options: {responsive:true, maintainAspectRatio:false, ...opt}}); }
const PAL = ['#2f9e5b', '#e5484d', '#f5a524', '#3b82f6', '#8b5cf6', '#14b8a6'];
const pill = s => `<span class="pill ${s}">${s}</span>`;
let A = [];
const isDue = a => a.next_vaccine && a.next_vaccine < day(0);

/* ---------- Auth ---------- */
let mode = 'login';
function setMode(m) { mode = m; $('#tLogin').classList.toggle('on', m == 'login'); $('#tSignup').classList.toggle('on', m == 'signup'); $('#authBtn').textContent = m == 'login' ? 'Login' : 'Create account'; $('#authErr').textContent = ''; }
function togglePw() { const p = $('#pass'); p.type = p.type == 'password' ? 'text' : 'password'; }
$('#authForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('#email').value.trim(), pw = $('#pass').value, err = $('#authErr');
  if (!/^\S+@\S+\.\S+$/.test(email)) return err.textContent = 'Enter a valid email address.';
  if (pw.length < 6) return err.textContent = 'Password must be at least 6 characters.';
  try {
    if (sb) {
      const r = mode == 'login' ? await sb.auth.signInWithPassword({email, password: pw}) : await sb.auth.signUp({email, password: pw});
      if (r.error) throw r.error;
      if (!r.data.session) { toast('Check your email to confirm, then log in.'); return setMode('login'); }
    } else {
      const u = LS('users') || {};
      if (mode == 'signup') { if (u[email]) throw Error('Account already exists. Log in instead.'); u[email] = pw; LS('users', u); }
      else if (u[email] !== pw) throw Error('Wrong email or password. New here? Sign up first.');
    }
    enter(email);
  } catch (x) { err.textContent = x.message; }
});
async function enter(email) {
  LS('session', email);
  if (!LS('profile')) LS('profile', {name:'Farmer', phone:'', farm:'', location:'', email});
  try { await seed(); } catch (x) { toast('Database error: ' + x.message, true); }
  screen('appShell'); nav('dashboard');
}
async function logout() { if (sb) await sb.auth.signOut(); localStorage.removeItem('sl_session'); screen('authScreen'); toast('Logged out'); }

/* ---------- Navigation ---------- */
async function nav(v) {
  $$('#nav button[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v == v));
  try { A = await db.all('animals'); const al = await db.all('alerts'); const n = al.filter(a => !a.read).length; $('#badge').textContent = n || ''; await R[v](A, al); }
  catch (x) { toast(x.message, true); }
  window.scrollTo(0, 0);
}
const view = h => { $('#main').innerHTML = `<div class="view">${h}</div>`; };

/* ---------- 3. Dashboard ---------- */
const R = {};
R.dashboard = (a, al) => {
  const c = s => a.filter(x => x.status == s).length;
  const st = (ic, n, l) => `<div class="card stat"><div class="ic">${ic}</div><div><b>${n}</b><span>${l}</span></div></div>`;
  const qa = (ic, l, f) => `<button class="card qa" onclick="${f}"><div>${ic}</div>${l}</button>`;
  view(`<h2>Hello, ${esc(profile().name || 'Farmer')}! 👋</h2>
  <div class="grid">${st('🐾', a.length, 'Total livestock')}${st('💚', c('Healthy'), 'Healthy animals')}${st('🩺', c('Diseased'), 'Diseased animals')}${st('⏳', c('Pending'), 'Pending health checks')}</div>
  <div class="grid">${qa('➕', 'Add Livestock', 'animalForm()')}${qa('🔬', 'Detect Disease', "nav('detect')")}${qa('🐄', 'View Animals', "nav('animals')")}${qa('📊', 'View Reports', "nav('reports')")}</div>
  <div class="two"><div class="card"><h3>Livestock health overview</h3><div class="chartbox"><canvas id="c1"></canvas></div></div>
  <div class="card"><h3>Recent disease alerts</h3>${al.slice(0, 4).map(alertRow).join('') || '<p>No alerts yet.</p>'}</div></div>`);
  chart('c1', 'doughnut', {labels:['Healthy','Diseased','Pending'], datasets:[{data:[c('Healthy'), c('Diseased'), c('Pending')], backgroundColor:[PAL[0], PAL[1], PAL[2]]}]});
};
const alertRow = a => `<div class="row"><div class="grow"><b>${esc(a.animal_tag)} · ${esc(a.disease)}</b><small>${esc(a.message)} · ${new Date(a.created_at).toLocaleDateString()}</small></div>${pill(a.risk)}</div>`;

/* ---------- 4. Livestock management ---------- */
R.animals = a => view(`<div class="top"><h2>My Livestock</h2><button class="btn" onclick="animalForm()">➕ Add animal</button></div>
  <div class="animals">${a.map(x => `<div class="card animal"><div class="em">${ICON[x.type] || '🐾'}</div><h3>${esc(x.name)} <small>${esc(x.tag)}</small></h3>
  <p>${esc(x.type)} · ${esc(x.breed)} · ${esc(x.gender)} · ${esc(x.age)}y</p><p>${esc(x.weight)} kg · ${esc(x.location)}</p>
  <p>${pill(x.status)} ${isDue(x) ? '<span class="pill High">Vaccine due</span>' : ''}</p>
  <div class="acts"><button class="btn sm ghost" onclick="viewA('${x.id}')">View</button><button class="btn sm ghost" onclick="animalForm('${x.id}')">Edit</button><button class="btn sm red" onclick="delA('${x.id}')">Delete</button></div></div>`).join('') || '<p>No animals yet. Add your first one.</p>'}</div>`);

function animalForm(id) {
  const a = A.find(x => x.id == id) || {status:'Healthy', type:'Cow', gender:'Female'};
  const f = (k, l, t = 'text', r = '') => `<label>${l}<input name="${k}" type="${t}" step="any" value="${esc(a[k])}" ${r}></label>`;
  const sel = (k, l, o) => `<label>${l}<select name="${k}">${o.map(v => `<option ${a[k] == v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`;
  const m = $('#modal');
  m.innerHTML = `<form id="af"><h3>${id ? 'Edit' : 'Add'} livestock</h3><div class="grid2">${f('tag','Animal ID','text','required')}${f('name','Name','text','required')}
  ${sel('type','Type',Object.keys(ICON))}${sel('gender','Gender',['Female','Male'])}${f('age','Age (years)','number')}${f('breed','Breed')}${f('weight','Weight (kg)','number')}${f('location','Location')}
  ${f('vaccine','Vaccinations given')}${f('next_vaccine','Next vaccination','date')}${f('feed','Feeding info')}${sel('status','Health status',['Healthy','Pending','Diseased'])}</div>
  <div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn ghost" onclick="modal.close()">Cancel</button><button class="btn">Save animal</button></div></form>`;
  m.showModal();
  $('#af').onsubmit = async e => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target));
    ['age','weight'].forEach(k => o[k] = o[k] === '' ? null : +o[k]);
    o.next_vaccine = o.next_vaccine || null;
    if (a.id) { Object.assign(o, {id:a.id, temp:a.temp, history:a.history, created_at:a.created_at}); }
    else { o.temp = 38.5; o.history = [{date:day(0), temp:38.5, weight:o.weight, note:'Registered'}]; }
    try { await db.save('animals', o); m.close(); toast('Animal saved'); nav($('#nav .on')?.dataset.v || 'animals'); } catch (x) { toast(x.message, true); }
  };
}
function viewA(id) {
  const a = A.find(x => x.id == id);
  $('#modal').innerHTML = `<h3>${ICON[a.type]} ${esc(a.name)} (${esc(a.tag)}) ${pill(a.status)}</h3>
  <p>${esc(a.type)} · ${esc(a.breed)} · ${esc(a.gender)} · ${esc(a.age)}y · ${esc(a.weight)} kg · ${esc(a.location)}</p>
  <p><b>Vaccinations:</b> ${esc(a.vaccine)} (next: ${esc(a.next_vaccine || 'n/a')})</p><p><b>Feed:</b> ${esc(a.feed)}</p><h3 style="margin-top:12px">Health history</h3>
  ${(a.history || []).slice().reverse().map(h => `<div class="row"><div class="grow">${esc(h.date)} — ${esc(h.note)}</div><span>${esc(h.temp)}°C · ${esc(h.weight)}kg</span></div>`).join('')}
  <button class="btn" style="margin-top:12px" onclick="modal.close()">Close</button>`;
  $('#modal').showModal();
}
async function delA(id) { if (!confirm('Delete this animal record?')) return; try { await db.del('animals', id); toast('Animal deleted'); nav('animals'); } catch (x) { toast(x.message, true); } }

/* ---------- 5. Disease detection (SIMULATED) ---------- */
const DIS = [
  {n:'Mastitis', s:['milk','fever','swelling'], sev:'High', p:['Improve milking hygiene','Use teat dip after milking','Isolate affected animal']},
  {n:'Foot-and-Mouth Disease', s:['fever','lesions','appetite','drooling'], sev:'High', p:['Isolate immediately','Restrict farm movement','Disinfect shed','Vaccinate herd']},
  {n:'Lumpy Skin Disease', s:['lesions','fever','swelling'], sev:'High', p:['Isolate animal','Control flies and ticks','Report to local vet office']},
  {n:'Bovine Respiratory Disease', s:['cough','fever','appetite','drooling'], sev:'Medium', p:['Improve ventilation','Reduce overcrowding','Keep animal warm and dry']},
  {n:'Mild Digestive Upset', s:['appetite','diarrhea'], sev:'Low', p:['Provide clean water','Adjust feed gradually','Monitor for 48 hours']}
];
const SYM = {fever:'Fever', appetite:'Loss of appetite', cough:'Coughing', lesions:'Skin lesions', milk:'Reduced milk production', diarrhea:'Diarrhea', swelling:'Swelling', drooling:'Drooling'};
/* Replace with a real model: set ML_API_URL in config.js. Expected JSON reply:
   {disease, confidence, severity, symptoms:[], prevention:[]} (e.g. Flask POST /predict) */
async function predict(sel, file) {
  if (C.ML_API_URL && file) {
    try { const fd = new FormData(); fd.append('image', file); fd.append('symptoms', sel.join(',')); const j = await (await fetch(C.ML_API_URL, {method:'POST', body:fd})).json(); return {...j, simulated:false}; }
    catch { toast('ML API unreachable. Using simulation.', true); }
  }
  const best = DIS.map(d => ({d, m: d.s.filter(x => sel.includes(x)).length})).sort((x, y) => y.m - x.m)[0];
  const conf = Math.min(94, Math.round(50 + 40 * (best.m / best.d.s.length) * (best.m / sel.length)));
  return {disease:best.d.n, confidence:conf, severity:best.d.sev, symptoms:sel.map(s => SYM[s]), prevention:best.d.p, simulated:true};
}
R.detect = a => {
  view(`<h2>Disease Detection</h2><div class="sim">⚠️ <b>Simulated prototype.</b> Results come from a simple symptom-matching demo, not a trained model, and are not a medical diagnosis.</div>
  <div class="two"><div class="card" style="display:grid;gap:12px"><label>Select animal<select id="dA">${a.map(x => `<option value="${x.id}">${esc(x.tag)} — ${esc(x.name)}</option>`).join('')}</select></label>
  <label>Animal image<div class="drop" onclick="dImg.click()" id="dz">📷 Tap to upload photo</div><input id="dImg" type="file" accept="image/*" hidden></label>
  <div><b>Symptoms</b><div class="chips" style="margin-top:8px">${Object.entries(SYM).map(([k, v]) => `<label><input type="checkbox" value="${k}">${v}</label>`).join('')}</div></div>
  <button class="btn" id="dBtn">🔬 Detect Disease</button></div><div class="card" id="dRes"><p>Results will appear here.</p></div></div>`);
  $('#dImg').onchange = e => { const f = e.target.files[0]; if (f) $('#dz').innerHTML = `<img src="${URL.createObjectURL(f)}" alt="Uploaded animal">`; };
  $('#dBtn').onclick = async () => {
    const sel = $$('.chips input:checked').map(i => i.value);
    if (!A.length) return toast('Add an animal first', true);
    if (!sel.length) return toast('Select at least one symptom', true);
    $('#dRes').innerHTML = '<p>Analysing…</p>';
    const r = await predict(sel, $('#dImg').files[0]), an = A.find(x => x.id == $('#dA').value);
    $('#dRes').innerHTML = `${r.simulated ? '<div class="sim">SIMULATED RESULT — demo only</div>' : ''}<h3>${esc(r.disease)} ${pill(r.severity)}</h3>
    <p>Confidence: <b>${r.confidence}%</b></p><div class="bar"><div style="width:${r.confidence}%"></div></div>
    <p style="margin-top:10px"><b>Symptoms:</b> ${r.symptoms.map(esc).join(', ')}</p><p><b>Preventive measures:</b></p><ul style="padding-left:20px">${r.prevention.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
    <div class="vet">🩺 Please consult a veterinary doctor to confirm this result${r.severity == 'High' ? ' <b>as soon as possible</b>' : ''}.</div>`;
    try {
      await db.save('alerts', {animal_tag:an.tag, disease:r.disease, risk:r.severity, message:`Suspected (${r.confidence}% simulated). Symptoms: ${r.symptoms.join(', ')}`, read:false, created_at:new Date().toISOString()});
      if (r.severity == 'High') await db.save('animals', {...an, status:'Diseased'});
      toast(`Alert created for ${an.tag}`); const al = await db.all('alerts'); $('#badge').textContent = al.filter(x => !x.read).length || '';
    } catch (x) { toast(x.message, true); }
  };
};

/* ---------- 6. Alerts ---------- */
R.alerts = (a, al) => {
  const due = a.filter(isDue);
  view(`<div class="top"><h2>Alerts</h2><button class="btn ghost" onclick="readAll()">Mark all read</button></div>
  ${due.length ? `<div class="vet">📅 <b>Vet reminder:</b> vaccination overdue for ${due.map(x => esc(x.tag)).join(', ')}. Schedule a veterinary visit.</div>` : ''}
  ${al.some(x => x.risk == 'High' && !x.read) ? '<div class="vet" style="background:#fde8e8;border-color:var(--red)">🚨 High-risk case needs a veterinary consultation today.</div>' : ''}
  <div class="two"><div class="card"><h3>Notifications</h3>${al.filter(x => !x.read).map(alertRow).join('') || '<p>You are all caught up. ✅</p>'}</div>
  <div class="card"><h3>Alert history</h3>${al.filter(x => x.read).map(alertRow).join('') || '<p>No history yet.</p>'}</div></div>`);
};
async function readAll() { for (const x of (await db.all('alerts')).filter(x => !x.read)) await db.save('alerts', {...x, read:true}); nav('alerts'); }

/* ---------- 7. Monitoring ---------- */
R.monitor = a => {
  if (!a.length) return view('<h2>Monitoring</h2><p>Add an animal to start monitoring.</p>');
  const id = window.monId && a.find(x => x.id == window.monId) ? window.monId : a[0].id, x = a.find(y => y.id == id), h = x.history || [];
  view(`<div class="top"><h2>Monitoring</h2><select style="width:auto" onchange="monId=this.value;nav('monitor')">${a.map(y => `<option value="${y.id}" ${y.id == id ? 'selected' : ''}>${esc(y.tag)} — ${esc(y.name)}</option>`).join('')}</select></div>
  <div class="grid"><div class="card stat"><div class="ic">${ICON[x.type]}</div><div><b>${pill(x.status)}</b><span>Health status</span></div></div><div class="card stat"><div class="ic">🌡️</div><div><b>${esc(x.temp)}°C</b><span>Temperature</span></div></div>
  <div class="card stat"><div class="ic">⚖️</div><div><b>${esc(x.weight)} kg</b><span>Weight</span></div></div><div class="card stat"><div class="ic">💉</div><div><b>${esc(x.next_vaccine || 'n/a')}</b><span>Next vaccination${isDue(x) ? ' (overdue)' : ''}</span></div></div></div>
  <div class="two"><div class="card"><h3>Temperature (°C)</h3><div class="chartbox"><canvas id="m1"></canvas></div></div><div class="card"><h3>Weight (kg)</h3><div class="chartbox"><canvas id="m2"></canvas></div></div></div>
  <div class="two"><div class="card"><h3>Feeding</h3><p>${esc(x.feed) || '—'}</p><p style="margin-top:8px"><b>Vaccinations:</b> ${esc(x.vaccine)}</p></div>
  <form class="card" id="lg" style="display:grid;gap:10px"><h3>Log a health reading</h3><div class="grid2"><label>Temp °C<input name="t" type="number" step="0.1" required></label><label>Weight kg<input name="w" type="number" step="0.1" required></label></div><label>Note<input name="n"></label><button class="btn">Save reading</button></form></div>
  <div class="card"><h3>Health monitoring history</h3>${h.slice().reverse().map(e => `<div class="row"><div class="grow">${esc(e.date)} — ${esc(e.note)}</div><span>${esc(e.temp)}°C · ${esc(e.weight)}kg</span></div>`).join('')}</div>`);
  const lab = h.map(e => e.date);
  chart('m1', 'line', {labels:lab, datasets:[{data:h.map(e => e.temp), borderColor:PAL[1], tension:.3}]}, {plugins:{legend:{display:false}}});
  chart('m2', 'line', {labels:lab, datasets:[{data:h.map(e => e.weight), borderColor:PAL[0], tension:.3}]}, {plugins:{legend:{display:false}}});
  $('#lg').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target), t = +f.get('t'), w = +f.get('w');
    const st = t >= 40 ? 'Diseased' : x.status;
    await db.save('animals', {...x, temp:t, weight:w, status:st, history:[...h, {date:day(0), temp:t, weight:w, note:f.get('n') || 'Manual reading'}]});
    if (t >= 40) await db.save('alerts', {animal_tag:x.tag, disease:'High fever', risk:'High', message:`Temperature ${t}°C recorded`, read:false, created_at:new Date().toISOString()});
    toast(t >= 40 ? 'High temperature alert created' : 'Reading saved', t >= 40); nav('monitor');
  };
};

/* ---------- 8. Reports ---------- */
R.reports = (a, al) => {
  const c = s => a.filter(x => x.status == s).length;
  view(`<h2>Reports & Analytics</h2><div class="grid"><div class="card stat"><div class="ic">🐾</div><div><b>${a.length}</b><span>Total livestock</span></div></div>
  <div class="card stat"><div class="ic">🚨</div><div><b>${al.length}</b><span>Disease detections</span></div></div><div class="card stat"><div class="ic">💉</div><div><b>${a.filter(isDue).length}</b><span>Vaccinations due</span></div></div></div>
  <div class="two"><div class="card"><h3>Healthy vs diseased</h3><div class="chartbox"><canvas id="r1"></canvas></div></div><div class="card"><h3>Disease detection statistics</h3><div class="chartbox"><canvas id="r2"></canvas></div></div>
  <div class="card"><h3>Monthly health report (alerts)</h3><div class="chartbox"><canvas id="r3"></canvas></div></div><div class="card"><h3>Vaccination report</h3><div class="chartbox"><canvas id="r4"></canvas></div></div></div>`);
  chart('r1', 'pie', {labels:['Healthy','Diseased','Pending'], datasets:[{data:[c('Healthy'), c('Diseased'), c('Pending')], backgroundColor:PAL}]});
  const dc = {}; al.forEach(x => dc[x.disease] = (dc[x.disease] || 0) + 1);
  chart('r2', 'bar', {labels:Object.keys(dc), datasets:[{data:Object.values(dc), backgroundColor:PAL[0]}]}, {plugins:{legend:{display:false}}, scales:{y:{ticks:{precision:0}}}});
  const mo = [...Array(6)].map((_, i) => { const d = new Date(); d.setMonth(d.getMonth() - 5 + i); return d; });
  chart('r3', 'line', {labels:mo.map(d => d.toLocaleString('default', {month:'short'})), datasets:[{label:'Alerts', borderColor:PAL[1], tension:.3, data:mo.map(d => al.filter(x => { const e = new Date(x.created_at); return e.getMonth() == d.getMonth() && e.getFullYear() == d.getFullYear(); }).length)}]}, {scales:{y:{ticks:{precision:0}}}});
  const du = a.filter(isDue).length;
  chart('r4', 'doughnut', {labels:['Up to date','Due / overdue'], datasets:[{data:[a.length - du, du], backgroundColor:[PAL[0], PAL[1]]}]});
};

/* ---------- 9. Profile ---------- */
R.profile = () => {
  const p = profile(), f = (k, l, t = 'text') => `<label>${l}<input name="${k}" type="${t}" value="${esc(p[k])}"></label>`;
  view(`<h2>Profile</h2><form class="card" id="pf" style="display:grid;gap:12px;max-width:560px"><div style="font-size:3rem">🧑‍🌾</div>${f('name','Farmer name')}${f('email','Email','email')}${f('phone','Phone','tel')}${f('farm','Farm name')}${f('location','Farm location')}
  <button class="btn">Save profile</button></form><div class="card" style="max-width:560px;margin-top:14px"><h3>Account settings</h3><p style="margin-bottom:10px">Storage: <b>${sb ? 'Supabase cloud database' : 'Browser localStorage (demo mode)'}</b></p>
  <button class="btn ghost" onclick="logout()">Logout</button> ${sb ? '' : '<button class="btn red" onclick="resetData()">Reset demo data</button>'}</div>`);
  $('#pf').onsubmit = e => { e.preventDefault(); LS('profile', Object.fromEntries(new FormData(e.target))); toast('Profile saved'); };
};
function resetData() { if (confirm('Erase all demo data?')) { ['animals','alerts'].forEach(k => localStorage.removeItem('sl_' + k)); localStorage.removeItem('sl_seeded_' + LS('session')); enter(LS('session')); } }

/* ---------- Boot ---------- */
(async () => {
  setMode('login');
  if (sb) { const {data} = await sb.auth.getSession(); if (data.session) return enter(data.session.user.email); }
  else if (LS('session')) enter(LS('session'));
})();
