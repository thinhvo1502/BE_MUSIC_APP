const mongoose = require("mongoose");
const Song = require("../models/Song");
const Artist = require("../models/Artist");
const Album = require("../models/Album");
const { getJamendoTracks, getJamendoArtists } = require("../config/jamendo");
const axios = require("axios");
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

    const total = await Song.countDocuments(query);
    const songs = await Song.find(query)
      .populate("artist", "name artist_id avatar")
      .populate("album", "title cover")
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
      limit: 1,
      search: "",
    });
    // console.log(tracks[0]);
    const formatted = tracks.map((t) => ({
      spotifyId: t.id,
      title: t.name,
      genre: t.musicinfo?.tags?.genres,
      cover: t.image,
      url: t.audio,
      duration: t.duration,
      lyric: "", // Jamendo does not provide lyrics
      playCount: t.stats?.listened_total || 0,
      likes: t.stats?.favorited_total || 0,
      artist: t.artist_name,
      album: t.album_name,
      position: t.position,
    }));

    res.json({ count: formatted.length, tracks: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Fetching Jamendo tracks failed" });
  }
};
exports.importJamendoSongs = async (req, res) => {
  try {
    const { limit } = req.query;
    const tracks = await getJamendoTracks({ limit });

    const newSongs = [];

    for (const t of tracks) {
      // find or create artist
      let artistDoc = await Artist.findOne({ name: t.artist_name });
      if (!artistDoc) {
        const artistRes = await getJamendoArtists(t.artist_name);
        const artistInfo = artistRes && artistRes[0];
        // console.log("artist info: ", artistRes);
        artistDoc = await Artist.create({
          artist_id: artistInfo?.id,
          name: artistInfo?.name || t.artist_name,
          avatar: artistInfo?.image || "",
          website: artistInfo?.website || "",
          joindate: artistInfo?.joindate || null,
        });
      }

      // find or create album
      let albumDoc = await Album.findOne({
        title: t.album_name,
        artist: artistDoc._id,
      });
      if (!albumDoc) {
        albumDoc = await Album.create({
          title: t.album_name,
          artist: artistDoc._id,
          cover: t.album_image,
          release_date: t.releasedate,
          genre: t.musicinfo?.tags?.genres || ["Unknown"],
        });
        // add album to artist's album array
        await Artist.findByIdAndUpdate(artistDoc._id, {
          $addToSet: { albums: albumDoc._id },
        });
      }

      // fetch lyrics (base-effort)
      let lyricText = "";
      try {
        const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(
          t.artist_name
        )}/${encodeURIComponent(t.name)}`;
        const lyricRes = await axios.get(url, { timeout: 5000 });
        lyricText = lyricRes.data?.lyrics || "";
      } catch (e) {
        // ignore lyric errors, keep lyricText = ""
      }

      // prepare song data
      newSongs.push({
        spotifyId: t.id,
        title: t.name,
        genre: t.musicinfo?.tags?.genres || ["Unknown"],
        cover: t.image,
        url: t.audio,
        duration: t.duration,
        lyric: lyricText !== "" ? lyricText : t.lyrics, // Jamendo does not provide lyrics
        playCount: t.stats?.listened_total || 0,
        likes: t.stats?.favorited_total || 0,
        artist: artistDoc._id,
        album: albumDoc._id,
        position: t.position,
        release_date: t.releasedate || new Date()
      });
    }
    // insert songs
    const insertedSongs = await Song.insertMany(newSongs, { ordered: false });

    // Cập nhật lại artist và album
    for (const song of insertedSongs) {
      if (song.artist) {
        await Artist.findByIdAndUpdate(song.artist, {
          $addToSet: { songs: song._id },
        });
      }
      if (song.album) {
        await Album.findByIdAndUpdate(song.album, {
          $addToSet: { songs: song._id },
        });
      }
    }
    res.json({ message: `Imported ${newSongs.length} songs from Jamendo` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Importing Jamendo songs failed" });
  }
};
// [GET] /api/songs/lyrics/:id?artist=Coldplay&title=Yellow
exports.getLyrics = async (req, res) => {
  try {
    const { artist, title } = req.query;
    const { id } = req.params;
    if (!artist || !title) {
      return res.status(400).json({ message: "Missing artist or title" });
    }

    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(
      artist
    )}/${encodeURIComponent(title)}`;
    const { data } = await axios.get(url);

    const song = await Song.findByIdAndUpdate(
      id,
      { lyric: data.lyrics || "Lyrics not found" },
      { new: true }
    );
    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    res.json({
      artist,
      title,
      lyrics: song.lyric || "Lyrics not found.",
      song,
    });
    // res.json({
    //   lyric: data.lyrics
    // })
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch lyrics" });
  }
};
// POST /api/songs/:id/lyrics (admin thêm hoặc chỉnh sửa)
exports.updateLyrics = async (req, res) => {
  try {
    const { id } = req.params;
    const { lyrics } = req.body;

    const song = await Song.findById(id);
    if (!song) return res.status(404).json({ message: "Song not found" });

    song.lyrics = lyrics;
    await song.save();

    res.json({ message: "Lyrics updated successfully", lyrics });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update lyrics failed" });
  }
};
// GET /api/songs/:id/recommend
exports.getRecommendedSongs = async (req, res) => {
  try {
    const { id } = req.params;
    let song = null;

    // 1. Kiểm tra xem ID gửi lên có phải ObjectId không?
    if (mongoose.Types.ObjectId.isValid(id)) {
        song = await Song.findById(id);
    } else {
        // 2. Nếu không phải, tìm theo spotifyId (Jamendo ID)
        song = await Song.findOne({ spotifyId: id });
    }

    // 3. Nếu vẫn không thấy bài hát (do chưa import vào DB), trả về rỗng để không crash
    if (!song) {
        return res.json({ base: "Unknown", recommendations: [] });
    }

    const relatedSongs = await Song.find({
      _id: { $ne: song._id },
      $or: [
        { genre: song.genre },
        { artist: song.artist },
        { album: song.album },
      ],
    })
      .populate("artist", "name avatar artist_id image") 
      .populate("album", "title cover")
      .limit(10);

    res.json({ base: song.title, recommendations: relatedSongs });
  } catch (err) {
    console.error("Recommendation Error:", err); // Log lỗi ra console để dễ debug
    res.status(500).json({ message: "Failed to fetch recommendations" });
  }
};
// [GET] /api/songs/top?limit=5
exports.getTopSongs = async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  try {
    const songs = await Song.find()
        .populate("artist", "name artist_id avatar") 
        .populate("album", "title cover");        
    
    res.json(songs);
  } catch (err) {
  }
};

// [GET] /api/songs/most-played
exports.getMostPlayed = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const songs = await Song.find()
        .sort({ playCount: -1 })
        .limit(limit)
        .populate("artist", "name artist_id avatar")
        .populate("album", "title cover");

    res.json({ message: "Most played songs", songs });
  } catch (err) {
  }
};

// [GET] /api/songs/new-release
exports.getNewRelease = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const songs = await Song.find()
        .sort({ release_date: -1, createdAt: -1 })
        .limit(limit)
        .populate("artist", "name artist_id avatar")
        .populate("album", "title cover");

    res.json({ 
        success: true, 
        message: "Newly released songs", 
        songs 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Get new release failed" });
  }
};