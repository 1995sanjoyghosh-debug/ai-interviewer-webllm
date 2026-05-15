# AI Interviewer WebLLM

A zero-cost static version of the AI Interviewer that can be hosted on a public URL without a backend.

## What Runs Where

- Hosting: Cloudflare Pages, GitHub Pages, Netlify, or any static host.
- LLM: WebLLM runs an open-source model in the student's browser with WebGPU.
- Speech-to-text: browser Speech Recognition API.
- Text-to-speech: browser Speech Synthesis API.
- Fallback: rule-based question and feedback engine if WebLLM is unavailable.

## Features

- Student-selected rounds:
  - Aptitude: 20 MCQs
  - GD: recent-event topic with structured speaking feedback
  - Technical: role and resume-aware technical questions only
- Target job title is free text.
- Resume upload for PDF, Word, and text files with best-effort browser extraction.
- Dynamic WebLLM generation for job titles that are not in a template.
- Nonsense answers are not scored.
- Feedback covers communication, fluency, and knowledge.
- Final report with competency bars.

## Run Locally

Open `index.html` directly, or serve the folder:

```powershell
cd ai-interviewer-webllm
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy for Free

### Cloudflare Pages

1. Push this folder to GitHub.
2. Create a Cloudflare Pages project.
3. Framework preset: None.
4. Build command: leave blank, or use `echo static`.
5. Output directory: `/` if this folder is the repo root.
6. Deploy.

### GitHub Pages

1. Push this folder to a GitHub repo.
2. Settings → Pages.
3. Deploy from branch.
4. Select the branch and root folder.

## Adoption Logging

A static site cannot keep server logs by itself. You still have free options:

1. Cloudflare Web Analytics:
   - Free page views, visitors, countries, referrers, and device/browser data.
   - Add the Cloudflare analytics snippet to `index.html`.

2. Optional event endpoint:
   - The app has an "Adoption logging" field.
   - Paste a Google Apps Script, webhook, or serverless endpoint URL.
   - It sends anonymous events only: app loaded, model loaded, interview started, answer submitted, interview completed.
   - It does not send answers or resume text.

3. Local export:
   - The app stores the last 500 anonymous events in the browser.
   - Use "Export local adoption events" for manual testing.

For real student adoption stats at zero hosting cost, Cloudflare Web Analytics is the easiest.

## Privacy Note

When WebLLM is used, prompts and answers are processed in the student's browser. No answer text or resume text is sent to this app's server because there is no server.
