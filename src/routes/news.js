const express = require('express');
const router = express.Router();
const { news } = require('../database');
const { requireAdmin } = require('../middleware/auth');

router.get('/', (req, res) => {
  res.json(news.getAll());
});

router.post('/', requireAdmin, (req, res) => {
  const { title, text, image, author } = req.body;
  if (!title || !text) return res.status(400).json({ error: 'Titel und Text erforderlich' });
  news.add(title, text, image || '', new Date().toLocaleDateString('de-DE'), author || 'Admin');
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  news.del(parseInt(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
