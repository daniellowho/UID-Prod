const express = require('express');
const router = express.Router();
const { registerForEvent, getUserRegistrations, cancelRegistration, getEventRegistrations, updateRegistrationStatus, getAllRegistrations } = require('../controllers/registrationController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.post('/events/:eventId/register', authenticate, registerForEvent);
router.get('/my', authenticate, getUserRegistrations);
router.delete('/events/:eventId/cancel', authenticate, cancelRegistration);
router.get('/events/:eventId', authenticate, isAdmin, getEventRegistrations);
router.put('/:registrationId/status', authenticate, isAdmin, updateRegistrationStatus);
router.get('/', authenticate, isAdmin, getAllRegistrations);

module.exports = router;