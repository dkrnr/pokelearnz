/**
 * PokeLearn — UI state & interactions (voice/API wiring comes later)
 */

const state = {
  companion: "pikachu",
  companionName: "Pikachu",
  companionEmoji: "⚡",
  theme: "yellow",
  subject: "science",
  subjectLabel: "Science",
  stars: 0,
  listening: false,
};

const SUBJECT_LABELS = {
  science: "Science",
  math: "Math",
  english: "English",
  geography: "Geography",
};

const GREETINGS = {
  pikachu: (subject) =>
    `Hi trainer! Tap the mic and ask me anything about ${subject}. Pika pika! ⚡`,
  bulbasaur: (subject) =>
    `Hello friend! I'm ready to help you learn ${subject}. Take your time! 🌿`,
  mewtwo: (subject) =>
    `Greetings. Select the microphone when you wish to explore ${subject}. 🔮`,
};

const LISTENING_HINTS = {
  pikachu: "Pika! I'm listening… ⚡",
  bulbasaur: "I'm listening carefully… 🌿",
  mewtwo: "Proceed. I am listening. 🔮",
};

// DOM refs
const starCountEl = document.getElementById("starCount");
const starCounterEl = document.getElementById("starCounter");
const bubbleLabelEl = document.getElementById("bubbleLabel");
const bubbleTextEl = document.getElementById("bubbleText");
const speechBubbleEl = document.getElementById("speechBubble");
const transcriptTextEl = document.getElementById("transcriptText");
const micBtnEl = document.getElementById("micBtn");
const micHintEl = document.getElementById("micHint");

const companionCards = document.querySelectorAll(".companion-card");
const subjectBtns = document.querySelectorAll(".subject-btn");

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function updateBubble() {
  bubbleLabelEl.textContent = `${state.companionName} says:`;
  bubbleTextEl.textContent = GREETINGS[state.companion](state.subjectLabel);
  speechBubbleEl.classList.remove("theme-yellow", "theme-green", "theme-purple");
  speechBubbleEl.classList.add(`theme-${state.theme}`);
}

function setCompanion(card) {
  state.companion = card.dataset.companion;
  state.companionName = card.dataset.name;
  state.companionEmoji = card.dataset.emoji;
  state.theme = card.dataset.theme;

  companionCards.forEach((c) => c.classList.toggle("active", c === card));
  updateBubble();
}

function setSubject(btn) {
  state.subject = btn.dataset.subject;
  state.subjectLabel = SUBJECT_LABELS[state.subject] || capitalize(state.subject);

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
  starCountEl.textContent = String(state.stars);
  bumpStars();
}

function setListening(on) {
  state.listening = on;
  micBtnEl.classList.toggle("listening", on);
  micBtnEl.setAttribute("aria-label", on ? "Listening…" : "Tap to talk");
  transcriptTextEl.classList.toggle("listening", on);

  if (on) {
    transcriptTextEl.textContent = LISTENING_HINTS[state.companion];
    micHintEl.textContent = "Listening… tap again when done!";
  } else {
    micHintEl.textContent = "Tap the microphone to talk!";
  }
}

function toggleMic() {
  if (!state.listening) {
    setListening(true);
    return;
  }

  setListening(false);
  // Placeholder until transcription + OpenAI are wired up
  const demoTranscript = `What is photosynthesis?`;
  transcriptTextEl.textContent = demoTranscript;
  transcriptTextEl.classList.remove("listening");

  bubbleTextEl.textContent = getPlaceholderReply();
  addStar(1);
}

function getPlaceholderReply() {
  const replies = {
    pikachu: `Great question about ${state.subjectLabel}! Photosynthesis is how plants use sunlight to make food. You're doing awesome! ⚡`,
    bulbasaur: `Photosynthesis helps plants turn light into energy. Bulba loves learning ${state.subjectLabel} with you! 🌿`,
    mewtwo: `Photosynthesis: light energy converted to chemical energy in chloroplasts. A fundamental ${state.subjectLabel} concept. 🔮`,
  };
  return replies[state.companion];
}

// Event listeners
companionCards.forEach((card) => {
  card.addEventListener("click", () => setCompanion(card));
});

subjectBtns.forEach((btn) => {
  btn.addEventListener("click", () => setSubject(btn));
});

micBtnEl.addEventListener("click", toggleMic);

// Initial render
updateBubble();
