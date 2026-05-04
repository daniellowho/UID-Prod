const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getTopics, getFeedback, createFeedback } = require('../controllers/feedbackController');
const { isAuthenticated } = require('../middleware/auth');

const feedbackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});

const feedbackSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many feedback submissions, please try again later.' }
});

router.get('/topics', feedbackLimiter, getTopics);
router.get('/', feedbackLimiter, getFeedback);
router.post('/', feedbackSubmitLimiter, isAuthenticated, createFeedback);

module.exports = router;
