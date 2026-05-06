const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { sendQRCodeEmail } = require('../ai/emailService');

const registerForEvent = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // ── Transaction: prevent overbooking concurrently ──
    // START TRANSACTION locks the row with FOR UPDATE so two concurrent
    // requests cannot both pass the capacity check.
    await connection.beginTransaction();

    const [events] = await connection.query('SELECT * FROM events WHERE id = ? FOR UPDATE', [eventId]);
    if (events.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = events[0];

    // Check for duplicate registration inside the transaction
    const [existing] = await connection.query(
      'SELECT * FROM registrations WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Already registered for this event', status: existing[0].status });
    }

    // Enforce capacity limit inside the transaction (prevents overbooking)
    if (event.max_capacity) {
      const [countRows] = await connection.query(
        'SELECT COUNT(*) as cnt FROM registrations WHERE event_id = ? AND status = ?',
        [eventId, 'approved']
      );
      if (countRows[0].cnt >= event.max_capacity) {
        await connection.rollback();
        return res.status(400).json({ error: 'This event has reached its maximum capacity' });
      }
    }

    await connection.query(
      'INSERT INTO registrations (user_id, event_id, status) VALUES (?, ?, ?)',
      [userId, eventId, 'pending']
    );

    // COMMIT — only at this point is the registration made permanent.
    // If any step above failed, ROLLBACK would have undone everything.
    await connection.commit();
    res.status(201).json({ message: 'Registration request submitted', status: 'pending' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
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

    // When approving, fetch user+event details needed for QR email
    let reg = null;
    if (status === 'approved') {
      const [rows] = await pool.query(
        `SELECT r.*, u.name as user_name, u.email as user_email,
                e.title as event_title, e.date as event_date, e.location as event_location
         FROM registrations r
         JOIN users u ON r.user_id = u.id
         JOIN events e ON r.event_id = e.id
         WHERE r.id = ?`,
        [registrationId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      reg = rows[0];
    }

    const [result] = await pool.query(
      'UPDATE registrations SET status = ? WHERE id = ?',
      [status, registrationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    // On approval, generate/get attendance token and queue QR code email
    let qrPayload = null;
    if (status === 'approved' && reg) {
      const [existing] = await pool.query(
        'SELECT * FROM attendance_tokens WHERE user_id = ? AND event_id = ?',
        [reg.user_id, reg.event_id]
      );

      let token;
      if (existing.length > 0) {
        token = existing[0].token;
      } else {
        token = uuidv4();
        await pool.query(
          'INSERT INTO attendance_tokens (user_id, event_id, token) VALUES (?, ?, ?)',
          [reg.user_id, reg.event_id, token]
        );
      }

      const qrDataUrl = await QRCode.toDataURL(token, {
        width: 220,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' }
      });

      qrPayload = { reg, token, qrDataUrl };
    }

    res.json({ message: `Registration ${status} successfully` });

    // Send QR code email after response (non-blocking)
    if (qrPayload) {
      const { reg: r, token, qrDataUrl } = qrPayload;
      sendQRCodeEmail({
        to: r.user_email,
        userName: r.user_name,
        eventTitle: r.event_title,
        eventDate: r.event_date,
        eventLocation: r.event_location,
        qrDataUrl,
        token
      }).catch(err => console.error('[Email] Failed to send QR code email:', err.message));
    }
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