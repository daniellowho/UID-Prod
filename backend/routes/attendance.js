const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getOrCreateToken, checkIn, getEventAttendance, getAllAttendance } = require('../controllers/attendanceController');
const { authenticate, isAdmin } = require('../middleware/auth');

const checkInLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many check-in requests, please slow down.' }
});

// User: get or generate their QR token for an event
router.get('/token/:eventId', authenticate, getOrCreateToken);

// Admin: scan a token and mark check-in
router.post('/checkin', authenticate, isAdmin, checkInLimiter, checkIn);

// Admin: all attendees for a specific event
router.get('/event/:eventId', authenticate, isAdmin, getEventAttendance);

// Admin: all attendance across all events
router.get('/', authenticate, isAdmin, getAllAttendance);

module.exports = router;

