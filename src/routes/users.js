const express = require('express');
const router = express.Router();
const { users } = require('../database');
const { requireAdmin } = require('../middleware/auth');
const crypto = require('../services/crypto');

router.get('/', requireAdmin, (req, res) => {
  res.json(users.getAll ? users.getAll() : []);
});

router.post('/', requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
  if (password.length < 6) return res.status(400).json({ error: 'Passwort mindestens 6 Zeichen' });
  if (users.get(username)) return res.status(400).json({ error: 'Benutzername existiert bereits' });

  const hash = crypto.hashPassword(password);
  users.upsert(username, role || 'user', hash);
  res.json({ ok: true });
});

router.delete('/:username', requireAdmin, (req, res) => {
  const { username } = req.params;
  if (username === 'jggaming2518') return res.status(400).json({ error: 'Admin kann nicht gelöscht werden' });
  users.remove(username);
  res.json({ ok: true });
});

module.exports = router;
