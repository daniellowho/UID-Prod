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

    // Total registrations per event (GROUP BY) — used for bar chart
    const [eventParticipation] = await pool.query(`
      SELECT e.id, e.title, e.date, e.max_capacity,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN r.status = 'denied' THEN 1 END) as denied_count,
        COUNT(r.id) as total_registrations
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id
      GROUP BY e.id, e.title, e.date, e.max_capacity
      ORDER BY e.date ASC
    `);

    // Average rating and count of feedback responses per event
    const [feedbackByEvent] = await pool.query(`
      SELECT e.id as event_id, e.title,
        ROUND(AVG(f.rating), 2) as avg_rating,
        COUNT(f.id) as feedback_count,
        SUM(CASE WHEN f.would_recommend = 1 THEN 1 ELSE 0 END) as recommend_yes,
        SUM(CASE WHEN f.would_recommend = 0 THEN 1 ELSE 0 END) as recommend_no
      FROM events e
      LEFT JOIN feedback f ON f.event_id = e.id
      GROUP BY e.id, e.title
      HAVING feedback_count > 0
      ORDER BY avg_rating DESC
    `);

    // Events that exceeded capacity
    const [exceededCapacity] = await pool.query(`
      SELECT e.id, e.title, e.max_capacity,
        COUNT(r.id) as approved_count
      FROM events e
      JOIN registrations r ON e.id = r.event_id AND r.status = 'approved'
      WHERE e.max_capacity IS NOT NULL
      GROUP BY e.id, e.title, e.max_capacity
      HAVING approved_count >= e.max_capacity
      ORDER BY approved_count DESC
    `);

    // Students who registered (approved) but did not submit feedback
    const [noFeedback] = await pool.query(`
      SELECT u.id, u.name, u.email, u.roll_number, u.department,
        e.id as event_id, e.title as event_title, e.date as event_date
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      JOIN events e ON r.event_id = e.id
      LEFT JOIN feedback f ON f.event_id = e.id AND f.user_id = u.id
      WHERE r.status = 'approved'
        AND e.date < CURDATE()
        AND f.id IS NULL
      ORDER BY e.date DESC, u.name ASC
      LIMIT 100
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
      feedbackByEvent,
      exceededCapacity,
      noFeedback,
      recentRegistrations
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.roll_number, u.department, u.created_at,
        COUNT(r.id) as registration_count,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_count
      FROM users u
      LEFT JOIN registrations r ON u.id = r.user_id
      WHERE u.role = 'user'
      GROUP BY u.id, u.name, u.email, u.role, u.roll_number, u.department, u.created_at
      ORDER BY u.created_at DESC
    `);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const sendEmail = async (req, res) => {
  try {
    const { to, recipientName, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'to, subject, and message are required' });
    }

    await sendCustomEmail({ to, recipientName, subject, message });
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('[Admin] Failed to send custom email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
};

module.exports = { getAnalytics, getAllUsers, sendEmail };