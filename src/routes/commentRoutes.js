const express = require("express");
const router = express.Router();
const { deleteComment } = require("../controllers/commentController");
const { protect } = require("../middleware/authMiddleware");

router.delete("/:id", protect, deleteComment);

module.exports = router;
