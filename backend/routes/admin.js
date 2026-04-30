const express = require('express');
const router = express.Router();
const { getAnalytics, getAllUsers } = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get('/analytics', authenticate, isAdmin, getAnalytics);
router.get('/users', authenticate, isAdmin, getAllUsers);

module.exports = router;