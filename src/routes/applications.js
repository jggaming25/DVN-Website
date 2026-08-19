const express = require('express');
const router = express.Router();
const { applications } = require('../database');
const { requireAdmin } = require('../middleware/auth');

const STELLEN = [
  { id: 'tf', title: 'EiB L/T -> Triebfahrzeugführer' },
  { id: 'fdl', title: 'EiB ZVS -> Fahrdienstleiter' }
];

router.get('/stellen', (req, res) => {
  res.json(STELLEN);
});

router.post('/', (req, res) => {
  const { stelleId, data } = req.body;
  if (!stelleId || !data) return res.status(400).json({ error: 'Daten erforderlich' });
  const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  applications.add(uid, stelleId, data, new Date().toLocaleDateString('de-DE'));
  res.json({ ok: true });
});

router.get('/', requireAdmin, (req, res) => {
  res.json(applications.getAll());
});

router.post('/:id/status', requireAdmin, (req, res) => {
  const { status, note, noteBy } = req.body;
  applications.updateStatus(parseInt(req.params.id), status, note || '', noteBy || '');
  res.json({ ok: true });
});

module.exports = router;
