const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { sendQRCodeEmail } = require('../ai/emailService');

const registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const [events] = await pool.query('SELECT * FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const [existing] = await pool.query(
      'SELECT * FROM registrations WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already registered for this event', status: existing[0].status });
    }

    await pool.query(
      'INSERT INTO registrations (user_id, event_id, status) VALUES (?, ?, ?)',
      [userId, eventId, 'pending']
    );

    res.status(201).json({ message: 'Registration request submitted', status: 'pending' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserRegistrations = async (req, res) => {
  try {
    const userId = req.user.id;

    const [registrations] = await pool.query(`
      SELECT r.*, e.title, e.description, e.date, e.location,
        u.name as created_by_name
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [userId]);

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const cancelRegistration = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const [result] = await pool.query(
      'DELETE FROM registrations WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    res.json({ message: 'Registration cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;

    const [registrations] = await pool.query(`
      SELECT r.*, u.name, u.email, u.created_at as user_created_at
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = ?
      ORDER BY r.created_at DESC
    `, [eventId]);

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const updateRegistrationStatus = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [result] = await pool.query(
      'UPDATE registrations SET status = ? WHERE id = ?',
      [status, registrationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    // When approving, generate / retrieve the QR token and email it to the user
    if (status === 'approved') {
      try {
        const [regRows] = await pool.query(
          `SELECT r.user_id, r.event_id, u.name as user_name, u.email as user_email,
                  e.title as event_title, e.date as event_date, e.location as event_location
           FROM registrations r
           JOIN users u ON r.user_id = u.id
           JOIN events e ON r.event_id = e.id
           WHERE r.id = ?`,
          [registrationId]
        );

        if (regRows.length > 0) {
          const reg = regRows[0];

          // Get or create attendance token
          let token;
          const [existingToken] = await pool.query(
            'SELECT token FROM attendance_tokens WHERE user_id = ? AND event_id = ?',
            [reg.user_id, reg.event_id]
          );

          if (existingToken.length > 0) {
            token = existingToken[0].token;
          } else {
            token = uuidv4();
            await pool.query(
              'INSERT INTO attendance_tokens (user_id, event_id, token) VALUES (?, ?, ?)',
              [reg.user_id, reg.event_id, token]
            );
          }

          // Generate QR data URL
          const qrDataUrl = await QRCode.toDataURL(token, {
            width: 220,
            margin: 2,
            color: { dark: '#1e293b', light: '#ffffff' }
          });

          // Send QR code email (non-blocking)
          sendQRCodeEmail({
            to: reg.user_email,
            userName: reg.user_name,
            eventTitle: reg.event_title,
            eventDate: reg.event_date,
            eventLocation: reg.event_location,
            qrDataUrl,
            token
          }).catch(err => console.error('[Email] Failed to send QR code email:', err.message));
        }
      } catch (emailErr) {
        console.error('[Email] Error preparing QR email:', emailErr.message);
      }
    }

    res.json({ message: `Registration ${status} successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllRegistrations = async (req, res) => {
  try {
    const [registrations] = await pool.query(`
      SELECT r.*, u.name as user_name, u.email as user_email,
        e.title as event_title, e.date as event_date
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      JOIN events e ON r.event_id = e.id
      ORDER BY r.created_at DESC
    `);

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  registerForEvent,
  getUserRegistrations,
  cancelRegistration,
  getEventRegistrations,
  updateRegistrationStatus,
  getAllRegistrations
};