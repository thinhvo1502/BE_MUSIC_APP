const express = require("express");
const router = express.Router();
const {
  deleteComment,
  toggleLikeComment,
  replyComment,
} = require("../controllers/commentController");
const { protect } = require("../middleware/authMiddleware");

router.delete("/:id", protect, deleteComment);
router.post("/:id/like", protect, toggleLikeComment);
router.post("/:id/reply", protect, replyComment);
module.exports = router;
