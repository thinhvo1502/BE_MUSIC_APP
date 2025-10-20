const User = require("../models/User");
const Song = require("../models/Song");
const { default: mongoose } = require("mongoose");
// [POST] /api/songs/:id/like
exports.toggleLike = async (req, res) => {
  const userId = req.user.id;
  const songId = req.params.id;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const user = await User.findById(userId).session(session);
    const song = await Song.findById(songId).session(session);
    if (!user || !song) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "User or song not found" });
    }
    const hasLiked = user.likedSongs.some((s) => s.equals(song._id));
    // const index = user.likedSongs.indexOf(songId);
    let action;

    if (!hasLiked) {
      // console.log("haha");
      await User.findByIdAndUpdate(
        userId,
        { $addToSet: { likedSongs: song._id } },
        { session }
      );
      action = "liked";
      await Song.findByIdAndUpdate(songId, { $inc: { likes: 1 } }, { session });
    } else {
      console.log("huhu");
      // remove like
      await User.findByIdAndUpdate(
        userId,
        { $pull: { likedSongs: song._id } },
        { session }
      );
      await Song.findByIdAndUpdate(
        songId,
        { $inc: { likes: -1 } },
        { session }
      );
      action = "unliked";
    }
    await session.commitTransaction();
    session.endSession();

    const updatedUser = await User.findById(userId).populate("likedSongs");

    return res.json({
      message: `Song ${action} successfully`,
      likedSongs: updatedUser.likedSongs,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.status(500).json({ message: "Toggle like failed" });
  }
};
// [GET] /api/users/:id/likes
exports.getLikedSongs = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).populate("likedSongs");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      user: user.username,
      total: user.likedSongs.length,
      likeSongs: user.likedSongs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Get liked songs failed" });
  }
};
