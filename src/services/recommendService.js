const Song = require("../models/Song");
const User = require("../models/User");

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += (a[i] || 0) * (b[i] || 0);
  }
  return s;
}
function norm(a) {
  return Math.sqrt(a.reduce((s, v) => s + (v || 0) * (v || 0), 0));
}
function cosine(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}
async function buildEmbeddings(options = {}) {
  const songs = await Song.find().populate("artist", "name");
  // build vocabularies
  const genreSet = new Set();
  const artistMap = new Map(); // artistName -> index
  songs.forEach((s) => {
    if (Array.isArray(s.genre)) s.genre.forEach((g) => g && genreSet.add(g));
    else if (s.genre) genreSet.add(s.genre);

    const an = s.artist ? s.artist.name || String(s.artist) : null;
    if (an && !artistMap.has(an)) {
      artistMap.set(an, artistMap.size);
    }
  });

  const genres = Array.from(genreSet);
  const genreIndex = new Map(genres.map((g, i) => [g, i])); // Map(3) {'pop' => 0,'rock' => 1,'jazz' => 2
  const artistIndex = new Map(
    Array.from(artistMap.entries()).map(([a, i]) => [a, i])
  ); // Map(3) {'Artist A' => 0,'Artist B' => 1,'Artist C' => 2

  // numeric ranges for normalization
  const maxPopularity = songs.reduce(
    (m, s) => Math.max(m, s.playCount || 0) + (s.likes || 0),
    1
  );
  const now = Date.now();
  const maxAgeMs = Math.max(
    1,
    ...songs.map(
      (s) => now - new Date(s.createdAt || s.updatedAt || now).getTime()
    )
  ); // tính tuổi bài hát
  // build and save embeddings for each song
  for (const s of songs) {
    const vec = [];
    // genre (multi-hot)
    for (let i = 0; i < genres.length; i++) vec.push(0);
    const songGenres = Array.isArray(s.genre) ? s.genre : [s.genre];
    songGenres.forEach((g) => {
      const gi = genreIndex.get(g);
      if (gi !== undefined) vec[gi] = 1;
    });
    // artist one-hot appended
    const artistOffset = vec.length;
    for (let i = 0; i < artistIndex.size; i++) vec.push(0);
    const artistName = s.artist ? s.artist.name || String(s.artist) : null;
    if (artistName && artistIndex.has(artistName)) {
      vec[artistOffset + artistIndex.get(artistName)] = 1;
    }
    // numeric features appended: popularity_norm, recency_norm
    const popularity = ((s.playCount || 0) + (s.likes || 0)) / maxPopularity;
    vec.push(popularity);

    const ageMs = now - new Date(s.createdAt || s.updatedAt || now).getTime();
    const recency = 1 - Math.min(1, ageMs / maxAgeMs); // newer -> closer to 1
    vec.push(recency);

    // normalize to unit vector
    const n = norm(vec) || 1;
    const unit = vec.map((v) => v / n);
    s.embeddings = unit;
    // update only embedding field to avoid triggering pre save side-effect
    await Song.updateOne({ _id: s._id }, { embeddings: unit });
  }
  return { genres, artists: Array.from(artistIndex.keys()) };
}
async function recommendForUser(userId, limit = 10, opts = {}) {
  // ensure embeddings exist (lazy build)
  const sample = await Song.findOne({ embeddings: { $exists: true, $ne: [] } });
  if (!sample) await buildEmbeddings();

  const user = await User.findById(userId)
    .populate({ path: "likedSongs", select: "embeddings" })
    .populate({ path: "history.song", select: "embeddings" });

  if (!user) throw new Error("User not found");
  // build user vector: liked weighted 3, history weighted 1
  const vectorLength = (await Song.findOne()).embeddings.length || 0;
  const userVec = new Array(vectorLength).fill(0);
  let count = 0;

  (user.likedSongs || []).forEach((s) => {
    if (
      s &&
      Array.isArray(s.embeddings) &&
      s.embeddings.length === vectorLength
    ) {
      for (let i = 0; i < vectorLength; i++) {
        userVec[i] += (s.embeddings[i] || 0) * 3;
      }
      count++;
    }
  });
  (user.history || []).forEach((h) => {
    const s = h.song;
    if (
      s &&
      Array.isArray(s.embeddings) &&
      s.embeddings.length === vectorLength
    ) {
      for (let i = 0; i < vectorLength; i++) {
        userVec[i] += (s.embeddings[i] || 0) * 1;
      }
      count++;
    }
  });
  if (count === 0) {
    const popular = await Song.find()
      .sort({ playCount: -1, likes: -1 })
      .limit(limit)
      .populate("artist", "name avatar")
      .populate("album", "title cover");
    return popular;
  }
  // normalize user vector
  const uNorm = norm(userVec) || 1;
  for (let i = 0; i < userVec.length; i++) userVec[i] /= uNorm;
  // Fix: Correct the excludedIds Set creation
  const excludedIds = new Set([
    ...(user.likedSongs || []).map((s) =>
      s._id ? s._id.toString() : s.toString()
    ),
    ...(user.history || [])
      .map((h) => (h.song && h.song._id ? h.song._id.toString() : null))
      .filter(Boolean),
  ]);
  // stream through songs to computing cosine similarity
  const candidates = await Song.find({
    _id: { $nin: Array.from(excludedIds) },
  });
  const scored = [];
  for (const c of candidates) {
    if (
      !Array.isArray(c.embeddings) ||
      c.embeddings.length !== userVec.length
    ) {
      continue;
    }
    const score = cosine(userVec, c.embeddings);
    const popularity = (c.playCount || 0) + (c.likes || 0);
    scored.push({ song: c, score, popularity });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.popularity - a.popularity;
  });
  const result = scored.slice(0, limit).map((r) => r.song);
  // populate before return
  return Song.populate(result, [
    { path: "artist", select: "name avatar" },
    { path: "album", select: "title cover" },
  ]);
}
module.exports = { buildEmbeddings, recommendForUser };
