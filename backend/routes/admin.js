const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getAnalytics, getAllUsers, sendEmail } = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get('/analytics', authenticate, isAdmin, getAnalytics);
router.get('/users', authenticate, isAdmin, getAllUsers);

module.exports = router;
