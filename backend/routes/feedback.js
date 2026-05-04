const express = require('express');
const router = express.Router();
const { getTopics, getFeedback, createFeedback } = require('../controllers/feedbackController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/topics', getTopics);
router.get('/', getFeedback);
router.post('/', isAuthenticated, createFeedback);

module.exports = router;
