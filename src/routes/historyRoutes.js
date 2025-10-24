const express = require("express");
const router = express.Router();

const {
    addHistory,
    getUserHistory,
    clearUserHistory,
} = require("../controllers/historyController");

// const { protect } = require("../middleware/authMiddleware");


// public routes
router.post('/', addHistory);
router.get('/:userId', getUserHistory);
router.delete('/:userId', clearUserHistory);


// protect routes


module.exports = router;