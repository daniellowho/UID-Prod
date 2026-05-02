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

router.post('/events/:eventId/register', authenticate, registerForEvent);
router.get('/my', authenticate, getUserRegistrations);
router.delete('/events/:eventId/cancel', authenticate, cancelRegistration);
router.get('/events/:eventId', authenticate, isAdmin, getEventRegistrations);
router.put('/:registrationId/status', authenticate, isAdmin, registrationStatusLimiter, updateRegistrationStatus);
router.get('/', authenticate, isAdmin, getAllRegistrations);

module.exports = router;