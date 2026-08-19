require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'dvn-fallback-secret',
  adminUsernames: (process.env.ADMIN_USERNAMES || 'jggaming2518').split(',').map(s => s.trim())
};
