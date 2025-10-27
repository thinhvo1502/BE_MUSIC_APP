const Song = rquire("../models/Song");
const User = require("../models/User");

// [GET] /api/songs/:id/recommendations
exports.getSimilarSongs = async (req, res) => {
  try {
    const { id } = req.params;
    const baseSong = await Song.findById(id).populate("artist");

    if (!baseSong) return res.status(404).json({ message: "Song not found" });

    // gợi ý theo genre hoặc artist
    const recommendations = await Song.find({
      _id: { $ne: baseSong._id },
      $or: [{ genre: baseSong.genre }, { artist: baseSong.artist?._id }],
    })
      .limit(10)
      .populate("artist album");

    res.json({
      baseSong: { title: baseSong.title, genre: baseSong.genre },
      recommendations,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Get recommendation failed" });
  }
};
// [GET] /api/users/:id/recommendations
exports.getUserRecommendations = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate("likedSongs history");

    if (!user) return res.status(404).json({ message: "User not found" });

    // lấy danh sách genre và artist yêu thích
  } catch (err) {}
};
