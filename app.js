const $ = selector => document.querySelector(selector);

const setupForm = $("#setupForm");
const resumeFile = $("#resumeFile");
const resumeText = $("#resumeText");
const resumeFileName = $("#resumeFileName");
const resumeStatus = $("#resumeStatus");
const logEndpoint = $("#logEndpoint");
const modelSelect = $("#modelSelect");
const loadModelButton = $("#loadModel");
const modelStatus = $("#modelStatus");
const modelProgress = $("#modelProgress");
const stageTitle = $("#stageTitle");
const statusPill = $("#statusPill");
const questionType = $("#questionType");
const questionProgress = $("#questionProgress");
const questionText = $("#questionText");
const mcqOptions = $("#mcqOptions");
const speakQuestionButton = $("#speakQuestion");
const recordButton = $("#recordAnswer");
const submitButton = $("#submitAnswer");
const answerText = $("#answerText");
const voiceNote = $("#voiceNote");
const latestScore = $("#latestScore");
const feedbackHeadline = $("#feedbackHeadline");
const dimensionScores = $("#dimensionScores");
const strengthList = $("#strengthList");
const improvementList = $("#improvementList");
const overallScore = $("#overallScore");
const verdictText = $("#verdictText");
const competencyBars = $("#competencyBars");
const exportEvents = $("#exportEvents");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isRecording = false;
let engine = null;
let webllmReady = false;
let selectedMcqAnswer = "";
let session = null;

const aptitudeBank = [
  ["A train travels 180 km in 3 hours. What is its average speed?", ["45 km/h", "60 km/h", "75 km/h", "90 km/h"], 1, "Average speed is distance divided by time: 180 / 3 = 60 km/h."],
  ["If 20% of a number is 48, what is the number?", ["120", "180", "240", "300"], 2, "0.20 x N = 48, so N = 240."],
  ["Find the next number: 3, 6, 12, 24, __.", ["30", "36", "48", "54"], 2, "Each number doubles, so the next number is 48."],
  ["A shopkeeper gives a 10% discount on Rs. 800. What is the selling price?", ["Rs. 700", "Rs. 720", "Rs. 740", "Rs. 760"], 1, "10% of 800 is 80, so 800 - 80 = 720."],
  ["Choose the word closest in meaning to 'concise'.", ["Brief", "Confused", "Slow", "Ordinary"], 0, "Concise means brief and clearly expressed."],
  ["If A is taller than B, and B is taller than C, who is the shortest?", ["A", "B", "C", "Cannot say"], 2, "The order is A > B > C, so C is shortest."],
  ["What is 15% of 260?", ["29", "34", "39", "44"], 2, "10% is 26 and 5% is 13, so 15% is 39."],
  ["Complete the analogy: Code is to Programmer as Design is to __.", ["Compiler", "Designer", "Database", "Server"], 1, "A programmer works with code; a designer works with design."],
  ["A can finish work in 10 days and B in 15 days. Together, how many days will they take?", ["5 days", "6 days", "8 days", "12 days"], 1, "Combined rate is 1/10 + 1/15 = 1/6, so 6 days."],
  ["Which number is the odd one out: 2, 3, 5, 9, 11?", ["3", "5", "9", "11"], 2, "9 is not prime."],
  ["If the ratio of boys to girls is 3:2 and there are 40 students, how many boys are there?", ["16", "20", "24", "28"], 2, "There are 5 parts. Each part is 8. Boys = 24."],
  ["Choose the correctly spelled word.", ["Recieve", "Receive", "Receeve", "Receve"], 1, "The correct spelling is Receive."],
  ["A product price increases from 500 to 600. What is the percentage increase?", ["10%", "15%", "20%", "25%"], 2, "Increase is 100. 100 / 500 x 100 = 20%."],
  ["Complete the series: AZ, BY, CX, __.", ["DW", "DX", "EV", "CY"], 0, "First letter moves forward and second moves backward: DW."],
  ["If 5 pens cost Rs. 75, what is the cost of 8 pens?", ["Rs. 100", "Rs. 110", "Rs. 120", "Rs. 130"], 2, "One pen costs 15, so 8 cost 120."],
  ["Choose the opposite of 'expand'.", ["Extend", "Increase", "Contract", "Develop"], 2, "Contract is the opposite of expand."],
  ["What is the simple interest on Rs. 2000 at 5% per annum for 2 years?", ["Rs. 100", "Rs. 150", "Rs. 200", "Rs. 250"], 2, "SI = P x R x T / 100 = 200."],
  ["Average mark of 4 students is 70. Three marks are 60, 75, and 80. What is the fourth?", ["60", "65", "70", "75"], 1, "Total is 280. Fourth mark = 280 - 215 = 65."],
  ["Which statement is logically strongest?", ["Some developers know Python. Riya is a developer. Therefore Riya must know Python.", "All interns completed training. Neha is an intern. Therefore Neha completed training.", "Some projects use SQL. This is a project. Therefore it uses SQL.", "No students attended. Amit is a student. Therefore Amit attended."], 1, "The conclusion follows from 'all interns' and 'Neha is an intern'."],
  ["A clock shows 3:15. What is the angle between the hour and minute hands?", ["0 degrees", "7.5 degrees", "15 degrees", "30 degrees"], 1, "The minute hand is at 90 degrees and hour hand at 97.5 degrees, so 7.5 degrees."]
];

const gdTopics = [
  ["AI in higher education", "In 2026, institutions are expanding AI use for learning, assessment, and campus skill-building.", "Should colleges allow students to use AI tools in assignments and projects?"],
  ["AI and fresher hiring", "Hiring discussions show demand for AI, ML, cloud, and cybersecurity skills while some IT firms remain cautious on headcount.", "Will AI create more opportunities than challenges for fresh graduates?"],
  ["Skills gap in engineering education", "Workforce discussions highlight the gap between graduates and industry-ready candidates.", "Should colleges focus more on employable skills than traditional marks?"],
  ["Cybersecurity and digital trust", "As cloud, AI, and digital services grow, cybersecurity and responsible data use are becoming core workplace concerns.", "Should cybersecurity awareness be mandatory for every college student?"],
  ["AI governance and responsible innovation", "Global AI discussions are focused on balancing innovation, safety, regulation, and equal access.", "Does India need stricter AI regulation, or should innovation move faster?"],
  ["Future of work", "Automation is changing job roles and increasing the importance of communication, adaptability, and continuous learning.", "Are soft skills becoming as important as technical skills for freshers?"],
  ["Climate technology and sustainability", "Organizations are using technology to address energy efficiency, sustainability, and climate resilience.", "Should sustainability be required in every engineering and business project?"],
  ["Digital public infrastructure", "India's digital ecosystem continues to influence payments, identity, education, healthcare, and citizen services.", "Can digital public infrastructure reduce inequality in education and jobs?"]
];

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.addEventListener("result", event => {
    let finalTranscript = "";
    let interimTranscript = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript;
      if (event.results[index].isFinal) finalTranscript += transcript;
      else interimTranscript += transcript;
    }
    const stableText = answerText.dataset.stableText || "";
    answerText.value = `${stableText}${finalTranscript}${interimTranscript}`.trim();
    if (finalTranscript) answerText.dataset.stableText = `${stableText}${finalTranscript} `.trimStart();
    submitButton.disabled = !answerText.value.trim() || !session;
  });
  recognition.addEventListener("end", () => {
    if (isRecording) recognition.start();
  });
} else {
  voiceNote.textContent = "Speech recognition is not available in this browser. Typed answers still work.";
}

logEndpoint.value = localStorage.getItem("ai_interviewer_log_endpoint") || "";
logEndpoint.addEventListener("input", () => localStorage.setItem("ai_interviewer_log_endpoint", logEndpoint.value.trim()));

function clean(value, fallback = "") {
  return String(value ?? fallback).replace(/\s+/g, " ").trim();
}

function tokenize(text) {
  return clean(text).toLowerCase().match(/[a-z0-9+#.]+/g) || [];
}

function keywords(text, limit = 12) {
  const stop = new Set(["the", "and", "for", "with", "from", "this", "that", "have", "project", "using", "student", "built"]);
  const counts = new Map();
  tokenize(text).forEach(word => {
    const normalized = word.replace(/^[^a-z0-9+#]+|[^a-z0-9+#]+$/g, "");
    if (normalized.length < 3 || stop.has(normalized)) return;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([word]) => word).slice(0, limit);
}

function profileFromForm() {
  const data = new FormData(setupForm);
  const profile = Object.fromEntries(data.entries());
  profile.selectedRounds = data.getAll("selectedRounds");
  if (!profile.selectedRounds.length) profile.selectedRounds = ["technical"];
  profile.resumeText = resumeText.value;
  profile.resumeFileName = resumeFileName.value;
  profile.resumeKeywords = keywords(`${profile.resumeDetails} ${profile.resumeText} ${profile.skills}`);
  return profile;
}

function setStatus(text, tone = "ready") {
  statusPill.textContent = text;
  statusPill.style.color = tone === "error" ? "#c83b3b" : tone === "active" ? "#2454ff" : "#138a58";
  statusPill.style.background = tone === "error" ? "#fff0f0" : tone === "active" ? "#edf2ff" : "#eafaf6";
}

function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.94;
  window.speechSynthesis.speak(utterance);
}

function extractReadableText(buffer) {
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  return decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}

function adoptionEvent(type, detail = {}) {
  const event = {
    id: crypto.randomUUID?.() || String(Date.now()),
    type,
    at: new Date().toISOString(),
    model: webllmReady ? modelSelect.value : "fallback",
    webgpu: Boolean(navigator.gpu),
    speechRecognition: Boolean(SpeechRecognition),
    ...detail
  };
  const existing = JSON.parse(localStorage.getItem("ai_interviewer_events") || "[]");
  existing.push(event);
  localStorage.setItem("ai_interviewer_events", JSON.stringify(existing.slice(-500)));

  const endpoint = logEndpoint.value.trim();
  if (!endpoint) return;
  const body = JSON.stringify(event);
  if (!navigator.sendBeacon || !navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }))) {
    fetch(endpoint, { method: "POST", mode: "no-cors", body, headers: { "content-type": "application/json" } }).catch(() => {});
  }
}

async function loadWebLLM() {
  if (!navigator.gpu) {
    modelStatus.textContent = "WebGPU is not available in this browser. Fallback mode will keep working.";
    adoptionEvent("model_unavailable", { reason: "no_webgpu" });
    return;
  }

  setStatus("Loading model", "active");
  loadModelButton.disabled = true;
  modelStatus.textContent = "Downloading model files. First load can take a while.";

  try {
    const webllm = await import("https://esm.run/@mlc-ai/web-llm");
    engine = await webllm.CreateMLCEngine(modelSelect.value, {
      initProgressCallback: report => {
        const progress = Math.round((report.progress || 0) * 100);
        modelProgress.style.width = `${progress}%`;
        modelStatus.textContent = report.text || `Loading model ${progress}%`;
      }
    });
    webllmReady = true;
    setStatus("LLM ready", "active");
    modelStatus.textContent = "WebLLM is ready. Questions and feedback can now adapt to any job title.";
    adoptionEvent("model_loaded", { selectedModel: modelSelect.value });
  } catch (error) {
    webllmReady = false;
    setStatus("Fallback", "ready");
    modelStatus.textContent = `WebLLM could not load. Fallback mode is active. ${error.message || ""}`;
    adoptionEvent("model_failed", { message: String(error.message || error).slice(0, 160) });
  } finally {
    loadModelButton.disabled = false;
  }
}

function fallbackTechnicalQuestions(profile) {
  const terms = profile.resumeKeywords.length ? profile.resumeKeywords.slice(0, 5).join(", ") : "your resume projects";
  return [
    `For the ${profile.jobTitle} role, what are the most important technical responsibilities and how have you prepared for them?`,
    `Based on your resume signals (${terms}), explain one project: problem, your contribution, tools, challenge, and result.`,
    `Explain one core concept needed for a ${profile.jobTitle} as if you were teaching a junior student.`,
    `Describe how you would solve an unfamiliar technical task in the ${profile.jobTitle} role from requirement to validation.`,
    `What tradeoff did you make in a project or coursework, and how would you improve it now?`,
    `How do your academic background and skills prove that you can perform in the ${profile.jobTitle} role?`
  ].map((prompt, index) => ({
    id: `technical-${index + 1}`,
    round: "technical",
    type: "Technical",
    competency: index === 1 || index === 5 ? "resume_alignment" : "technical_depth",
    prompt
  }));
}

async function llmJson(system, user, fallback) {
  if (!webllmReady || !engine) return fallback;
  try {
    const response = await engine.chat.completions.create({
      messages: [
        { role: "system", content: `${system}\nReturn valid compact JSON only. No markdown.` },
        { role: "user", content: user }
      ],
      temperature: 0.4,
      max_tokens: 900
    });
    const content = response.choices?.[0]?.message?.content || "";
    const jsonText = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
    return JSON.parse(jsonText);
  } catch (error) {
    adoptionEvent("llm_json_failed", { message: String(error.message || error).slice(0, 160) });
    return fallback;
  }
}

async function buildTechnicalQuestions(profile) {
  const fallback = { questions: fallbackTechnicalQuestions(profile).map(item => item.prompt) };
  const result = await llmJson(
    "You are an expert campus technical interviewer. Create technical-only interview questions. No HR questions.",
    `Target job title: ${profile.jobTitle}
Experience: ${profile.experienceLevel}
Academics: ${profile.academicBackground}
Skills: ${profile.skills}
Resume/project details: ${`${profile.resumeDetails} ${profile.resumeText}`.slice(0, 2500)}

Create exactly 6 technical interview questions personalized to the role and resume. Include at least 2 resume/project-based questions. JSON schema: {"questions":["..."]}`,
    fallback
  );
  const questions = Array.isArray(result.questions) && result.questions.length >= 3 ? result.questions.slice(0, 6) : fallback.questions;
  return questions.map((prompt, index) => ({
    id: `technical-${index + 1}`,
    round: "technical",
    type: "Technical",
    competency: index === 1 || /resume|project|experience|built|implemented/i.test(prompt) ? "resume_alignment" : "technical_depth",
    prompt: clean(prompt)
  }));
}

function buildAptitudeQuestions() {
  return aptitudeBank.map((item, index) => ({
    id: `aptitude-${index + 1}`,
    round: "aptitude",
    type: "Aptitude MCQ",
    competency: "aptitude",
    prompt: item[0],
    options: item[1],
    correctIndex: item[2],
    explanation: item[3]
  }));
}

function buildGdQuestion(profile) {
  const seed = profile.jobTitle.length + profile.academicBackground.length + profile.resumeKeywords.length;
  const selected = gdTopics[seed % gdTopics.length];
  return {
    id: "gd-1",
    round: "gd",
    type: "Group Discussion",
    competency: "communication",
    topic: selected[0],
    context: selected[1],
    prompt: `Recent event GD topic: ${selected[2]} Context: ${selected[1]} Speak for 90 seconds. Start with your position, give two reasons, include one current example, acknowledge another viewpoint, and close with a balanced conclusion.`
  };
}

async function buildQuestionPlan(profile) {
  const questions = [];
  if (profile.selectedRounds.includes("aptitude")) questions.push(...buildAptitudeQuestions());
  if (profile.selectedRounds.includes("gd")) questions.push(buildGdQuestion(profile));
  if (profile.selectedRounds.includes("technical")) questions.push(...await buildTechnicalQuestions(profile));
  return questions;
}

function isNonsense(answer) {
  const text = clean(answer).toLowerCase();
  const words = tokenize(text);
  if (words.length < 8) return true;
  if (/^(.)\1{7,}$/.test(text.replace(/\s/g, ""))) return true;
  if (/(asdf|qwerty|blah|lorem|test test|nothing|no idea|idk|don't know|dont know)/.test(text)) return true;
  if (words.length > 12 && new Set(words).size / words.length < 0.28) return true;
  return text.replace(/[^a-z]/g, "").length < Math.max(18, text.length * 0.35);
}

function evaluateMcq(answer, question) {
  const selectedIndex = ["A", "B", "C", "D"].indexOf(clean(answer).toUpperCase()[0]);
  const correct = selectedIndex === question.correctIndex;
  return {
    score: correct ? 100 : 0,
    headline: correct ? "Correct answer" : "Incorrect answer",
    competency: "aptitude",
    dimensions: { communication: null, fluency: null, knowledge: correct ? 80 : 35 },
    strengths: correct ? ["You selected the right option accurately."] : [],
    improvements: correct ? ["Keep practicing timed aptitude sets to improve speed."] : [`Correct answer: ${["A", "B", "C", "D"][question.correctIndex]}. ${question.explanation}`],
    modelAnswer: question.explanation
  };
}

function fallbackEvaluate(answer, question, profile) {
  if (isNonsense(answer)) {
    return {
      score: null,
      unscored: true,
      headline: "Answer could not be scored genuinely",
      competency: question.competency,
      dimensions: { communication: null, fluency: null, knowledge: null },
      strengths: [],
      improvements: [
        "The answer did not contain enough meaningful content to evaluate.",
        "Start with one clear sentence that directly answers the question.",
        "Add two relevant points and one example from your academics, resume, or project work."
      ],
      modelAnswer: "Give a structured answer with context, key points, example, and conclusion."
    };
  }
  const words = tokenize(answer);
  const text = answer.toLowerCase();
  const roleWords = tokenize(`${profile.jobTitle} ${profile.skills} ${profile.resumeKeywords.join(" ")}`);
  const structure = ["first", "second", "because", "example", "result", "conclusion", "however"].filter(word => words.includes(word)).length;
  const technical = ["api", "database", "security", "network", "data", "model", "testing", "python", "java", "react", "sql", "cloud", "linux"].filter(word => words.includes(word)).length;
  const roleHits = roleWords.filter(word => words.includes(word)).length;
  const specifics = /\d|%|users|marks|latency|accuracy|team|semester|dashboard|portal|app|model|server/i.test(answer);
  const communication = Math.max(25, Math.min(100, 38 + Math.min(28, words.length) + structure * 7 + (specifics ? 8 : 0)));
  const fluency = Math.max(25, Math.min(100, 45 + Math.min(26, Math.round(words.length / 2)) + structure * 4));
  const knowledge = Math.max(20, Math.min(100, 30 + technical * 9 + roleHits * 6 + (specifics ? 12 : 0)));
  const score = Math.round(communication * 0.34 + fluency * 0.26 + knowledge * 0.4);
  return {
    score,
    headline: score >= 82 ? "Strong answer" : score >= 68 ? "Good answer with specific improvement areas" : score >= 52 ? "Average answer, needs clearer structure" : "Weak answer, needs more substance",
    competency: question.competency,
    dimensions: { communication, fluency, knowledge },
    strengths: [
      communication >= 72 ? "Communication was structured enough to follow." : "",
      fluency >= 72 ? "The answer sounds reasonably fluent and complete." : "",
      knowledge >= 72 ? "You showed relevant knowledge connected to the role or resume." : "",
      specifics ? "Specific details made the answer more credible." : ""
    ].filter(Boolean).slice(0, 4),
    improvements: [
      communication < 72 ? "Improve communication by using opening, two points, and conclusion." : "",
      fluency < 72 ? "Improve fluency by speaking in shorter sentences with pauses." : "",
      knowledge < 72 ? "Improve knowledge by naming tools, concepts, tradeoffs, and evidence." : "",
      !specifics ? "Add one metric, result, constraint, or project example." : ""
    ].filter(Boolean).slice(0, 4),
    modelAnswer: question.round === "gd"
      ? "Start with a stance, give two reasons, support one with an example, acknowledge the other side, and conclude."
      : `Connect the answer to ${profile.jobTitle}, include tools or concepts, explain tradeoffs, and validate the result.`
  };
}

async function evaluateSpoken(answer, question, profile) {
  const fallback = fallbackEvaluate(answer, question, profile);
  if (fallback.unscored || !webllmReady) return fallback;
  const result = await llmJson(
    "You are a strict but helpful interview coach. If the answer is nonsense, do not score it.",
    `Question type: ${question.type}
Question: ${question.prompt}
Target job: ${profile.jobTitle}
Skills: ${profile.skills}
Resume keywords: ${profile.resumeKeywords.join(", ")}
Student answer: ${answer}

Evaluate communication, fluency, and knowledge. If answer is nonsense or unrelated, set score null and unscored true. JSON schema: {"score":number|null,"unscored":boolean,"headline":"...","dimensions":{"communication":number|null,"fluency":number|null,"knowledge":number|null},"strengths":["..."],"improvements":["..."],"modelAnswer":"..."}`,
    fallback
  );
  if (result.unscored || typeof result.score !== "number") {
    return { ...fallback, ...result, score: null, unscored: true };
  }
  return {
    score: clampScore(result.score),
    headline: clean(result.headline, fallback.headline),
    competency: question.competency,
    dimensions: {
      communication: nullableScore(result.dimensions?.communication),
      fluency: nullableScore(result.dimensions?.fluency),
      knowledge: nullableScore(result.dimensions?.knowledge)
    },
    strengths: arrayText(result.strengths, fallback.strengths),
    improvements: arrayText(result.improvements, fallback.improvements),
    modelAnswer: clean(result.modelAnswer, fallback.modelAnswer)
  };
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function nullableScore(value) {
  return value === null || value === undefined ? null : clampScore(value);
}

function arrayText(value, fallback) {
  return Array.isArray(value) && value.length ? value.map(item => clean(item)).filter(Boolean).slice(0, 4) : fallback;
}

function currentQuestion() {
  return session?.questions[session.index] || null;
}

function setAnswerMode(question) {
  selectedMcqAnswer = "";
  mcqOptions.innerHTML = "";
  const isMcq = question?.round === "aptitude";
  mcqOptions.classList.toggle("active", isMcq);
  recordButton.disabled = isMcq;
  answerText.readOnly = isMcq;
  answerText.placeholder = isMcq ? "Select an option above." : "Your spoken answer will appear here. You can also type or edit before submitting.";
  if (!isMcq) return;
  question.options.forEach((option, index) => {
    const letter = ["A", "B", "C", "D"][index];
    const button = document.createElement("button");
    button.className = "option-button";
    button.type = "button";
    button.innerHTML = `<span class="option-letter">${letter}</span><span>${option}</span>`;
    button.addEventListener("click", () => {
      selectedMcqAnswer = letter;
      answerText.value = letter;
      submitButton.disabled = false;
      mcqOptions.querySelectorAll(".option-button").forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
    });
    mcqOptions.append(button);
  });
}

function renderQuestion() {
  const question = currentQuestion();
  if (!question) return;
  stageTitle.textContent = "Interview in progress";
  questionType.textContent = question.type;
  questionProgress.textContent = `${session.index + 1} / ${session.questions.length}`;
  questionText.textContent = question.prompt;
  answerText.value = "";
  answerText.dataset.stableText = "";
  submitButton.disabled = true;
  setAnswerMode(question);
  const optionSpeech = question.options ? question.options.map((option, index) => `${["A", "B", "C", "D"][index]}. ${option}`).join(". ") : "";
  speak(`${question.type}. ${question.prompt}. ${optionSpeech}`);
}

function renderList(target, items) {
  target.innerHTML = "";
  items.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    target.append(li);
  });
}

function labelize(value) {
  return value.replaceAll("_", " ");
}

function renderDimensions(dimensions = {}) {
  dimensionScores.innerHTML = "";
  ["communication", "fluency", "knowledge"].forEach(name => {
    const value = dimensions[name];
    const chip = document.createElement("div");
    chip.className = "dimension-chip";
    chip.innerHTML = `<span>${labelize(name)}</span><strong>${typeof value === "number" ? value : "--"}</strong>`;
    dimensionScores.append(chip);
  });
}

function renderFeedback(feedback) {
  latestScore.textContent = typeof feedback.score === "number" ? String(feedback.score) : "No score";
  feedbackHeadline.textContent = feedback.headline;
  renderDimensions(feedback.dimensions);
  renderList(strengthList, feedback.strengths || []);
  renderList(improvementList, feedback.improvements || []);
  const spokenScore = typeof feedback.score === "number" ? `Your score is ${feedback.score}.` : "No score was given because the answer was not meaningful enough.";
  speak(`Feedback. ${feedback.headline}. ${spokenScore} ${feedback.improvements?.[0] || ""}`);
}

function summarizeReport() {
  const answers = session.answers;
  const scored = answers.filter(item => typeof item.feedback.score === "number");
  const overall = scored.length ? Math.round(scored.reduce((sum, item) => sum + item.feedback.score, 0) / scored.length) : null;
  const dimensions = ["aptitude", "communication", "fluency", "knowledge", "technical_depth", "resume_alignment"];
  const competencyScores = Object.fromEntries(dimensions.map(name => {
    const values = answers.flatMap(item => {
      if (item.feedback.competency === name && typeof item.feedback.score === "number") return [item.feedback.score];
      const dimension = item.feedback.dimensions?.[name];
      return typeof dimension === "number" ? [dimension] : [];
    });
    return [name, values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null];
  }));
  return {
    overallScore: overall,
    verdict: overall === null ? "Not enough meaningful answers to score" : overall >= 82 ? "Ready for strong interview performance" : overall >= 68 ? "Interview-ready with targeted practice" : overall >= 52 ? "Promising, but needs clearer communication and deeper examples" : "Needs significant practice before a formal interview",
    competencyScores
  };
}

function renderReport() {
  const report = summarizeReport();
  stageTitle.textContent = "Interview complete";
  setStatus("Complete");
  overallScore.textContent = typeof report.overallScore === "number" ? String(report.overallScore) : "--";
  verdictText.textContent = report.verdict;
  competencyBars.innerHTML = "";
  Object.entries(report.competencyScores).filter(([, score]) => score !== null).forEach(([name, score]) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `<div class="bar-label"><span>${labelize(name)}</span><span>${score}</span></div><div class="bar-track"><div class="bar-fill" style="width:${score}%"></div></div>`;
    competencyBars.append(row);
  });
  questionType.textContent = "Report ready";
  questionProgress.textContent = `${session.questions.length} / ${session.questions.length}`;
  questionText.textContent = `${session.profile.studentName}, your final verdict is: ${report.verdict}. Overall score: ${typeof report.overallScore === "number" ? report.overallScore : "not scored"}.`;
  adoptionEvent("interview_completed", { rounds: session.profile.selectedRounds.join(","), questions: session.questions.length, scored: session.answers.filter(item => typeof item.feedback.score === "number").length });
}

function stopRecording() {
  if (!recognition || !isRecording) return;
  isRecording = false;
  recognition.stop();
  recordButton.classList.remove("recording");
  recordButton.textContent = "Start answering";
  setStatus("Paused");
}

loadModelButton.addEventListener("click", loadWebLLM);

resumeFile.addEventListener("change", async () => {
  const file = resumeFile.files?.[0];
  resumeText.value = "";
  resumeFileName.value = "";
  if (!file) {
    resumeStatus.textContent = "Resume upload is optional. Add details below if extraction is limited.";
    return;
  }
  resumeFileName.value = file.name;
  resumeStatus.textContent = `Reading ${file.name}...`;
  try {
    const extracted = extractReadableText(await file.arrayBuffer());
    resumeText.value = extracted;
    resumeStatus.textContent = extracted.length > 80 ? `${file.name} attached. Resume-aware questions will use extracted text.` : `${file.name} attached. Add key details below if extraction is limited.`;
    adoptionEvent("resume_attached", { extension: file.name.split(".").pop()?.toLowerCase() || "unknown", extractedChars: extracted.length });
  } catch {
    resumeStatus.textContent = "Could not read the resume file. Add key project details below.";
  }
});

setupForm.addEventListener("submit", async event => {
  event.preventDefault();
  stopRecording();
  setStatus("Preparing", "active");
  stageTitle.textContent = "Preparing questions";
  questionText.textContent = webllmReady ? "Generating personalized questions in the browser..." : "Preparing offline fallback questions...";
  const profile = profileFromForm();
  session = {
    profile,
    questions: await buildQuestionPlan(profile),
    answers: [],
    index: 0
  };
  adoptionEvent("interview_started", { rounds: profile.selectedRounds.join(","), questionCount: session.questions.length, jobTitleLength: profile.jobTitle.length });
  setStatus(webllmReady ? "LLM active" : "Fallback");
  renderQuestion();
});

speakQuestionButton.addEventListener("click", () => {
  const question = currentQuestion();
  speak(question?.prompt || questionText.textContent);
});

recordButton.addEventListener("click", () => {
  if (currentQuestion()?.round === "aptitude") return;
  if (!session) {
    voiceNote.textContent = "Start an interview session first.";
    return;
  }
  if (!recognition) {
    voiceNote.textContent = "Speech recognition is not available here, but typed answers still work.";
    return;
  }
  if (isRecording) {
    stopRecording();
    return;
  }
  isRecording = true;
  answerText.dataset.stableText = `${answerText.value.trim()} `;
  recordButton.classList.add("recording");
  recordButton.textContent = "Stop recording";
  setStatus("Listening", "active");
  recognition.start();
});

answerText.addEventListener("input", () => {
  answerText.dataset.stableText = answerText.value ? `${answerText.value.trim()} ` : "";
  submitButton.disabled = !answerText.value.trim() || !session;
});

submitButton.addEventListener("click", async () => {
  stopRecording();
  const question = currentQuestion();
  if (!question) return;
  const answer = question.round === "aptitude" ? selectedMcqAnswer : answerText.value.trim();
  if (!answer) return;
  setStatus("Scoring", "active");
  submitButton.disabled = true;
  const feedback = question.round === "aptitude" ? evaluateMcq(answer, question) : await evaluateSpoken(answer, question, session.profile);
  session.answers.push({ question, answer, feedback, at: new Date().toISOString() });
  adoptionEvent("answer_submitted", { round: question.round, scored: typeof feedback.score === "number", unscored: Boolean(feedback.unscored) });
  renderFeedback(feedback);
  session.index += 1;
  if (session.index >= session.questions.length) {
    renderReport();
    return;
  }
  setTimeout(() => {
    setStatus(webllmReady ? "LLM active" : "Fallback");
    renderQuestion();
  }, question.round === "aptitude" ? 700 : 2400);
});

exportEvents.addEventListener("click", () => {
  const events = localStorage.getItem("ai_interviewer_events") || "[]";
  const blob = new Blob([events], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ai-interviewer-adoption-events.json";
  link.click();
  URL.revokeObjectURL(url);
});

adoptionEvent("app_loaded");
