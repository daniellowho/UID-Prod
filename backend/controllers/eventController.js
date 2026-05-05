const { pool } = require('../config/database');

const getAllEvents = async (req, res) => {
  try {
    const [events] = await pool.query(`
      SELECT e.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM registrations WHERE event_id = e.id AND status = 'approved') as participants_count
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      ORDER BY e.date ASC
    `);
    res.json(events);
  } catch (error) {
    console.error('Error loading events:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const [events] = await pool.query(`
      SELECT e.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM registrations WHERE event_id = e.id AND status = 'approved') as participants_count
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = ?
    `, [id]);

    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(events[0]);
  } catch (error) {
    console.error('Error loading event:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createEvent = async (req, res) => {
  try {
<<<<<<< HEAD
    const { title, description, date, location } = req.body;
=======
    const { title, description, date, location, start_time, category, max_capacity, speaker } = req.body;
>>>>>>> 7d1407119e09a51bf5b8c9549f65df4cac929d5c
    const created_by = req.user.id;

    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }

    const [result] = await pool.query(
<<<<<<< HEAD
      'INSERT INTO events (title, description, date, location, created_by) VALUES (?, ?, ?, ?, ?)',
      [title, description, date, location, created_by]
=======
      'INSERT INTO events (title, description, date, location, start_time, category, max_capacity, speaker, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, date, location, start_time || '09:00:00', category || null, capacityVal, speaker || null, created_by]
>>>>>>> 7d1407119e09a51bf5b8c9549f65df4cac929d5c
    );

    res.status(201).json({
      message: 'Event created successfully',
      eventId: result.insertId
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
<<<<<<< HEAD
    const { title, description, date, location } = req.body;
=======
    const { title, description, date, location, start_time, category, max_capacity, speaker } = req.body;
>>>>>>> 7d1407119e09a51bf5b8c9549f65df4cac929d5c

    const [existing] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await pool.query(
<<<<<<< HEAD
      'UPDATE events SET title = ?, description = ?, date = ?, location = ? WHERE id = ?',
      [title || existing[0].title, description || existing[0].description, date || existing[0].date, location || existing[0].location, id]
=======
      'UPDATE events SET title = ?, description = ?, date = ?, location = ?, start_time = ?, category = ?, max_capacity = ?, speaker = ? WHERE id = ?',
      [
        title || existing[0].title,
        description !== undefined ? description : existing[0].description,
        date || existing[0].date,
        location !== undefined ? location : existing[0].location,
        start_time || existing[0].start_time,
        category !== undefined ? (category || null) : existing[0].category,
        capacityVal,
        speaker !== undefined ? (speaker || null) : existing[0].speaker,
        id
      ]
>>>>>>> 7d1407119e09a51bf5b8c9549f65df4cac929d5c
    );

    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM events WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllEvents, getEventById, createEvent, updateEvent, deleteEvent };
