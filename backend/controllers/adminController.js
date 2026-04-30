const { pool } = require('../config/database');

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

module.exports = { getAnalytics, getAllUsers };