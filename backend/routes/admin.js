const express = require('express');
const router = express.Router();
const { getAnalytics, getAllUsers, getEmailLogs, sendAdminEmail } = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get('/analytics', authenticate, isAdmin, getAnalytics);
router.get('/users', authenticate, isAdmin, getAllUsers);
router.get('/email/logs', authenticate, isAdmin, getEmailLogs);
router.post('/email/send', authenticate, isAdmin, sendAdminEmail);

module.exports = router;