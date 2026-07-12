const fs = require('node:fs');
const path = require('node:path');

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function loadKnowledge(text) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) {
    return paragraphs;
  }

  return text
    .split('\n')
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function retrieveRelevantChunk(question, chunks) {
  const stopWords = new Set(['a', 'an', 'and', 'are', 'for', 'how', 'is', 'it', 'the', 'what', 'when', 'where', 'who', 'why']);
  const questionWords = normalize(question)
    .split(' ')
    .filter(Boolean)
    .filter((word) => !stopWords.has(word));

  let bestChunk = null;
  let bestScore = -1;

  chunks.forEach((chunk) => {
    const chunkWords = normalize(chunk).split(' ').filter(Boolean);
    const overlap = questionWords.filter((word) => {
      const stem = word.replace(/s$/, '');
      return chunkWords.some((chunkWord) => {
        const chunkStem = chunkWord.replace(/s$/, '');
        return (
          chunkWord === word ||
          chunkWord === stem ||
          chunkStem === word ||
          chunkStem === stem ||
          chunkWord.includes(word) ||
          word.includes(chunkWord)
        );
      });
    }).length;

    const score = overlap + (chunk.toLowerCase().includes(question.toLowerCase()) ? 5 : 0);

    if (score > bestScore) {
      bestScore = score;
      bestChunk = chunk;
    }
  });

  return bestChunk;
}

function answerQuestion(question, knowledge) {
  const chunks = Array.isArray(knowledge) ? knowledge : loadKnowledge(knowledge);
  const bestChunk = retrieveRelevantChunk(question, chunks);

  if (!bestChunk) {
    return "I don't have enough information yet. Try asking about refunds, support, or onboarding.";
  }

  return `Based on the knowledge base: ${bestChunk}`;
}

function loadKnowledgeFromFile(relativePath) {
  const fullPath = path.resolve(__dirname, '..', relativePath);
  const contents = fs.readFileSync(fullPath, 'utf8');
  return loadKnowledge(contents);
}

module.exports = {
  loadKnowledge,
  retrieveRelevantChunk,
  answerQuestion,
  loadKnowledgeFromFile,
};
