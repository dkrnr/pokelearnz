/**
 * PokeLearn — Pokémon browser, VALSEA realtime transcription, voice UI
 */

const POKEAPI_LIST =
  "https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0";
const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

const DEFAULT_POKEMON_ID = 25;
const MIN_RECORDING_MS = 1500;

const CHARACTER_RULES =
  'Never say "Certainly!", "Great question!", "Of course!", or any assistant-style phrases. Never sound like an AI assistant. Always speak AS the Pokémon in first person using their real speech patterns. Always end with something that makes the kid want to ask another question.';

const POKEMON_PERSONALITIES_FALLBACK = {
  25: "You ARE Pikachu. Start with Pika pika! and end with Pika! Use very short excited sentences only, maximum 2 sentences between the Pika sounds. You are buzzing with energy!",
  4: "You ARE Charmander. Speak brave and fiery in first person. Love a tough challenge and tell the kid to keep trying like training by a volcano.",
  1: "You ARE Bulbasaur. Speak slow, warm, and nurturing about nature. Use gentle first-person words like a patient garden friend.",
  150: "You ARE Mewtwo. Formal and precise. Sometimes speak in third person about Mewtwo power. Call the child young one with calm respect.",
  143: "You ARE Snorlax. Speak slowly and yawn a lot. Every reply mentions being sleepy or hungry, give ONE simple answer, then want to nap.",
  133: "You ARE Eevee. Nervous and sweet in first person. Naturally say um and oh! while figuring things out with the kid.",
  94: "You ARE Gengar. Cackle and use spooky wordplay. Say Heheheh often. Make learning feel like a fun ghost mystery you are leading.",
  448: "You ARE Lucario. Speak with calm discipline and quiet strength in first person. Help the kid feel brave and focused.",
};

let POKEMON_PERSONALITIES = POKEMON_PERSONALITIES_FALLBACK;
let personalitiesReady = false;

const TYPE_PERSONALITY_FALLBACKS = {
  fire: "You speak passionate and intense, use fire metaphors, and never give up. Encourage the kid like a flame that keeps burning.",
  water: "You are calm and flowing, use ocean metaphors, and are patient like a gentle river guiding the kid.",
  grass: "You are nurturing and slow, use garden metaphors, and gentle like a kind plant friend helping things grow.",
  electric: "You are fast and jumpy, use electricity metaphors, and energetic — spark the kid's curiosity!",
  psychic: "You are mysterious and wise, use mind metaphors, and thoughtful like a calm psychic guide.",
  ghost: "You are spooky and playful, use mystery metaphors, and mischievous in a friendly haunted-house way.",
  dragon: "You are proud and epic, use adventure metaphors, and brave like a legendary dragon teacher.",
  normal: "You are friendly and encouraging, warm and relatable, and easy to talk to like a buddy.",
};

const SECONDARY_TYPE_HINTS = {
  ice: "Cool and clear, crisp and steady.",
  fighting: "Bold and direct, like a trainer's punch.",
  flying: "Light and breezy, soaring between ideas.",
  poison: "Sly but helpful, with a tricky giggle.",
  ground: "Solid and steady, down-to-earth.",
  rock: "Tough and sturdy, simple and strong.",
  bug: "Curious and busy, hopping between facts.",
  steel: "Firm and shiny, precise and loyal.",
  dark: "Cheeky and clever, with a brave smirk.",
  fairy: "Sparkly and kind, with fairy-tale warmth.",
};

const state = {
  companionId: DEFAULT_POKEMON_ID,
  companionName: "Pikachu",
  companionSlug: "pikachu",
  companionTypes: ["electric"],
  shiny: false,
  subject: "general",
  subjectLabel: "General Knowledge",
  stars: 0,
  listening: false,
  processing: false,
  finalTranscript: "",
  language: "english",
  conversationHistory: [],
  lastTopic: "",
  questionsSinceQuiz: 0,
  pendingQuiz: null,
  quizActive: false,
};

const QUIZ_TRIGGER_EVERY = 3;
const QUIZ_REWARD_STARS = 25;

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

// Content safety ----------------------------------------------------------------

const NSFW_WORDS = [
  // profanity
  "fuck", "fucking", "fucker", "fucks", "fucked",
  "shit", "shits", "shitting", "bullshit",
  "bitch", "bitches", "bitchy",
  "cunt", "cunts",
  "asshole", "assholes",
  "bastard", "bastards",
  "damn", "goddamn",
  // sexual
  "cock", "cocks", "dick", "dicks", "penis",
  "pussy", "vagina",
  "boob", "boobs", "tit", "tits", "breast",
  "porn", "porno", "pornography",
  "sex", "sexual", "sexy",
  "nude", "nudes", "naked",
  "condom", "masturbate", "masturbation",
  "orgasm", "erection",
  // slurs
  "nigger", "niggers", "nigga", "niggas",
  "faggot", "faggots", "fag",
  "retard", "retards", "retarded",
  // self-harm / violence
  "suicide", "suicidal",
  "rape", "raping", "raped", "rapist",
  "kill yourself", "kys",
  // hard drugs
  "heroin", "cocaine", "meth", "methamphetamine", "crack",
];

const NSFW_PATTERNS = [
  /\bf+[u*@#]+c+k/i,       // f*ck, f**k, fuuuck
  /\bs+h+[i!1*]+t/i,       // sh!t, sh*t, shiiit
  /\bb+[i!1*]+t+c+h/i,     // b!tch, b*tch
  /\ba+s+\s*h+o+l+e/i,     // a s s h o l e (spaced)
  /\bn+[i*!1]+g+[gae]+/i,  // n-word obfuscations
];

function containsNSFW(text) {
  const lower = (text || "").toLowerCase();
  for (const word of NSFW_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(lower)) return true;
  }
  for (const pattern of NSFW_PATTERNS) {
    if (pattern.test(lower)) return true;
  }
  return false;
}

function censorText(text) {
  let result = text;
  for (const word of NSFW_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "***");
  }
  return result;
}

function getBlockedResponse() {
  const name = state.companionName;
  if (state.companionId === 25) {
    const pikaLines = [
      "Pika pika! That is not something I can help with! Ask me about science or math instead! Pika!",
      "Pika! Pika! Let's zap into something fun like space or animals! Pika pika!",
      "Pikaaa! Nope, not that one! Ask me how lightning works or about cool history! Pika!",
    ];
    return pikaLines[Math.floor(Math.random() * pikaLines.length)];
  }
  const redirects = [
    `Whoa, trainer! That's not something ${name} can explore. Let's use that energy for something awesome — ask me about science, space, history, or nature! ⚡`,
    `Hmm, ${name} can't go there! But there's a whole world of amazing things to discover together. What do you actually want to learn today? 🌟`,
    `Oops! That question is out of bounds in our Pokémon classroom. ${name} knows SO many cool facts — ask me anything about the world around you!`,
    `${name} says: nope, not that one! Let's keep our adventure fun and amazing. Try asking about animals, math, how stars work… the list goes on! ✨`,
  ];
  return redirects[Math.floor(Math.random() * redirects.length)];
}

// End content safety ----------------------------------------------------------

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
  history: "History",
  nature: "Science & Nature",
  art: "Art & Music",
  technology: "Technology",
  general: "General Knowledge",
};

const HISTORY_KEY = "pokelearn_history";
const STARS_KEY = "pokelearn_stars";
const STREAK_KEY = "pokelearn_streak";
const LAST_ACTIVE_KEY = "pokelearn_last_active";

const SUBJECT_KEYWORDS = {
  science: [
    "photosynthesis", "cell", "animal", "plant", "gravity", "space", "force",
    "energy", "atom", "biology", "chemistry", "physics", "experiment",
  ],
  math: [
    "add", "subtract", "multiply", "divide", "fraction", "equation", "number",
    "calculate", "geometry", "algebra", "percentage", "average",
  ],
  english: [
    "spell", "grammar", "word", "meaning", "sentence", "write", "read",
    "vocabulary", "pronoun", "verb", "noun", "tense", "essay",
  ],
  geography: [
    "country", "capital", "continent", "ocean", "river", "mountain", "map",
    "climate", "population", "city",
  ],
  history: [
    "war", "king", "queen", "ancient", "civilization", "empire", "century",
    "revolution", "historical", "dynasty",
  ],
  nature: [
    "weather", "volcano", "earthquake", "dinosaur", "evolution", "ecosystem",
    "habitat",
  ],
  art: [
    "draw", "paint", "color", "music", "song", "instrument", "dance",
    "creativity",
  ],
  technology: [
    "computer", "internet", "code", "robot", "ai", "app", "website", "machine",
    "program",
  ],
};

const SUBJECT_BADGE_LABELS = {
  science: "🔬 Science",
  math: "➕ Math",
  english: "📚 English",
  geography: "🌍 Geography",
  history: "🏛️ History",
  nature: "🌋 Science & Nature",
  art: "🎨 Art & Music",
  technology: "💻 Technology",
  general: "📝 General Knowledge",
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
const quizMeBtnEl = document.getElementById("quizMeBtn");
const subjectBadgeEl = document.getElementById("subjectBadge");

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

const quizCardEl = document.getElementById("quizCard");
const quizQuestionEl = document.getElementById("quizQuestion");
const quizOptionsEl = document.getElementById("quizOptions");
const quizFeedbackEl = document.getElementById("quizFeedback");
const quizCloseEl = document.getElementById("quizClose");

const chatFabEl = document.getElementById("chatFab");
const chatPanelEl = document.getElementById("chatPanel");
const chatPanelCloseEl = document.getElementById("chatPanelClose");
const chatPanelFormEl = document.getElementById("chatPanelForm");
const chatPanelInputEl = document.getElementById("chatPanelInput");
const chatPanelSendEl = document.getElementById("chatPanelSend");
const chatPanelStatusEl = document.getElementById("chatPanelStatus");

const starBurstEl = document.getElementById("starBurst");

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
  const lower = (text || "").toLowerCase();
  const scores = {
    science: 0, math: 0, english: 0, geography: 0,
    history: 0, nature: 0, art: 0, technology: 0,
  };

  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    for (const kw of keywords) {
      const pattern = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (pattern.test(lower)) scores[subject]++;
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

function updateSubjectBadge(subject) {
  if (!subjectBadgeEl) return;
  if (!subject || subject === "general") {
    subjectBadgeEl.hidden = true;
    return;
  }
  const label = SUBJECT_BADGE_LABELS[subject] || SUBJECT_BADGE_LABELS.general;
  subjectBadgeEl.textContent = label;
  subjectBadgeEl.hidden = false;
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

function greeting(name) {
  return `Hi trainer! I'm ${name}! Tap the mic or use 💬 to ask me anything!`;
}

function updateBubbleLabel() {
  bubbleLabelEl.textContent = state.shiny
    ? `✨ Shiny ${state.companionName} says:`
    : `${state.companionName} says:`;
}

function updateBubble() {
  updateBubbleLabel();
  bubbleTextEl.textContent = greeting(state.companionName);
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

function isInvalidTranscript(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return true;
  if (trimmed.length < 2) return true;
  if (/^[^A-Za-z\u0B80-\u0BFF\u0D80-\u0DFF]+$/.test(trimmed)) return true;
  return false;
}

function resetRecorderState() {
  if (recorder.mediaRecorder) {
    try {
      recorder.mediaRecorder.ondataavailable = null;
      recorder.mediaRecorder.onstop = null;
      recorder.mediaRecorder.onerror = null;
      if (recorder.mediaRecorder.state !== "inactive") {
        recorder.mediaRecorder.stop();
      }
    } catch (err) {
      console.warn("MediaRecorder reset failed", err);
    }
  }
  stopMicTracks();
  recorder.mediaRecorder = null;
  recorder.mediaStream = null;
  recorder.chunks = [];
  recorder.recordingStartedAt = 0;
}

function rejectInvalidTranscript() {
  state.finalTranscript = "";
  resetRecorderState();
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
  const primary = (types && types[0]) || "normal";
  const baseFallback = TYPE_PERSONALITY_FALLBACKS[primary] || TYPE_PERSONALITY_FALLBACKS.normal;
  const secondary = types && types[1] ? SECONDARY_TYPE_HINTS[types[1]] : null;
  const typeLabel = types && types.length ? types.join("/") : "normal";
  const secondLine = secondary ? ` Also: ${secondary}` : "";
  return `You ARE ${name}, a ${typeLabel}-type Pokémon. ${baseFallback}${secondLine} You teach kids aged 6-14 in first person and always stay in character.`;
}

async function loadPokemonPersonalities() {
  browserStatusEl.textContent = "Loading personalities…";
  pokemonGridEl.replaceChildren();
  try {
    const res = await fetch("./pokemonPersonalities.json");
    if (!res.ok) throw new Error(`pokemonPersonalities.json: ${res.status}`);
    POKEMON_PERSONALITIES = await res.json();
  } catch {
    POKEMON_PERSONALITIES = { ...POKEMON_PERSONALITIES_FALLBACK };
  }
  personalitiesReady = true;
}

async function getCompanionPersonality() {
  const mapped =
    POKEMON_PERSONALITIES[state.companionId] ||
    POKEMON_PERSONALITIES[String(state.companionId)];
  if (mapped) {
    return mapped;
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

const SUBJECT_PROMPT_HINTS = {
  science: " If the question is about science, include one fun related fact about your Pokémon type.",
  math: " If the question is about math, be encouraging about logic and step-by-step thinking.",
  english: " If the question is about English, help with the specific word or grammar they asked about.",
  geography: " If the question is about geography, use places and maps kids can picture easily.",
  history: " If the question is about history, share one short story-like detail that makes the past feel alive.",
  nature: " If the question is about nature, paint a vivid picture of the place, creature, or event.",
  art: " If the question is about art or music, encourage creativity and describe colors, sounds, or motion vividly.",
  technology: " If the question is about technology, explain it like a friendly invention demo a kid can imagine.",
};

const CHILD_SAFETY_INSTRUCTION =
  " You are talking to a child aged 6-14. Never discuss violence, adult content, inappropriate topics, or anything unsuitable for children. If asked about anything inappropriate, deflect in character and redirect to learning topics.";

function buildSystemPrompt(emotion, personality, detectedSubject, includeQuiz) {
  let prompt = `SAFETY RULE (highest priority): You are speaking exclusively to children aged 6–14. If any question is inappropriate, sexual, violent, or harmful, do NOT engage with it — stay in character and cheerfully redirect the child to ask something they can learn.${CHILD_SAFETY_INSTRUCTION} ${CHARACTER_RULES} ${personality} Keep answers under 5 sentences unless your character rules say shorter. Use simple words kids understand. Always stay fully in character — never break character or sound like an AI.`;
  prompt += buildRecentQuestionsContext();

  if (state.language && state.language !== "english") {
    prompt += ` The child chose to speak in ${LANGUAGE_LABELS[state.language]}. Reply in clear, simple English, but feel free to acknowledge a single ${LANGUAGE_LABELS[state.language]} word warmly if it helps them feel understood.`;
  }

  const subject = detectedSubject || state.subject;
  prompt += SUBJECT_PROMPT_HINTS[subject] || "";

  prompt += EMOTION_INSTRUCTIONS[emotion] || EMOTION_INSTRUCTIONS.neutral;

  if (includeQuiz) {
    prompt +=
      " After your normal in-character answer, on the VERY LAST line, output a single-line JSON block in this exact format and nothing after it: QUIZ:{\"question\":\"...\",\"options\":[\"A) ...\",\"B) ...\",\"C) ...\",\"D) ...\"],\"answer\":\"A\"} where the question is a fun age-appropriate multiple-choice question related to the topic you just explained, options are four short choices each starting with A) B) C) D), and answer is the single capital letter A B C or D of the correct option. Do not add any text after the QUIZ block.";
  }
  return prompt;
}

async function fetchSentiment(transcript) {
  const res = await fetch("/.netlify/functions/sentiment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transcript }),
  });
  if (!res.ok) throw new Error("Sentiment request failed");
  const data = await res.json();
  return data.sentiment;
}

function buildChatMessages(transcript, emotion, personality, detectedSubject, includeQuiz) {
  const systemPrompt = buildSystemPrompt(emotion, personality, detectedSubject, includeQuiz);
  return [
    { role: "system", content: systemPrompt },
    ...state.conversationHistory.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: "user", content: transcript },
  ];
}

async function callOpenAIChat(messages, label = "openai") {
  let res;
  try {
    res = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });
  } catch (networkErr) {
    console.error(`[${label}] Network error before reaching OpenRouter:`, networkErr);
    throw new Error(`Network error: ${networkErr.message || networkErr}`);
  }

  console.log(`[${label}] OpenRouter status:`, res.status, res.statusText);

  if (!res.ok) {
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch {
      bodyText = "<could not read body>";
    }
    console.error(`[${label}] OpenRouter error body:`, bodyText);
    throw new Error(`OpenRouter ${res.status} ${res.statusText}: ${bodyText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  console.log(`[${label}] OpenRouter raw response text:`, content);
  if (!content) {
    console.error(`[${label}] OpenRouter returned no content. Full body:`, data);
    throw new Error("OpenRouter returned an empty response.");
  }
  return content;
}

async function fetchOpenAIReply(transcript, emotion, personality, detectedSubject, includeQuiz) {
  const messages = buildChatMessages(transcript, emotion, personality, detectedSubject, includeQuiz);
  console.log("[openai] Messages going to OpenRouter:", messages);
  return callOpenAIChat(messages, "openai");
}

function parseQuizFromReply(reply) {
  if (!reply) return { answerText: reply || "", quiz: null };
  const trimmedReply = reply.trim();
  const idx = trimmedReply.lastIndexOf("QUIZ:");
  if (idx < 0) return { answerText: trimmedReply, quiz: null };

  const answerText = trimmedReply.slice(0, idx).trim();
  let jsonPart = trimmedReply.slice(idx + 5);
  jsonPart = jsonPart
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/[\r\n]+/g, " ")
    .trim();
  console.log("[quiz] raw quiz JSON string before parsing:", jsonPart);

  let quiz = null;
  try {
    const parsed = JSON.parse(jsonPart);
    if (
      parsed &&
      typeof parsed.question === "string" &&
      Array.isArray(parsed.options) &&
      parsed.options.length === 4 &&
      typeof parsed.answer === "string"
    ) {
      const answer = parsed.answer.trim().toUpperCase().charAt(0);
      if (["A", "B", "C", "D"].includes(answer)) {
        quiz = {
          question: parsed.question.trim(),
          options: parsed.options.map((o) => String(o).trim()),
          answer,
        };
      } else {
        console.error("[quiz] parse failed — invalid answer letter. Full reply:", reply);
      }
    } else {
      console.error("[quiz] parse failed — shape mismatch. Full reply:", reply);
    }
  } catch (err) {
    console.warn("Failed to parse QUIZ JSON", err, jsonPart);
    console.error("[quiz] parse failed — JSON.parse threw. Full reply:", reply);
  }

  return { answerText: answerText || trimmedReply, quiz };
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
  if (containsNSFW(transcript)) {
    transcriptTextEl.textContent = censorText(transcript);
    bubbleTextEl.textContent = getBlockedResponse();
    updateBubbleLabel();
    setMicUI("idle");
    return;
  }

  const detectedSubject = detectSubjectFromQuestion(transcript);
  state.subject = detectedSubject;
  state.subjectLabel = SUBJECT_LABELS[detectedSubject] || SUBJECT_LABELS.general;
  state.lastTopic = transcript;

  let sentiment = "neutral";
  try {
    sentiment = await fetchSentiment(transcript);
  } catch (err) {
    console.warn("Sentiment fetch failed, using text-only emotion analysis", err);
  }

  const emotion = deriveEmotionState(transcript, sentiment);

  const shouldQuiz = state.questionsSinceQuiz >= QUIZ_TRIGGER_EVERY - 1 && !state.quizActive;
  const personality = await getCompanionPersonality();

  const rawReply = await fetchOpenAIReply(
    transcript,
    emotion,
    personality,
    detectedSubject,
    shouldQuiz
  );

  console.log("Detected emotion:", emotion, "sentiment:", sentiment);

  const { answerText, quiz } = parseQuizFromReply(rawReply);
  bubbleTextEl.textContent = answerText;
  updateSubjectBadge(detectedSubject);
  pushConversationTurn(transcript, answerText);
  recordSuccessfulQuestion(transcript, detectedSubject);
  state.questionsSinceQuiz += 1;

  if (shouldQuiz && quiz) {
    state.questionsSinceQuiz = 0;
    showQuizCard(quiz);
  }
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
  const res = await fetch("/.netlify/functions/transcribe", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(`VALSEA transcription failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.text || "").trim();
}

const BRAIN_ERROR_MESSAGE =
  "Oops! Could not connect to my brain. Please check your internet and try again!";

function showBrainError(err) {
  console.error("Pokémon reply failed:", err);
  const detail = err && err.message ? ` (${err.message})` : "";
  bubbleTextEl.textContent = `${BRAIN_ERROR_MESSAGE}${detail}`;
}

function deliverFinalTranscript() {
  setMicUI("idle");
  transcriptTextEl.classList.remove("listening");
  if (!state.finalTranscript) return;
  bubbleTextEl.textContent = "Thinking…";
  respondToFinalTranscript(state.finalTranscript).catch((err) => {
    showBrainError(err);
  });
}

async function processRecordedAudio() {
  if (!recorder.chunks.length) {
    resetRecorderState();
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
    resetRecorderState();
    showTranscriptError("Could not transcribe audio, please try again");
    return;
  }

  if (isInvalidTranscript(text)) {
    rejectInvalidTranscript();
    return;
  }

  state.finalTranscript = text;
  transcriptTextEl.textContent = text;
  resetRecorderState();
  deliverFinalTranscript();
}

async function startRecording() {
  if (state.listening || state.processing) return;
  if (typeof MediaRecorder === "undefined") {
    showTranscriptError("Recording not supported in this browser.");
    return;
  }

  resetRecorderState();
  state.finalTranscript = "";
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
    resetRecorderState();
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
    resetRecorderState();
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
      resetRecorderState();
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
  heroIdEl.textContent = state.shiny
    ? `${formatPokemonId(state.companionId)} ✨`
    : formatPokemonId(state.companionId);
  triggerHeroBounce();
}

function selectPokemon(pokemon, cellEl) {
  if (!personalitiesReady) return;
  state.companionId = pokemon.id;
  state.companionSlug = pokemon.name;
  state.companionName = formatPokemonName(pokemon.name);
  state.companionTypes = null;
  state.questionsSinceQuiz = 0;
  state.lastTopic = "";
  hideQuizCard();
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
  if (subjectBadgeEl) subjectBadgeEl.hidden = true;
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
  document.body.classList.toggle("shiny-mode", state.shiny);

  pokemonGridEl.querySelectorAll("img[data-id]").forEach((img) => {
    if (img.dataset.loaded === "true") {
      img.src = spriteUrl(Number(img.dataset.id));
    }
  });
  heroSpriteEl.src = spriteUrl(state.companionId);
  heroIdEl.textContent = state.shiny
    ? `${formatPokemonId(state.companionId)} ✨`
    : formatPokemonId(state.companionId);
  updateBubbleLabel();
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

function getLastDiscussedTopic() {
  for (let i = state.conversationHistory.length - 1; i >= 0; i--) {
    if (state.conversationHistory[i].role === "user") {
      return state.conversationHistory[i].content;
    }
  }
  return "";
}

async function triggerManualQuiz() {
  if (state.listening || state.processing || state.quizActive) return;

  const topic = getLastDiscussedTopic();
  if (!topic) {
    transcriptTextEl.textContent = "Ask me something first so I can quiz you on it! 🎮";
    return;
  }

  if (containsNSFW(topic)) {
    transcriptTextEl.textContent = "Ask me something first so I can quiz you on it! 🎮";
    return;
  }

  if (quizMeBtnEl) quizMeBtnEl.disabled = true;
  bubbleTextEl.textContent = "Thinking up a quiz for you…";

  try {
    const detectedSubject = state.subject || detectSubjectFromQuestion(topic);
    let sentiment = "neutral";
    try {
      sentiment = await fetchSentiment(topic);
    } catch (err) {
      console.warn("Sentiment fetch failed, using text-only emotion analysis", err);
    }
    const emotion = deriveEmotionState(topic, sentiment);
    const personality = await getCompanionPersonality();
    const rawReply = await fetchOpenAIReply(topic, emotion, personality, detectedSubject, true);
    const { answerText, quiz } = parseQuizFromReply(rawReply);

    if (quiz) {
      state.questionsSinceQuiz = 0;
      showQuizCard(quiz);
      bubbleTextEl.textContent = answerText || "Quick quiz time! 🎯";
    } else {
      bubbleTextEl.textContent = answerText || "Hmm, I couldn't whip up a quiz right now. Try again!";
    }
  } catch (err) {
    showBrainError(err);
  } finally {
    if (quizMeBtnEl) quizMeBtnEl.disabled = false;
  }
}

function hideQuizCard() {
  if (!quizCardEl) return;
  state.quizActive = false;
  state.pendingQuiz = null;
  quizCardEl.hidden = true;
  if (quizOptionsEl) quizOptionsEl.replaceChildren();
  if (quizFeedbackEl) {
    quizFeedbackEl.textContent = "";
    quizFeedbackEl.classList.remove("feedback-reveal");
  }
}

function showQuizCard(quiz) {
  if (!quizCardEl || !quiz) return;
  state.quizActive = true;
  state.pendingQuiz = quiz;

  quizQuestionEl.textContent = quiz.question;
  quizFeedbackEl.textContent = "";
  quizOptionsEl.replaceChildren();

  quiz.options.forEach((label, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quiz-option";
    btn.dataset.color = String(idx);
    btn.dataset.letter = String.fromCharCode(65 + idx);
    btn.textContent = label;
    btn.addEventListener("click", () => handleQuizAnswer(btn));
    quizOptionsEl.appendChild(btn);
  });

  quizCardEl.hidden = false;
  quizCardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function disableQuizButtons() {
  quizOptionsEl.querySelectorAll(".quiz-option").forEach((b) => {
    b.disabled = true;
  });
}

async function handleQuizAnswer(btn) {
  if (!state.pendingQuiz || !state.quizActive) return;
  const chosen = btn.dataset.letter;
  const quiz = state.pendingQuiz;
  const isCorrect = chosen === quiz.answer;

  disableQuizButtons();
  btn.classList.add(isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    const correctBtn = quizOptionsEl.querySelector(`.quiz-option[data-letter="${quiz.answer}"]`);
    if (correctBtn) correctBtn.classList.add("correct");
  }

  if (isCorrect) {
    addStar(QUIZ_REWARD_STARS);
    triggerStarBurst();
    quizFeedbackEl.textContent = `🎉 +${QUIZ_REWARD_STARS} stars!`;
  } else {
    quizFeedbackEl.textContent = "Let's hear it from your buddy…";
  }
  quizFeedbackEl.classList.remove("feedback-reveal");
  void quizFeedbackEl.offsetWidth;
  quizFeedbackEl.classList.add("feedback-reveal");

  state.quizActive = false;
  try {
    const reaction = await fetchQuizReaction(quiz, chosen, isCorrect);
    bubbleTextEl.textContent = reaction;
    pushConversationTurn(
      `(Quiz answer: ${chosen}. ${isCorrect ? "Correct" : "Wrong"}.)`,
      reaction
    );
  } catch (err) {
    showBrainError(err);
  }
}

async function fetchQuizReaction(quiz, chosen, isCorrect) {
  const personality = await getCompanionPersonality();
  const reactionInstruction = isCorrect
    ? "The child just got the quiz question CORRECT. Celebrate IN CHARACTER with one short excited line and one tiny bonus fact. Do not include any QUIZ block."
    : `The child answered ${chosen} but the correct answer was ${quiz.answer}. Gently explain why ${quiz.answer} is right IN CHARACTER, kind and encouraging in 2-3 sentences. Do not include any QUIZ block.`;

  const systemPrompt = `${CHARACTER_RULES} ${personality} Always stay fully in character. ${reactionInstruction}${CHILD_SAFETY_INSTRUCTION}`;

  const userContent = `Quiz question: ${quiz.question}\nOptions: ${quiz.options.join(" | ")}\nMy answer: ${chosen}\nCorrect answer: ${quiz.answer}`;

  return callOpenAIChat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    "openai-quiz"
  );
}

function triggerStarBurst() {
  if (!starBurstEl) return;
  starBurstEl.hidden = false;
  starBurstEl.replaceChildren();
  const count = 18;
  for (let i = 0; i < count; i++) {
    const star = document.createElement("span");
    star.className = "burst-star";
    star.textContent = "⭐";
    const angle = (Math.PI * 2 * i) / count;
    const distance = 180 + Math.random() * 60;
    star.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    star.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    star.style.fontSize = `${1.5 + Math.random() * 1.2}rem`;
    starBurstEl.appendChild(star);
  }
  setTimeout(() => {
    starBurstEl.replaceChildren();
    starBurstEl.hidden = true;
  }, 1100);
}

function openChatPanel() {
  if (!chatPanelEl) return;
  chatPanelEl.hidden = false;
  chatPanelStatusEl.textContent = "";
  setTimeout(() => chatPanelInputEl.focus(), 50);
}

function closeChatPanel() {
  if (!chatPanelEl) return;
  chatPanelEl.hidden = true;
  chatPanelStatusEl.textContent = "";
  chatPanelInputEl.value = "";
  chatPanelSendEl.disabled = false;
}

async function handleTextChatSubmit(event) {
  event.preventDefault();
  const text = chatPanelInputEl.value.trim();
  if (!text) return;
  if (isInvalidTranscript(text)) {
    chatPanelStatusEl.textContent = "Try a clearer question, trainer!";
    return;
  }

  chatPanelSendEl.disabled = true;
  chatPanelStatusEl.textContent = "Sending to your buddy…";

  state.finalTranscript = text;
  transcriptTextEl.textContent = text;
  bubbleTextEl.textContent = "Thinking…";

  try {
    await respondToFinalTranscript(text);
    chatPanelStatusEl.textContent = "Answered! Ask another?";
    chatPanelInputEl.value = "";
  } catch (err) {
    showBrainError(err);
    chatPanelStatusEl.textContent = err && err.message ? err.message : "Something went wrong. Try again.";
  } finally {
    chatPanelSendEl.disabled = false;
  }
}

micBtnEl.addEventListener("click", toggleMic);
if (quizMeBtnEl) {
  quizMeBtnEl.addEventListener("click", async () => {
    if (state.listening || state.processing || state.quizActive) return;

    const progressHistory = getHistory();
    const hasConversation = state.conversationHistory.some((m) => m.role === "user");
    const hasProgress = progressHistory.length > 0;

    if (!hasConversation && !hasProgress) {
      transcriptTextEl.textContent = "Ask me something first so I can quiz you on it! 🎮";
      return;
    }

    let topic = "";
    let detectedSubject = state.subject;

    if (hasConversation) {
      for (let i = state.conversationHistory.length - 1; i >= 0; i--) {
        if (state.conversationHistory[i].role === "user") {
          topic = state.conversationHistory[i].content;
          break;
        }
      }
    }
    if (!topic && hasProgress) {
      const last = progressHistory[progressHistory.length - 1];
      if (last?.question) {
        topic = last.question;
        detectedSubject = last.subject || detectedSubject;
      }
    }

    if (!topic) {
      transcriptTextEl.textContent = "Ask me something first so I can quiz you on it! 🎮";
      return;
    }

    if (containsNSFW(topic)) {
      transcriptTextEl.textContent = "Ask me something first so I can quiz you on it! 🎮";
      return;
    }

    quizMeBtnEl.disabled = true;
    bubbleTextEl.textContent = "Making a quiz for you…";

    try {
      const strictSystem =
        'You are a quiz generator. You MUST end your response with a quiz in this EXACT format on the very last line, no exceptions: QUIZ:{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A"}. The answer field must be exactly A, B, C, or D. Do not add anything after the QUIZ: line. Do not wrap in markdown or code blocks.' +
        CHILD_SAFETY_INSTRUCTION;
      const userMsg = `Create one short, fun, age-appropriate multiple-choice quiz question for a child aged 6-14 about this topic: "${topic}". Output ONLY the QUIZ: line in the exact format described.`;

      const rawReply = await callOpenAIChat(
        [
          { role: "system", content: strictSystem },
          { role: "user", content: userMsg },
        ],
        "openai-quiz-manual"
      );
      console.log("[quiz-manual] full OpenAI reply:", rawReply);

      const { quiz } = parseQuizFromReply(rawReply);

      if (quiz) {
        state.questionsSinceQuiz = 0;
        showQuizCard(quiz);
        console.log("Quiz card shown");
        bubbleTextEl.textContent = "Quick quiz time! 🎯";
      } else {
        console.error("[quiz-manual] parse returned no quiz. Full reply was:", rawReply);
        bubbleTextEl.textContent = "Hmm, I couldn't whip up a quiz right now. Try again!";
      }
    } catch (err) {
      showBrainError(err);
    } finally {
      quizMeBtnEl.disabled = false;
    }
  });
}

pokemonSearchEl.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  applySearch();
});

shinyToggleEl.addEventListener("click", toggleShiny);

langBtns.forEach((btn) => {
  btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
});

if (quizCloseEl) quizCloseEl.addEventListener("click", hideQuizCard);
if (chatFabEl) {
  chatFabEl.addEventListener("click", () => {
    if (chatPanelEl.hidden) openChatPanel();
    else closeChatPanel();
  });
}
if (chatPanelCloseEl) chatPanelCloseEl.addEventListener("click", closeChatPanel);
if (chatPanelFormEl) chatPanelFormEl.addEventListener("submit", handleTextChatSubmit);

setupSpriteObserver();
loadStars();
updateProgressPanel();
updateBubble();
async function initApp() {
  await loadPokemonPersonalities();
  try {
    await fetchAllPokemon();
  } catch {
    browserStatusEl.textContent = "Could not load Pokémon. Check your connection.";
  }
}

initApp();
