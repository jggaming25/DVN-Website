const express = require('express');
const router = express.Router();
const { pwRequests, users } = require('../database');
const { requireAdmin } = require('../middleware/auth');
const crypto = require('../services/crypto');
const emailService = require('../services/email');

router.post('/request', (req, res) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword) return res.status(400).json({ error: 'Felder erforderlich' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Passwort mindestens 6 Zeichen' });

  const hash = crypto.hashPassword(newPassword);
  pwRequests.create(username, hash);
  emailService.sendPasswordRequest(username, newPassword);

  res.json({ ok: true, message: 'Anfrage eingereicht. Der Admin wird benachrichtigt.' });
});

router.get('/', requireAdmin, (req, res) => {
  res.json(pwRequests.getAll());
});

router.post('/:id/approve', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const request = pwRequests.resolve(id, 'approved');
  if (!request) return res.status(404).json({ error: 'Anfrage nicht gefunden' });
  users.upsert(request.username, null, request.newPasswordHash);
  res.json({ ok: true });
});

router.post('/:id/reject', requireAdmin, (req, res) => {
  pwRequests.resolve(parseInt(req.params.id), 'rejected');
  res.json({ ok: true });
});

module.exports = router;
