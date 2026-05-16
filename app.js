/**
 * PokeLearn — Pokémon browser, VALSEA realtime transcription, voice UI
 */

const POKEAPI_LIST =
  "https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0";
const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

const VALSEA_TRANSCRIBE_URL = "https://api.valsea.ai/v1/audio/transcriptions";

const DEFAULT_POKEMON_ID = 25;
const MIN_RECORDING_MS = 1500;

const CHARACTER_RULES =
  'Never say "Certainly!", "Great question!", "Of course!", or any assistant-style phrases. Never sound like an AI assistant. Always speak AS the Pokémon in first person using their real speech patterns. Always end with something that makes the kid want to ask another question.';

const POKEMON_PERSONALITIES = {
  25: "You ARE Pikachu. Start with 'Pika pika!' and end with 'Pika!' Use very short excited sentences only — maximum 2 sentences between the Pika sounds. I am buzzing with energy!",
  4: "You ARE Charmander. I speak brave and fiery in first person. I love a tough challenge and I tell the kid to keep trying like training by a volcano.",
  1: "You ARE Bulbasaur. I speak slow, warm, and nurturing about nature. I use gentle first-person words like a patient garden friend.",
  150: "You ARE Mewtwo. I am formal and precise. I sometimes speak in third person about Mewtwo's power. I call the child 'young one' with calm respect.",
  143: "You ARE Snorlax. I speak slowly and yawn a lot. Every reply mentions being sleepy or hungry, gives ONE simple answer, then I want to nap.",
  133: "You ARE Eevee. I am nervous and sweet in first person. I naturally say 'um' and 'oh!' while I figure things out with the kid.",
  94: "You ARE Gengar. I cackle and use spooky wordplay. I say 'Heheheh' often. Learning feels like a fun ghost mystery I am leading.",
  448: "You ARE Lucario. I speak with calm discipline and quiet strength in first person. I help the kid feel brave and focused.",
};

const TYPE_PERSONALITY_HINTS = {
  fire: "I speak with intensity and passion — short fiery bursts!",
  water: "I speak flowing and calm, like a gentle river.",
  grass: "I speak slowly and nurturing, like growing plants.",
  electric: "I speak fast and jumpy, zippy and excited!",
  psychic: "I speak mysteriously, with quiet knowing.",
  ghost: "I speak eerily and playfully, with spooky teasing.",
  ice: "I speak cool and clear, crisp and steady.",
  fighting: "I speak bold and direct, like a trainer's punch.",
  flying: "I speak light and breezy, soaring between ideas.",
  poison: "I speak sly but helpful, with a tricky giggle.",
  ground: "I speak solid and steady, down-to-earth.",
  rock: "I speak tough and sturdy, simple and strong.",
  bug: "I speak curious and busy, hopping between facts.",
  steel: "I speak firm and shiny, precise and loyal.",
  dragon: "I speak grand and mighty, like an epic tale.",
  dark: "I speak cheeky and clever, with a brave smirk.",
  fairy: "I speak sparkly and kind, with fairy-tale warmth.",
  normal: "I speak friendly and cheerful, like a buddy.",
};

const state = {
  companionId: DEFAULT_POKEMON_ID,
  companionName: "Pikachu",
  companionSlug: "pikachu",
  companionTypes: ["electric"],
  shiny: false,
  subject: "science",
  subjectLabel: "Science",
  stars: 0,
  listening: false,
  processing: false,
  finalTranscript: "",
  language: "english",
  conversationHistory: [],
};

const LANGUAGE_CODES = {
  english: "english",
  sinhala: "si",
  tamil: "ta",
};

const LANGUAGE_LABELS = {
  english: "English",
  sinhala: "Sinhala",
  tamil: "Tamil",
};

const VALSEA_HINT_TEXT =
  "This is a child speaking to a Pokemon educational app. They may mix languages.";

const MAX_CONVERSATION_MESSAGES = 6;

const EMOTION_KEYWORDS = {
  confused: [
    "dont get it", "don't get it", "confused", "hard", "difficult", "why",
    "what does", "i dont know", "i don't know", "help", "dont understand",
    "don't understand", "huh",
  ],
  confident: [
    "cool", "wow", "amazing", "i know", "easy", "got it", "yes!", "yay",
    "awesome", "i can",
  ],
  disengaged: [
    "boring", "dont want", "don't want", "stop", "tired", "whatever",
    "i'm done", "im done",
  ],
  frustrated: [
    "ugh", "argh", "i give up", "stupid", "hate this", "can't", "cant do it",
    "frustrated",
  ],
};

const recorder = {
  mediaRecorder: null,
  mediaStream: null,
  chunks: [],
  recordingStartedAt: 0,
  mimeType: "audio/webm",
};

const SUBJECT_LABELS = {
  science: "Science",
  math: "Math",
  english: "English",
  geography: "Geography",
  general: "General",
};

const HISTORY_KEY = "pokelearn_history";
const STARS_KEY = "pokelearn_stars";
const STREAK_KEY = "pokelearn_streak";
const LAST_ACTIVE_KEY = "pokelearn_last_active";

const SUBJECT_KEYWORDS = {
  science: [
    "photosynthesis", "plant", "plants", "animal", "animals", "cell", "cells",
    "energy", "gravity", "space", "force", "science", "biology", "chemistry",
    "atom", "molecule", "ecosystem", "weather", "planet", "solar",
  ],
  math: [
    "add", "subtract", "multiply", "divide", "fraction", "equation", "plus",
    "minus", "times", "number", "numbers", "count", "algebra", "geometry",
    "percent", "decimal", "equal", "equals",
  ],
  english: [
    "spell", "spelling", "grammar", "word", "words", "meaning", "sentence",
    "write", "writing", "read", "reading", "verb", "noun", "adjective",
    "story", "paragraph",
  ],
  geography: [
    "country", "capital", "continent", "ocean", "map", "river", "mountain",
    "city", "world", "geography", "landmark", "desert", "island",
  ],
};

const CONFUSION_PHRASES = [
  "dont understand",
  "don't understand",
  "do not understand",
  "confused",
  "what",
  "huh",
  "again",
  "explain",
  "i dont get",
  "i don't get",
  "help me understand",
  "what do you mean",
  "say again",
];

const SUBJECT_BADGE_LABELS = {
  science: "🔬 Science",
  math: "➕ Math",
  english: "📚 English",
  geography: "🌍 Geography",
  general: "📝 General",
};

let allPokemon = [];
let filteredPokemon = [];
let spriteObserver = null;
let searchQuery = "";

// DOM refs
const starCountEl = document.getElementById("starCount");
const starCounterEl = document.getElementById("starCounter");
const bubbleLabelEl = document.getElementById("bubbleLabel");
const bubbleTextEl = document.getElementById("bubbleText");
const transcriptTextEl = document.getElementById("transcriptText");
const micBtnEl = document.getElementById("micBtn");
const micContentEl = document.getElementById("micContent");
const micHintEl = document.getElementById("micHint");
const subjectBtns = document.querySelectorAll(".subject-btn");

const heroSpriteEl = document.getElementById("heroSprite");
const heroNameEl = document.getElementById("heroName");
const heroIdEl = document.getElementById("heroId");
const pokemonSearchEl = document.getElementById("pokemonSearch");
const shinyToggleEl = document.getElementById("shinyToggle");
const browserStatusEl = document.getElementById("browserStatus");
const pokemonGridEl = document.getElementById("pokemonGrid");
const pokemonGridScrollEl = document.getElementById("pokemonGridScroll");
const progressTodayCountEl = document.getElementById("progressTodayCount");
const progressStarsEl = document.getElementById("progressStars");
const progressStreakEl = document.getElementById("progressStreak");
const progressSubjectsEl = document.getElementById("progressSubjects");
const langToggleEl = document.getElementById("langToggle");
const langBtns = langToggleEl ? langToggleEl.querySelectorAll(".lang-btn") : [];

function getDateKey(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getDateKey(d.getTime());
}

function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function detectSubjectFromQuestion(text) {
  const lower = text.toLowerCase();
  const scores = { science: 0, math: 0, english: 0, geography: 0 };

  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[subject]++;
    }
  }

  if (
    /\d+\s*[\+\-\*\/x×÷]\s*\d+/.test(lower) ||
    (/\d+/.test(lower) &&
      /\b(add|plus|subtract|minus|multiply|times|divide|equals?)\b/.test(lower))
  ) {
    scores.math += 2;
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] > 0) return ranked[0][0];
  return "general";
}

function detectConfusion(text) {
  const lower = text.toLowerCase();
  return CONFUSION_PHRASES.some((phrase) => lower.includes(phrase));
}

function updateStreak() {
  const today = getDateKey();
  const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
  let streak = parseInt(localStorage.getItem(STREAK_KEY) || "0", 10);

  if (!lastActive) {
    streak = 1;
  } else if (lastActive === today) {
    streak = Math.max(streak, 1);
  } else if (lastActive === getYesterdayKey()) {
    streak += 1;
  } else {
    streak = 1;
  }

  localStorage.setItem(STREAK_KEY, String(streak));
  localStorage.setItem(LAST_ACTIVE_KEY, today);
  return streak;
}

function getStreak() {
  return parseInt(localStorage.getItem(STREAK_KEY) || "0", 10);
}

function recordSuccessfulQuestion(question, subject) {
  const history = getHistory();
  history.push({
    question,
    subject,
    pokemon: state.companionName,
    pokemonId: state.companionId,
    timestamp: Date.now(),
  });
  saveHistory(history);
  updateStreak();
  addStar(1);
}

function loadStars() {
  state.stars = parseInt(localStorage.getItem(STARS_KEY) || "0", 10);
  starCountEl.textContent = String(state.stars);
}

function updateProgressPanel() {
  const today = getDateKey();
  const history = getHistory();
  const todayEntries = history.filter((h) => getDateKey(h.timestamp) === today);
  const bySubject = {};

  todayEntries.forEach((h) => {
    const key = h.subject || "general";
    bySubject[key] = (bySubject[key] || 0) + 1;
  });

  progressTodayCountEl.textContent = String(todayEntries.length);
  progressStarsEl.textContent = String(state.stars);
  progressStreakEl.textContent = String(getStreak());

  if (!todayEntries.length) {
    progressSubjectsEl.innerHTML =
      '<span class="progress-badge empty">Ask your first question today!</span>';
    return;
  }

  progressSubjectsEl.innerHTML = Object.entries(bySubject)
    .map(([subject, count]) => {
      const label = SUBJECT_BADGE_LABELS[subject] || `📝 ${subject}`;
      return `<span class="progress-badge">${label}: ${count}</span>`;
    })
    .join("");
}

function spriteUrl(id, shiny = state.shiny) {
  return shiny
    ? `${SPRITE_BASE}/shiny/${id}.png`
    : `${SPRITE_BASE}/${id}.png`;
}

function formatPokemonName(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPokemonId(id) {
  return `#${String(id).padStart(3, "0")}`;
}

function parseIdFromUrl(url) {
  const parts = url.split("/").filter(Boolean);
  return parseInt(parts[parts.length - 1], 10);
}

function greeting(subject, name) {
  return `Hi trainer! I'm ${name}! Tap the mic and ask me anything about ${subject}.`;
}

function updateBubble() {
  bubbleLabelEl.textContent = `${state.companionName} says:`;
  bubbleTextEl.textContent = greeting(state.subjectLabel, state.companionName);
}

function setSubject(btn) {
  state.subject = btn.dataset.subject;
  state.subjectLabel =
    SUBJECT_LABELS[state.subject] ||
    state.subject.charAt(0).toUpperCase() + state.subject.slice(1);

  subjectBtns.forEach((b) => b.classList.toggle("active", b === btn));
  updateBubble();
}

function bumpStars() {
  starCounterEl.classList.remove("bump");
  void starCounterEl.offsetWidth;
  starCounterEl.classList.add("bump");
}

function addStar(amount = 1) {
  state.stars += amount;
  localStorage.setItem(STARS_KEY, String(state.stars));
  starCountEl.textContent = String(state.stars);
  bumpStars();
  updateProgressPanel();
}

function setMicUI(mode) {
  micBtnEl.classList.remove("recording", "processing");
  micBtnEl.disabled = false;
  transcriptTextEl.classList.remove("listening");

  if (mode === "recording") {
    state.listening = true;
    state.processing = false;
    micBtnEl.classList.add("recording");
    micContentEl.textContent = "🎤";
    micBtnEl.setAttribute("aria-label", "Recording… tap to stop");
    transcriptTextEl.classList.add("listening");
    micHintEl.textContent = "Speak now… tap the mic when you're done!";
    return;
  }

  if (mode === "processing") {
    state.listening = false;
    state.processing = true;
    micBtnEl.classList.add("processing");
    micBtnEl.disabled = true;
    micContentEl.textContent = "Processing...";
    micBtnEl.setAttribute("aria-label", "Processing transcription, please wait");
    micHintEl.textContent = "Hang tight — still transcribing your voice!";
    return;
  }

  state.listening = false;
  state.processing = false;
  micContentEl.textContent = "🎤";
  micBtnEl.setAttribute("aria-label", "Tap to talk");
  micHintEl.textContent = "Tap the microphone to talk!";
}

function setTranscriptStatus(message) {
  transcriptTextEl.textContent = message;
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isOnlyNumbers(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return /^[\d\s.,+\-%]+$/.test(trimmed);
}

function isGibberishTranscript(text) {
  const letters = text.toLowerCase().replace(/[^a-z]/g, "");
  if (letters.length < 3) return false;
  if (!/[aeiouy]/.test(letters)) return true;
  if (/[^aeiouy]{4,}/i.test(letters)) return true;
  const vowels = (letters.match(/[aeiouy]/g) || []).length;
  return letters.length >= 8 && vowels / letters.length < 0.15;
}

function isInvalidTranscript(text) {
  if (!text?.trim()) return true;
  if (countWords(text) < 2) return true;
  if (isOnlyNumbers(text)) return true;
  if (isGibberishTranscript(text)) return true;
  return false;
}

function rejectInvalidTranscript() {
  state.finalTranscript = "";
  showTranscriptError("Could not hear you clearly, please try again");
}

function showTranscriptError(message) {
  transcriptTextEl.textContent = message;
  transcriptTextEl.classList.remove("listening");
  setMicUI("idle");
  micHintEl.textContent = "Tap the microphone to try again";
}

async function fetchPokemonTypes(id) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!res.ok) throw new Error("Pokémon type fetch failed");
  const data = await res.json();
  return data.types.map((t) => t.type.name);
}

function personalityFromTypes(name, types) {
  const primary = types[0] || "normal";
  const hint =
    TYPE_PERSONALITY_HINTS[primary] ||
    "I speak friendly and cheerful, like a buddy.";
  const typeLabel = types.length ? types.join("/") : "unknown";
  return `You ARE ${name}, a ${typeLabel}-type Pokémon. ${hint} I teach kids aged 6-14 in first person.`;
}

async function getCompanionPersonality() {
  if (POKEMON_PERSONALITIES[state.companionId]) {
    return POKEMON_PERSONALITIES[state.companionId];
  }
  if (!state.companionTypes?.length) {
    state.companionTypes = await fetchPokemonTypes(state.companionId);
  }
  return personalityFromTypes(state.companionName, state.companionTypes);
}

function buildRecentQuestionsContext() {
  const recent = getHistory().slice(-3);
  if (!recent.length) return "";
  const list = recent
    .map(
      (h, i) =>
        `${i + 1}. "${h.question}" (${SUBJECT_BADGE_LABELS[h.subject] || h.subject})`
    )
    .join(" ");
  return ` The student recently asked: ${list}. When helpful, connect this answer to what they discussed before (for example: "Last time you asked about photosynthesis, this connects to that!").`;
}

function scoreEmotionFromText(text) {
  const lower = text.toLowerCase();
  const scores = { confused: 0, confident: 0, disengaged: 0, frustrated: 0 };
  for (const [emotion, words] of Object.entries(EMOTION_KEYWORDS)) {
    for (const w of words) {
      if (lower.includes(w)) scores[emotion]++;
    }
  }
  return scores;
}

function deriveEmotionState(text, sentiment) {
  const scores = scoreEmotionFromText(text);
  const topEntry = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const [topEmotion, topScore] = topEntry;

  if (sentiment === "negative" && topScore === 0) return "frustrated";
  if (topScore === 0) {
    if (sentiment === "positive") return "confident";
    if (sentiment === "negative") return "frustrated";
    return "neutral";
  }

  if (topEmotion === "confused" && sentiment === "negative" && scores.frustrated > 0) {
    return "frustrated";
  }
  return topEmotion;
}

const EMOTION_INSTRUCTIONS = {
  confused:
    " The student feels CONFUSED. Slow down. Use one simple analogy. Break the answer into 2 tiny steps. Be extra warm and patient.",
  confident:
    " The student feels CONFIDENT. Be excited and high-energy. Add one fun bonus fact. Encourage them to try a harder follow-up question.",
  disengaged:
    " The student feels DISENGAGED. Be dramatic and surprising. Start with something unexpected about the topic, like \"Wait wait wait — did you know?!\" Make it feel like a tiny adventure.",
  frustrated:
    " The student feels FRUSTRATED. Be very gentle. Validate their feeling first (for example: \"Even I find this tricky sometimes!\"). Then give one small, kind step forward.",
  neutral:
    " The student feels NEUTRAL. Be warm, curious, and inviting. Keep it light and fun.",
};

function buildSystemPrompt(emotion, personality, detectedSubject) {
  let prompt = `${CHARACTER_RULES} ${personality} Keep answers under 5 sentences unless your character rules say shorter. Use simple words kids understand. Always stay fully in character — never break character or sound like an AI.`;
  prompt += buildRecentQuestionsContext();

  if (state.language && state.language !== "english") {
    prompt += ` The child chose to speak in ${LANGUAGE_LABELS[state.language]}. Reply in clear, simple English, but feel free to acknowledge a single ${LANGUAGE_LABELS[state.language]} word warmly if it helps them feel understood.`;
  }

  const subject = detectedSubject || state.subject;
  if (subject === "science") {
    prompt +=
      " If the question is about science, include one fun related fact about your Pokémon type.";
  } else if (subject === "math") {
    prompt +=
      " If the question is about math, be encouraging about logic and step-by-step thinking.";
  } else if (subject === "english") {
    prompt +=
      " If the question is about English, help with the specific word or grammar they asked about.";
  } else if (subject === "geography") {
    prompt +=
      " If the question is about geography, use places and maps kids can picture easily.";
  }

  prompt += EMOTION_INSTRUCTIONS[emotion] || EMOTION_INSTRUCTIONS.neutral;
  return prompt;
}

async function fetchSentiment(transcript) {
  const res = await fetch("https://api.valsea.ai/v1/sentiment", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CONFIG.VALSEA_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "valsea-sentiment",
      transcript,
    }),
  });
  if (!res.ok) throw new Error("Sentiment request failed");
  const data = await res.json();
  return data.sentiment;
}

function buildChatMessages(transcript, emotion, personality, detectedSubject) {
  const messages = [
    {
      role: "system",
      content: buildSystemPrompt(emotion, personality, detectedSubject),
    },
  ];

  state.conversationHistory.forEach((msg) => {
    messages.push({ role: msg.role, content: msg.content });
  });

  messages.push({ role: "user", content: transcript });
  return messages;
}

async function fetchOpenAIReply(transcript, emotion, personality, detectedSubject) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CONFIG.OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: buildChatMessages(transcript, emotion, personality, detectedSubject),
    }),
  });
  if (!res.ok) throw new Error("OpenAI request failed");
  const data = await res.json();
  return data.choices[0].message.content;
}

function pushConversationTurn(userText, assistantText) {
  state.conversationHistory.push({ role: "user", content: userText });
  state.conversationHistory.push({ role: "assistant", content: assistantText });
  if (state.conversationHistory.length > MAX_CONVERSATION_MESSAGES) {
    state.conversationHistory.splice(
      0,
      state.conversationHistory.length - MAX_CONVERSATION_MESSAGES
    );
  }
}

function clearConversationHistory() {
  state.conversationHistory = [];
}

async function respondToFinalTranscript(transcript) {
  const detectedSubject = detectSubjectFromQuestion(transcript);

  let sentiment = "neutral";
  try {
    sentiment = await fetchSentiment(transcript);
  } catch (err) {
    console.warn("Sentiment fetch failed, using text-only emotion analysis", err);
  }

  const emotion = deriveEmotionState(transcript, sentiment);
  console.log("Detected emotion:", emotion, "sentiment:", sentiment);

  const personality = await getCompanionPersonality();
  const reply = await fetchOpenAIReply(
    transcript,
    emotion,
    personality,
    detectedSubject
  );
  bubbleTextEl.textContent = reply;
  pushConversationTurn(transcript, reply);
  recordSuccessfulQuestion(transcript, detectedSubject);
}

function pickAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "";
}

function stopMicTracks() {
  if (recorder.mediaStream) {
    recorder.mediaStream.getTracks().forEach((t) => t.stop());
    recorder.mediaStream = null;
  }
}

function filenameForMime(mime) {
  if (mime.includes("mp4")) return "recording.mp4";
  if (mime.includes("ogg")) return "recording.ogg";
  return "recording.webm";
}

function getValseaLanguageCode() {
  return LANGUAGE_CODES[state.language] || "english";
}

async function transcribeWithValsea(blob) {
  const form = new FormData();
  form.append("file", blob, filenameForMime(blob.type || "audio/webm"));
  form.append("model", "valsea-transcribe");
  form.append("language", getValseaLanguageCode());
  form.append("hint_text", VALSEA_HINT_TEXT);
  const res = await fetch(VALSEA_TRANSCRIBE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${CONFIG.VALSEA_KEY}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`VALSEA transcription failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.text || "").trim();
}

function deliverFinalTranscript() {
  setMicUI("idle");
  transcriptTextEl.classList.remove("listening");
  if (!state.finalTranscript) return;
  bubbleTextEl.textContent = "Thinking…";
  respondToFinalTranscript(state.finalTranscript).catch(() => {
    bubbleTextEl.textContent = getPlaceholderReply();
  });
}

async function processRecordedAudio() {
  if (!recorder.chunks.length) {
    showTranscriptError("Could not hear you clearly, please try again");
    return;
  }

  const mime = recorder.mimeType || "audio/webm";
  const blob = new Blob(recorder.chunks, { type: mime });
  recorder.chunks = [];

  setMicUI("processing");
  setTranscriptStatus("Processing...");

  let text = "";
  try {
    text = await transcribeWithValsea(blob);
  } catch (err) {
    console.error("VALSEA transcription error", err);
    showTranscriptError("Could not transcribe audio, please try again");
    return;
  }

  if (isInvalidTranscript(text)) {
    rejectInvalidTranscript();
    return;
  }

  state.finalTranscript = text;
  transcriptTextEl.textContent = text;
  deliverFinalTranscript();
}

async function startRecording() {
  if (state.listening || state.processing) return;
  if (typeof MediaRecorder === "undefined") {
    showTranscriptError("Recording not supported in this browser.");
    return;
  }

  state.finalTranscript = "";
  recorder.chunks = [];
  recorder.recordingStartedAt = Date.now();

  try {
    recorder.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    showTranscriptError("Microphone access denied");
    return;
  }

  const mime = pickAudioMimeType();
  recorder.mimeType = mime || "audio/webm";

  try {
    recorder.mediaRecorder = mime
      ? new MediaRecorder(recorder.mediaStream, { mimeType: mime })
      : new MediaRecorder(recorder.mediaStream);
  } catch (err) {
    console.error("MediaRecorder failed", err);
    stopMicTracks();
    showTranscriptError("Could not start recording.");
    return;
  }

  recorder.mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recorder.chunks.push(event.data);
    }
  };

  recorder.mediaRecorder.onstop = () => {
    stopMicTracks();
    processRecordedAudio();
  };

  recorder.mediaRecorder.onerror = (event) => {
    console.error("MediaRecorder error", event.error || event);
    stopMicTracks();
    showTranscriptError("Recording failed, please try again.");
  };

  setTranscriptStatus("Listening...");
  setMicUI("recording");
  recorder.mediaRecorder.start();
}

function stopRecording() {
  if (!state.listening) return;
  const elapsed = Date.now() - recorder.recordingStartedAt;
  if (elapsed < MIN_RECORDING_MS) {
    setTranscriptStatus("Hold the button longer!");
    micHintEl.textContent = "Keep talking a little longer…";
    return;
  }
  if (recorder.mediaRecorder && recorder.mediaRecorder.state !== "inactive") {
    try {
      recorder.mediaRecorder.stop();
    } catch (err) {
      console.error("MediaRecorder stop failed", err);
      stopMicTracks();
      showTranscriptError("Could not stop recording, please try again.");
    }
  }
}

function toggleMic() {
  if (state.processing) return;
  if (!state.listening) {
    startRecording();
  } else {
    stopRecording();
  }
}

function getPlaceholderReply() {
  return `Great question about ${state.subjectLabel}! Photosynthesis is how plants use sunlight to make food. You're doing awesome, trainer!`;
}

function triggerHeroBounce() {
  heroSpriteEl.classList.remove("bounce");
  void heroSpriteEl.offsetWidth;
  heroSpriteEl.classList.add("bounce");
  heroSpriteEl.addEventListener(
    "animationend",
    () => heroSpriteEl.classList.remove("bounce"),
    { once: true }
  );
}

function updateHero() {
  heroSpriteEl.src = spriteUrl(state.companionId);
  heroSpriteEl.alt = state.companionName;
  heroNameEl.textContent = state.companionName;
  heroIdEl.textContent = formatPokemonId(state.companionId);
  triggerHeroBounce();
}

function selectPokemon(pokemon, cellEl) {
  state.companionId = pokemon.id;
  state.companionSlug = pokemon.name;
  state.companionName = formatPokemonName(pokemon.name);
  state.companionTypes = null;
  clearConversationHistory();
  fetchPokemonTypes(pokemon.id)
    .then((types) => {
      if (state.companionId === pokemon.id) state.companionTypes = types;
    })
    .catch(() => {});

  document.querySelectorAll(".pokemon-cell").forEach((cell) => {
    cell.classList.toggle("selected", cell === cellEl);
    cell.setAttribute("aria-selected", cell === cellEl ? "true" : "false");
  });

  updateHero();
  updateBubble();
}

function setLanguage(lang) {
  if (!LANGUAGE_CODES[lang]) return;
  state.language = lang;
  langBtns.forEach((btn) => {
    const isActive = btn.dataset.lang === lang;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });
}

function loadSpriteForImg(img) {
  const id = img.dataset.id;
  if (!id) return;
  img.src = spriteUrl(Number(id));
  img.dataset.loaded = "true";
  if (spriteObserver) spriteObserver.unobserve(img);
}

function setupSpriteObserver() {
  if (spriteObserver) spriteObserver.disconnect();

  spriteObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) loadSpriteForImg(entry.target);
      });
    },
    {
      root: pokemonGridScrollEl,
      rootMargin: "80px",
      threshold: 0.01,
    }
  );
}

function observeGridSprites() {
  pokemonGridEl.querySelectorAll("img[data-id]").forEach((img) => {
    if (img.dataset.loaded === "true") return;
    spriteObserver.observe(img);
  });
}

function buildPokemonCell(pokemon) {
  const displayName = formatPokemonName(pokemon.name);
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = "pokemon-cell";
  cell.dataset.id = String(pokemon.id);
  cell.dataset.name = pokemon.name;
  cell.setAttribute("role", "option");
  cell.setAttribute("aria-selected", "false");
  cell.setAttribute("aria-label", displayName);

  if (pokemon.id === state.companionId) {
    cell.classList.add("selected");
    cell.setAttribute("aria-selected", "true");
  }

  const img = document.createElement("img");
  img.dataset.id = String(pokemon.id);
  img.alt = "";
  img.width = 56;
  img.height = 56;

  const label = document.createElement("span");
  label.className = "pokemon-cell-name";
  label.textContent = displayName;

  cell.append(img, label);
  cell.addEventListener("click", () => selectPokemon(pokemon, cell));
  return cell;
}

function renderPokemonGrid(list) {
  if (spriteObserver) spriteObserver.disconnect();

  const fragment = document.createDocumentFragment();
  list.forEach((pokemon) => fragment.appendChild(buildPokemonCell(pokemon)));
  pokemonGridEl.replaceChildren(fragment);

  observeGridSprites();
  updateBrowserStatus(list.length);
}

function updateBrowserStatus(visibleCount) {
  if (!allPokemon.length) return;

  if (searchQuery) {
    browserStatusEl.textContent =
      visibleCount === 0
        ? `No Pokémon match "${searchQuery}"`
        : `Showing ${visibleCount} of ${allPokemon.length} Pokémon`;
  } else {
    browserStatusEl.textContent = `${allPokemon.length} Pokémon — scroll to explore!`;
  }
}

function applySearch() {
  const q = searchQuery.trim().toLowerCase();
  filteredPokemon = q
    ? allPokemon.filter((p) => p.name.includes(q))
    : allPokemon;
  renderPokemonGrid(filteredPokemon);
}

function toggleShiny() {
  state.shiny = !state.shiny;
  shinyToggleEl.classList.toggle("active", state.shiny);
  shinyToggleEl.setAttribute("aria-pressed", String(state.shiny));
  shinyToggleEl.textContent = state.shiny ? "✨ Shiny ON" : "✨ Shiny";

  pokemonGridEl.querySelectorAll("img[data-id]").forEach((img) => {
    if (img.dataset.loaded === "true") {
      img.src = spriteUrl(Number(img.dataset.id));
    }
  });
  heroSpriteEl.src = spriteUrl(state.companionId);
}

async function fetchAllPokemon() {
  browserStatusEl.textContent = "Loading Pokémon…";
  pokemonGridEl.replaceChildren();

  const res = await fetch(POKEAPI_LIST);
  if (!res.ok) throw new Error(`PokeAPI error: ${res.status}`);

  const data = await res.json();
  allPokemon = data.results.map((entry) => ({
    name: entry.name,
    id: parseIdFromUrl(entry.url),
  }));

  filteredPokemon = allPokemon;
  renderPokemonGrid(filteredPokemon);

  const defaultMon = allPokemon.find((p) => p.id === DEFAULT_POKEMON_ID);
  if (defaultMon) {
    state.companionSlug = defaultMon.name;
    state.companionName = formatPokemonName(defaultMon.name);
    fetchPokemonTypes(DEFAULT_POKEMON_ID)
      .then((types) => {
        state.companionTypes = types;
      })
      .catch(() => {});
    updateBubble();
  }
}

subjectBtns.forEach((btn) => {
  btn.addEventListener("click", () => setSubject(btn));
});

micBtnEl.addEventListener("click", toggleMic);

pokemonSearchEl.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  applySearch();
});

shinyToggleEl.addEventListener("click", toggleShiny);

langBtns.forEach((btn) => {
  btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
});

setupSpriteObserver();
loadStars();
updateProgressPanel();
updateBubble();
fetchAllPokemon().catch(() => {
  browserStatusEl.textContent = "Could not load Pokémon. Check your connection.";
});
