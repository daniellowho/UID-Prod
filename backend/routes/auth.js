const express = require('express');
const router = express.Router();
const { signup, login, googleCallback, getCurrentUser, updateProfile, changePassword, deleteAccount } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleCallback);
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);
router.delete('/account', authenticate, deleteAccount);

module.exports = router;