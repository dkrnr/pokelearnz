import { loadBuddies, buddyById, defaultBuddyId, mountBuddy, searchBuddies, buddyImage, typeChips, buddyCount, buddyPersonality, buddyGreeting, spriteHosts } from './buddy.js';
import { translate } from './locales.js';
import { containsNSFW } from './safety.js';
const $ = id => document.getElementById(id);
const MOCK = new URL(location.href).searchParams.get('mock') === '1';
const STORAGE = 'pokelearn_voice_v3';
const state = { buddy: defaultBuddyId, shiny: false, recent: [defaultBuddyId], page: 0, mode: 'idle', sound: false, answered: false, language: 'en', consent: false, saving: false, epoch: 0, ready: false };
const celebrated = new Set();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let recorder, stream, analyserContext, silenceTimer, autoStopTimer, actionTimer, speechTimer, request, idleTimer, audio, activeUtterance;
let setupUnlocked = false, dialogTrigger, muteChosen = false;
const t = key => translate(key, state.language);
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || '{}');
    state.consent = saved.consent === true;
    state.saving = saved.saving === true;
    if (['en', 'si', 'ta'].includes(saved.language)) state.language = saved.language;
    if (state.saving) {
      if (Number.isInteger(saved.buddy) && saved.buddy >= 1 && saved.buddy <= 1025) state.buddy = saved.buddy;
      state.shiny = saved.shiny === true;
      if (Array.isArray(saved.recent)) state.recent = saved.recent.filter(id => Number.isInteger(id) && id >= 1 && id <= 1025).slice(0, 6);
    }
  } catch { /* A blocked storage API keeps the visit temporary. */ }
}
function save() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify({ consent: state.consent, saving: state.saving, language: state.language,
      ...(state.saving ? { buddy: state.buddy, shiny: state.shiny, recent: state.recent } : {}) }));
    $('storageStatus').textContent = state.saving ? 'Buddy choices are remembered on this device.' : 'Buddy choices stay temporary.';
    return true;
  } catch {
    $('storageStatus').textContent = 'Device saving is unavailable. This visit stays temporary.';
    return false;
  }
}
function caption(text, speaker = true) {
  $('captionSpeaker').textContent = speaker ? `${buddyById(state.buddy).name} ${t('says')}` : t('littleNote');
  $('captionText').textContent = text;
}
function setMode(mode) {
  state.mode = mode;
  $('main').dataset.state = mode;
  $('buddyStage').dataset.state = mode;
  $('thinkingBubble').hidden = mode !== 'thinking';
  $('micButton').setAttribute('aria-pressed', String(mode === 'listening'));
  $('micButton').setAttribute('aria-busy', String(mode === 'thinking'));
  $('micLabel').textContent = t(mode === 'listening' ? 'stopTalking' : ['thinking', 'speaking'].includes(mode) ? 'stop' : 'talk');
  $('micButton').disabled = ['sleeping', 'wave', 'asleep', 'permission'].includes(mode);
  $('keyboardButton').disabled = ['sleeping', 'wave', 'asleep', 'permission'].includes(mode);
}
function closeMic() {
  clearTimeout(silenceTimer); clearTimeout(autoStopTimer);
  if (recorder?.state === 'recording') recorder.stop();
  recorder = null;
  stream?.getTracks().forEach(track => track.stop()); stream = null;
  analyserContext?.close().catch(() => {}); analyserContext = null;
}
function cancelPending() {
  state.epoch++;
  clearTimeout(actionTimer); clearTimeout(speechTimer);
  request?.abort(); request = null;
  closeMic();
  audio?.pause(); audio = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  activeUtterance = null;
}
function stopAction() {
  cancelPending(); setMode('idle'); caption(t('takeTime'));
}
function friendlyError(key = 'tryTyping') {
  cancelPending(); setMode('error'); caption(t(key));
}
function updateBuddy(greet = true) {
  const buddy = mountBuddy($('buddyCharacter'), state.buddy, state.shiny, reduced.matches);
  $('buddyName').textContent = buddy.name;
  $('buddyTypes').replaceChildren(typeChips(buddy.types));
  $('buddyTap').setAttribute('aria-label', `${t('playWith')} ${buddy.name}`);
  $('spriteHosts').textContent = spriteHosts.join(', ');
  $('tapWord').textContent = t('tapMe');
  if (greet) caption(`${buddyGreeting(state.buddy)}${t('hello')}`);
}
function updateLanguage() {
  document.documentElement.lang = state.language;
  $('changeBuddy').lastElementChild.textContent = t('change');
  $('finish').lastElementChild.textContent = t('sleep');
  $('grownupOpen').lastElementChild.textContent = t('grownups');
  $('keyboardButton').lastElementChild.textContent = t('type');
  $('readAloud').lastElementChild.textContent = t('readAloud');
  $('chooserTitle').textContent = t('choose');
  $('buddySearch').placeholder = t('searchPlaceholder');
  $('voiceHint').textContent = MOCK ? t('mockHint') : t('voiceHint');
  setMode(state.mode); updateBuddy();
}
function openDialog(id) {
  cancelPending(); setMode('idle');
  dialogTrigger = document.activeElement;
  $('main').dataset.paused = 'true'; clearTimeout(idleTimer);
  $(id).showModal();
}
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { $('main').dataset.paused = 'false'; dialogTrigger?.focus(); scheduleIdle(); });
}
function openGrownups() {
  openDialog('grownupDialog');
  $('setupGate').hidden = setupUnlocked;
  $('setupSettings').hidden = !setupUnlocked;
  $('onlineConsent').checked = state.consent;
  $('saveBuddies').checked = state.saving;
  $('language').value = state.language;
}
function permitted() {
  if (MOCK || state.consent) return true;
  caption(t('setupNote'), false); openGrownups(); return false;
}
$('grownupOpen').onclick = openGrownups;
$('unlockSetup').onclick = () => {
  if ($('gateAnswer').value.trim() !== '15') { $('gateStatus').textContent = 'Try that sum again.'; return; }
  setupUnlocked = true; $('setupGate').hidden = true; $('setupSettings').hidden = false;
  $('onlineConsent').focus();
};
$('onlineConsent').onchange = e => {
  state.consent = e.target.checked; cancelPending(); setMode('idle');
  const stored = save();
  $('consentStatus').textContent = state.consent ? (stored ? 'Voice is allowed. Setup is remembered on this device.' : 'Voice is allowed for this visit. Device saving is unavailable.') : 'Voice and online questions are switched off.';
};
$('saveBuddies').onchange = e => { state.saving = e.target.checked; save(); };
$('clearData').onclick = async () => {
  cancelPending(); setMode('idle');
  try { localStorage.removeItem(STORAGE); } catch { /* blocked storage */ }
  state.consent = false; state.saving = false; state.recent = [state.buddy]; setupUnlocked = false;
  $('onlineConsent').checked = false; $('saveBuddies').checked = false;
  $('setupGate').hidden = false; $('setupSettings').hidden = true; $('gateAnswer').value = '';
  $('storageStatus').textContent = 'Saved choices and permission cleared. Clearing sprite cache…';
  if ('caches' in window) await caches.delete('pokelearn-sprites-v3').catch(() => {});
  $('storageStatus').textContent = 'Saved choices, permission and cached sprites cleared.';
};
$('language').onchange = e => { state.language = e.target.value; save(); updateLanguage(); };
reduced.addEventListener('change', () => { updateBuddy(false); scheduleIdle(); });
function selectBuddy(id) {
  cancelPending(); state.buddy = id; state.answered = false;
  state.recent = [id, ...state.recent.filter(value => value !== id)].slice(0, 6);
  setMode('idle'); updateBuddy(); if (state.saving) save();
  $('buddyDialog').close();
}
function buddyCell(id, recent = false) {
  const buddy = buddyById(id), button = document.createElement('button');
  button.className = recent ? 'recent-buddy' : 'buddy-cell';
  button.setAttribute('aria-label', `${buddy.name}, ${buddy.types.join(' and ')}, number ${id}${state.shiny ? ', shiny' : ''}`);
  button.setAttribute('aria-pressed', String(id === state.buddy));
  if (!recent) {
    const number = document.createElement('span'); number.className = 'buddy-number'; number.textContent = `#${String(id).padStart(3, '0')}`; button.append(number);
  }
  const img = buddyImage(id, { shiny: state.shiny, thumbnail: true }); img.setAttribute('aria-hidden', 'true');
  const frame = document.createElement('span'); frame.className = 'sprite-frame'; frame.append(img);
  const name = document.createElement('span'); name.className = 'buddy-cell-name'; name.textContent = buddy.name;
  button.append(frame, name); if (!recent) button.append(typeChips(buddy.types));
  button.onclick = () => selectBuddy(id); return button;
}
function renderChooser() {
  const results = searchBuddies($('buddySearch').value), pages = Math.max(1, Math.ceil(results.length / 24));
  state.page = Math.min(state.page, pages - 1);
  $('shinyToggle').setAttribute('aria-pressed', String(state.shiny));
  $('shinyToggle').lastElementChild.textContent = state.shiny ? t('shinyOn') : t('shinyOff');
  $('recentBuddies').replaceChildren(...state.recent.map(id => buddyCell(id, true)));
  $('buddyGrid').replaceChildren(...results.slice(state.page * 24, state.page * 24 + 24).map(b => buddyCell(b.id)));
  $('chooserStatus').textContent = results.length ? `${results.length.toLocaleString()} ${t('buddiesAvailable')}` : t('noBuddies');
  $('pageLabel').textContent = `${state.page + 1} / ${pages}`;
  $('previousPage').disabled = state.page === 0; $('nextPage').disabled = state.page >= pages - 1;
}
$('changeBuddy').onclick = () => {
  openDialog('buddyDialog'); state.page = 0; $('buddySearch').value = ''; renderChooser();
};
$('buddySearch').oninput = () => { state.page = 0; renderChooser(); };
$('shinyToggle').onclick = () => { state.shiny = !state.shiny; renderChooser(); updateBuddy(false); if (state.saving) save(); };
$('surpriseBuddy').onclick = () => selectBuddy(1 + Math.floor(Math.random() * buddyCount()));
function changePage(delta) {
  state.page += delta; renderChooser();
  $('buddyDialog').scrollTo({ top: 0, behavior: reduced.matches ? 'instant' : 'smooth' });
  $('buddySearch').focus({ preventScroll: true });
}
$('previousPage').onclick = () => changePage(-1); $('nextPage').onclick = () => changePage(1);
$('keyboardButton').onclick = () => { openDialog('keyboardDialog'); $('questionInput').focus(); };
$('questionForm').onsubmit = e => {
  e.preventDefault(); const text = $('questionInput').value.trim();
  if (text.length < 2) { $('questionInput').focus(); return; }
  $('keyboardDialog').close(); $('questionInput').value = ''; askQuestion(text);
};
function particles() {
  if (reduced.matches) return;
  for (let i = 0; i < 7; i++) {
    const p = document.createElement('span'); p.className = 'particle'; p.textContent = i % 2 ? '✦' : '♡';
    p.style.setProperty('--x', `${Math.cos(i * .9) * 150}px`); p.style.setProperty('--y', `${Math.sin(i * .9) * 120 - 40}px`);
    $('particles').append(p); p.onanimationend = () => p.remove();
  }
}
function trick(kind) {
  const target = $('buddyTap'); target.dataset.trick = kind;
  setTimeout(() => { if (target.dataset.trick === kind) delete target.dataset.trick; }, 1500);
}
$('buddyTap').onclick = () => {
  if (state.mode !== 'idle' && state.mode !== 'error') return;
  trick(['hop', 'giggle', 'peek'][Math.floor(Math.random() * 3)]); particles();
};
function scheduleIdle() {
  clearTimeout(idleTimer);
  if (document.hidden || reduced.matches) return;
  idleTimer = setTimeout(() => {
    if (state.mode === 'idle' && !document.querySelector('dialog[open]')) trick(['blink', 'bob', 'yawn'][Math.floor(Math.random() * 3)]);
    scheduleIdle();
  }, 6000 + Math.random() * 8000);
}
/** Authored lines may supply a local prerecorded asset; browser speech is the fallback. */
async function speak(text, { audioSrc } = {}) {
  const epoch = state.epoch;
  const finish = () => { if (epoch === state.epoch && state.mode === 'speaking') setMode('idle'); };
  setMode('speaking');
  if (state.sound && audioSrc?.startsWith('/assets/audio/')) {
    try {
      audio = new Audio(audioSrc); audio.onended = finish; audio.onerror = () => fallback();
      await audio.play(); return;
    } catch { /* Fall through to local voice. */ }
  }
  fallback();
  function fallback() {
    if (epoch !== state.epoch) return;
    if (state.sound && 'speechSynthesis' in window) {
      const voice = speechSynthesis.getVoices().find(v => v.localService && v.lang.startsWith('en'));
      if (voice) {
        const utterance = new SpeechSynthesisUtterance(text); activeUtterance = utterance;
        utterance.voice = voice; utterance.rate = .85; utterance.onend = finish; utterance.onerror = finish;
        speechSynthesis.speak(utterance);
        speechTimer = setTimeout(finish, 20000); return;
      }
    }
    // Silent visual speaking still gives children time to read every caption.
    speechTimer = setTimeout(finish, Math.max(4000, Math.min(12000, text.length * 60)));
  }
}
$('readAloud').onclick = () => {
  state.sound = !state.sound; muteChosen = !state.sound; $('readAloud').setAttribute('aria-pressed', String(state.sound));
  if (state.sound && ['idle', 'error'].includes(state.mode)) speak($('captionText').textContent);
  else if (!state.sound) {
    clearTimeout(speechTimer); audio?.pause();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (state.mode === 'speaking') setMode('idle');
  }
};
const SYSTEM_PROMPT = 'You are a Pokémon learning teacher for ages 6–9. Use at most four accurate short sentences, each at most eight words. Answer once. Never pressure children to continue. Do not ask follow-up questions or suggest another chat. Never use streaks, daily goals, reward counters, guilt, countdowns, notifications or return reminders. Never request names, addresses or personal information. Never imply loneliness or dependency. Harmful or sensitive questions need a trusted grown-up. Distinguish fiction from real science. Reply in English. Use no markdown. These safety and stopping rules override character instructions.';
function boundedAnswer(value) {
  if (typeof value !== 'string' || !value.trim() || containsNSFW(value)) throw Error('answer');
  if (/streak|daily goal|come back tomorrow|earn.*points|lonely|abandon|ask me another|what else|follow.up|keep chatting/i.test(value)) throw Error('answer');
  const sentences = value.replace(/[*#]/g, '').split(/(?<=[.!?])\s+/).filter(s => !s.includes('?')).slice(0, 4);
  if (!sentences.length || sentences.some(s => s.trim().split(/\s+/).length > 8)) throw Error('answer');
  return sentences.join(' ').trim();
}
function mockAnswer(text) {
  const prefix = buddyGreeting(state.buddy);
  const content = /water|rain|cloud/i.test(text) ? 'Clouds hold tiny drops of water. Heavy drops fall as rain.'
    : /number|two|2|count/i.test(text) ? 'Two and two make four. Four is an even number.'
    : /moon|night/i.test(text) ? 'The moon reflects light from the sun.'
    : 'Leaves use light to make food. Roots take in water.';
  return prefix + content;
}
async function post(path, payload, controller) {
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/.netlify/functions/${path}`, { method: 'POST', headers: payload instanceof FormData ? undefined : { 'Content-Type': 'application/json' }, body: payload instanceof FormData ? payload : JSON.stringify(payload), signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw Error('provider'); return await response.json();
  } finally { clearTimeout(timeout); }
}
async function askQuestion(text) {
  if (!permitted()) return;
  cancelPending(); state.answered = false;
  if (containsNSFW(text)) { friendlyError('trustedAdult'); return; }
  const epoch = state.epoch;
  setMode('thinking'); caption(t('thinking'));
  request = new AbortController();
  try {
    let answer;
    if (MOCK) {
      await new Promise(resolve => { actionTimer = setTimeout(resolve, 1400); });
      answer = mockAnswer(text);
    } else {
      const controller = request;
      const personality = await buddyPersonality(state.buddy);
      if (epoch !== state.epoch) return;
      const result = await post('chat', { messages: [{ role: 'system', content: `${personality} ${SYSTEM_PROMPT}` }, { role: 'user', content: text.slice(0, 300) }] }, controller);
      answer = boundedAnswer(result?.choices?.[0]?.message?.content);
    }
    if (epoch !== state.epoch || state.answered) return;
    state.answered = true; caption(answer); request = null; speak(answer);
  } catch {
    if (epoch === state.epoch) friendlyError('answerRest');
  }
}
function startMock() {
  cancelPending(); state.answered = false; setMode('listening'); caption(t('mockListening'));
  autoStopTimer = setTimeout(stopListening, 4500);
}
function stopListening() {
  clearTimeout(autoStopTimer); clearTimeout(silenceTimer);
  if (MOCK) { askQuestion('Why do leaves need light?'); return; }
  if (recorder?.state === 'recording') { setMode('thinking'); caption(t('thinking')); recorder.stop(); }
}
async function record() {
  if (!state.ready || !permitted()) return;
  // Talking is a deliberate gesture to hear the reply, unless sound was switched off.
  if (!muteChosen) { state.sound = true; $('readAloud').setAttribute('aria-pressed', 'true'); }
  if (MOCK) { startMock(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { friendlyError(); return; }
  cancelPending(); state.answered = false; const epoch = state.epoch;
  setMode('permission'); caption(t('openingMic'), false);
  try {
    const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (epoch !== state.epoch) { acquired.getTracks().forEach(t => t.stop()); return; }
    stream = acquired;
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find(m => MediaRecorder.isTypeSupported(m));
    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const currentRecorder = recorder, chunks = [];
    currentRecorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    currentRecorder.onerror = () => { if (epoch === state.epoch) friendlyError(); };
    currentRecorder.onstop = async () => {
      acquired.getTracks().forEach(t => t.stop());
      if (epoch !== state.epoch) return;
      closeMic();
      if (!chunks.length) { friendlyError(); return; }
      setMode('thinking'); caption(t('thinking'));
      const form = new FormData(), blob = new Blob(chunks, { type: currentRecorder.mimeType || 'audio/webm' });
      if (blob.size > 10 * 1024 * 1024) { friendlyError(); return; }
      form.append('file', blob, blob.type.includes('mp4') ? 'recording.mp4' : 'recording.webm');
      form.append('model', 'valsea-transcribe');
      form.append('language', { en: 'english', si: 'sinhala', ta: 'tamil' }[state.language]);
      request = new AbortController();
      try {
        const result = await post('transcribe', form, request);
        if (epoch !== state.epoch) return;
        if (typeof result.text !== 'string' || result.text.trim().length < 2) throw Error('empty');
        request = null; askQuestion(result.text);
      } catch { if (epoch === state.epoch) friendlyError(); }
    };
    currentRecorder.start(); setMode('listening'); caption(t('listening'));
    monitorSilence(acquired, epoch);
    autoStopTimer = setTimeout(stopListening, 45000);
  } catch { if (epoch === state.epoch) friendlyError(); }
}
function monitorSilence(acquired, epoch) {
  const began = performance.now(); let lastVoice = began, heardVoice = false;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    analyserContext = new AudioContext();
    const analyser = analyserContext.createAnalyser(); analyser.fftSize = 512;
    analyserContext.createMediaStreamSource(acquired).connect(analyser);
    analyserContext.resume().catch(() => {});
    const samples = new Uint8Array(analyser.fftSize);
    const poll = () => {
      if (epoch !== state.epoch || state.mode !== 'listening') return;
      analyser.getByteTimeDomainData(samples);
      const rms = Math.sqrt(samples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) / samples.length);
      const now = performance.now();
      if (rms > .025) { heardVoice = true; lastVoice = now; }
      if ((heardVoice && now - lastVoice > 1800) || (!heardVoice && now - began > 12000)) { stopListening(); return; }
      silenceTimer = setTimeout(poll, 100);
    };
    poll();
  } catch { /* Tap-to-stop and recording ceiling still work without the analyser. */ }
}
$('micButton').onclick = () => {
  if (state.mode === 'listening') stopListening();
  else if (['thinking', 'speaking'].includes(state.mode)) stopAction();
  else record();
};
$('finish').onclick = () => {
  cancelPending(); setMode('sleeping'); caption(t('goodbye'));
  if (!celebrated.has('pause')) { celebrated.add('pause'); particles(); }
  const epoch = state.epoch;
  actionTimer = setTimeout(() => {
    if (epoch !== state.epoch) return;
    setMode('wave');
    actionTimer = setTimeout(() => {
      if (epoch !== state.epoch) return;
      setMode('asleep'); $('endScreen').hidden = false;
      $('endTitle').textContent = t('pauseTitle'); $('endCaption').textContent = t('goodbye'); $('wakeButton').focus();
    }, reduced.matches ? 0 : 1200);
  }, reduced.matches ? 0 : 1400);
};
$('wakeButton').onclick = () => { $('endScreen').hidden = true; celebrated.delete('pause'); setMode('idle'); updateBuddy(); $('micButton').focus(); };
addEventListener('pagehide', () => { cancelPending(); clearTimeout(idleTimer); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelPending(); clearTimeout(idleTimer); if (state.mode !== 'asleep') { setMode('idle'); caption(t('takeTime')); } }
  else scheduleIdle();
});
addEventListener('offline', () => { if (!MOCK && ['permission', 'listening', 'thinking'].includes(state.mode)) friendlyError('offline'); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* Captions remain available without offline setup. */ });
restore(); updateLanguage(); scheduleIdle();
$('micButton').disabled = true; $('changeBuddy').disabled = true;
loadBuddies().then(() => { state.ready = true; updateBuddy(); setMode('idle'); $('changeBuddy').disabled = false; })
  .catch(() => { state.ready = false; $('changeBuddy').disabled = false; $('micButton').disabled = false; $('chooserStatus').textContent = 'Buddy pictures need another visit online.'; });
window.__STUDIO_QA__ = { snapshot: () => ({ state: state.mode, buddyState: state.mode, buddy: state.buddy, shiny: state.shiny, catalog: buddyCount(), saving: state.saving, consent: state.consent, requestActive: !!request, recording: !!recorder, mock: MOCK, sound: state.sound, language: state.language, reducedMotion: reduced.matches, answered: state.answered }) };
