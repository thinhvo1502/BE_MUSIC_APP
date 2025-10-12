const Song = require("../models/Song");
const Artist = require("../models/Artist");
const Album = require("../models/Album");
const { getJamendoTracks } = require("../config/jamendo");
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
exports.getAllSongs = async (req, res) => {
  try {
    const song = await Song.find();
    const {
      genere,
      artist,
      album,
      page = 1,
      limit = 10,
      sort = "-createdAt",
    } = req.query;

    const query = {};
    if (genere) query.genre = genere;
    if (artist) query.artist = artist;
    if (album) query.album = album;
    const songs = await Song.find(query)
      .populate("artist", "name")
      .populate("album", "title")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      songs,
    });
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
// [GET] /api/songs/jamendo?search=love&limit=5
exports.getJamendoSongs = async (req, res) => {
  try {
    const { search, limit } = req.query;
    const tracks = await getJamendoTracks({
      limit: limit || 10,
      search: search || "",
    });

    const formatted = tracks.map((t) => ({
      title: t.name,
      artist: t.artist_name,
      audio: t.audio,
      image: t.album_image,
      duration: t.duration,
      genre: t.musicinfo?.tag?.genres?.[0] || "Unknown",
    }));

    res.json({ count: formatted.length, tracks: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Fetching Jamendo tracks failed" });
  }
};
exports.importJamendoSongs = async (req, res) => {
  try {
    const { limit = 10 } = req.querry;
    const tracks = await getJamendoTracks({ limit });

    const newSongs = [];

    for (const t of tracks) {
      // find or create artist
      let artistDoc = await Artist.findOne({ name: t.artist_name });
      if (!artistDoc) {
        artistDoc = await Artist.create({ name: t.artist_name });
      }

      // find or create album
      let albumDoc = await Album.findOne({
        title: t.album_name,
        artist: artistDoc._id,
      });
      if (!albumDoc) {
        albumDoc = await Abum.create({
          title: t.album_name,
          artist: artistDoc._id,
          cover: t.album_image,
          releaseDate: t.album_release_date,
          genre,
        });
      }

      // prepare song data
      newSongs.push({
        spotifyId: t.id,
        title: t.name,
        genre: t.musicinfo?.tags?.[0] || "Unknown",
        cover: t.image,
        url: t.audio,
        duration: t.duration,
        lyric: "", // Jamendo does not provide lyrics
        playCount: t.stats?.listened_total || 0,
        likes: t.stats?.favorited_total || 0,
        artist: artistDoc._id,
        album: albumDoc._id,
      });
    }
    // insert songs
    await Song.insertMany(newSongs, { ordered: false });
    res.json({ message: `Imported ${newSongs.length} songs from Jamendo` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Importing Jamendo songs failed" });
  }
};
// [GET] /api/songs/lyrics?artist=Coldplay&title=Yellow
exports.getLyrics = async (req, res) => {
  try {
    const { artist, title } = req.query;
    if (!artist || !title) {
      return res.status(400).json({ message: "Missing artist or title" });
    }

    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(
      artist
    )}/${encodeURIComponent(title)}`;
    const { data } = await axios.get(url);

    res.json({
      artist,
      title,
      lyrics: data.lyrics || "Lyrics not found.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch lyrics" });
  }
};
// GET /api/songs/:id/recommend
exports.getRecommendedSongs = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: "Song not found" });

    const relatedSongs = await Song.find({
      _id: { $ne: song._id },
      $or: [
        { genre: song.genre },
        { artist: song.artist },
        { album: song.album },
      ],
    })
      .populate("artist", "name")
      .limit(10);
    res.json({ base: song.title, recommendations: relatedSongs });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch recommendations" });
  }
};
// [GET] /api/songs/top?limit=5
exports.getTopSongs = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  try {
    const songs = await Song.find().sort({ likes: -1 }).limit(limit);
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: "Failed to get top songs" });
  }
};
// [GET] /api/songs/most-played
exports.getMostPlayed = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  try {
    const songs = await Song.find().sort({ playCount: -1 }).limit(limit);
    res.json({ message: "Most played songs", songs });
  } catch (err) {
    res.status(500).json({ message: "Failed to get most played songs" });
  }
};
// [GET] /api/songs/new-release
exports.getNewRelease = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const songs = await Song.find().sort({ createdAt: -1 }).limit(limit);
    res.json({ message: "Newly released songs", songs });
  } catch (err) {
    res.status(500).json({ message: "Failed to get new releases" });
  }
};
