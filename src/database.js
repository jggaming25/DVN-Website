const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'dvn.json');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) { console.warn('[DB] Laden fehlgeschlagen, erstelle neu:', e.message); }
  return {
    users: [],
    passwordRequests: [],
    tickets: [],
    ticketMessages: [],
    news: [],
    shifts: [],
    applications: [],
    stellenOpen: { tf: true, fdl: true },
    ticketCounter: 0
  };
}

let db = loadDB();

function saveDB() {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8'); }
  catch (e) { console.error('[DB] Speichern fehlgeschlagen:', e.message); }
}

// Auto-save every 30 seconds if there are changes
let dirty = false;
function markDirty() { dirty = true; }
setInterval(() => { if (dirty) { saveDB(); dirty = false; } }, 30000);

// Save on process exit
process.on('SIGINT', () => { saveDB(); process.exit(); });
process.on('SIGTERM', () => { saveDB(); process.exit(); });

// ─── Query helpers (minimiert Datenbankzugriffe) ───

const users = {
  get(username) { return db.users.find(u => u.username === username); },
  upsert(username, role, pwHash) {
    let u = db.users.find(x => x.username === username);
    if (!u) { u = { username, role: role || 'user', backupPasswordHash: pwHash || null, createdAt: new Date().toISOString() }; db.users.push(u); }
    else { if (role) u.role = role; if (pwHash) u.backupPasswordHash = pwHash; }
    markDirty();
    return u;
  },
  setBackupPw(username, hash) {
    const u = db.users.find(x => x.username === username);
    if (u) { u.backupPasswordHash = hash; markDirty(); }
  },
  getAll() { return db.users.map(u => ({ username: u.username, role: u.role, createdAt: u.createdAt })); },
  remove(username) { db.users = db.users.filter(u => u.username !== username); markDirty(); }
};

const pwRequests = {
  create(username, newPwHash) {
    db.passwordRequests.push({ id: Date.now(), username, newPasswordHash: newPwHash, status: 'pending', createdAt: new Date().toISOString(), resolvedAt: null });
    markDirty();
  },
  getAll() { return db.passwordRequests.slice().reverse(); },
  resolve(id, status) {
    const r = db.passwordRequests.find(x => x.id === id);
    if (r) { r.status = status; r.resolvedAt = new Date().toISOString(); markDirty(); }
    return r;
  }
};

const tickets = {
  create(subject, createdBy) {
    db.ticketCounter = (db.ticketCounter || 0) + 1;
    const ticket = { id: Date.now(), ticketNumber: db.ticketCounter, subject, status: 'open', createdBy: createdBy || 'system', createdAt: new Date().toISOString() };
    db.tickets.push(ticket);
    markDirty();
    return ticket;
  },
  getAll() { return db.tickets.slice().reverse(); },
  getByNumber(num) { return db.tickets.find(t => t.ticketNumber === num); },
  getById(id) { return db.tickets.find(t => t.id === id); },
  close(id) { const t = db.tickets.find(x => x.id === id); if (t) { t.status = 'closed'; markDirty(); } },
  reopen(id) { const t = db.tickets.find(x => x.id === id); if (t) { t.status = 'open'; markDirty(); } },
  openCount() { return db.tickets.filter(t => t.status === 'open').length; }
};

const ticketMessages = {
  add(ticketId, author, content, source) {
    db.ticketMessages.push({ id: Date.now(), ticketId, author: author || 'system', content, source: source || 'web', createdAt: new Date().toISOString() });
    markDirty();
  },
  getByTicketId(ticketId) { return db.ticketMessages.filter(m => m.ticketId === ticketId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
};

const news = {
  getAll() { return db.news.slice().reverse(); },
  add(title, text, image, date, author) {
    db.news.push({ id: Date.now(), title, text, image: image || '', date, author: author || 'Admin' });
    markDirty();
  },
  del(id) { db.news = db.news.filter(n => n.id !== id); markDirty(); }
};

const shifts = {
  getAll() { return db.shifts.slice().reverse(); },
  add(title, date, desc, time, image, plan) {
    db.shifts.push({ id: Date.now(), title, date: date || '', desc: desc || '', time, image: image || '', plan: plan ? 1 : 0 });
    markDirty();
  },
  update(id, title, date, desc, time, image, plan) {
    const s = db.shifts.find(x => x.id === id);
    if (s) { Object.assign(s, { title, date: date || '', desc: desc || '', time, image: image || '', plan: plan ? 1 : 0 }); markDirty(); }
  },
  del(id) { db.shifts = db.shifts.filter(s => s.id !== id); markDirty(); }
};

const applications = {
  getAll() { return db.applications.slice().reverse(); },
  add(uid, stelleId, data, datum) {
    db.applications.push({ id: Date.now(), uid, stelleId, data, datum, status: 'pending', adminNote: '', adminNoteBy: '' });
    markDirty();
  },
  updateStatus(id, status, note, noteBy) {
    const a = db.applications.find(x => x.id === id);
    if (a) { a.status = status; if (note) { a.adminNote = note; a.adminNoteBy = noteBy || ''; } markDirty(); }
  }
};

const config = {
  get() { return db.stellenOpen || { tf: true, fdl: true }; },
  set(val) { db.stellenOpen = val; markDirty(); }
};

module.exports = { saveDB, users, pwRequests, tickets, ticketMessages, news, shifts, applications, config };
