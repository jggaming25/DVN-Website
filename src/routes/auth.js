const express = require('express');
const router = express.Router();
const config = require('../config');
const { users } = require('../database');
const crypto = require('../services/crypto');

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Felder erforderlich' });

  let user = users.get(username);
  if (user && user.backupPasswordHash) {
    if (!crypto.comparePassword(password, user.backupPasswordHash)) {
      return res.status(401).json({ error: 'Falscher Benutzername oder Passwort' });
    }
  } else {
    if (!config.adminUsernames.includes(username)) {
      return res.status(401).json({ error: 'Falscher Benutzername oder Passwort' });
    }
    const hash = crypto.hashPassword(password);
    user = users.upsert(username, 'admin', hash);
  }

  req.session.user = { username, role: user.role || 'admin' };
  res.json({ ok: true, username, role: user.role || 'admin', email: user.email || null, needsEmail: !user.email });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  if (!req.session?.user) return res.json({ loggedIn: false });
  const user = users.get(req.session.user.username);
  res.json({ loggedIn: true, ...req.session.user, email: user?.email || null, needsEmail: !user?.email });
});

router.post('/set-email', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Nicht angemeldet' });
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Gültige E-Mail-Adresse erforderlich' });
  users.setEmail(req.session.user.username, email);
  req.session.user.email = email;
  res.json({ ok: true });
});

module.exports = router;
