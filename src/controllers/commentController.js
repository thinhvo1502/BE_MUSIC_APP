const Comment = require("../models/Comment");
const Song = require("../models/Song");

// [GET] /api/songs/:songId/comments?page=1&limit=10
exports.getComments = async (req, res) => {
  try {
    const { songId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const comments = await Comment.find({ song: songId })
      .populate("user", "username")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments({ song: songId });

    res.json({
      songId,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      comments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Get comments failed" });
  }
};
// [POST] /api/songs/:songId/comments
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === "")
      return res.status(400).json({ message: "Content is required" });

    const song = await Song.findById(id);
    if (!song) return res.status(404).json({ message: "Song not found" });

    const newComment = await Comment.create({
      song: id,
      user: userId,
      content,
    });
    const populated = await newComment.populate("user", "username");
    res.status(201).json({
      message: "Comment added successfully",
      comment: populated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Add comment failed" });
  }
};

// [delete] /api/comments/:id
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // chỉ cho phép xoá nếu là chủ comment hoặc admin
    if (comment.user.toString() !== userId)
      return res.status(403).json({ message: "Not authorized" });

    await Comment.findByIdAndDelete(id);

    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete comment failed" });
  }
};
