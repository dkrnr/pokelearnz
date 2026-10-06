/** PokeLearn Discovery Camp. Finite authored learning, memory-first questions, existing provider interfaces. */
import { en, si } from "./locales.js";
import { containsNSFW } from "./safety.js";
const $ = (id) => document.getElementById(id);
const specimenElement = $("specimen");
const heroImage = $("heroSprite");
const SOURCE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/a3a1432e688ea028f12c51371d5253037cb9f17b/sprites/pokemon";
const STARTERS = [
  { id: 25, name: "pikachu" },
  { id: 1, name: "bulbasaur" },
  { id: 4, name: "charmander" },
  { id: 7, name: "squirtle" },
  { id: 133, name: "eevee" },
  { id: 143, name: "snorlax" },
];
const STORAGE_KEY = "pokelearn_camp_v1";
const state = {
  phase: "welcome",
  previousPhase: "welcome",
  light: false,
  water: false,
  feedback: "",
  buddy: STARTERS[0],
  shiny: false,
  language: "en",
  saving: false,
  completed: false,
  history: [],
  request: null,
  epoch: 0,
  buddyState: "ready",
  recording: null,
  stream: null,
  page: 0,
  query: "",
  catalog: STARTERS,
  personalities: {},
  permissionPending: false,
};
let installPrompt = null,
  workerRegistration = null,
  refreshRequested = false;
const suspendedMedia = [];
function suspendBackgroundMedia() {
  for (const image of document.querySelectorAll(".app-shell img")) {
    const placeholder = document.createElement("span");
    const rect = image.getBoundingClientRect();
    placeholder.style.display = "block";
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;
    image.replaceWith(placeholder);
    suspendedMedia.push({ image, placeholder });
  }
}
function restoreBackgroundMedia() {
  for (const { image, placeholder } of suspendedMedia)
    placeholder.replaceWith(image);
  suspendedMedia.length = 0;
}
function heroLoading() {
  const img = $("heroSprite");
  if (img)
    img.loading =
      img.getBoundingClientRect().top + scrollY < innerHeight
        ? "eager"
        : "lazy";
}
const url = new URL(location.href);
const forceCompanionFallback = url.searchParams.get("renderer") === "fallback";
let locale = url.searchParams.get("lang") === "si" ? "si" : "en";
state.language = locale;
function t(key, values = {}) {
  let text = (locale === "si" ? si : en)[key] ?? en[key] ?? key;
  for (const [k, v] of Object.entries(values))
    text = text.replaceAll(`{${k}}`, String(v));
  return text;
}
function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (["activity-tag", "science-note", "choice-index"].includes(className))
    el.dataset.textRole = "label";
  if (text !== undefined) el.textContent = text;
  return el;
}
function button(label, handler, className = "quiet-button", id) {
  const el = node("button", className, t(label));
  el.type = "button";
  if (id) el.id = id;
  el.addEventListener("click", handler);
  return el;
}
function name(buddy = state.buddy) {
  return buddy.name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
function translate() {
  document.documentElement.lang = locale;
  document
    .querySelectorAll("[data-i18n]")
    .forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $("questionInput").placeholder = t("questionPlaceholder");
  $("pokemonSearch").placeholder = t("searchPlaceholder");
  $("buddyTitle").textContent = t("buddyTitle");
  document
    .querySelectorAll("[data-close]")
    .forEach((el) => el.setAttribute("aria-label", t("close")));
  $("language").value = state.language;
  $("micBtn").setAttribute(
    "aria-label",
    t(state.recording ? "stopTalking" : "talk"),
  );
  $("micLabel").textContent = t(state.recording ? "stopTalking" : "talk");
  updateStorageStatus();
  updateBuddy();
  renderActivity();
  renderBuddies();
  networkStatus();
}
function save() {
  if (!state.saving) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        consent: true,
        buddy: state.buddy,
        shiny: state.shiny,
        completed: state.completed,
      }),
    );
  } catch {
    state.saving = false;
    $("storageStatus").textContent = t("storageError");
  }
}
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.version === 1 && saved.consent === true) {
      state.saving = true;
      state.completed = saved.completed === true;
      state.shiny = saved.shiny === true;
      if (
        Number.isInteger(saved.buddy?.id) &&
        saved.buddy.id >= 1 &&
        saved.buddy.id <= 1025 &&
        typeof saved.buddy.name === "string"
      )
        state.buddy = {
          id: saved.buddy.id,
          name: saved.buddy.name.slice(0, 60),
        };
    }
  } catch {
    /* Storage is optional. */
  }
}
function clearLegacy() {
  try {
    Object.keys(localStorage)
      .filter(
        (key) => key.startsWith("pokelearn") || key.startsWith("pokeLearn"),
      )
      .forEach((key) => localStorage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}
function updateStorageStatus(message) {
  $("storageStatus").textContent =
    message || t(state.saving ? "savedStatus" : "sessionStatus");
  $("saveAccept").disabled = state.saving;
}
function art(buddy = state.buddy, shiny = state.shiny) {
  if (STARTERS.some((x) => x.id === buddy.id) && (!shiny || buddy.id === 25))
    return `/assets/buddies/${buddy.id}${shiny ? "-shiny" : ""}.png`;
  return `${SOURCE}/other/official-artwork/${shiny ? "shiny/" : ""}${buddy.id}.png`;
}
function updateBuddy() {
  const img = heroImage;
  const source = art();
  if (img.getAttribute("src") !== source) {
    img.hidden = false;
    $("buddyFallback").hidden = true;
    img.src = source;
  }
  if (forceCompanionFallback) {
    img.hidden = true;
    $("buddyFallback").hidden = false;
  }
  img.alt = name();
  $("buddyFallback").textContent = name();
  $("heroName").textContent = name();
  $("answerLabel").textContent = t("answerLabel", { name: name() });
}
heroImage.addEventListener("error", () => {
  heroImage.hidden = true;
  $("buddyFallback").hidden = false;
});
function buddyStatus(status) {
  state.buddyState = status;
  $("buddyStage").dataset.state = status;
  $("sceneStatus").textContent = t(status === "ready" ? "ready" : status);
}
function syncSpecimen() {
  $("specimen").dataset.light = String(state.light);
  $("specimen").dataset.water = String(state.water);
}
function focusActivity() {
  const heading = $("activityContent").querySelector("h2");
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
  if (matchMedia("(max-width:900px)").matches && state.phase === "experiment")
    $("activityContent")
      .querySelector(".experiment-workbench")
      ?.scrollIntoView({ block: "center", behavior: "instant" });
}
function setPhase(phase) {
  state.phase = phase;
  state.feedback = "";
  renderActivity();
  focusActivity();
}
function begin() {
  cancelPending(false);
  state.light = false;
  state.water = false;
  syncSpecimen();
  setPhase("experiment");
}
function renderActivity() {
  const box = $("activityContent");
  $("campScene").append(specimenElement);
  box.replaceChildren();
  $("discovery").dataset.phase = state.phase;
  document.body.classList.toggle("finished", state.phase === "finished");
  $("questionInput").disabled = state.phase === "finished";
  $("askButton").disabled =
    state.phase === "finished" ||
    !!state.request ||
    !!state.recording ||
    state.permissionPending;
  $("micBtn").disabled =
    state.phase === "finished" || !!state.request || state.permissionPending;
  const nav = $("activityNav");
  nav.replaceChildren();
  if (["experiment", "check"].includes(state.phase)) {
    nav.append(
      button(
        "skipCheck",
        () => setPhase("recap"),
        "primary-button",
        "skipCheck",
      ),
    );
  }
  if (["experiment", "check", "recap"].includes(state.phase)) {
    nav.append(button("done", finish, "quiet-button", "pauseActivity"));
  }
  const add = (tag, cls, key) => {
    const el = node(tag, cls, t(key));
    box.append(el);
    return el;
  };
  const message = {
    welcome: "introBuddy",
    experiment: "plantBuddy",
    check: "checkBuddy",
    recap: "recapBuddy",
    finished: "finishedBuddy",
  };
  $("buddyMessage").textContent = t(message[state.phase]);
  $("pageNumber").textContent =
    state.phase === "welcome"
      ? "01 / 03"
      : state.phase === "experiment"
        ? "02 / 03"
        : "03 / 03";
  heroLoading();
  if (!state.request && !state.recording && !state.permissionPending)
    buddyStatus(
      state.phase === "finished"
        ? "resting"
        : state.phase === "welcome"
          ? "ready"
          : "explaining",
    );
  if (state.phase === "welcome") {
    add("h2", "", "welcomeTitle");
    add("p", "lesson-lead", "welcomeLead");
    ["plants", "shadows", "sharing"].forEach((key, index) => {
      const b = button(
        key,
        () => (key === "plants" ? begin() : prefill(key)),
        "discovery-choice",
        `discover-${key}`,
      );
      b.prepend(node("span", "choice-index", `0${index + 1}`));
      b.append(node("span", "choice-arrow", "↗"));
      box.append(b);
    });
  } else if (state.phase === "experiment") {
    add("span", "activity-tag", "offlineTag");
    add("h2", "", "plantTitle");
    add("p", "lesson-lead", "plantLead");
    const tools = node("div", "experiment-tools");
    if (matchMedia("(max-width:900px)").matches) {
      const bench = node("div", "experiment-workbench");
      const visual = node("div", "experiment-visual");
      visual.append(specimenElement);
      bench.append(visual, tools);
      box.append(bench);
    }
    for (const key of ["sunlight", "water"]) {
      const property = key === "sunlight" ? "light" : "water";
      const b = button(
        key,
        () => {
          state[property] = !state[property];
          syncSpecimen();
          for (const prop of ["light", "water"])
            $(`tool-${prop}`).setAttribute("aria-pressed", String(state[prop]));
          $("plantObservation").textContent = t(
            state.light && state.water
              ? "observeBoth"
              : state.light
                ? "observeLight"
                : state.water
                  ? "observeWater"
                  : "observeNone",
          );
        },
        "experiment-button",
        `tool-${property}`,
      );
      b.setAttribute("aria-pressed", String(state[property]));
      tools.append(b);
    }
    if (!tools.parentElement) box.append(tools);
    add(
      "p",
      "observation",
      state.light && state.water
        ? "observeBoth"
        : state.light
          ? "observeLight"
          : state.water
            ? "observeWater"
            : "observeNone",
    ).id = "plantObservation";
    add("p", "science-note", "scienceNote");
    box.append(
      button(
        "check",
        () => setPhase("check"),
        "primary-button",
        "checkActivity",
      ),
    );
  } else if (state.phase === "check") {
    if (matchMedia("(max-width:900px)").matches) {
      const visual = node("div", "notebook-specimen");
      visual.append(specimenElement);
      box.append(visual);
    }
    add("h2", "", "checkTitle");
    add("p", "lesson-lead", "checkLead");
    for (const key of ["both", "onlyWater", "neither"])
      box.append(
        button(
          key,
          () => {
            state.feedback =
              key === "both"
                ? "correct"
                : key === "onlyWater"
                  ? "wrongWater"
                  : "wrongNeither";
            if (key === "both") {
              state.light = true;
              state.water = true;
              syncSpecimen();
              setPhase("recap");
            } else {
              let feedback = $("checkFeedback");
              if (!feedback) {
                feedback = node("p", "feedback");
                feedback.id = "checkFeedback";
                feedback.setAttribute("role", "status");
                box.append(feedback);
              }
              feedback.textContent = t(state.feedback);
            }
          },
          "answer-choice",
          `answer-${key}`,
        ),
      );
  } else if (state.phase === "recap") {
    if (matchMedia("(max-width:900px)").matches) {
      const visual = node("div", "notebook-specimen");
      visual.append(specimenElement);
      box.append(visual);
    }
    add("span", "activity-tag", "savedPlant");
    add("h2", "", "recapTitle");
    add("p", "recap", "recapLead");
    add("p", "lesson-lead", "realWorld");
    const actions = node("div", "activity-actions");
    actions.append(
      button(
        "finishActivity",
        () => {
          state.completed = true;
          save();
          finish();
        },
        "primary-button",
        "completeActivity",
      ),
      button(
        "back",
        () => setPhase("experiment"),
        "quiet-button",
        "backActivity",
      ),
    );
    box.append(actions);
  } else {
    if (state.completed && matchMedia("(max-width:900px)").matches) {
      const visual = node("div", "notebook-specimen");
      visual.append(specimenElement);
      box.append(visual);
    }
    add("h2", "", "finishedTitle");
    add("p", "lesson-lead", "finishedLead");
    if (state.completed) add("p", "recap", "recapLead");
    box.append(
      button(
        "resume",
        () => {
          setPhase(
            state.previousPhase === "finished"
              ? "welcome"
              : state.previousPhase,
          );
          $("notebook").focus({ preventScroll: true });
        },
        "quiet-button",
        "resumeActivity",
      ),
    );
  }
}
function prefill(key) {
  $("questionInput").value = t(key);
  $("questionInput").focus();
  $("questionStatus").textContent = navigator.onLine ? "" : t("offlineAsk");
}
function releaseMic() {
  if (state.recording) {
    state.recording.onstop = null;
    state.recording.ondataavailable = null;
    state.recording.onerror = null;
    try {
      if (state.recording.state !== "inactive") state.recording.stop();
    } catch {}
  }
  state.stream?.getTracks().forEach((track) => track.stop());
  state.stream = null;
  state.recording = null;
  state.permissionPending = false;
  $("micBtn").setAttribute("aria-pressed", "false");
  $("micLabel").textContent = t("talk");
  $("micBtn").setAttribute("aria-label", t("talk"));
}
function cancelPending(announce = true) {
  state.epoch++;
  state.request?.abort();
  state.request = null;
  releaseMic();
  $("cancelQuestion").hidden = true;
  $("askButton").hidden = false;
  $("micBtn").hidden = false;
  if (announce) $("questionStatus").textContent = t("cancelled");
  renderActivity();
}
function finish() {
  if (state.phase !== "finished") state.previousPhase = state.phase;
  cancelPending(false);
  state.history = [];
  $("questionInput").value = "";
  $("answer").hidden = true;
  $("answerText").textContent = "";
  $("questionStatus").textContent = "";
  setPhase("finished");
  $("notebook").focus({ preventScroll: true });
}
function openDialog(id) {
  const dialog = $(id);
  if (dialog.open) return;
  suspendBackgroundMedia();
  dialog.showModal();
  document.querySelector(".app-shell").inert = true;
  document.body.style.overflow = "hidden";
  if (id === "buddyDialog") renderBuddies();
}
function closeDialog(dialog) {
  restoreBackgroundMedia();
  document.querySelector(".app-shell").inert = false;
  dialog.close();
  document.body.style.overflow = "";
}
for (const dialog of document.querySelectorAll("dialog")) {
  dialog
    .querySelector("[data-close]")
    .addEventListener("click", () => closeDialog(dialog));
  dialog.addEventListener("cancel", () => {
    restoreBackgroundMedia();
    document.querySelector(".app-shell").inert = false;
    document.body.style.overflow = "";
  });
  dialog.addEventListener("close", () => {
    restoreBackgroundMedia();
    document.querySelector(".app-shell").inert = false;
    document.body.style.overflow = "";
    if (dialog.id === "buddyDialog") $("pokemonGrid").replaceChildren();
  });
}
$("buddyOpen").addEventListener("click", () => openDialog("buddyDialog"));
$("grownupOpen").addEventListener("click", () => openDialog("grownupDialog"));
$("installOpen").addEventListener("click", () => {
  if (matchMedia("(display-mode: standalone)").matches || navigator.standalone)
    $("installInstructions").textContent = t("installed");
  openDialog("installDialog");
});
function renderBuddies() {
  if (!$("buddyDialog").open) return;
  const q = state.query.trim().toLowerCase();
  const choices = q
    ? state.catalog.filter((x) => x.name.includes(q) || String(x.id) === q)
    : [
        ...STARTERS,
        ...state.catalog.filter((x) => !STARTERS.some((s) => s.id === x.id)),
      ];
  const pages = Math.max(1, Math.ceil(choices.length / 6));
  state.page = Math.min(state.page, pages - 1);
  $("pokemonGrid").replaceChildren();
  for (const buddy of choices.slice(state.page * 6, state.page * 6 + 6)) {
    const b = node("button", "pokemon-cell");
    b.type = "button";
    b.setAttribute("aria-pressed", String(buddy.id === state.buddy.id));
    b.setAttribute("aria-label", name(buddy));
    const img = node("img");
    img.alt = "";
    img.width = 92;
    img.height = 92;
    img.id = `buddy-image-${buddy.id}`;
    img.loading = "eager";
    img.src = art(buddy);
    img.addEventListener(
      "error",
      () => {
        const fallback = node("span", "image-fallback", name(buddy).charAt(0));
        fallback.setAttribute("aria-hidden", "true");
        img.replaceWith(fallback);
      },
      { once: true },
    );
    b.append(img, node("span", "", name(buddy)));
    b.addEventListener("click", () => {
      cancelPending(false);
      state.buddy = buddy;
      state.history = [];
      state.shiny = $("shinyToggle").checked;
      save();
      updateBuddy();
      $("answer").hidden = true;
      $("questionStatus").textContent = "";
      closeDialog($("buddyDialog"));
    });
    $("pokemonGrid").append(b);
  }
  $("browserStatus").textContent = choices.length
    ? t("pageStatus", { page: state.page + 1, pages })
    : t("noMatches");
  $("previousBuddies").disabled = state.page === 0;
  $("nextBuddies").disabled = state.page >= pages - 1;
}
$("buddySearchForm").addEventListener("submit", (event) =>
  event.preventDefault(),
);
$("pokemonSearch").addEventListener("input", (event) => {
  state.query = event.target.value;
  state.page = 0;
  renderBuddies();
});
$("previousBuddies").addEventListener("click", () => {
  state.page--;
  renderBuddies();
});
$("nextBuddies").addEventListener("click", () => {
  state.page++;
  renderBuddies();
});
$("shinyToggle").addEventListener("change", (event) => {
  cancelPending(false);
  state.shiny = event.target.checked;
  updateBuddy();
  renderBuddies();
  save();
});
$("saveAccept").addEventListener("click", () => {
  state.saving = true;
  save();
  updateStorageStatus(state.saving ? null : t("storageError"));
});
function rejectSaving(clear = false) {
  state.saving = false;
  let success = true;
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (clear) success = clearLegacy();
  } catch {
    success = false;
  }
  updateStorageStatus(
    success ? t(clear ? "cleared" : "sessionStatus") : t("storageError"),
  );
}
$("saveReject").addEventListener("click", () => rejectSaving());
$("clearData").addEventListener("click", () => rejectSaving(true));
$("finish").addEventListener("click", finish);
$("cancelQuestion").addEventListener("click", () => cancelPending());
$("language").addEventListener("change", (event) => {
  cancelPending(false);
  state.language = event.target.value;
  locale = state.language === "si" ? "si" : "en";
  url.searchParams.set("lang", locale);
  history.replaceState(null, "", url);
  translate();
  if (state.language === "ta")
    $("questionStatus").textContent = t("voiceNotice", { language: "Tamil" });
  $("answer").hidden = true;
});
function setBusy(controller, status = "thinking") {
  state.request = controller;
  buddyStatus(status);
  $("askButton").hidden = true;
  $("micBtn").hidden = true;
  $("cancelQuestion").hidden = false;
  $("questionInput").disabled = true;
}
function clearBusy(epoch) {
  if (epoch !== state.epoch) return;
  const lastBuddyState = state.buddyState;
  state.request = null;
  $("askButton").hidden = false;
  $("micBtn").hidden = false;
  $("cancelQuestion").hidden = true;
  $("questionInput").disabled = false;
  renderActivity();
  if (
    lastBuddyState === "unavailable" ||
    (lastBuddyState === "explaining" && !$("answer").hidden)
  )
    buddyStatus(lastBuddyState);
}
async function post(path, payload, signal) {
  const res = await fetch(`/.netlify/functions/${path}`, {
    method: "POST",
    headers:
      payload instanceof FormData
        ? undefined
        : { "Content-Type": "application/json" },
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
    signal,
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}
function prompt() {
  const mapped = state.personalities[state.buddy.id];
  const personality = typeof mapped === "string" ? mapped : mapped?.personality;
  return `You are a fictional ${name()} learning companion for a child aged 6–14. ${personality || "Speak warmly and patiently."} Use simple accurate language and at most four short sentences. Never pressure the child to continue, preserve streaks, earn rewards, or care for you. Never imply that you feel lonely, sad, hungry or abandoned when they leave. If they say stop, tired, bored, or done, welcome a break without a follow-up hook. They may ask for a simpler explanation. Don't routinely end with a question. Do not request personal identifying information. For harmful or sensitive questions, gently suggest a trusted grown-up. Explain real science separately from Pokémon fiction. Reply in clear simple English. Never include quiz JSON unless requested.`;
}
async function ask(text, existing) {
  if (state.phase === "finished") return;
  if (!text.trim() || text.trim().length < 2) {
    $("questionStatus").textContent = t("clearer");
    return;
  }
  if (!navigator.onLine) {
    $("questionStatus").textContent = t("offlineAsk");
    return;
  }
  if (containsNSFW(text)) {
    $("questionStatus").textContent = t("blocked");
    return;
  }
  if (!existing) cancelPending(false);
  const epoch = state.epoch;
  const controller = existing || new AbortController();
  setBusy(controller);
  $("questionStatus").textContent = t("asking");
  $("answer").hidden = true;
  try {
    const data = await post(
      "chat",
      {
        messages: [
          { role: "system", content: prompt() },
          ...state.history,
          { role: "user", content: text },
        ],
      },
      controller.signal,
    );
    if (epoch !== state.epoch) return;
    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) throw new Error("empty");
    $("answerText").textContent = answer.trim();
    $("answerLabel").textContent = t("answerLabel", { name: name() });
    $("answer").hidden = false;
    $("questionStatus").textContent = t("answered");
    $("questionInput").value = "";
    state.history.push(
      { role: "user", content: text },
      { role: "assistant", content: answer },
    );
    state.history = state.history.slice(-6);
    buddyStatus("explaining");
  } catch (error) {
    if (epoch !== state.epoch || error.name === "AbortError") return;
    $("questionStatus").textContent = t(
      /429|402/.test(error.message) ? "quota" : "failed",
    );
    buddyStatus("unavailable");
  } finally {
    clearBusy(epoch);
  }
}
$("questionInput").addEventListener("focus", () =>
  document.body.classList.add("typing"),
);
$("questionInput").addEventListener("blur", () =>
  document.body.classList.remove("typing"),
);
$("questionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.request && !state.recording && !state.permissionPending)
    ask($("questionInput").value.trim());
});
async function record() {
  if (state.phase === "finished" || state.request || state.permissionPending)
    return;
  if (state.recording) {
    state.recording.stop();
    return;
  }
  if (!navigator.onLine) {
    $("questionStatus").textContent = t("voiceUnavailable");
    return;
  }
  if (
    !navigator.mediaDevices?.getUserMedia ||
    typeof MediaRecorder === "undefined"
  ) {
    $("questionStatus").textContent = t("micUnsupported");
    return;
  }
  cancelPending(false);
  const epoch = state.epoch;
  state.permissionPending = true;
  renderActivity();
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (epoch !== state.epoch) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    state.stream = stream;
    state.permissionPending = false;
    const mime = [
      "audio/webm;codecs=opus",
      "audio/mp4",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
    state.recording = recorder;
    const chunks = [];
    const started = Date.now();
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => {
      if (epoch !== state.epoch) return;
      cancelPending(false);
      $("questionStatus").textContent = t("micFailed");
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      if (epoch !== state.epoch) return;
      state.recording = null;
      state.stream = null;
      $("micBtn").setAttribute("aria-pressed", "false");
      $("micLabel").textContent = t("talk");
      if (Date.now() - started < 1500 || !chunks.length) {
        renderActivity();
        $("questionStatus").textContent = t("micShort");
        return;
      }
      const controller = new AbortController();
      setBusy(controller);
      $("questionStatus").textContent = t("micProcessing");
      const form = new FormData();
      const blob = new Blob(chunks, {
        type: recorder.mimeType || "audio/webm",
      });
      form.append(
        "file",
        blob,
        blob.type.includes("mp4") ? "recording.mp4" : "recording.webm",
      );
      form.append("model", "valsea-transcribe");
      form.append(
        "language",
        { en: "english", si: "sinhala", ta: "tamil" }[state.language],
      );
      form.append(
        "hint_text",
        "This is a child speaking to a Pokemon educational app. They may mix languages.",
      );
      try {
        const data = await post("transcribe", form, controller.signal);
        if (epoch !== state.epoch) return;
        const text = (data.text || "").trim();
        if (text.length < 2) throw new Error("empty");
        $("questionInput").value = text;
        await ask(text, controller);
      } catch (error) {
        if (epoch !== state.epoch || error.name === "AbortError") return;
        $("questionStatus").textContent = t("micFailed");
      } finally {
        clearBusy(epoch);
      }
    };
    recorder.start();
    buddyStatus("listening");
    $("micBtn").setAttribute("aria-pressed", "true");
    $("micBtn").setAttribute("aria-label", t("stopTalking"));
    $("micLabel").textContent = t("stopTalking");
    $("questionStatus").textContent = t("listening");
    $("cancelQuestion").hidden = false;
    $("askButton").disabled = true;
  } catch {
    if (epoch !== state.epoch) return;
    releaseMic();
    renderActivity();
    $("questionStatus").textContent = t("micDenied");
  }
}
$("micBtn").addEventListener("click", record);
function networkStatus() {
  $("connectionBanner").hidden = navigator.onLine;
}
matchMedia("(max-width:900px)").addEventListener("change", () =>
  renderActivity(),
);
addEventListener("online", networkStatus);
addEventListener("offline", () => {
  cancelPending(false);
  networkStatus();
});
addEventListener("pagehide", () => cancelPending(false));
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.recording) cancelPending();
});
addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  $("nativeInstall").hidden = false;
});
$("nativeInstall").addEventListener("click", async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $("nativeInstall").hidden = true;
});
addEventListener("appinstalled", () => {
  $("nativeInstall").hidden = true;
  installPrompt = null;
  $("installInstructions").textContent = t("installed");
});
$("updateButton").addEventListener("click", () => {
  if (
    state.request ||
    state.recording ||
    state.permissionPending ||
    ["experiment", "check"].includes(state.phase)
  ) {
    $("questionStatus").textContent = t("waitingUpdate");
    return;
  }
  if (workerRegistration?.waiting) {
    refreshRequested = true;
    workerRegistration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
  }
});
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then((reg) => {
      workerRegistration = reg;
      const show = () => {
        if (reg.waiting && navigator.serviceWorker.controller)
          $("updateBanner").hidden = false;
      };
      show();
      reg.addEventListener("updatefound", () => {
        reg.installing?.addEventListener("statechange", show);
      });
    })
    .catch(() => {
      /* Offline cache failure does not prevent the activity. */
    });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshRequested) location.reload();
  });
}
for (const detail of document.querySelectorAll("details")) {
  const sync = () => {
    for (const child of detail.children)
      if (child.tagName !== "SUMMARY") child.hidden = !detail.open;
  };
  sync();
  detail.addEventListener("toggle", sync);
}
document
  .querySelectorAll(
    ".eyebrow,.buddy-toolbar,.scene-status,.camp-sign,.notebook-heading,.composer-note,#questionHint,.answer-label,.answer-note,.camp-footer,.small-note",
  )
  .forEach((el) => (el.dataset.textRole = "label"));
restore();
$("shinyToggle").checked = state.shiny;
translate();
Promise.all([
  fetch("/assets/pokemon-index.json")
    .then((r) => r.json())
    .then((data) => {
      if (Array.isArray(data)) {
        state.catalog = data;
        renderBuddies();
      }
    }),
  fetch("/pokemonPersonalities.json")
    .then((r) => r.json())
    .then((data) => {
      state.personalities = data;
    }),
]).catch(() => {
  /* Familiar buddies and local activity remain usable. */
});
window.__STUDIO_QA__ = {
  snapshot: () => ({
    renderer: heroImage.hidden ? "fallback" : "dom",
    state: state.phase,
    progress: (Number(state.light) + Number(state.water)) / 2,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    fallbackReason:
      heroImage.hidden
        ? (forceCompanionFallback ? "Forced companion-image fallback" : "Companion image unavailable")
        : null,
    buddyState: state.buddyState,
    light: state.light,
    water: state.water,
    saving: state.saving,
    completed: state.completed,
    requestActive: !!state.request,
    recording: !!state.recording,
  }),
};
