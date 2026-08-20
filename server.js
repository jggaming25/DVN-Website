const express = require('express');
const session = require('express-session');
const path = require('path');
const config = require('./src/config');
const { config: dbConfig } = require('./src/database');

const app = express();

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/password-requests', require('./src/routes/passwordRequests'));
app.use('/api/password-reset', require('./src/routes/passwordReset'));
app.use('/api/tickets', require('./src/routes/tickets'));
app.use('/api/news', require('./src/routes/news'));
app.use('/api/shifts', require('./src/routes/shifts'));
app.use('/api/applications', require('./src/routes/applications'));
app.use('/api/users', require('./src/routes/users'));

app.get('/api/config', (req, res) => {
  res.json({ stellenOpen: dbConfig.get() });
});

app.post('/api/config/stellen', require('./src/middleware/auth').requireAdmin, (req, res) => {
  dbConfig.set(req.body);
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(config.port, () => {
  console.log(`[DVN] Server läuft auf http://localhost:${config.port}`);
});
