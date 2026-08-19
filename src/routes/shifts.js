const express = require('express');
const router = express.Router();
const { shifts } = require('../database');
const { requireAdmin } = require('../middleware/auth');

router.get('/', (req, res) => {
  const all = shifts.getAll();
  res.json({ plan: all.filter(s => s.plan === 1), single: all.filter(s => s.plan === 0), total: all.length });
});

router.post('/', requireAdmin, (req, res) => {
  const { title, date, time, desc, image, plan } = req.body;
  if (!title || !time) return res.status(400).json({ error: 'Titel und Zeitraum erforderlich' });
  shifts.add(title, date || '', desc || '', time, image || '', plan ? 1 : 0);
  res.json({ ok: true });
});

router.put('/:id', requireAdmin, (req, res) => {
  const { title, date, time, desc, image, plan } = req.body;
  shifts.update(parseInt(req.params.id), title, date || '', desc || '', time, image || '', plan ? 1 : 0);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  shifts.del(parseInt(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
