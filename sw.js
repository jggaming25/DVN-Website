const DB_URL = 'https://dvn-website-9ce7a-default-rtdb.firebaseio.com';
const PATHS = ['dvn_shifts','dvn_strafen','dvn_news','dvn_staff_news','dvn_shiftplans','dvn_applications','dvn_perm_overrides','dvn_tickets'];
let cache = {};
let user = '';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('message', e => {
  const d = e.data;
  if (!d) return;
  if (d.type === 'config') {
    user = d.user || '';
    if (d.enabled && Object.keys(activeConnections).length === 0) startAll();
    if (!d.enabled) stopAll();
  }
});

const activeConnections = {};
const retryTimers = {};

function stopAll() {
  Object.keys(activeConnections).forEach(path => {
    if (activeConnections[path]) activeConnections[path].abort();
  });
  Object.keys(activeConnections).forEach(k => delete activeConnections[k]);
  Object.keys(retryTimers).forEach(k => { clearTimeout(retryTimers[k]); delete retryTimers[k]; });
}

function startAll() {
  PATHS.forEach(path => listenSSE(path));
}

async function listenSSE(path) {
  if (retryTimers[path]) { clearTimeout(retryTimers[path]); delete retryTimers[path]; }
  if (activeConnections[path]) activeConnections[path].abort();

  const controller = new AbortController();
  activeConnections[path] = controller;

  try {
    const resp = await fetch(`${DB_URL}/${path}.json`, {
      signal: controller.signal,
      headers: { 'Accept': 'text/event-stream' }
    });

    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let currentEvent = '';
    let currentData = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          currentData = line.slice(6).trim();
        } else if (line === '' && currentData) {
          if (currentEvent === 'put' || currentEvent === 'patch') {
            try {
              const parsed = JSON.parse(currentData);
              const newData = parsed.data;
              const oldData = cache[path] || null;
              if (oldData !== null && JSON.stringify(oldData) !== JSON.stringify(newData)) {
                checkAndNotify(path, oldData, newData);
              }
              cache[path] = newData;
            } catch (e) {}
          }
          currentEvent = '';
          currentData = '';
        }
      }
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }

  delete activeConnections[path];
  retryTimers[path] = setTimeout(() => listenSSE(path), 10000);
}

const pendingNotif = {};
function checkAndNotify(path, oldData, newData) {
  if (!user) return;
  const oldStr = JSON.stringify(oldData);
  const newStr = JSON.stringify(newData);
  if (oldStr === newStr) return;

  let entries = [];

  if (path === 'dvn_strafen') {
    const oldList = oldData ? Object.values(oldData) : [];
    const newList = newData ? Object.values(newData) : [];
    const added = newList.filter(n => !oldList.some(o => o.id === n.id));
    for (const s of added) {
      if (s.discordName && s.discordName.toLowerCase() === user.toLowerCase()) {
        entries.push('⚠️ Strafe: '+s.totalHours+'h – '+s.reason);
      }
    }
  } else if (path === 'dvn_shifts') {
    const oldKeys = oldData ? Object.keys(oldData) : [];
    const newKeys = newData ? Object.keys(newData) : [];
    const added = newKeys.filter(k => !oldKeys.includes(k));
    added.forEach(k => {
      if (newData[k]) {
        entries.push('📅 '+(newData[k].title||'')+' ('+(newData[k].time||'')+(newData[k].date?' am '+newData[k].date:'')+')');
      }
    });
  } else if (path === 'dvn_news') {
    const oldKeys = oldData ? Object.keys(oldData) : [];
    const newKeys = newData ? Object.keys(newData) : [];
    const added = newKeys.filter(k => !oldKeys.includes(k));
    added.forEach(k => {
      entries.push('🌍 News: '+(newData[k]?.title||''));
    });
  } else if (path === 'dvn_staff_news') {
    const oldLen = Array.isArray(oldData) ? oldData.length : oldData ? Object.keys(oldData).length : 0;
    const newLen = Array.isArray(newData) ? newData.length : newData ? Object.keys(newData).length : 0;
    if (newLen > oldLen) {
      entries.push('🔒 Neue Staff-News');
    }
  } else if (path === 'dvn_applications') {
    const oldLen = Array.isArray(oldData) ? oldData.length : oldData ? Object.keys(oldData).length : 0;
    const newLen = Array.isArray(newData) ? newData.length : newData ? Object.keys(newData).length : 0;
    if (newLen > oldLen) {
      entries.push('📝 Neue Bewerbung');
    }
  } else if (path === 'dvn_perm_overrides') {
    if (oldData && newData) {
      const oldUser = oldData[user] || {};
      const newUser = newData[user] || {};
      const labels = {logs:'Logs',bewerbungen:'Bewerbungen',shiftplan:'Shiftplan',strafen:'Strafen',accounts:'Accounts'};
      for (const key of Object.keys(newUser)) {
        if (newUser[key] !== oldUser[key]) {
          entries.push('🔑 '+(labels[key]||key)+' '+(newUser[key]?'erteilt':'entzogen'));
        }
      }
    }
  } else if (path === 'dvn_tickets') {
    const oldList = oldData ? (Array.isArray(oldData) ? oldData : Object.values(oldData)) : [];
    const newList = newData ? (Array.isArray(newData) ? newData : Object.values(newData)) : [];
    const added = newList.filter(n => !oldList.some(o => o.id === n.id));
    for (const t of added) {
      if (t.author === user) {
        entries.push('🎫 Ticket #'+t.id.slice(0,6)+': '+t.title);
      }
    }
    const changed = newList.filter(n => oldList.some(o => o.id === n.id && JSON.stringify(o) !== JSON.stringify(n)));
    for (const t of changed) {
      const old = oldList.find(o => o.id === t.id);
      if (!old) continue;
      if (t.author === user) {
        if (t.status !== old.status) {
          if (t.status === 'claimed') entries.push('🔧 Ticket #'+t.id.slice(0,6)+' übernommen: '+t.title);
          else if (t.status === 'closed') {
            if (t.email && !old.email) entries.push('✅ Ticket #'+t.id.slice(0,6)+' geschlossen (Transkript gesendet): '+t.title);
            else entries.push('✅ Ticket #'+t.id.slice(0,6)+' geschlossen: '+t.title);
          }
          else if (t.status === 'open') entries.push('🔓 Ticket #'+t.id.slice(0,6)+' wieder geöffnet: '+t.title);
        }
        if (t.messages && old.messages && t.messages.length > old.messages.length) {
          const newMsgs = t.messages.slice(old.messages.length);
          for (const m of newMsgs) {
            if (m.author !== user) {
              entries.push('💬 Ticket #'+t.id.slice(0,6)+' – Neue Antwort von '+m.author+': '+t.title);
            }
            if (m.text && m.text.includes('Transkript an')) {
              entries.push('📧 Ticket #'+t.id.slice(0,6)+' – Transkript gesendet: '+t.title);
            }
          }
        } else if (!old.email && t.email && t.author === user) {
          entries.push('📧 Ticket #'+t.id.slice(0,6)+' – Transkript gesendet: '+t.title);
        }
      }
    }
  }

  if (entries.length === 0) return;

  // Add to pending notifications for this path
  if (!pendingNotif[path]) pendingNotif[path] = [];
  entries.forEach(e => pendingNotif[path].push(e));

  // Debounce: wait 3s then flush all pending for this path
  if (pendingNotif[path]._timer) clearTimeout(pendingNotif[path]._timer);
  pendingNotif[path]._timer = setTimeout(() => {
    const list = pendingNotif[path] || [];
    delete pendingNotif[path];
    let title = '';
    let body = '';
    if (list.length === 1) {
      const first = list[0];
      const sepIdx = first.indexOf(' ');
      title = sepIdx > 0 ? first.slice(0, sepIdx).trim() : '🔔';
      body = first.slice(sepIdx + 1).trim();
    } else {
      title = '📋 ' + list.length + ' Änderungen';
      body = list.map((e, i) => {
        const sep = e.indexOf(' ');
        return (i+1)+'. '+(sep > 0 ? e.slice(sep + 1).trim() : e);
      }).join('\n');
    }
    self.registration.showNotification(title, {
      body: body || '',
      icon: 'images/dvn_logo.png',
      tag: path,
      renotify: true
    });
  }, 3000);
}
