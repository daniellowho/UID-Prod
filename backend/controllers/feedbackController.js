const { pool } = require('../config/database');

const GENERAL_TOPICS = ['General', 'Website Experience', 'Event Organization', 'Support'];

// GET /api/feedback/topics
const getTopics = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [pastEvents] = await pool.query(
      'SELECT DISTINCT title FROM events WHERE date < ? ORDER BY date DESC',
      [today]
    );
    const eventTopics = pastEvents.map(e => e.title);
    res.json({ topics: [...eventTopics, ...GENERAL_TOPICS] });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/feedback
const getFeedback = async (req, res) => {
  try {
    const { topic } = req.query;
    let query = 'SELECT id, user_name, topic, rating, message, created_at FROM feedback';
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
    const { topic, rating, message, user_name } = req.body;

    if (!topic || !message) {
      return res.status(400).json({ error: 'Topic and message are required' });
    }

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const displayName = req.user
      ? req.user.name || 'Anonymous'
      : (user_name && user_name.trim()) || 'Anonymous';

    const userId = req.user ? req.user.id : null;

    const [result] = await pool.query(
      'INSERT INTO feedback (user_id, user_name, topic, rating, message) VALUES (?, ?, ?, ?, ?)',
      [userId, displayName, topic, parsedRating, message.trim()]
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

module.exports = { getTopics, getFeedback, createFeedback };
