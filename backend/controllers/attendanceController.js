const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

// Get or create a QR token for the authenticated user for a specific event
const getOrCreateToken = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Check the event exists
    const [events] = await pool.query('SELECT * FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check user is registered (approved) for this event
    const [registrations] = await pool.query(
      "SELECT * FROM registrations WHERE user_id = ? AND event_id = ? AND status = 'approved'",
      [userId, eventId]
    );
    if (registrations.length === 0) {
      return res.status(403).json({ error: 'You are not an approved participant for this event' });
    }

    // Check for existing token
    const [existing] = await pool.query(
      'SELECT * FROM attendance_tokens WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );

    let token;
    let checkedIn;
    let checkedInAt;

    if (existing.length > 0) {
      token = existing[0].token;
      checkedIn = !!existing[0].checked_in;
      checkedInAt = existing[0].checked_in_at;
    } else {
      // Generate new token
      token = uuidv4();
      await pool.query(
        'INSERT INTO attendance_tokens (user_id, event_id, token) VALUES (?, ?, ?)',
        [userId, eventId, token]
      );
      checkedIn = false;
      checkedInAt = null;
    }

    // Generate QR code as data URL server-side
    const qrDataUrl = await QRCode.toDataURL(token, {
      width: 220,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' }
    });

    res.json({
      token,
      qr_data_url: qrDataUrl,
      checked_in: checkedIn,
      checked_in_at: checkedInAt,
      user_id: userId,
      event_id: parseInt(eventId),
      event_title: events[0].title
    });
  } catch (error) {
    console.error('Failed to get or create token:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: scan a token and mark the user as checked in
const checkIn = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const [rows] = await pool.query(
      `SELECT at.*, u.name as user_name, u.email as user_email, e.title as event_title
       FROM attendance_tokens at
       JOIN users u ON at.user_id = u.id
       JOIN events e ON at.event_id = e.id
       WHERE at.token = ?`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invalid QR code' });
    }

    const record = rows[0];

    if (record.checked_in) {
      return res.status(200).json({
        already_checked_in: true,
        user_name: record.user_name,
        user_email: record.user_email,
        event_title: record.event_title,
        checked_in_at: record.checked_in_at
      });
    }

    await pool.query(
      'UPDATE attendance_tokens SET checked_in = TRUE, checked_in_at = NOW() WHERE token = ?',
      [token]
    );

    res.json({
      success: true,
      user_name: record.user_name,
      user_email: record.user_email,
      event_title: record.event_title,
      checked_in_at: new Date()
    });
  } catch (error) {
    console.error('Check-in failed:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: get all attendees (checked in or not) for an event
const getEventAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;

    const [events] = await pool.query('SELECT * FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const [rows] = await pool.query(
      `SELECT at.token, at.checked_in, at.checked_in_at, at.created_at,
              u.id as user_id, u.name as user_name, u.email as user_email
       FROM attendance_tokens at
       JOIN users u ON at.user_id = u.id
       WHERE at.event_id = ?
       ORDER BY at.checked_in DESC, at.checked_in_at DESC`,
      [eventId]
    );

    res.json({ event: events[0], attendees: rows });
  } catch (error) {
    console.error('Failed to get event attendance:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: get attendance summary across all events
const getAllAttendance = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT at.token, at.checked_in, at.checked_in_at,
              u.id as user_id, u.name as user_name, u.email as user_email,
              e.id as event_id, e.title as event_title, e.date as event_date
       FROM attendance_tokens at
       JOIN users u ON at.user_id = u.id
       JOIN events e ON at.event_id = e.id
       ORDER BY e.date DESC, at.checked_in DESC, at.checked_in_at DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error('Failed to get all attendance:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getOrCreateToken, checkIn, getEventAttendance, getAllAttendance };

