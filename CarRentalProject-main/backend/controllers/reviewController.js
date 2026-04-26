const Review = require('../models/Review');

// @desc    Get all reviews
// @route   GET /api/reviews
// @access  Public
exports.getReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('user', 'name profilePicture role')
            .populate('replies.user', 'name profilePicture role')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error fetching reviews' });
    }
};

// @desc    Add a review
// @route   POST /api/reviews
// @access  Private
exports.addReview = async (req, res) => {
    try {
        const { rating, text } = req.body;

        if (!rating || !text) {
            return res.status(400).json({ success: false, message: 'Please provide rating and text' });
        }

        const review = await Review.create({
            user: req.user._id,
            rating,
            text
        });

        // Fetch populated version to send back
        const populatedReview = await Review.findById(review._id)
            .populate('user', 'name profilePicture role');

        res.status(201).json({ success: true, data: populatedReview });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error adding review' });
    }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
    try {
        const { rating, text } = req.body;
        let review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Make sure user owns review
        if (review.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ success: false, message: 'Not authorized to update this review' });
        }

        review.rating = rating || review.rating;
        review.text = text || review.text;

        await review.save();

        const updatedReview = await Review.findById(req.params.id)
            .populate('user', 'name profilePicture role')
            .populate('replies.user', 'name profilePicture role');

        res.status(200).json({ success: true, data: updatedReview });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error updating review' });
    }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Make sure user owns review or user is an admin
        if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: 'Not authorized to delete this review' });
        }

        // If admin is deleting and provided a reason, soft delete
        if (req.user.role === 'admin' && req.body.reason) {
            review.isRemoved = true;
            review.removalReason = req.body.reason;
            await review.save();
        } else {
            // Hard delete
            await review.deleteOne();
        }

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error deleting review' });
    }
};

// @desc    Like / Unlike review
// @route   POST /api/reviews/:id/like
// @access  Private
exports.likeReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Check if the review has already been liked by this user
        if (review.likes.includes(req.user._id)) {
            // Un-like it
            review.likes = review.likes.filter(userId => userId.toString() !== req.user._id.toString());
        } else {
            // Like it
            review.likes.push(req.user._id);
        }

        await review.save();

        const updatedReview = await Review.findById(req.params.id)
            .populate('user', 'name profilePicture role')
            .populate('replies.user', 'name profilePicture role');

        res.status(200).json({ success: true, data: updatedReview });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error liking review' });
    }
};

// @desc    Reply to review
// @route   POST /api/reviews/:id/reply
// @access  Private
exports.replyToReview = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, message: 'Reply text is required' });
        }

        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        const isAdminReply = req.user.role === 'admin';

        review.replies.push({
            user: req.user._id,
            text,
            isAdminReply
        });

        await review.save();

        const updatedReview = await Review.findById(req.params.id)
            .populate('user', 'name profilePicture role')
            .populate('replies.user', 'name profilePicture role');

        res.status(201).json({ success: true, data: updatedReview });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error adding reply' });
    }
};
