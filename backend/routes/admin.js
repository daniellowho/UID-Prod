const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getAnalytics, getAllUsers, sendEmail, deleteUser, updateUserRole } = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get('/analytics', authenticate, isAdmin, getAnalytics);
router.get('/users', authenticate, isAdmin, getAllUsers);
router.delete('/users/:id', authenticate, isAdmin, deleteUser);
router.put('/users/:id/role', authenticate, isAdmin, updateUserRole);

module.exports = router;
