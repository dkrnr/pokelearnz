/**
 * PokeLearn — UI state, Pokémon browser, voice interactions (API wiring later)
 */

const POKEAPI_LIST =
  "https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0";
const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

const DEFAULT_POKEMON_ID = 25;

const state = {
  companionId: DEFAULT_POKEMON_ID,
  companionName: "Pikachu",
  companionSlug: "pikachu",
  shiny: false,
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

function listeningHint(name) {
  return `${name} is listening…`;
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

function setListening(on) {
  state.listening = on;
  micBtnEl.classList.toggle("listening", on);
  micBtnEl.setAttribute("aria-label", on ? "Listening…" : "Tap to talk");
  transcriptTextEl.classList.toggle("listening", on);

  if (on) {
    transcriptTextEl.textContent = listeningHint(state.companionName);
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
  const demoTranscript = "What is photosynthesis?";
  transcriptTextEl.textContent = demoTranscript;
  transcriptTextEl.classList.remove("listening");

  bubbleTextEl.textContent = getPlaceholderReply();
  addStar(1);
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

  document.querySelectorAll(".pokemon-cell").forEach((cell) => {
    cell.classList.toggle("selected", cell === cellEl);
    cell.setAttribute(
      "aria-selected",
      cell === cellEl ? "true" : "false"
    );
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
    updateBubble();
  }
}

// Event listeners
subjectBtns.forEach((btn) => {
  btn.addEventListener("click", () => setSubject(btn));
});

micBtnEl.addEventListener("click", toggleMic);

pokemonSearchEl.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  applySearch();
});

shinyToggleEl.addEventListener("click", toggleShiny);

// Init
setupSpriteObserver();
updateBubble();
fetchAllPokemon().catch(() => {
  browserStatusEl.textContent = "Could not load Pokémon. Check your connection.";
});
