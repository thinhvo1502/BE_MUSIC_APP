const Song = require("../models/Song");
const Artist = require("../models/Artist");
const Album = require("../models/Album");
// [POST] /api/songs
exports.createSong = async (req, res) => {
  try {
    const { title, genre, cover, url, duration, lyric, artist, album } =
      req.body;
    const song = await Song.create({
      title,
      genre,
      cover,
      url,
      duration,
      lyric,
      artist,
      album,
    });

    // gắn vào album và artist
    if (artist) {
      await Artist.findByIdAndUpdate(artist, { $push: { songs: song._id } });
    }
    if (album) {
      await Album.findByIdAndUpdate(album, { $push: { songs: song._id } });
    }
    res.status(201).json({
      message: "Song created successfully",
      song: song,
    });
  } catch (err) {
    res.status(500).json({ message: "Creating song failed" });
  }
};
// [GET] /api/songs
exports.createSong = async (req, res) => {
  try {
    const songs = await Song.find()
      .populate("artist", "name")
      .populate("album", "title");
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: "Fetching songs failed" });
  }
};
// [GET] /api/songs
exports.getAllSongs = async (req, res) => {
  try {
    const song = await Song.find();
    res.json(song);
  } catch (err) {
    res.status(500).json({ message: "Get all songs failed" });
  }
};
// [GET] /api/songs/:id
exports.getSongById = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate("artist", "name")
      .populate("album", "title");
    if (!song) {
      return res.status(404).json({
        message: "Song not found",
      });
    }
    res.json(song);
  } catch (err) {
    res.status(500).json({ message: "Get song failed" });
  }
};
// [PUT] /api/songs/:id
exports.updateSong = async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!song) return res.status(404).json({ message: "Song not found" });
    res.json(song);
  } catch (err) {
    res.status(500).json({ message: "Update song failed" });
  }
};
// [DELETE] /api/songs/:id
exports.deleteSong = async (req, res) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) return res.status(404).json({ message: "Song not found" });

    // Xoá khỏi album & artist
    if (song.artist)
      await Artist.findByIdAndUpdate(song.artist, {
        $pull: { songs: song._id },
      });
    if (song.album)
      await Album.findByIdAndUpdate(song.album, { $pull: { songs: song._id } });
    res.json({ message: "Song deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete song failed" });
  }
};
// [patch] /api/songs/:id/play
exports.incrementPlayCount = async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(
      req.params.id,
      { $inc: { playCount: 1 } },
      { new: true }
    );
    if (!song) return res.status(404).json({ message: "Song not found" });
    res.json(song);
  } catch (err) {
    res.status(500).json({ message: "Increment play count failed" });
  }
};
