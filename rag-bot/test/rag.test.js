const test = require('node:test');
const assert = require('node:assert/strict');
const { answerQuestion, loadKnowledge } = require('../src/rag');

test('loads knowledge base and answers a relevant question', () => {
  const knowledge = loadKnowledge('Refunds are available within 30 days.\nSupport is available by email.');
  const answer = answerQuestion('What is the refund policy?', knowledge);

  assert.equal(knowledge.length, 2);
  assert.match(answer, /refund/i);
});
