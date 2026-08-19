const express = require('express');
const router = express.Router();
const { tickets, ticketMessages } = require('../database');
const { requireAdmin } = require('../middleware/auth');
const emailService = require('../services/email');

router.post('/', (req, res) => {
  const { subject, message, author } = req.body;
  if (!subject || !message) return res.status(400).json({ error: 'Betreff und Nachricht erforderlich' });

  const ticket = tickets.create(subject, author || 'Gast');
  ticketMessages.add(ticket.id, author || 'Gast', message, 'web');

  res.json({ ok: true, ticketNumber: ticket.ticketNumber });
});

router.get('/', requireAdmin, (req, res) => {
  res.json({ tickets: tickets.getAll(), openCount: tickets.openCount() });
});

router.get('/public', (req, res) => {
  res.json({ tickets: tickets.getAll(), openCount: tickets.openCount() });
});

router.get('/:number', (req, res) => {
  const ticket = tickets.getByNumber(parseInt(req.params.number));
  if (!ticket) return res.status(404).json({ error: 'Ticket nicht gefunden' });
  const msgs = ticketMessages.getByTicketId(ticket.id);
  res.json({ ticket, messages: msgs });
});

router.post('/:number/message', (req, res) => {
  const ticket = tickets.getByNumber(parseInt(req.params.number));
  if (!ticket) return res.status(404).json({ error: 'Ticket nicht gefunden' });

  const { message, author } = req.body;
  if (!message) return res.status(400).json({ error: 'Nachricht erforderlich' });

  ticketMessages.add(ticket.id, author || 'Gast', message, 'web');
  emailService.sendTicketNotification(ticket.ticketNumber, ticket.subject, author || 'Gast', message);
  res.json({ ok: true });
});

router.post('/:number/close', requireAdmin, (req, res) => {
  const ticket = tickets.getByNumber(parseInt(req.params.number));
  if (!ticket) return res.status(404).json({ error: 'Ticket nicht gefunden' });
  tickets.close(ticket.id);
  res.json({ ok: true });
});

router.post('/:number/reopen', requireAdmin, (req, res) => {
  const ticket = tickets.getByNumber(parseInt(req.params.number));
  if (!ticket) return res.status(404).json({ error: 'Ticket nicht gefunden' });
  tickets.reopen(ticket.id);
  res.json({ ok: true });
});

module.exports = router;
