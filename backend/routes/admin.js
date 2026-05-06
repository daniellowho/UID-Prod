const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getAnalytics, getAllUsers, sendEmail } = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

const emailLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many email requests, please slow down.' }
});

router.get('/analytics', authenticate, isAdmin, getAnalytics);
router.get('/users', authenticate, isAdmin, getAllUsers);
router.post('/email', authenticate, isAdmin, emailLimiter, sendEmail);

module.exports = router;