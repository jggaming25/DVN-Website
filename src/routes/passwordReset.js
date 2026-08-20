const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { users } = require('../database');
const emailService = require('../services/email');
const pwCrypto = require('../services/crypto');

router.post('/request', (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) return res.status(400).json({ error: 'Benutzername und E-Mail erforderlich' });

  const user = users.get(username);
  if (!user || !user.email || user.email.toLowerCase() !== email.toLowerCase()) {
    return res.json({ ok: true, message: 'Wenn Benutzername und E-Mail übereinstimmen, erhalten Sie eine E-Mail zum Zurücksetzen.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  users.setResetToken(username, token, expiry);

  const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
  emailService.sendPasswordReset(user.email, username, resetUrl);

  res.json({ ok: true, message: 'Wenn Benutzername und E-Mail übereinstimmen, erhalten Sie eine E-Mail zum Zurücksetzen.' });
});

router.post('/verify-token', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token erforderlich' });

  const user = users.getByResetToken(token);
  if (!user) return res.status(400).json({ error: 'Link abgelaufen oder ungültig' });
  res.json({ ok: true, username: user.username });
});

router.post('/reset', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token und neues Passwort erforderlich' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Passwort mindestens 6 Zeichen' });

  const user = users.getByResetToken(token);
  if (!user) return res.status(400).json({ error: 'Link abgelaufen oder ungültig' });

  const hash = pwCrypto.hashPassword(newPassword);
  users.upsert(user.username, null, hash);
  users.clearResetToken(user.username);

  res.json({ ok: true, message: 'Passwort erfolgreich zurückgesetzt. Sie können sich jetzt anmelden.' });
});

module.exports = router;
