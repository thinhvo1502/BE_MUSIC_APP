const Comment = require("../models/Comment");
const Song = require("../models/Song");
const { cleanContent } = require("../utils/filterWords");
// [GET] /api/songs/:songId/comments?page=1&limit=10
exports.getComments = async (req, res) => {
  try {
    const { songId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const comments = await Comment.find({ song: songId, parentComment: null })
      .populate("user", "username")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments({
      song: songId,
      parentComment: null,
    });

    // lấy kèm replies (nếu có)
    const withReplies = await Promise.all(
      comments.map(async (c) => {
        const replies = await Comment.find({ parentComment: c._id })
          .populate("user", "username")
          .sort({ createdAt: 1 });
        return { ...c.toObject(), replies };
      })
    );
    res.json({
      songId,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      comments: withReplies,
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

    const cleaned = cleanContent(content);
    const newComment = await Comment.create({
      song: id,
      user: userId,
      content: cleaned,
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
// [POST] /api/comments/:id/reply
exports.replyComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const parent = await Comment.findById(id);
    if (!parent)
      return res.status(404).json({ message: "Parent comment not found" });
    const cleaned = cleanContent(content);
    // error
    const reply = await Comment.create({
      song: parent.song,
      user: userId,
      content: cleaned,
      parentComment: id,
    });

    const populated = await reply.populate("user", "username");
    res.status(201).json({
      message: "Reply added successfully",
      reply: populated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Reply comment failed" });
  }
};
// [POST] /api/comments/:id/like
exports.toggleLikeComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const index = comment.likes.indexOf(userId);

    let action;
    if (index === -1) {
      comment.likes.push(userId);
      action = "liked";
    } else {
      comment.likes.splice(index, 1);
      action = "unliked";
    }
    await comment.save();
    res.json({
      message: `Comment ${action}`,
      totalLikes: comment.likes.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Toggle like comment failed" });
  }
};
