const Song = rquire("../models/Song");
const User = require("../models/User");

// [GET] /api/songs/:id/recommendations
exports.getSimilarSongs = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const baseSong = await Song.findById(id).populate("artist album");
    if (!baseSong) return res.status(404).json({ message: "Song not found" });

    // build genre list and artist id
    const genres = Array.isArray(baseSong.genre)
      ? baseSong.genre
      : [baseSong.genre];
    const artistId = baseSong.artist
      ? baseSong.artist._id || baseSong.artist
      : null;

    const query = {
      _id: { $ne: baseSong._id },
      $or: [],
    };
    if (genres.length) query.$or.push({ genre: { $in: genres } });
    if (artistId) query.$or.push({ artist: artistId });
    if (query.$or.length === 0) delete query.$or; // fallback: no filter

    // gợi ý theo genre hoặc artist
    const recommendations = await Song.find(query).limit(limit);

    res.json({
      baseSong: {
        id: baseSong._id,
        title: baseSong.title,
        genre: baseSong.genre,
      },
      recommendations,
      count: recommendations.length,
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
    const limit = parseInt(req.query.limit) || 10;
    const user = await User.findById(id).populate("likedSongs history");

    if (!user) return res.status(404).json({ message: "User not found" });

    // lấy danh sách genre và artist yêu thích
    const genres = user.likedSongs.map((s) => s.genre);
    const artists = user.likedSongs.map((s) => s.artist);

    const recommendations = await Song.find({
      _id: { $nin: user.likedSongs },
      $or: [{ genre: { $in: genres } }, { artist: { $in: artists } }],
    })
      .limit(10)
      .populate("artist album");

    res.json({
      user: user.username,
      recommendations,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "User recommendations failed" });
  }
};
