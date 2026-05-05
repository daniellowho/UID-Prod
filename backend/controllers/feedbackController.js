const { pool } = require('../config/database');

const GENERAL_TOPICS = ['General', 'Website Experience', 'Event Organization', 'Support'];

// GET /api/feedback/topics
const getTopics = async (req, res) => {
  let eventTopics = [];
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [pastEvents] = await pool.query(
      'SELECT DISTINCT id, title FROM events WHERE date < ? ORDER BY date DESC',
      [today]
    );
    eventTopics = pastEvents.map(e => ({ id: e.id, title: e.title }));
  } catch (error) {
    console.error('Error fetching event topics:', error);
  }
  res.json({ topics: GENERAL_TOPICS, eventTopics });
};

// GET /api/feedback/my-events  — events the logged-in user attended (approved registration)
const getMyAttendedEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const [events] = await pool.query(`
      SELECT e.id, e.title, e.date
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE r.user_id = ? AND r.status = 'approved'
      ORDER BY e.date DESC
    `, [userId]);
    res.json(events);
  } catch (error) {
    console.error('Error fetching attended events:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/feedback
const getFeedback = async (req, res) => {
  try {
    const { topic } = req.query;
    let query = 'SELECT id, user_name, event_id, topic, rating, message, would_recommend, created_at FROM feedback';
    const params = [];

    if (topic && topic !== 'all') {
      query += ' WHERE topic = ?';
      params.push(topic);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/feedback
const createFeedback = async (req, res) => {
  try {
    const { topic, rating, message, user_name, event_id, would_recommend } = req.body;

    if (!topic || !message) {
      return res.status(400).json({ error: 'Topic and message are required' });
    }

    if (message.trim().length > 1000) {
      return res.status(400).json({ error: 'Comment must not exceed 1000 characters' });
    }

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const displayName = req.user
      ? req.user.name || 'Anonymous'
      : (user_name && user_name.trim()) || 'Anonymous';

    const userId = req.user ? req.user.id : null;
    const eventIdVal = event_id ? parseInt(event_id, 10) : null;

    // Validate would_recommend: accept true/false/"yes"/"no"/1/0
    let recommendVal = null;
    if (would_recommend !== undefined && would_recommend !== null && would_recommend !== '') {
      recommendVal = (would_recommend === true || would_recommend === 'yes' || would_recommend === '1' || would_recommend === 1) ? 1 : 0;
    }

    const [result] = await pool.query(
      'INSERT INTO feedback (user_id, user_name, event_id, topic, rating, message, would_recommend) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, displayName, eventIdVal, topic, parsedRating, message.trim(), recommendVal]
    );

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedbackId: result.insertId
    });
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getTopics, getFeedback, createFeedback, getMyAttendedEvents };
