const User = require("../models/User");
const Song = require("../models/Song");
// [POST] /api/songs/:id/like
exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const songId = req.params.id;

    const user = await User.findById(userId);
    const song = await Song.findById(songId);
    if (!user || !song) {
      return res.status(404).json({ message: "User or song not found" });
    }
    const index = user.likedSongs.indexOf(songId);
    let action;

    if (index === -1) {
      user.likedSongs.push(songId);
      action = "liked";
    } else {
      user.likedSongs.splice(index, 1);
      action = "unliked";
    }
    await user.save();

    res.json({
      message: `Song ${action} successfully`,
      likedSongs: user.likedSongs,
    });
  } catch (err) {
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

    res.jon({
      user: user.username,
      total: user.likedSongs.length,
      likeSongs: user.likedSongs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Get liked songs failed" });
  }
};
