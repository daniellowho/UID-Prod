const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getAnalytics, getAllUsers, getEmailLogs, sendAdminEmail } = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

const adminEmailLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many email requests, please slow down.' }
});

router.get('/analytics', authenticate, isAdmin, getAnalytics);
router.get('/users', authenticate, isAdmin, getAllUsers);
router.get('/email/logs', authenticate, isAdmin, adminEmailLimiter, getEmailLogs);
router.post('/email/send', authenticate, isAdmin, adminEmailLimiter, sendAdminEmail);

module.exports = router;