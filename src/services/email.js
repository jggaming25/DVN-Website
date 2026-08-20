const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || process.env.SMTP_USER.includes('deine-email')) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return transporter;
}

async function sendPasswordRequest(username, newPwPlain) {
  const transport = getTransporter();
  if (!transport) { console.log('[EMAIL] SMTP nicht konfiguriert'); return false; }
  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || 'DVN <noreply@dvn.de>',
      to: process.env.ADMIN_EMAIL,
      subject: `Passwort-Aenderungsanfrage: ${username}`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;background:#f8f9fc;border-radius:12px">
        <div style="background:linear-gradient(135deg,#c62828,#8e0000);color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center"><h2 style="margin:0">Passwort-Aenderungsanfrage</h2></div>
        <div style="background:#fff;padding:20px;border-radius:0 0 12px 12px;border:1px solid #e8ecf4">
          <p style="color:#475467;font-size:14px">Ein Nutzer hat eine Passwort-Aenderung angefordert:</p>
          <table style="width:100%;border-collapse:collapse;margin:15px 0">
            <tr><td style="padding:8px;color:#667085;font-weight:600">Benutzername:</td><td style="padding:8px;color:#1d2939">${username}</td></tr>
            <tr><td style="padding:8px;color:#667085;font-weight:600">Neues Passwort:</td><td style="padding:8px;color:#1d2939;font-family:monospace;background:#f1f3f8;border-radius:4px">${newPwPlain}</td></tr>
            <tr><td style="padding:8px;color:#667085;font-weight:600">Zeitpunkt:</td><td style="padding:8px;color:#1d2939">${new Date().toLocaleString('de-DE')}</td></tr>
          </table>
          <p style="color:#98a2b3;font-size:12px;margin-top:15px">Genehmigen oder ablehnen ueber das Admin-Panel der DVN Website.</p>
        </div>
      </div>`
    });
    console.log(`[EMAIL] PW-Request an ${process.env.ADMIN_EMAIL} gesendet fuer ${username}`);
    return true;
  } catch (e) {
    console.error('[EMAIL] Fehler:', e.message);
    return false;
  }
}

async function sendPasswordReset(email, username, resetUrl) {
  const transport = getTransporter();
  if (!transport) { console.log('[EMAIL] SMTP nicht konfiguriert - Reset-Link nicht gesendet'); return false; }
  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || 'DVN <noreply@dvn.de>',
      to: email,
      subject: 'DVN - Passwort zuruecksetzen',
      html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;background:#f8f9fc;border-radius:12px">
        <div style="background:linear-gradient(135deg,#c62828,#8e0000);color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center"><h2 style="margin:0">Passwort zuruecksetzen</h2></div>
        <div style="background:#fff;padding:20px;border-radius:0 0 12px 12px;border:1px solid #e8ecf4">
          <p style="color:#475467;font-size:14px">Hallo <strong>${username}</strong>,</p>
          <p style="color:#475467;font-size:14px">Sie haben eine Passwort-Zuruecksetzung angefordert. Klicken Sie auf den Button, um ein neues Passwort festzulegen:</p>
          <div style="text-align:center;margin:25px 0">
            <a href="${resetUrl}" style="display:inline-block;padding:12px 30px;background:linear-gradient(135deg,#c62828,#8e0000);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">Neues Passwort festlegen</a>
          </div>
          <p style="color:#98a2b3;font-size:12px">Der Link ist 1 Gueltig. Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.</p>
          <p style="color:#98a2b3;font-size:12px">Link: <a href="${resetUrl}">${resetUrl}</a></p>
        </div>
      </div>`
    });
    console.log(`[EMAIL] Reset-Link an ${email} gesendet fuer ${username}`);
    return true;
  } catch (e) {
    console.error('[EMAIL] Reset-Link Fehler:', e.message);
    return false;
  }
}

async function sendTicketNotification(ticketNumber, subject, author, content) {
  const transport = getTransporter();
  if (!transport) return false;
  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || 'DVN <noreply@dvn.de>',
      to: process.env.ADMIN_EMAIL,
      subject: `Ticket #${ticketNumber} - ${subject}`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;background:#f8f9fc;border-radius:12px">
        <div style="background:linear-gradient(135deg,#c62828,#8e0000);color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center"><h2 style="margin:0">Neue Ticket-Nachricht</h2></div>
        <div style="background:#fff;padding:20px;border-radius:0 0 12px 12px;border:1px solid #e8ecf4">
          <p style="color:#475467;font-size:14px"><strong>Ticket #${ticketNumber}</strong> - ${subject}</p>
          <p style="color:#667085;font-size:13px">Von: ${author} | Quelle: Web</p>
          <div style="background:#f1f3f8;padding:12px;border-radius:8px;margin:10px 0;color:#1d2939;font-size:13px;white-space:pre-wrap">${content}</div>
        </div>
      </div>`
    });
    return true;
  } catch (e) {
    console.error('[EMAIL] Ticket-Notification Fehler:', e.message);
    return false;
  }
}

module.exports = { sendPasswordRequest, sendPasswordReset, sendTicketNotification };
