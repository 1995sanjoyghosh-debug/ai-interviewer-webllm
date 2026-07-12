const { answerQuestion, loadKnowledgeFromFile } = require('./src/rag');

const question = process.argv.slice(2).join(' ') || 'What is the refund policy?';
const knowledge = loadKnowledgeFromFile('data/knowledge.txt');

console.log(answerQuestion(question, knowledge));
