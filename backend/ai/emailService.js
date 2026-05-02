const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter using SMTP settings from environment
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const FROM_ADDRESS = `"EventHub" <${process.env.SMTP_USER}>`;

// ─── Shared HTML wrapper ──────────────────────────────────────────────────────
const emailWrapper = (bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EventHub</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">🎉 EventHub</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} EventHub. You received this because you registered for an event.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ─── Certificate block (reused in thank-you email) ────────────────────────────
const certificateBlock = (userName, eventTitle, eventDate, eventLocation) => `
<table width="100%" cellpadding="0" cellspacing="0" style="border:3px solid #6366f1;border-radius:12px;padding:0;margin:24px 0;background:linear-gradient(135deg,#f8f7ff,#ede9fe);">
  <tr>
    <td style="padding:28px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#6366f1;font-weight:700;">Certificate of Attendance</p>
      <p style="margin:0 0 16px;font-size:11px;color:#94a3b8;">This certifies that</p>
      <h2 style="margin:0 0 16px;font-size:26px;color:#1e293b;font-weight:800;">${userName}</h2>
      <p style="margin:0 0 8px;font-size:14px;color:#64748b;">has successfully attended</p>
      <h3 style="margin:0 0 16px;font-size:18px;color:#4f46e5;font-weight:700;">${eventTitle}</h3>
      <p style="margin:0;font-size:13px;color:#64748b;">${new Date(eventDate).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}${eventLocation ? ' &bull; ' + eventLocation : ''}</p>
      <div style="margin-top:20px;border-top:1px dashed #c4b5fd;padding-top:16px;">
        <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:1px;">✦ OFFICIALLY AWARDED BY EVENTHUB ✦</p>
      </div>
    </td>
  </tr>
</table>`;

// ─── Email: Event reminder ────────────────────────────────────────────────────
const sendEventReminder = async ({ to, userName, eventTitle, eventDate, eventLocation, minutesLeft }) => {
  const transporter = createTransporter();

  let urgencyText, urgencyColor, emoji;
  if (minutesLeft <= 2) {
    urgencyText = '🔴 Join Now! Event starts in 2 minutes!';
    urgencyColor = '#ef4444';
    emoji = '🚨';
  } else if (minutesLeft <= 10) {
    urgencyText = '🟠 10 minutes left — get ready!';
    urgencyColor = '#f59e0b';
    emoji = '⏰';
  } else {
    urgencyText = '🟡 Your event starts in 30 minutes';
    urgencyColor = '#6366f1';
    emoji = '📅';
  }

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">${emoji} Event Reminder</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">Hi <strong>${userName}</strong>, your event is coming up!</p>

    <div style="background:#f8fafc;border-left:4px solid ${urgencyColor};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:16px;font-weight:700;color:${urgencyColor};">${urgencyText}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:0;margin-bottom:24px;">
      <tr><td style="padding:20px;">
        <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;">Event</p>
        <p style="margin:0 0 14px;font-size:17px;font-weight:700;color:#1e293b;">${eventTitle}</p>
        <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;">Date &amp; Time</p>
        <p style="margin:0 0 14px;font-size:15px;color:#334155;">${new Date(eventDate).toLocaleString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
        ${eventLocation ? `<p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;">Location</p>
        <p style="margin:0;font-size:15px;color:#334155;">📍 ${eventLocation}</p>` : ''}
      </td></tr>
    </table>

    ${minutesLeft <= 2 ? `<div style="text-align:center;margin-bottom:16px;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/attendance/user-qr.html" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 32px;border-radius:10px;">🚀 Open My QR Pass Now</a>
    </div>` : `<div style="text-align:center;margin-bottom:16px;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/attendance/user-qr.html" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 28px;border-radius:10px;">🎟️ View My QR Pass</a>
    </div>`}`;

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: `${emoji} ${minutesLeft <= 2 ? 'JOIN NOW!' : `${minutesLeft} mins left –`} ${eventTitle}`,
    html: emailWrapper(body)
  });
};

// ─── Email: QR code (sent on registration approval) ───────────────────────────
const sendQRCodeEmail = async ({ to, userName, eventTitle, eventDate, eventLocation, qrDataUrl, token }) => {
  const transporter = createTransporter();

  // Embed QR as inline attachment
  const attachments = [];
  let qrImgTag = '';

  if (qrDataUrl && qrDataUrl.startsWith('data:image/png;base64,')) {
    const base64Data = qrDataUrl.replace('data:image/png;base64,', '');
    attachments.push({
      filename: 'qr-pass.png',
      content: base64Data,
      encoding: 'base64',
      cid: 'qrcode@eventhub'
    });
    qrImgTag = `<img src="cid:qrcode@eventhub" alt="Your QR Pass" style="display:block;margin:0 auto;border:8px solid #fff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.12);max-width:220px;" />`;
  }

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">🎟️ Your QR Pass is Ready!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">
      Hi <strong>${userName}</strong>, your registration for <strong>${eventTitle}</strong> has been <span style="color:#10b981;font-weight:700;">approved</span>!
      Here is your personal QR pass for check-in on the day of the event.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:0;margin-bottom:24px;">
      <tr><td style="padding:20px;">
        <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;">Event</p>
        <p style="margin:0 0 14px;font-size:17px;font-weight:700;color:#1e293b;">${eventTitle}</p>
        <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;">Date</p>
        <p style="margin:0 0 14px;font-size:15px;color:#334155;">${new Date(eventDate).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
        ${eventLocation ? `<p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;">Location</p>
        <p style="margin:0;font-size:15px;color:#334155;">📍 ${eventLocation}</p>` : ''}
      </td></tr>
    </table>

    <div style="text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:13px;color:#64748b;">Show this QR code to event staff at check-in</p>
      ${qrImgTag || `<a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/attendance/user-qr.html" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 28px;border-radius:10px;">View My QR Pass Online</a>`}
      ${token ? `<p style="margin:12px 0 0;font-size:11px;color:#94a3b8;">Token: ${token.slice(0, 8)}…</p>` : ''}
    </div>

    <div style="background:#ecfdf5;border-radius:10px;padding:14px 18px;border:1px solid #a7f3d0;">
      <p style="margin:0;font-size:13px;color:#065f46;">💡 <strong>Tip:</strong> Save this email or bookmark your QR pass page for easy access on event day.</p>
    </div>`;

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: `🎟️ Your QR Pass for ${eventTitle}`,
    html: emailWrapper(body),
    attachments
  });
};

// ─── Email: Thank you + certificate (sent after check-in) ────────────────────
const sendThankYouEmail = async ({ to, userName, eventTitle, eventDate, eventLocation }) => {
  const transporter = createTransporter();

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#1e293b;">🎊 Thank You for Attending!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">
      Hi <strong>${userName}</strong>, thank you for joining <strong>${eventTitle}</strong>!
      Your attendance has been recorded and your certificate of attendance is ready below.
    </p>

    ${certificateBlock(userName, eventTitle, eventDate, eventLocation)}

    <div style="background:#eff6ff;border-radius:10px;padding:14px 18px;border:1px solid #bfdbfe;margin-top:16px;">
      <p style="margin:0;font-size:13px;color:#1e40af;">🌟 We hope you had a great experience. Look out for future events on EventHub!</p>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events.html" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 28px;border-radius:10px;">Browse More Events</a>
    </div>`;

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: `🎊 Thank you for attending ${eventTitle}! Your certificate is here`,
    html: emailWrapper(body)
  });
};

module.exports = { sendEventReminder, sendQRCodeEmail, sendThankYouEmail };
