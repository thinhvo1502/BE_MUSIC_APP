// utils/embedding.js
let extractor = null;

const getExtractor = async () => {
  if (!extractor) {
    const { pipeline } = await import('@xenova/transformers');
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Embedding model loaded!');
  }
  return extractor;
};

const createEmbedding = async (text) => {
  if (typeof text !== 'string') return null;
  text = text.trim();
  if (!text) return null;

  const ex = await getExtractor();
  const result = await ex(text, {
    pooling: 'mean',
    normalize: true,
  });

  const vector = await result.tolist();
  return vector?.[0] ?? null;
};

module.exports = { createEmbedding };
