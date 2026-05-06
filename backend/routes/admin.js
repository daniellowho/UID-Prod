const express = require('express');
const router = express.Router();
const { getAnalytics, getAllUsers } = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');
const { pool } = require('../config/database');
const { sendCustomEmail } = require('../ai/emailService');

router.get('/analytics', authenticate, isAdmin, getAnalytics);
router.get('/users', authenticate, isAdmin, getAllUsers);

// ── Email logs ────────────────────────────────────────────────────────────────
router.get('/email/logs', authenticate, isAdmin, async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT id, recipient_email, recipient_name, subject, email_type, status, error_message, sent_at
       FROM email_logs
       ORDER BY sent_at DESC
       LIMIT 200`
    );
    res.json(logs);
  } catch (error) {
    console.error('Email logs error:', error);
    res.status(500).json({ error: 'Failed to fetch email logs' });
  }
});

// ── Send custom email ─────────────────────────────────────────────────────────
router.post('/email/send', authenticate, isAdmin, async (req, res) => {
  const { to, recipientName, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ error: 'to, subject, and message are required' });
  }

  try {
    await sendCustomEmail({ to, recipientName, subject, message });
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: `Failed to send email: ${error.message}` });
  }
});

module.exports = router;