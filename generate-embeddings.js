require('dotenv').config();
const mongoose = require('mongoose');
const Song = require('./src/models/Song');
const { createEmbedding } = require('./src/utils/embedding');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const songs = await Song.find({
    $or: [{ embeddings: { $size: 0 } }, { embeddings: { $exists: false } }],
  });

  console.log(`Processing ${songs.length} songs...`);

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];

    const text = [song.title, ...(song.genre || []), song.lyric]
      .filter(Boolean)
      .join(' ');

    console.log('TEXT =>', text);

    const embedding = await createEmbedding(text);

    if (embedding) {
      await Song.updateOne({ _id: song._id }, { embeddings: embedding });
      console.log(`${i + 1}/${songs.length} saved (${embedding.length})`);
    } else {
      console.log(`${i + 1}/${songs.length} Failed`);
    }
  }

  console.log('All embeddings generated!');
  process.exit();
}

run();
