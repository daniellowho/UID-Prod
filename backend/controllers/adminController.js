const { pool } = require('../config/database');
const { sendCustomEmail } = require('../ai/emailService');

const getAnalytics = async (req, res) => {
  try {
    const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "user"');
    const [totalEvents] = await pool.query('SELECT COUNT(*) as count FROM events');
    const [totalRegistrations] = await pool.query('SELECT COUNT(*) as count FROM registrations');

    const [pendingRequests] = await pool.query('SELECT COUNT(*) as count FROM registrations WHERE status = "pending"');
    const [approvedRegistrations] = await pool.query('SELECT COUNT(*) as count FROM registrations WHERE status = "approved"');
    const [deniedRegistrations] = await pool.query('SELECT COUNT(*) as count FROM registrations WHERE status = "denied"');

    const [eventParticipation] = await pool.query(`
      SELECT e.id, e.title, e.date,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN r.status = 'denied' THEN 1 END) as denied_count,
        COUNT(r.id) as total_registrations
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id
      GROUP BY e.id, e.title, e.date
      ORDER BY e.date ASC
    `);

    const [recentRegistrations] = await pool.query(`
      SELECT r.*, u.name as user_name, u.email as user_email,
        e.title as event_title
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      JOIN events e ON r.event_id = e.id
      ORDER BY r.created_at DESC
      LIMIT 10
    `);

    res.json({
      totals: {
        users: totalUsers[0].count,
        events: totalEvents[0].count,
        registrations: totalRegistrations[0].count,
        pendingRequests: pendingRequests[0].count,
        approved: approvedRegistrations[0].count,
        denied: deniedRegistrations[0].count
      },
      eventParticipation,
      recentRegistrations
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.created_at,
        COUNT(r.id) as registration_count,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_count
      FROM users u
      LEFT JOIN registrations r ON u.id = r.user_id
      WHERE u.role = 'user'
      GROUP BY u.id, u.name, u.email, u.role, u.created_at
      ORDER BY u.created_at DESC
    `);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getEmailLogs = async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 500`
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const sendAdminEmail = async (req, res) => {
  try {
    const { recipients, subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    let targets = [];

    if (!recipients || recipients === 'all') {
      // Send to all non-admin users
      const [users] = await pool.query(
        "SELECT id, name, email FROM users WHERE role = 'user'"
      );
      targets = users;
    } else if (Array.isArray(recipients)) {
      // recipients is an array of user ids
      if (recipients.length === 0) {
        return res.status(400).json({ error: 'No recipients selected' });
      }
      const placeholders = recipients.map(() => '?').join(',');
      const [users] = await pool.query(
        `SELECT id, name, email FROM users WHERE id IN (${placeholders}) AND role = 'user'`,
        recipients
      );
      targets = users;
    } else {
      return res.status(400).json({ error: 'Invalid recipients value' });
    }

    if (targets.length === 0) {
      return res.status(400).json({ error: 'No valid recipients found' });
    }

    const results = await Promise.allSettled(
      targets.map(user =>
        sendCustomEmail({ to: user.email, recipientName: user.name, subject, message })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({ message: `Email sent to ${sent} user(s)${failed > 0 ? `, ${failed} failed` : ''}.`, sent, failed });
  } catch (error) {
    console.error('sendAdminEmail error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAnalytics, getAllUsers, getEmailLogs, sendAdminEmail };