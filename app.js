/**
 * PokeLearn — Pokémon browser, VALSEA realtime transcription, voice UI
 */

const POKEAPI_LIST =
  "https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0";
const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

const VALSEA_WS_BASE = "wss://api.valsea.ai/v1/realtime";
const VALSEA_SAMPLE_RATE = 16000;

const DEFAULT_POKEMON_ID = 25;
const SILENCE_MS = 3000;
const SILENCE_LEVEL_THRESHOLD = 0.012;

const POKEMON_PERSONALITIES = {
  25: "You are Pikachu! Super energetic and enthusiastic! Use exclamation marks, say Pika sometimes, very encouraging, celebrate every answer!",
  4: "You are Charmander, brave and determined. You love challenges and never give up. Encourage kids to keep trying.",
  1: "You are Bulbasaur, calm and nurturing. You love nature and science. Patient and gentle with explanations.",
  150: "You are Mewtwo, highly intelligent and precise. Speak with confidence and wisdom but stay kind to children.",
  143: "You are Snorlax, lazy and funny but surprisingly wise. Break everything into the tiniest steps. Use food analogies.",
  133: "You are Eevee, curious and adaptable. You get excited about learning new things and love asking questions back.",
  94: "You are Gengar, mischievous and playful but secretly very helpful. Make learning feel like a fun spooky mystery.",
  448: "You are Lucario, disciplined and focused. You speak with calm strength and help kids build confidence.",
};

const TYPE_PERSONALITY_HINTS = {
  fire: "passionate and fiery",
  water: "calm and thoughtful",
  psychic: "wise and insightful",
  ghost: "mysterious but kind",
  normal: "friendly and cheerful",
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
  finalTranscript: "",
};

const valsea = {
  ws: null,
  sessionReady: false,
  sessionStarted: false,
  mediaStream: null,
  audioContext: null,
  pcmNode: null,
  pcmSource: null,
  pcmFloatBuffer: [],
  pcmSendIntervalId: null,
  stopping: false,
  awaitingFinal: false,
  finalTimeoutId: null,
  stopTimeoutId: null,
  sessionStopSent: false,
  commitSent: false,
  lastSoundAt: 0,
  hasDetectedSound: false,
  silenceCheckIntervalId: null,
};

const SUBJECT_LABELS = {
  science: "Science",
  math: "Math",
  english: "English",
  geography: "Geography",
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

function valseaWebSocketUrl() {
  return `${VALSEA_WS_BASE}?api_key=${encodeURIComponent(CONFIG.VALSEA_KEY)}`;
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
  starCountEl.textContent = String(state.stars);
  bumpStars();
}

function setRecordingUI(on) {
  state.listening = on;
  micBtnEl.classList.toggle("recording", on);
  micBtnEl.setAttribute("aria-label", on ? "Recording… tap to stop" : "Tap to talk");
  transcriptTextEl.classList.toggle("listening", on);

  if (on) {
    micHintEl.textContent = "Speak now… tap the mic when you're done!";
  } else {
    micHintEl.textContent = "Tap the microphone to talk!";
  }
}

function downsampleTo16k(float32, inputRate) {
  if (inputRate === VALSEA_SAMPLE_RATE) return float32;
  const ratio = inputRate / VALSEA_SAMPLE_RATE;
  const outLen = Math.max(1, Math.round(float32.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    out[i] = float32[Math.min(Math.floor(i * ratio), float32.length - 1)];
  }
  return out;
}

function float32ToPcm16Base64(float32) {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function sendValseaMessage(payload) {
  if (valsea.ws?.readyState === WebSocket.OPEN) {
    valsea.ws.send(JSON.stringify(payload));
  }
}

function sendAudioAppend(pcmBase64) {
  sendValseaMessage({ type: "audio.append", audio: pcmBase64 });
}

function clearFinalTimeout() {
  if (valsea.finalTimeoutId) {
    clearTimeout(valsea.finalTimeoutId);
    valsea.finalTimeoutId = null;
  }
}

function clearStopTimeout() {
  if (valsea.stopTimeoutId) {
    clearTimeout(valsea.stopTimeoutId);
    valsea.stopTimeoutId = null;
  }
}

function clearSilenceMonitor() {
  if (valsea.silenceCheckIntervalId) {
    clearInterval(valsea.silenceCheckIntervalId);
    valsea.silenceCheckIntervalId = null;
  }
}

function clearValseaTimeouts() {
  clearFinalTimeout();
  clearStopTimeout();
  clearSilenceMonitor();
}

function audioLevel(float32) {
  if (!float32.length) return 0;
  let sum = 0;
  for (let i = 0; i < float32.length; i++) sum += float32[i] * float32[i];
  return Math.sqrt(sum / float32.length);
}

function startSilenceMonitor() {
  clearSilenceMonitor();
  valsea.lastSoundAt = Date.now();
  valsea.silenceCheckIntervalId = setInterval(() => {
    if (
      !state.listening ||
      valsea.awaitingFinal ||
      valsea.commitSent ||
      !valsea.sessionReady ||
      !valsea.hasDetectedSound
    ) {
      return;
    }
    if (Date.now() - valsea.lastSoundAt >= SILENCE_MS) {
      console.log("3 seconds of silence — auto audio.commit");
      commitAndAwaitFinal();
    }
  }, 200);
}

function handleFinalTimeout() {
  if (!valsea.awaitingFinal) return;
  console.log("transcript.final not received within 5 seconds of audio.commit");
  valsea.awaitingFinal = false;
  clearStopTimeout();
  showTranscriptError("Could not understand audio, please try again");
  if (valsea.ws?.readyState === WebSocket.OPEN && !valsea.sessionStopSent) {
    sendValseaMessage({ type: "session.stop" });
    valsea.sessionStopSent = true;
  }
  closeValseaSocket();
  setRecordingUI(false);
}

function flushPcmBuffer() {
  if (valsea.pcmFloatBuffer.length === 0) return;
  const chunk = new Float32Array(valsea.pcmFloatBuffer);
  valsea.pcmFloatBuffer = [];
  sendAudioAppend(float32ToPcm16Base64(chunk));
}

function startPcmCapture(stream) {
  valsea.audioContext = new AudioContext({ sampleRate: VALSEA_SAMPLE_RATE });
  valsea.pcmFloatBuffer = [];

  valsea.pcmSource = valsea.audioContext.createMediaStreamSource(stream);
  const bufferSize = 4096;
  valsea.pcmNode = valsea.audioContext.createScriptProcessor(bufferSize, 1, 1);
  valsea.pcmNode.onaudioprocess = (event) => {
    if (!valsea.sessionReady || valsea.commitSent || valsea.awaitingFinal) return;
    const input = event.inputBuffer.getChannelData(0);
    const resampled = downsampleTo16k(input, valsea.audioContext.sampleRate);
    if (audioLevel(resampled) > SILENCE_LEVEL_THRESHOLD) {
      valsea.lastSoundAt = Date.now();
      valsea.hasDetectedSound = true;
    }
    for (let i = 0; i < resampled.length; i++) {
      valsea.pcmFloatBuffer.push(resampled[i]);
    }
  };

  valsea.pcmSource.connect(valsea.pcmNode);
  valsea.pcmNode.connect(valsea.audioContext.destination);

  valsea.pcmSendIntervalId = setInterval(() => {
    if (!valsea.sessionReady || valsea.commitSent || valsea.awaitingFinal) return;
    flushPcmBuffer();
  }, 250);
}

function stopAudioCapture() {
  if (valsea.pcmSendIntervalId) {
    clearInterval(valsea.pcmSendIntervalId);
    valsea.pcmSendIntervalId = null;
  }
  flushPcmBuffer();
  valsea.pcmFloatBuffer = [];

  if (valsea.pcmNode) {
    valsea.pcmNode.onaudioprocess = null;
    valsea.pcmNode.disconnect();
    valsea.pcmNode = null;
  }
  if (valsea.pcmSource) {
    valsea.pcmSource.disconnect();
    valsea.pcmSource = null;
  }
  if (valsea.audioContext) {
    valsea.audioContext.close().catch(() => {});
    valsea.audioContext = null;
  }
  if (valsea.mediaStream) {
    valsea.mediaStream.getTracks().forEach((track) => track.stop());
    valsea.mediaStream = null;
  }
}

function handleValseaMessage(msg) {
  switch (msg.type) {
    case "session.created":
      console.log("session.created", msg);
      if (!valsea.sessionStarted) {
        valsea.sessionStarted = true;
        sendValseaMessage({
          type: "session.start",
          model: "valsea-rtt",
          language: "english",
        });
      }
      break;

    case "session.ready":
      console.log("session.ready", msg);
      valsea.sessionReady = true;
      transcriptTextEl.textContent = "Listening…";
      console.log("audio streaming started");
      startSilenceMonitor();
      break;

    case "transcript.partial":
      console.log("transcript.partial received", msg.text);
      if (msg.text) {
        transcriptTextEl.textContent = msg.text;
      }
      break;

    case "transcript.final":
      console.log("transcript.final received", msg.text);
      if (msg.text) {
        state.finalTranscript = msg.text;
        transcriptTextEl.textContent = msg.text;
        transcriptTextEl.classList.remove("listening");
      }
      finishAfterFinal();
      break;

    case "error":
      showTranscriptError(msg.message || "Transcription error");
      closeValseaSession();
      break;

    default:
      break;
  }
}

function showTranscriptError(message) {
  transcriptTextEl.textContent = message;
  transcriptTextEl.classList.remove("listening");
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
    TYPE_PERSONALITY_HINTS[primary] || "cheerful and helpful";
  const typeLabel = types.length ? types.join("/") : "unknown";
  return `You are ${name}, a ${typeLabel}-type Pokémon. You are ${hint}. Teach kids aged 6-14 with warmth and patience.`;
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

function buildSystemPrompt(sentiment, personality) {
  let prompt = `${personality} Keep answers under 5 sentences always. Use simple words.`;

  if (state.subject === "science") {
    prompt +=
      " If the question is about science, include one fun related fact about your Pokémon type.";
  } else if (state.subject === "math") {
    prompt +=
      " If the question is about math, be encouraging about logic and step-by-step thinking.";
  } else if (state.subject === "english") {
    prompt +=
      " If the question is about English, help with the specific word or grammar they asked about.";
  }

  if (sentiment === "negative") {
    prompt +=
      " The student seems confused or frustrated, be extra gentle and encouraging.";
  } else if (sentiment === "positive") {
    prompt +=
      " The student seems confident, be enthusiastic and match their energy.";
  }
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

async function fetchOpenAIReply(transcript, sentiment, personality) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CONFIG.OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(sentiment, personality) },
        { role: "user", content: transcript },
      ],
    }),
  });
  if (!res.ok) throw new Error("OpenAI request failed");
  const data = await res.json();
  return data.choices[0].message.content;
}

async function respondToFinalTranscript(transcript) {
  const sentiment = await fetchSentiment(transcript);
  const personality = await getCompanionPersonality();
  const reply = await fetchOpenAIReply(transcript, sentiment, personality);
  bubbleTextEl.textContent = reply;
}

function commitAndAwaitFinal() {
  if (valsea.commitSent || valsea.awaitingFinal) return;

  flushPcmBuffer();
  stopAudioCapture();
  setRecordingUI(false);
  clearSilenceMonitor();

  if (!valsea.sessionReady) {
    closeValseaSession();
    return;
  }

  valsea.commitSent = true;
  valsea.awaitingFinal = true;
  transcriptTextEl.textContent = "Finishing…";
  console.log("audio.commit sent");
  sendValseaMessage({ type: "audio.commit" });

  clearFinalTimeout();
  valsea.finalTimeoutId = setTimeout(handleFinalTimeout, 8000);
}

function finishAfterFinal() {
  clearFinalTimeout();
  clearStopTimeout();
  clearSilenceMonitor();
  valsea.awaitingFinal = false;
  valsea.commitSent = true;

  stopAudioCapture();
  if (valsea.ws?.readyState === WebSocket.OPEN && !valsea.sessionStopSent) {
    sendValseaMessage({ type: "session.stop" });
    valsea.sessionStopSent = true;
  }
  closeValseaSocket();

  setRecordingUI(false);

  if (state.finalTranscript) {
    bubbleTextEl.textContent = "Thinking…";
    addStar(1);
    respondToFinalTranscript(state.finalTranscript).catch(() => {
      bubbleTextEl.textContent = getPlaceholderReply();
    });
  }
}

function closeValseaSocket() {
  clearValseaTimeouts();
  if (valsea.ws) {
    valsea.ws.onopen = null;
    valsea.ws.onmessage = null;
    valsea.ws.onerror = null;
    valsea.ws.onclose = null;
    if (valsea.ws.readyState === WebSocket.OPEN) {
      valsea.ws.close();
    }
    valsea.ws = null;
  }
  valsea.sessionReady = false;
  valsea.sessionStarted = false;
  valsea.stopping = false;
  valsea.awaitingFinal = false;
  valsea.sessionStopSent = false;
  valsea.commitSent = false;
  valsea.hasDetectedSound = false;
}

function closeValseaSession() {
  valsea.stopping = true;
  valsea.awaitingFinal = false;
  clearValseaTimeouts();
  stopAudioCapture();
  if (valsea.ws?.readyState === WebSocket.OPEN && !valsea.sessionStopSent) {
    sendValseaMessage({ type: "session.stop" });
    valsea.sessionStopSent = true;
  }
  closeValseaSocket();
  setRecordingUI(false);
}

async function startValseaRecording() {
  if (state.listening) return;

  state.finalTranscript = "";
  valsea.awaitingFinal = false;
  valsea.sessionStopSent = false;
  valsea.commitSent = false;
  valsea.hasDetectedSound = false;
  clearValseaTimeouts();
  transcriptTextEl.textContent = "Connecting…";
  transcriptTextEl.classList.add("listening");
  setRecordingUI(true);

  try {
    valsea.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    showTranscriptError("Microphone access denied");
    setRecordingUI(false);
    return;
  }

  valsea.ws = new WebSocket(valseaWebSocketUrl());

  valsea.ws.addEventListener("open", () => {
    transcriptTextEl.textContent = "Starting session…";
  });

  valsea.ws.addEventListener("message", (event) => {
    try {
      handleValseaMessage(JSON.parse(event.data));
    } catch {
      showTranscriptError("Invalid response from transcription service");
      closeValseaSession();
    }
  });

  valsea.ws.addEventListener("error", () => {
    showTranscriptError("Could not connect to transcription service");
    closeValseaSession();
  });

  valsea.ws.addEventListener("close", () => {
    if (state.listening) {
      stopAudioCapture();
      setRecordingUI(false);
    }
  });

  try {
    startPcmCapture(valsea.mediaStream);
  } catch {
    showTranscriptError("Could not start microphone capture");
    closeValseaSession();
  }
}

function stopValseaRecording() {
  if (!state.listening) return;
  console.log("manual stop — waiting for transcript.final");
  commitAndAwaitFinal();
}

function toggleMic() {
  if (!state.listening) {
    startValseaRecording();
  } else {
    stopValseaRecording();
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

setupSpriteObserver();
updateBubble();
fetchAllPokemon().catch(() => {
  browserStatusEl.textContent = "Could not load Pokémon. Check your connection.";
});
