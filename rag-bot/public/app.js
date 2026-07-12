const form = document.getElementById('query-form');
const questionInput = document.getElementById('question');
const result = document.getElementById('result');
const answer = document.getElementById('answer');
const error = document.getElementById('error');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  result.classList.add('hidden');
  error.classList.add('hidden');

  const question = questionInput.value.trim();
  if (!question) return;

  try {
    const response = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const data = await response.json();

    if (!response.ok) {
      error.textContent = data.error || 'Unknown server error';
      error.classList.remove('hidden');
      return;
    }

    answer.textContent = data.answer;
    result.classList.remove('hidden');
  } catch (err) {
    error.textContent = 'Unable to reach the server.';
    error.classList.remove('hidden');
  }
});
