const API = '';
let currentUser = null;
let currentStelle = null;
let editingShiftIdx = null;
let pendingAction = null;
let appConfig = { stellenOpen: { tf: true, fdl: true }, ticketEmail: '' };
const STELLEN_DATA = [
  { id:'tf', title:'EiB L/T -> Triebfahrzeugführer', description:'Sie übernehmen die Verantwortung für die sichere und pünktliche Führung unserer Züge im DVN-Netz. Wir bieten eine moderne Fahrzeugflotte und geregelte Arbeitszeiten.', requirements:['14+ Jahre alt','Gute Grammatik','Geduld','Funktionierendes Mikrofon'], fields:[{type:'text',label:'Vorname',name:'vorname',required:true},{type:'text',label:'Nachname',name:'nachname',required:true},{type:'email',label:'E-Mail',name:'email',required:true},{type:'text',label:'Discord-Name',name:'discord',placeholder:'z.B. user#1234'},{type:'text',label:'Discord-ID',name:'discord_id',placeholder:'Rechtsklick > ID kopieren'},{type:'tel',label:'Telefon',name:'telefon'},{type:'date',label:'Geburtsdatum',name:'geburtsdatum',required:true},{type:'text',label:'Wohnort',name:'wohnort',required:true},{type:'select',label:'Führerschein Klasse B',name:'fuehrerschein_b',options:['Ja','Nein'],required:true},{type:'checkbox',label:'TF-Führerschein vorhanden',name:'tf_schein'},{type:'checkbox',label:'Bereit zur Umschulung',name:'umschulung'},{type:'textarea',label:'Motivationsschreiben',name:'motivation',required:true},{type:'file',label:'Lebenslauf (PDF)',name:'lebenslauf'}] },
  { id:'fdl', title:'EiB ZVS -> Fahrdienstleiter', description:'Als Fahrdienstleiter steuern Sie den Zugverkehr auf unseren Strecken und sorgen für einen reibungslosen und sicheren Betriebsablauf.', requirements:['14+ Jahre alt','Gute Konzentration','Geduld','Funktionierendes Mikrofon'], fields:[{type:'text',label:'Vorname',name:'vorname',required:true},{type:'text',label:'Nachname',name:'nachname',required:true},{type:'email',label:'E-Mail',name:'email',required:true},{type:'text',label:'Discord-Name',name:'discord',placeholder:'z.B. user#1234'},{type:'text',label:'Discord-ID',name:'discord_id',placeholder:'Rechtsklick > ID kopieren'},{type:'tel',label:'Telefon',name:'telefon'},{type:'date',label:'Geburtsdatum',name:'geburtsdatum',required:true},{type:'text',label:'Wohnort',name:'wohnort',required:true},{type:'select',label:'FDL-Ausbildung',name:'fdl_abschluss',options:['Ja','Nein','In Ausbildung'],required:true},{type:'checkbox',label:'ZVS-Zulassung vorhanden',name:'zvs_zulassung'},{type:'checkbox',label:'Schichtbereitschaft',name:'schichtbereit'},{type:'textarea',label:'Berufserfahrung',name:'erfahrung'},{type:'textarea',label:'Motivationsschreiben',name:'motivation',required:true},{type:'file',label:'Lebenslauf (PDF)',name:'lebenslauf'}] }
];

const WELCOME_TEXT = `Willkommen beim Deutsches Verkehrsnetz (DVN)!\n\nWir freuen uns, Sie auf unserer Website begrüßen zu dürfen. Hier finden Sie alle wichtigen Informationen zu Netzplänen, offenen Stellenanzeigen, aktuellen News und der Schichtplanung.\n\nBei Fragen wenden Sie sich bitte per Ticket auf unserem Discord Server an uns!\nDiscord: https://discord.gg/MT3JcUarXw`;

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('welcomeText').textContent = WELCOME_TEXT;
  await loadSession();
  await loadConfig();
  initNavigation();
  initAdminNav();
  initSchichtenTabs();
  initKeyboardShortcuts();
  requestNotificationPermission();
  renderAll();
  checkResetToken();
});

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin'
  });
  return res.json();
}

async function loadSession() {
  const data = await api('/api/auth/me');
  if (data.loggedIn) { currentUser = data; updateUI(); if (data.needsEmail) setTimeout(() => openModal('emailRequiredModal'), 1000); }
}

async function loadConfig() {
  try { appConfig = await api('/api/config'); } catch (e) {}
}

function renderAll() {
  renderStellen();
  renderPublicShifts();
  renderNews();
}

// ─── NAVIGATION ───
function initNavigation() {
  document.querySelectorAll('nav button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.page === 'admin' && (!currentUser || currentUser.role !== 'admin')) return;
      document.querySelectorAll('nav button[data-page], .page').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.page).classList.add('active');
      if (btn.dataset.page === 'admin') { renderAdminPanels(); renderAdminNewsList(); }
      if (btn.dataset.page === 'news') renderNews();
      if (btn.dataset.page === 'shifts') renderPublicShifts();
      if (btn.dataset.page === 'tickets-page') renderPublicTickets();
      if (btn.dataset.page === 'stellen') renderStellen();
    });
  });
}

function initAdminNav() {
  document.querySelectorAll('[data-apanel]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-apanel]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById('apanel-' + btn.dataset.apanel);
      if (panel) {
        panel.classList.add('active');
        if (btn.dataset.apanel === 'schichten') renderAdminShifts();
        if (btn.dataset.apanel === 'newsadmin') renderAdminNewsList();
        if (btn.dataset.apanel === 'verwaltung') { renderPwRequests(); renderAdminTickets(); renderAdminUsers(); }
        if (btn.dataset.apanel === 'bewerbungen') renderAdminPanels();
      }
    });
  });
  initVerwaltungTabs();
}

function initVerwaltungTabs() {
  document.querySelectorAll('[data-vtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-vtab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.vtab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('vtab-' + btn.dataset.vtab).classList.add('active');
      if (btn.dataset.vtab === 'accounts') renderAdminUsers();
      if (btn.dataset.vtab === 'pwrequests') renderPwRequests();
      if (btn.dataset.vtab === 'admintickets') renderAdminTickets();
    });
  });
}

function initSchichtenTabs() {
  document.querySelectorAll('[data-stab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-stab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.stab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('stab-' + btn.dataset.stab).classList.add('active');
    });
  });
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      closeLightbox();
    }
  });
}

// ─── UI UPDATE ───
function updateUI() {
  const adminBtn = document.getElementById('adminNavBtn');
  const userMenu = document.getElementById('userMenu');
  const loginBtn = document.getElementById('loginNavBtn');
  if (currentUser) {
    if (adminBtn) adminBtn.style.display = currentUser.role === 'admin' ? 'flex' : 'none';
    userMenu.style.display = 'flex';
    loginBtn.style.display = 'none';
    document.getElementById('userNameDisplay').textContent = currentUser.username;
    document.getElementById('userNameDisplay2').textContent = currentUser.username;
  } else {
    if (adminBtn) adminBtn.style.display = 'none';
    userMenu.style.display = 'none';
    loginBtn.style.display = 'flex';
    if (document.getElementById('admin').classList.contains('active')) {
      document.querySelector('nav button[data-page="willkommen"]').click();
    }
  }
}

// ─── MODALS ───
function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'loginModal') {
    document.getElementById('loginError').classList.remove('show');
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    setTimeout(() => document.getElementById('loginUser').focus(), 100);
  }
  if (id === 'pwResetRequestModal') {
    document.getElementById('pwResetReqError').classList.remove('show');
    document.getElementById('pwResetReqSuccess').classList.remove('show');
    document.getElementById('pwResetReqUser').value = '';
    document.getElementById('pwResetReqEmail').value = '';
  }
  if (id === 'pwResetFormModal') {
    document.getElementById('pwResetFormError').classList.remove('show');
    document.getElementById('pwResetFormSuccess').classList.remove('show');
    document.getElementById('pwResetFormPass').value = '';
    document.getElementById('pwResetFormPass2').value = '';
  }
  if (id === 'emailRequiredModal') {
    document.getElementById('emailReqError').classList.remove('show');
    document.getElementById('emailReqInput').value = '';
    setTimeout(() => document.getElementById('emailReqInput').focus(), 100);
  }
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function toggleDropdown(e) {
  e.stopPropagation();
  document.getElementById('userDropdown').classList.toggle('open');
}
document.addEventListener('click', () => {
  const d = document.getElementById('userDropdown');
  if (d) d.classList.remove('open');
});

// ─── LIGHTBOX ───
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  img.src = src;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  img.style.transform = 'scale(0.8)';
  img.style.opacity = '0';
  setTimeout(() => {
    lb.classList.remove('open');
    img.style.transform = '';
    img.style.opacity = '';
    document.body.style.overflow = '';
  }, 250);
}

// ─── WINDOWS NOTIFICATIONS ───
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
function sendNotification(title, body, icon) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification(title, { body, icon: icon || '/images/dvn_logo.png', badge: '/images/dvn_logo.png' }); } catch (e) {}
  }
}

// ─── LOGIN / LOGOUT ───
async function doLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  if (!u || !p) { showErr('loginError', 'Bitte alle Felder ausfüllen.'); return; }
  const data = await api('/api/auth/login', { method: 'POST', body: { username: u, password: p } });
  if (data.ok) {
    currentUser = { loggedIn: true, username: data.username, role: data.role, email: data.email };
    closeModal('loginModal');
    updateUI();
    renderAll();
    sendNotification('DVN', `Willkommen zurück, ${data.username}!`);
    if (data.needsEmail) {
      setTimeout(() => openModal('emailRequiredModal'), 500);
    }
  } else {
    showErr('loginError', data.error || 'Anmeldung fehlgeschlagen.');
  }
}

async function doLogout() {
  await api('/api/auth/logout', { method: 'POST' });
  currentUser = null;
  document.getElementById('userDropdown').classList.remove('open');
  document.querySelectorAll('nav button[data-page], .page').forEach(el => el.classList.remove('active'));
  document.querySelector('nav button[data-page="willkommen"]').classList.add('active');
  document.getElementById('willkommen').classList.add('active');
  updateUI();
  renderAll();
}

// ─── PASSWORT ZURÜCKSETZEN (E-Mail-Link) ───
async function submitPwResetRequest() {
  const u = document.getElementById('pwResetReqUser').value.trim();
  const e = document.getElementById('pwResetReqEmail').value.trim();
  hideMsgs('pwResetReqError', 'pwResetReqSuccess');
  if (!u || !e) { showErr('pwResetReqError', 'Bitte alle Felder ausfüllen.'); return; }
  if (!e.includes('@')) { showErr('pwResetReqError', 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'); return; }
  const data = await api('/api/password-reset/request', { method: 'POST', body: { username: u, email: e } });
  if (data.ok) {
    showSuccess('pwResetReqSuccess', data.message || 'Wenn Benutzername und E-Mail übereinstimmen, erhalten Sie eine E-Mail mit einem Link zum Zurücksetzen.');
    sendNotification('DVN Passwort', `Reset-Link-Anfrage von ${u}.`);
    setTimeout(() => closeModal('pwResetRequestModal'), 3000);
  } else {
    showErr('pwResetReqError', data.error || 'Fehler.');
  }
}

async function submitPwResetForm() {
  const token = new URLSearchParams(window.location.search).get('token');
  const p = document.getElementById('pwResetFormPass').value;
  const p2 = document.getElementById('pwResetFormPass2').value;
  hideMsgs('pwResetFormError', 'pwResetFormSuccess');
  if (!p) { showErr('pwResetFormError', 'Bitte geben Sie ein neues Passwort ein.'); return; }
  if (p.length < 6) { showErr('pwResetFormError', 'Passwort muss mindestens 6 Zeichen lang sein.'); return; }
  if (p !== p2) { showErr('pwResetFormError', 'Passwörter stimmen nicht überein.'); return; }
  const data = await api('/api/password-reset/reset', { method: 'POST', body: { token, newPassword: p } });
  if (data.ok) {
    showSuccess('pwResetFormSuccess', data.message || 'Passwort erfolgreich zurückgesetzt!');
    document.getElementById('pwResetFormPass').value = '';
    document.getElementById('pwResetFormPass2').value = '';
    setTimeout(() => { window.history.replaceState({}, '', '/'); closeModal('pwResetFormModal'); }, 2500);
  } else {
    showErr('pwResetFormError', data.error || 'Fehler.');
  }
}

async function checkResetToken() {
  const token = new URLSearchParams(window.location.search).get('token');
  if (!token) return;
  const data = await api('/api/password-reset/verify-token', { method: 'POST', body: { token } });
  if (data.ok) {
    document.getElementById('pwResetFormUser').textContent = 'Setzen Sie ein neues Passwort für den Account „' + data.username + '" fest.';
    openModal('pwResetFormModal');
  } else {
    alert('Der Link zum Zurücksetzen des Passworts ist abgelaufen oder ungültig.');
    window.history.replaceState({}, '', '/');
  }
}

// ─── EMAIL HINTERLEGEN ───
async function submitEmail() {
  const email = document.getElementById('emailReqInput').value.trim();
  hideMsgs('emailReqError');
  if (!email || !email.includes('@')) { showErr('emailReqError', 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'); return; }
  const data = await api('/api/auth/set-email', { method: 'POST', body: { email } });
  if (data.ok) {
    currentUser.email = email;
    closeModal('emailRequiredModal');
    sendNotification('DVN', 'E-Mail-Adresse erfolgreich hinterlegt.');
  } else {
    showErr('emailReqError', data.error || 'Fehler beim Speichern.');
  }
}

function skipEmailSetup() {
  closeModal('emailRequiredModal');
}

// ─── STELLEN ───
function renderStellen() {
  const grid = document.getElementById('saGrid');
  if (!grid) return;
  const open = appConfig.stellenOpen || { tf: true, fdl: true };
  grid.innerHTML = STELLEN_DATA.map(s => {
    const isOpen = open[s.id] !== false;
    return `<div class="sa-card">
      <div class="sa-title">${s.title}<span>${isOpen ? '– Bewerbungen offen' : '– Derzeit geschlossen'}</span></div>
      <div class="sa-meta"><span class="sa-tag ${isOpen ? 'open' : 'closed'}">${isOpen ? '● Offen' : '▼ Geschlossen'}</span></div>
      <div class="sa-desc">${s.description}</div>
      <div class="sa-req"><strong>Anforderungen:</strong><ul>${s.requirements.map(r => `<li>${r}</li>`).join('')}</ul></div>
      <div class="sa-actions">
        <button class="btn-apply" ${isOpen ? '' : 'disabled'} onclick="${isOpen ? `openBewerb('${s.id}')` : ''}">
          ${isOpen ? '📝 Jetzt bewerben' : '🔒 Geschlossen'}
        </button>
      </div>
    </div>`;
  }).join('');
  const openCount = STELLEN_DATA.filter(s => (open[s.id] !== false)).length;
  document.getElementById('stellenBadge').textContent = openCount + ' offen / ' + STELLEN_DATA.length;
}

function openBewerb(id) {
  const st = STELLEN_DATA.find(s => s.id === id);
  if (!st) return;
  currentStelle = st;
  document.getElementById('bewerbModalTitle').textContent = '📝 Bewerbung: ' + st.title;
  document.getElementById('bewerbError').classList.remove('show');
  const c = document.getElementById('bewerbFormFields');
  c.innerHTML = st.fields.map(f => {
    const req = f.required ? ' <span style="color:var(--r500)">*</span>' : '';
    const fid = 'bf_' + f.name;
    if (f.type === 'checkbox') return `<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.75rem"><input type="checkbox" id="${fid}" name="${f.name}" style="width:18px;height:18px;accent-color:var(--r500)"><label for="${fid}" style="margin:0;cursor:pointer;font-size:.85rem">${f.label}${req}</label></div>`;
    if (f.type === 'select') return `<div style="margin-bottom:.75rem"><label style="display:block;font-size:.82rem;font-weight:600;margin-bottom:.3rem">${f.label}${req}</label><select id="${fid}" name="${f.name}" style="width:100%;padding:.6rem .9rem;border:2px solid var(--g200);border-radius:var(--rs);font-size:.88rem;font-family:inherit">${f.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select></div>`;
    if (f.type === 'textarea') return `<div style="margin-bottom:.75rem"><label style="display:block;font-size:.82rem;font-weight:600;margin-bottom:.3rem">${f.label}${req}</label><textarea id="${fid}" name="${f.name}" style="width:100%;padding:.6rem .9rem;border:2px solid var(--g200);border-radius:var(--rs);font-size:.88rem;font-family:inherit;min-height:80px;resize:vertical"></textarea></div>`;
    if (f.type === 'file') return `<div style="margin-bottom:.75rem"><label style="display:block;font-size:.82rem;font-weight:600;margin-bottom:.3rem">${f.label}${req}</label><input type="file" id="${fid}" name="${f.name}" accept=".pdf,.doc,.docx" style="width:100%;padding:.4rem"></div>`;
    const ph = f.placeholder ? ` placeholder="${f.placeholder}"` : '';
    return `<div style="margin-bottom:.75rem"><label style="display:block;font-size:.82rem;font-weight:600;margin-bottom:.3rem">${f.label}${req}</label><input type="${f.type}" id="${fid}" name="${f.name}" style="width:100%;padding:.6rem .9rem;border:2px solid var(--g200);border-radius:var(--rs);font-size:.88rem;font-family:inherit"${ph}></div>`;
  }).join('');
  openModal('bewerbModal');
}

async function submitBewerb() {
  if (!currentStelle) return;
  const data = {};
  let valid = true;
  currentStelle.fields.forEach(f => {
    const el = document.getElementById('bf_' + f.name);
    if (!el) return;
    if (f.type === 'checkbox') { data[f.name] = el.checked; return; }
    if (f.type === 'file') { data[f.name] = el.files[0] ? el.files[0].name : ''; return; }
    data[f.name] = el.value.trim();
    if (f.required && !data[f.name]) { valid = false; el.style.borderColor = 'var(--r400)'; } else el.style.borderColor = '';
  });
  if (!valid) { showErr('bewerbError', 'Bitte alle Pflichtfelder ausfüllen.'); return; }
  await api('/api/applications', { method: 'POST', body: { stelleId: currentStelle.id, data } });
  closeModal('bewerbModal');
  sendNotification('DVN', 'Bewerbung erfolgreich eingereicht!');
  alert('✅ Bewerbung erfolgreich eingereicht!');
}

// ─── ADMIN PANELS ───
function renderAdminPanels() {
  if (!currentUser || currentUser.role !== 'admin') return;
  document.getElementById('adminBadge').textContent = 'Angemeldet als ' + currentUser.username;
  const sg = document.getElementById('adminStellenGrid');
  const open = appConfig.stellenOpen || { tf: true, fdl: true };
  if (sg) sg.innerHTML = STELLEN_DATA.map(s => {
    const isOpen = open[s.id] !== false;
    return `<div class="sa-card" style="border-left:4px solid ${isOpen ? '#065f46' : 'var(--g300)'}">
      <div class="sa-title" style="font-size:.95rem">${s.title}</div>
      <div class="sa-meta"><span class="sa-tag ${isOpen ? 'open' : 'closed'}">${isOpen ? '● Offen' : '▼ Geschlossen'}</span></div>
      <button class="btn-toggle ${isOpen ? 'open' : ''}" onclick="toggleStelle('${s.id}')">${isOpen ? '🔒 Schließen' : '🔓 Öffnen'}</button>
    </div>`;
  }).join('');
  renderAdminBewList();
}

async function renderAdminBewList() {
  const apps = await api('/api/applications');
  const bl = document.getElementById('adminBewList');
  if (!bl) return;
  if (apps.length === 0) { bl.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--g400)">Noch keine Bewerbungen.</div>'; return; }
  bl.innerHTML = '<div class="ab-list">' + apps.map(a => {
    const st = STELLEN_DATA.find(s => s.id === a.stelle_id);
    const dataHtml = Object.entries(a.data).filter(([k]) => !['lebenslauf'].includes(k)).map(([k, v]) => `<span class="k">${k}:</span><span class="v">${v}</span>`).join('');
    return `<div class="ab-item">
      <div class="ab-head">
        <span class="ab-name">${a.data.vorname || '?'} ${a.data.nachname || '?'}</span>
        <span class="ab-date">${a.datum} · ${st ? st.title : '?'}</span>
        <span class="ab-status ${a.status}">${a.status === 'pending' ? 'Ausstehend' : a.status === 'accepted' ? 'Angenommen' : 'Abgelehnt'}</span>
      </div>
      <div class="ab-data">${dataHtml}</div>
      ${a.admin_note ? '<div style="font-size:.8rem;color:var(--g500);margin-top:.3rem">📝 ' + (a.admin_note_by ? a.admin_note_by + ': ' : '') + a.admin_note + '</div>' : ''}
      ${a.status === 'pending' ? `
      <div class="ab-actions">
        <button class="accept" onclick="appAction(${a.id},'accepted')">✓ Annehmen</button>
        <button class="reject" onclick="appAction(${a.id},'rejected')">✗ Ablehnen</button>
      </div>
      <div class="ab-note-input" id="noteArea${a.id}">
        <input type="text" id="noteInput${a.id}" placeholder="Begründung (optional)">
        <button onclick="submitNote(${a.id})">Bestätigen</button>
      </div>` : ''}
    </div>`;
  }).join('') + '</div>';
}

function appAction(id, action) {
  const area = document.getElementById('noteArea' + id);
  if (area) { area.style.display = area.style.display === 'none' ? 'flex' : 'none'; pendingAction = { id, action }; }
  else doAppAction(id, action, '');
}

async function submitNote(id) {
  const note = document.getElementById('noteInput' + id).value.trim();
  if (pendingAction && pendingAction.id === id) { await doAppAction(id, pendingAction.action, note); pendingAction = null; }
}

async function doAppAction(id, action, note) {
  await api(`/api/applications/${id}/status`, { method: 'POST', body: { status: action, note, noteBy: currentUser.username } });
  renderAdminBewList();
  sendNotification('DVN Bewerbung', `Bewerbung ${action === 'accepted' ? 'angenommen' : 'abgelehnt'}.`);
}

async function toggleStelle(id) {
  const open = appConfig.stellenOpen || { tf: true, fdl: true };
  open[id] = open[id] === false ? true : false;
  appConfig.stellenOpen = open;
  await api('/api/config/stellen', { method: 'POST', body: open });
  renderStellen();
  renderAdminPanels();
}

// ─── SHIFTS ───
async function renderPublicShifts() {
  const data = await api('/api/shifts');
  const list = document.getElementById('shiftsListPublic');
  const badge = document.getElementById('shiftCountBadge');
  if (!list) return;
  badge.textContent = data.total + ' Schichten';
  const all = [...data.plan, ...data.single];
  if (all.length === 0) { list.innerHTML = '<div style="text-align:center;padding:2.5rem;color:var(--g400)">📅 Keine Schichten eingetragen.</div>'; return; }
  list.innerHTML = all.map(s => `<div class="sc">
    <div class="stb"><div class="l1">${s.time}</div><div class="l2">${s.date || ''}${s.plan ? ' 📅' : ''}</div></div>
    <div class="si"><h3>${s.title}</h3>${s.desc ? '<p>' + s.desc + '</p>' : ''}${s.image ? '<img src="' + s.image + '" class="shift-img" onclick="openLightbox(\'' + s.image + '\')" alt="">' : ''}</div>
  </div>`).join('');
}

async function renderAdminShifts() {
  const data = await api('/api/shifts');
  const planList = document.getElementById('adminShiftPlanList');
  const singleList = document.getElementById('adminShiftsList');
  const renderList = (shifts, container) => {
    if (!container) return;
    if (shifts.length === 0) { container.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--g400)">Keine Einträge.</div>'; return; }
    container.innerHTML = shifts.map(s => `<div class="sc">
      <div class="stb"><div class="l1">${s.time}</div><div class="l2">${s.date || ''}</div></div>
      <div class="si"><h3>${s.title}</h3>${s.desc ? '<p>' + s.desc + '</p>' : ''}${s.image ? '<img src="' + s.image + '" class="shift-img" onclick="openLightbox(\'' + s.image + '\')" alt="">' : ''}</div>
      <div class="sa-btn"><button onclick="editShift(${s.id})" title="Bearbeiten">✏️</button><button onclick="delShift(${s.id})" title="Löschen">🗑️</button></div>
    </div>`).join('');
  };
  renderList(data.plan, planList);
  renderList(data.single, singleList);
}

async function addShift(isPlan) {
  const prefix = isPlan ? 'sp' : 's';
  const title = document.getElementById(prefix + 'Title').value.trim();
  const date = document.getElementById(prefix + 'Date').value;
  const time = document.getElementById(prefix + 'Time').value.trim();
  const desc = document.getElementById(prefix + 'Desc').value.trim();
  const fileInput = document.getElementById(prefix + 'Image');
  if (!title || !time) { alert('Bitte Titel und Zeitraum angeben!'); return; }

  const doAdd = (imgDataUrl) => {
    api('/api/shifts', { method: 'POST', body: { title, date, time, desc, image: imgDataUrl || '', plan: isPlan } }).then(() => {
      document.getElementById(prefix + 'Title').value = '';
      document.getElementById(prefix + 'Date').value = '';
      document.getElementById(prefix + 'Time').value = '';
      document.getElementById(prefix + 'Desc').value = '';
      document.getElementById(prefix + 'Image').value = '';
      renderAdminShifts();
      renderPublicShifts();
    });
  };

  if (fileInput && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = e => doAdd(e.target.result);
    reader.readAsDataURL(fileInput.files[0]);
  } else doAdd(null);
}

async function editShift(id) {
  const data = await api('/api/shifts');
  const all = [...data.plan, ...data.single];
  const s = all.find(x => x.id === id);
  if (!s) return;
  editingShiftIdx = id;
  document.getElementById('seTitle').value = s.title;
  document.getElementById('seDate').value = s.date || '';
  document.getElementById('seTime').value = s.time;
  document.getElementById('seDesc').value = s.desc || '';
  document.getElementById('sePlan').value = s.plan ? '1' : '0';
  document.getElementById('seImage').value = '';
  openModal('shiftEditModal');
}

async function saveShiftEdit() {
  if (editingShiftIdx === null) return;
  const title = document.getElementById('seTitle').value.trim();
  const date = document.getElementById('seDate').value;
  const time = document.getElementById('seTime').value.trim();
  const desc = document.getElementById('seDesc').value.trim();
  const plan = document.getElementById('sePlan').value === '1';
  const fileInput = document.getElementById('seImage');

  const doSave = (imgDataUrl) => {
    const body = { title, date, time, desc, image: imgDataUrl || '', plan };
    if (imgDataUrl === undefined) delete body.image;
    api(`/api/shifts/${editingShiftIdx}`, { method: 'PUT', body }).then(() => {
      closeModal('shiftEditModal');
      editingShiftIdx = null;
      renderAdminShifts();
      renderPublicShifts();
    });
  };

  if (fileInput && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = e => doSave(e.target.result);
    reader.readAsDataURL(fileInput.files[0]);
  } else doSave(undefined);
}

async function delShift(id) {
  if (!confirm('Schicht wirklich löschen?')) return;
  await api(`/api/shifts/${id}`, { method: 'DELETE' });
  renderAdminShifts();
  renderPublicShifts();
}

// ─── NEWS ───
async function renderNews() {
  const news = await api('/api/news');
  const grid = document.getElementById('newsGrid');
  const badge = document.getElementById('newsBadge');
  if (!grid) return;
  badge.textContent = news.length + ' Beiträge';
  if (news.length === 0) { grid.innerHTML = '<div class="news-empty"><div class="big">📰</div>Noch keine News vorhanden.</div>'; return; }
  grid.innerHTML = news.map(n => `<div class="news-card">
    ${n.image ? `<img class="nc-img" src="${n.image}" alt="${n.title}" loading="lazy" onclick="openLightbox('${n.image}')">` : ''}
    <div class="nc-body">
      <div class="nc-date">${n.date} · ${n.author || 'DVN'}</div>
      <div class="nc-title">${n.title}</div>
      <div class="nc-text" style="white-space:pre-wrap">${n.text}</div>
    </div>
  </div>`).join('');
}

async function addNews() {
  const title = document.getElementById('newsTitle').value.trim();
  const text = document.getElementById('newsText').value.trim();
  const fileInput = document.getElementById('newsImage');
  if (!title || !text) { alert('Bitte Titel und Text eingeben!'); return; }

  const publish = (imgDataUrl) => {
    api('/api/news', { method: 'POST', body: { title, text, image: imgDataUrl || '', author: currentUser?.username || 'Admin' } }).then(() => {
      clearNewsForm();
      renderNews();
      renderAdminNewsList();
    });
  };

  if (fileInput && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = e => publish(e.target.result);
    reader.readAsDataURL(fileInput.files[0]);
  } else publish(null);
}

function clearNewsForm() {
  document.getElementById('newsTitle').value = '';
  document.getElementById('newsText').value = '';
  document.getElementById('newsImage').value = '';
}

async function renderAdminNewsList() {
  const news = await api('/api/news');
  const list = document.getElementById('adminNewsList');
  if (!list) return;
  if (news.length === 0) { list.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--g400)">Noch keine News.</div>'; return; }
  list.innerHTML = news.map(n => `<div class="news-item-admin">
    <div><div class="nia-title">${n.title}</div><div class="nia-date">${n.date}</div></div>
    <button class="nia-del" onclick="delNews(${n.id})">🗑️</button>
  </div>`).join('');
}

async function delNews(id) {
  if (!confirm('News wirklich löschen?')) return;
  await api(`/api/news/${id}`, { method: 'DELETE' });
  renderNews();
  renderAdminNewsList();
}

// ─── TICKETS (PUBLIC) ───
async function renderPublicTickets() {
  const data = await api('/api/tickets');
  const list = document.getElementById('ticketsPageList');
  const badge = document.getElementById('ticketsPageBadge');
  const detail = document.getElementById('ticketDetailView');
  if (!list) return;
  list.style.display = 'block';
  detail.style.display = 'none';
  badge.textContent = data.openCount + ' offen';
  if (data.tickets.length === 0) { list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--g400)">🎫 Noch keine Tickets.</div>'; return; }
  list.innerHTML = '<div class="ticket-list">' + data.tickets.map(t => `<div class="ticket-item" onclick="viewTicket(${t.ticket_number})">
    <div class="ticket-head">
      <span class="ticket-num">#${t.ticket_number}</span>
      <span class="ticket-subject">${t.subject}</span>
      <span class="ticket-status ${t.status}">${t.status === 'open' ? '● Offen' : '■ Geschlossen'}</span>
      <span class="ticket-date">${t.created_at}</span>
    </div>
  </div>`).join('') + '</div>';
}

async function viewTicket(num) {
  const data = await api(`/api/tickets/${num}`);
  if (!data.ticket) return;
  const list = document.getElementById('ticketsPageList');
  const detail = document.getElementById('ticketDetailView');
  list.style.display = 'none';
  detail.style.display = 'block';
  const t = data.ticket;
  let html = `<button class="ticket-back" onclick="renderPublicTickets()">← Zurück</button>
    <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem">
      <span style="font-weight:700;color:var(--r500);font-size:1.1rem">#${t.ticket_number}</span>
      <h2 style="font-size:1.1rem">${t.subject}</h2>
      <span class="ticket-status ${t.status}">${t.status === 'open' ? '● Offen' : '■ Geschlossen'}</span>
    </div>`;
  html += '<div class="ticket-thread">';
  if (data.messages.length === 0) html += '<div style="text-align:center;padding:1rem;color:var(--g400)">Noch keine Nachrichten.</div>';
  data.messages.forEach(m => {
    html += `<div class="ticket-msg ${m.source === 'email' ? 'email' : ''}">
      <div class="msg-head">
        <span class="msg-author">${m.author}</span>
        <div style="display:flex;gap:.5rem;align-items:center">
          <span class="msg-source">${m.source === 'email' ? '📧 E-Mail' : '🌐 Web'}</span>
          <span class="msg-date">${m.created_at}</span>
        </div>
      </div>
      <div class="msg-content">${m.content}</div>
    </div>`;
  });
  html += '</div>';
  if (t.status === 'open') {
    html += `<div class="ticket-reply">
      <textarea id="ticketReplyMsg" placeholder="Antwort schreiben..."></textarea>
      <button onclick="replyTicket(${t.ticket_number})">📤 Senden</button>
    </div>`;
  }
  detail.innerHTML = html;
}

async function submitTicket() {
  const subject = document.getElementById('ticketSubject').value.trim();
  const message = document.getElementById('ticketMessage').value.trim();
  const author = document.getElementById('ticketAuthor').value.trim() || 'Gast';
  hideMsgs('ticketCreateError');
  if (!subject || !message) { showErr('ticketCreateError', 'Betreff und Nachricht erforderlich.'); return; }
  const data = await api('/api/tickets', { method: 'POST', body: { subject, message, author } });
  if (data.ok) {
    closeModal('ticketCreateModal');
    document.getElementById('ticketSubject').value = '';
    document.getElementById('ticketMessage').value = '';
    document.getElementById('ticketAuthor').value = '';
    sendNotification('DVN Ticket', `Ticket #${data.ticketNumber} erstellt.`);
    renderPublicTickets();
    viewTicket(data.ticketNumber);
  }
}

async function replyTicket(num) {
  const msg = document.getElementById('ticketReplyMsg').value.trim();
  if (!msg) return;
  await api(`/api/tickets/${num}/message`, { method: 'POST', body: { message: msg, author: currentUser?.username || 'Gast' } });
  viewTicket(num);
}

// ─── ADMIN TICKETS ───
async function renderAdminTickets() {
  const data = await api('/api/tickets');
  const list = document.getElementById('adminTicketsList');
  if (!list) return;
  if (data.tickets.length === 0) { list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--g400)">🎫 Noch keine Tickets.</div>'; return; }
  list.innerHTML = '<div class="ticket-list">' + data.tickets.map(t => `<div class="ticket-item" onclick="viewTicket(${t.ticket_number})">
    <div class="ticket-head">
      <span class="ticket-num">#${t.ticket_number}</span>
      <span class="ticket-subject">${t.subject}</span>
      <span class="ticket-status ${t.status}">${t.status === 'open' ? '● Offen' : '■ Geschlossen'}</span>
      <span class="ticket-date">${t.created_at}</span>
    </div>
    <div style="display:flex;gap:.5rem;margin-top:.5rem">
      ${t.status === 'open' ? `<button class="btn-toggle" onclick="event.stopPropagation();closeTicketAdmin(${t.ticket_number})">🔒 Schließen</button>` : `<button class="btn-toggle open" onclick="event.stopPropagation();reopenTicketAdmin(${t.ticket_number})">🔓 Öffnen</button>`}
    </div>
  </div>`).join('') + '</div>';
}

async function closeTicketAdmin(num) {
  await api(`/api/tickets/${num}/close`, { method: 'POST' });
  renderAdminTickets();
}

async function reopenTicketAdmin(num) {
  await api(`/api/tickets/${num}/reopen`, { method: 'POST' });
  renderAdminTickets();
}

// ─── PASSWORT-ANFRagen (ADMIN) ───
async function renderPwRequests() {
  const requests = await api('/api/password-requests');
  const list = document.getElementById('adminPwReqList');
  if (!list) return;
  if (requests.length === 0) { list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--g400)">Keine Passwort-Anfragen.</div>'; return; }
  list.innerHTML = requests.map(r => `<div class="pw-req-item">
    <div class="pw-head">
      <span class="pw-user">🔑 ${r.username}</span>
      <span class="ab-status ${r.status}">${r.status === 'pending' ? 'Ausstehend' : r.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}</span>
      <span class="pw-date">${r.created_at}</span>
    </div>
    ${r.status === 'pending' ? `<div class="pw-actions">
      <button class="accept" style="background:rgba(34,197,94,.12);color:#065f46;border:none;padding:.4rem 1rem;border-radius:6px;font-weight:600;font-size:.78rem;cursor:pointer" onclick="approvePwReq(${r.id})">✓ Genehmigen</button>
      <button class="reject" style="background:rgba(244,63,94,.1);color:#be123c;border:none;padding:.4rem 1rem;border-radius:6px;font-weight:600;font-size:.78rem;cursor:pointer" onclick="rejectPwReq(${r.id})">✗ Ablehnen</button>
    </div>` : ''}
  </div>`).join('');
}

async function approvePwReq(id) {
  await api(`/api/password-requests/${id}/approve`, { method: 'POST' });
  renderPwRequests();
  sendNotification('DVN Passwort', 'Passwort-Anfrage genehmigt.');
}

async function rejectPwReq(id) {
  await api(`/api/password-requests/${id}/reject`, { method: 'POST' });
  renderPwRequests();
}

// ─── USER MANAGEMENT ───
async function createUser() {
  const username = document.getElementById('newUser').value.trim();
  const password = document.getElementById('newUserPw').value;
  const role = document.getElementById('newUserRole').value;
  const email = document.getElementById('newUserEmail').value.trim() || null;
  if (!username || !password) { alert('Benutzername und Passwort eingeben!'); return; }
  if (password.length < 6) { alert('Passwort mindestens 6 Zeichen!'); return; }
  const data = await api('/api/users', { method: 'POST', body: { username, password, role, email } });
  if (data.ok) {
    document.getElementById('newUser').value = '';
    document.getElementById('newUserPw').value = '';
    document.getElementById('newUserEmail').value = '';
    renderAdminUsers();
    sendNotification('DVN', `Account "${username}" erstellt.`);
  } else {
    alert(data.error || 'Fehler beim Erstellen.');
  }
}

async function renderAdminUsers() {
  const usersList = await api('/api/users');
  const list = document.getElementById('adminUserList');
  if (!list) return;
  if (usersList.length === 0) { list.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--g400)">Keine Accounts vorhanden.</div>'; return; }
  const roleLabels = { admin: '🛡️ Admin', tf: '🚄 TF', fdl: '📡 FDL' };
  list.innerHTML = '<div class="ab-list">' + usersList.map(u => `<div class="ab-item">
    <div class="ab-head">
      <span class="ab-name">${u.username}</span>
      ${u.email ? '<span style="font-size:.75rem;color:var(--g500);margin-left:.5rem">📧 ' + u.email + '</span>' : ''}
      <span class="ab-status ${u.role === 'admin' ? 'accepted' : 'pending'}">${roleLabels[u.role] || u.role}</span>
      <span class="ab-date">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('de-DE') : ''}</span>
    </div>
    ${u.username !== 'jggaming2518' ? `<div class="ab-actions">
      <button class="reject" onclick="deleteUser('${u.username}')">🗑️ Löschen</button>
    </div>` : '<div style="font-size:.75rem;color:var(--g400);margin-top:.3rem">Schutz-Konto - kann nicht gelöscht werden</div>'}
  </div>`).join('') + '</div>';
}

async function deleteUser(username) {
  if (!confirm(`Account "${username}" wirklich löschen?`)) return;
  const data = await api(`/api/users/${username}`, { method: 'DELETE' });
  if (data.ok) renderAdminUsers();
  else alert(data.error || 'Fehler.');
}

// ─── HELPERS ───
function showErr(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
}
function hideMsgs(...ids) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('show'); });
}
function showSuccess(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
}
