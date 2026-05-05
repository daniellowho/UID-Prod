const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { registerForEvent, getUserRegistrations, cancelRegistration, getEventRegistrations, updateRegistrationStatus, getAllRegistrations } = require('../controllers/registrationController');
const { authenticate, isAdmin } = require('../middleware/auth');

const registrationStatusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration status updates, please slow down.' }
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts, please try again later.' }
});

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});

// Rate limiters placed before authenticate so unauthenticated traffic is also throttled
router.post('/events/:eventId/register', registerLimiter, authenticate, registerForEvent);
router.get('/my', readLimiter, authenticate, getUserRegistrations);
router.delete('/events/:eventId/cancel', readLimiter, authenticate, cancelRegistration);
router.get('/events/:eventId', readLimiter, authenticate, isAdmin, getEventRegistrations);
router.put('/:registrationId/status', registrationStatusLimiter, authenticate, isAdmin, updateRegistrationStatus);
router.get('/', readLimiter, authenticate, isAdmin, getAllRegistrations);

module.exports = router;