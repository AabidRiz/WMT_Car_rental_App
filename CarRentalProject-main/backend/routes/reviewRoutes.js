const express = require('express');
const {
    getReviews,
    addReview,
    updateReview,
    deleteReview,
    likeReview,
    replyToReview
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
    .get(getReviews)
    .post(protect, addReview);

router.route('/:id')
    .put(protect, updateReview)
    .delete(protect, deleteReview);

router.route('/:id/like')
    .post(protect, likeReview);

router.route('/:id/reply')
    .post(protect, replyToReview);

module.exports = router;
