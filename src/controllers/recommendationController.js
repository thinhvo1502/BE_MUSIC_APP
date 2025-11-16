const Song = require("../models/Song");
const User = require("../models/User");
const {
  buildEmbeddings,
  recommendForUser,
} = require("../services/recommendService");
// [GET] /api/songs/:id/recommendations (content-based fallback)
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
    const recommendations = await Song.find(query)
      .limit(limit)
      .populate("artist", "name avatar")
      .populate("album", "title cover")
      .sort({ playCount: -1, likes: -1 });

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
    console.error("getSimilarSongs error:", err);
    res.status(500).json({ message: "Get recommendation failed", err });
  }
};
// [GET] /api/users/:id/recommendations
// if ml=1 use recommenderService, otherwise fallback original rule-based
exports.getUserRecommendations = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const useML = req.query.ml === "1" || req.query.ml === "true";
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (useML) {
      try {
        const recs = await recommendForUser(id, limit);
        return res.json({
          user: user.username,
          method: "ml",
          count: recs.length,
          recommendations: recs,
        });
      } catch (e) {
        console.error("ML recommend failed, falling back:", e.message);
        // fallthrough to rule-based
      }
    }

    // fallback rule-based
    await user.populate({ path: "likedSongs", select: "genre artist" });
    await user.populate({ path: "history.song", select: "genre artist" });

    // collect liked and history song ids to exclude
    const likedIds = (user.likedSongs || []).map((s) => s._id.toString());
    const historyIds = (user.history || [])
      .map((h) => (h.song ? h.song._id.toString() : null))
      .filter(Boolean);

    const excludedIdsSet = new Set([...likedIds, ...historyIds]);

    // collect preferred genres and artists with simple weighting
    const genreCounts = new Map();
    const artistCounts = new Map();

    (user.likedSongs || []).forEach((s) => {
      if (Array.isArray(s.genre)) {
        s.genre.forEach(
          (g) => g && genreCounts.set(g, (genreCounts.get(g) || 0) + 3)
        );
      } else if (s.genre) {
        genreCounts.set(s.genre, (genreCounts.get(s.genre) || 0) + 3);
      }
      if (s.artist)
        artistCounts.set(
          s.artist.toString(),
          (artistCounts.get(s.artist.toString()) || 0) + 3
        );
    });

    (user.history || []).forEach((h) => {
      const s = h.song;
      if (!s) return;
      if (Array.isArray(s.genre)) {
        s.genre.forEach(
          (g) => g && genreCounts.set(g, (genreCounts.get(g) || 0) + 1)
        );
      } else if (s.genre) {
        genreCounts.set(s.genre, (genreCounts.get(s.genre) || 0) + 1);
      }
      if (s.artist)
        artistCounts.set(
          s.artist.toString(),
          (artistCounts.get(s.artist.toString()) || 0) + 1
        );
    });

    const preferredGenres = Array.from(genreCounts.keys());
    const preferredArtists = Array.from(artistCounts.keys()).map((a) => a);

    if (preferredGenres.length === 0 && preferredArtists.length === 0) {
      return res.json({
        user: user.username,
        likedCount: likedIds.length,
        recommendations: [],
      });
    }

    const candidateQuery = {
      _id: { $nin: Array.from(excludedIdsSet) },
      $or: [],
    };
    if (preferredGenres.length)
      candidateQuery.$or.push({ genre: { $in: preferredGenres } });
    if (preferredArtists.length)
      candidateQuery.$or.push({ artist: { $in: preferredArtists } });
    if (candidateQuery.$or.length === 0) delete candidateQuery.$or;

    const candidates = await Song.find(candidateQuery)
      .populate("artist", "name avatar")
      .populate("album", "title cover");

    // score candidates
    const scored = candidates.map((song) => {
      let score = 0;
      // genre score
      const genre = Array.isArray(song.genre) ? song.genre : [song.genre];
      genre.forEach((g) => {
        if (g && genreCounts.has(g)) score += genreCounts.get(g);
      });
      // artist score
      const aId = song.artist
        ? song.artist._id
          ? song.artist._id.toString()
          : song.artist.toString()
        : null;
      if (aId && artistCounts.has(aId)) score += artistCounts.get(aId) * 2;

      const popularity = (song.playCount || 0) + (song.likes || 0);
      return { song, score, popularity };
    });
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.popularity !== a.popularity) return b.popularity - a.popularity;
      return 0;
    });
    const recommendations = scored.slice(0, limit).map((s) => s.song);
    res.json({
      user: user.username,
      likedCount: likedIds.length,
      historyCount: historyIds.length,
      count: recommendations.length,
      recommendations,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "User recommendations failed" });
  }
};
exports.rebuildEmbeddings = async (req, res) => {
  try {
    const info = await buildEmbeddings();
    res.json({ message: "Embeddings rebuilt", info });
  } catch (err) {
    console.error("rebuildEmbeddings error: ", err);
    res.status(500).json({ message: "Rebuild embeddings failed", err });
  }
};
