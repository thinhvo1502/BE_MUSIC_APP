const Song = require("../models/Song");
const Artist = require("../models/Artist");
const Album = require("../models/Album");
const { getJamendoTracks } = require("../config/jamendo");
// [GET] /api/search?q=love&type=song&page=1&limit=10
exports.searchAll = async (req, res) => {
  try {
    const { q, type = "all", page = 1, limit = 10 } = req.query;
    if (!q) return res.status(400).json({ message: "Missing search query" });

    const regex = new RegExp(q, "i"); // tìm kiếm không phân biệt hoa thường
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let results = {};

    if (type === "song" || type === "all") {
      const songs = await Song.find({ title: regex })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("artist", "name")
        .populate("album", "title");
      const total = await Song.countDocuments({ title: regex });
      results.songs = {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        data: songs,
      };
    }

    if (type === "artist" || type === "all") {
      const artists = await Artist.find({ name: regex })
        .skip(skip)
        .limit(parseInt(limit));
      const total = await Artist.countDocuments({ name: regex });
      results.artists = {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        data: artists,
      };
    }

    if (type === "album" || type === "all") {
      const albums = await Album.find({ title: regex })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("artist", "name");
      const total = await Album.countDocuments({ title: regex });
      results.albums = {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        data: albums,
      };
    }

    res.json({
      query: q,
      type,
      results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Search failed" });
  }
};
// [GET] /api/search/suggest?q=love&type=song|artist|album|all
exports.suggest = async (req, res) => {
  try {
    const { q, type = "all", limit = 5 } = req.query;
    if (!q) return res.status(400).json({ message: "Missing search query" });

    const regex = new RegExp("^" + q, "i"); // bắt đầu bằng chuỗi nhập vào
    const suggestions = {};

    if (type === "song" || type === "all") {
      const songs = await Song.find({ title: regex })
        .limit(parseInt(limit))
        .select("title cover");
      suggestions.songs = songs;
    }

    if (type === "artist" || type === "all") {
      const artists = await Artist.find({ name: regex })
        .limit(parseInt(limit))
        .select("name avatar");
      suggestions.artists = artists;
    }

    if (type === "album" || type === "all") {
      const albums = await Album.find({ title: regex })
        .limit(parseInt(limit))
        .select("title cover");
      suggestions.albums = albums;
    }

    res.json({
      query: q,
      type,
      suggestions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Suggestion failed" });
  }
};
