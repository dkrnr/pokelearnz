import { loadBuddies, buddyById, defaultBuddyId, mountBuddy, searchBuddies, buddyImage, typeChips, buddyCount, buddyPersonality, buddyGreeting, spriteHosts, generations, typeMarks, animatedUrl, fitPixel } from './buddy.js';
import { art } from './art.js';
import { createChooser } from './chooser.js';
import { translate } from './locales.js';
import { containsNSFW } from './safety.js';
const $ = id => document.getElementById(id);
const MOCK = new URL(location.href).searchParams.get('mock') === '1';
const STORAGE = 'pokelearn_voice_v3';
const state = { buddy: defaultBuddyId, shiny: false, moving:true, recent: [defaultBuddyId], generation: 'all', type: '', mode: 'idle', sound: false, answered: false, language: 'en', consent: false, saving: false, epoch: 0, ready: false };
const celebrated = new Set();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let recorder, stream, analyserContext, silenceTimer, autoStopTimer, actionTimer, speechTimer, request, idleTimer, trickTimer, audio, activeUtterance;
let setupUnlocked = false, dialogTrigger, muteChosen = false, gateExpected, currentAudioSrc, activityPlayer, activityLoading;
const t = key => translate(key, state.language);
function restore() {
  try {
    for(const key of Object.keys(localStorage))if(/^pokelearn|^pokeLearn/.test(key)&&key!==STORAGE)localStorage.removeItem(key);
    const saved = JSON.parse(localStorage.getItem(STORAGE) || '{}');
    state.consent = saved.consent === true;
    state.saving = saved.saving === true;
    if (['en', 'si', 'ta'].includes(saved.language)) state.language = saved.language;
    if (state.saving) {
      if (Number.isInteger(saved.buddy) && saved.buddy >= 1 && saved.buddy <= 1025) state.buddy = saved.buddy;
      state.shiny = saved.shiny === true; state.moving = saved.moving !== false;
      if (Array.isArray(saved.recent)) state.recent = saved.recent.filter(id => Number.isInteger(id) && id >= 1 && id <= 1025).slice(0, 6);
    }
  } catch { /* A blocked storage API keeps the visit temporary. */ }
}
function save() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify({ consent: state.consent, saving: state.saving, language: state.language,
      ...(state.saving ? { buddy: state.buddy, shiny: state.shiny, moving:state.moving, recent: state.recent } : {}) }));
    $('storageStatus').textContent = state.saving ? 'Buddy choices are remembered on this device.' : 'Buddy choices stay temporary.';
    return true;
  } catch {
    $('storageStatus').textContent = 'Device saving is unavailable. This visit stays temporary.';
    return false;
  }
}
function caption(text, speaker = true) {
  currentAudioSrc=undefined;
  $('captionSpeaker').textContent = speaker ? `${buddyById(state.buddy).name} ${t('says')}` : t('littleNote');
  const paragraph=$('captionText');paragraph.textContent=text;paragraph.style.fontSize='';paragraph.scrollTop=0;
  let size=parseFloat(getComputedStyle(paragraph).fontSize);
  while(paragraph.scrollHeight>paragraph.clientHeight && size>15){size=Math.max(15,size-.5);paragraph.style.fontSize=size+'px';}
}
function setMode(mode) {
  state.mode = mode;if(mode!=='error')delete $('main').dataset.errorState;
  $('main').dataset.state = mode;
  $('buddyStage').dataset.state = mode;
  $('thinkingBubble').hidden = mode !== 'thinking';
  $('micButton').setAttribute('aria-pressed', String(mode === 'listening'));
  $('micButton').setAttribute('aria-busy', String(mode === 'thinking'));
  const activityOpen=$('activityDialog').open;
  $('micLabel').textContent = t(activityOpen?'talk':mode === 'listening' ? 'stopTalking' : ['thinking', 'speaking'].includes(mode) ? 'stop' : 'talk');
  $('micButton').disabled = activityOpen || ['sleeping', 'wave', 'asleep', 'permission'].includes(mode);
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
  clearTimeout(actionTimer); clearTimeout(speechTimer); clearTimeout(trickTimer);
  delete $('buddyTap').dataset.trick;
  request?.abort(); request = null;
  closeMic();
  audio?.pause(); audio = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  activeUtterance = null;
}
function stopAction() {
  cancelPending(); setMode('idle'); caption(t('takeTime'));
}
function friendlyError(key = 'tryTyping',errorState='type-instead') {
  cancelPending(); setMode('error');$('main').dataset.errorState=errorState;caption(t(key));
}
function updateBuddy(greet = true) {
  const buddy = mountBuddy($('buddyCharacter'), state.buddy, state.shiny, state.moving && !reduced.matches && !document.hidden && !document.querySelector('dialog[open]') && state.mode!=='asleep');
  $('movingToggle').setAttribute('aria-pressed',String(state.moving));
  $('movingToggle').lastElementChild.textContent=t(state.moving?'moving':'artwork');
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
  for(const prop of $('sceneProps').children)prop.lastElementChild.textContent=t(prop.dataset.word);
  setMode(state.mode); updateBuddy();
}
function openDialog(id) {
  cancelPending(); setMode('idle');
  dialogTrigger = document.activeElement;
  $('main').dataset.paused = 'true'; clearTimeout(idleTimer);
  $(id).showModal(); updateBuddy(false); setMode('idle');
}
for (const dialog of document.querySelectorAll('dialog')) {
  const stopActivity=()=>{if(dialog.id==='activityDialog'){cancelPending();setMode('idle');}};
  dialog.querySelector('[data-close]').onclick = () => {stopActivity();dialog.close();};
  dialog.addEventListener('cancel',stopActivity);
  dialog.addEventListener('close', () => { $('main').dataset.paused = 'false'; dialogTrigger?.focus(); updateBuddy(false); scheduleIdle(); });
}
function randomGate() {
  const numbers = crypto.getRandomValues(new Uint32Array(3));
  const first = 12 + numbers[0] % 18, second = 3 + numbers[1] % 7, extra = 11 + numbers[2] % 19;
  gateExpected = first * second + extra;
  $('gateQuestion').textContent = `Grown-up check: (${first} × ${second}) + ${extra} = ?`;
  $('gateAnswer').value = ''; $('gateStatus').textContent = '';
}
function openGrownups() {
  if (!setupUnlocked) randomGate();
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
  if (Number($('gateAnswer').value) !== gateExpected || !$('gateAnswer').value.trim()) { $('gateStatus').textContent = 'Try that sum again.'; return; }
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
  try { for(const key of Object.keys(localStorage))if(/^pokelearn|^pokeLearn/.test(key))localStorage.removeItem(key); } catch { /* blocked storage */ }
  state.consent = false; state.saving = false; state.recent = [state.buddy]; setupUnlocked = false;
  $('onlineConsent').checked = false; $('saveBuddies').checked = false;
  $('setupGate').hidden = false; $('setupSettings').hidden = true; randomGate();
  $('storageStatus').textContent = 'Saved choices and permission cleared. Clearing sprite cache…';
  if ('caches' in window) await Promise.all(['pokelearn-sprites-v3','pokelearn-sprites-v4-bytes'].map(name=>caches.delete(name))).catch(() => {});
  $('storageStatus').textContent = 'Saved choices, permission and cached sprites cleared.';
};
$('language').onchange = e => { state.language = e.target.value; save(); updateLanguage(); };
reduced.addEventListener('change', () => { if(reduced.matches)document.querySelectorAll('.particle').forEach(node=>node.remove());updateBuddy(false); scheduleIdle(); });
function selectBuddy(id) {
  cancelPending(); state.buddy = id; state.answered = false;
  state.recent = [id, ...state.recent.filter(value => value !== id)].slice(0, 6);
  setMode('idle'); updateBuddy(); if (state.saving) save();
  $('buddyDialog').close();
}
let activePreview;
$('movingToggle').onclick=()=>{state.moving=!state.moving;updateBuddy(false);if(state.saving)save();};
new ResizeObserver(()=>{const img=$('buddyCharacter').querySelector('[data-kind=pixel]');if(img)fitPixel(img);}).observe($('buddyCharacter'));
function buddyCell(id, recent = false) {
  const buddy = buddyById(id), button = document.createElement('button');
  button.className = recent ? 'recent-buddy' : 'buddy-cell';
  button.setAttribute('aria-label', `${buddy.name}, ${buddy.types.join(' and ')}, number ${id}${state.shiny ? ', shiny' : ''}`);
  button.setAttribute('aria-pressed', String(id === state.buddy));
  if (!recent) {
    const number = document.createElement('span'); number.className = 'buddy-number'; number.textContent = `#${String(id).padStart(3, '0')}`; button.append(number);
  }
  const img = buddyImage(id, { shiny: state.shiny, thumbnail: true }); img.setAttribute('aria-hidden', 'true');
  const frame = document.createElement('span'); frame.className = 'sprite-frame loading-sprite'; frame.append(img);
  img.loading='eager'; // Virtual overscan rows preload just beyond the viewport.
  const placeholder=document.createElement('span');placeholder.className='sprite-placeholder';placeholder.setAttribute('aria-hidden','true');frame.prepend(placeholder);
  const name = document.createElement('span'); name.className = 'buddy-cell-name'; name.textContent = buddy.name;
  button.append(frame, name); if (!recent) button.append(typeChips(buddy.types));
  const staticSrc=img.src; let hoverEpoch=0;
  const stopPreview=()=>{hoverEpoch++;if(activePreview===stopPreview)activePreview=null;img.src=staticSrc;button.classList.remove('previewing');};
  const startPreview=()=>{if(reduced.matches)return;activePreview?.();activePreview=stopPreview;const animation=animatedUrl(id,state.shiny);button.classList.add('previewing');if(animation)img.src=animation;const epoch=++hoverEpoch;setTimeout(()=>{if(epoch===hoverEpoch)stopPreview();},1500);};
  button.onpointerenter=startPreview;button.onpointerdown=startPreview;button.onpointerleave=stopPreview;button.onpointercancel=stopPreview;
  button.onclick = () => {stopPreview();selectBuddy(id);}; return button;
}
const chooser = createChooser($('buddyViewport'), $('buddyGrid'), id => buddyCell(id));
function renderChooser() {
  const results = searchBuddies($('buddySearch').value, {generation:state.generation, type:state.type});
  $('shinyToggle').setAttribute('aria-pressed', String(state.shiny));
  $('shinyToggle').lastElementChild.textContent = state.shiny ? t('shinyOn') : t('shinyOff');
  $('recentBuddies').replaceChildren(...state.recent.map(id => buddyCell(id, true)));
  $('chooserStatus').textContent = results.length ? `${results.length.toLocaleString()} ${t('buddiesAvailable')}` : t('noBuddies');
  $('surpriseBuddy').disabled = !results.length;
  for (const button of $('generationTabs').children) button.setAttribute('aria-pressed', String(button.dataset.generation === state.generation));
  activePreview?.();
  for(const button of $('typeFilters').children)button.setAttribute('aria-pressed',String(button.dataset.type===state.type));
  chooser.setItems(results);
}
for (const generation of [{id:'all', label:'All'}, ...generations]) {
  const button = document.createElement('button'); button.className = 'generation-tab'; button.dataset.generation = generation.id;
  const icon = document.createElement('span'); icon.setAttribute('aria-hidden', 'true'); icon.textContent = generation.id === 'all' ? '◉' : generation.id;
  const label = document.createElement('span'); label.textContent = generation.label; button.append(icon,label);
  button.onclick = () => { state.generation = generation.id; renderChooser(); };
  $('generationTabs').append(button);
}
for(const [type,icon] of [['','◉'],...Object.entries(typeMarks)]){
  const button=document.createElement('button');button.className=`type-filter-chip type-${type||'normal'}`;button.dataset.type=type;button.setAttribute('aria-pressed',String(!type));
  const mark=document.createElement('span');mark.setAttribute('aria-hidden','true');mark.textContent=icon;const word=document.createElement('span');word.textContent=type||'All types';button.append(mark,word);
  button.onclick=()=>{state.type=type;renderChooser();};$('typeFilters').append(button);
}
$('changeBuddy').onclick = () => { openDialog('buddyDialog'); $('buddySearch').value = ''; renderChooser(); };
$('buddySearch').oninput = renderChooser;
$('shinyToggle').onclick = () => { state.shiny = !state.shiny; renderChooser(); updateBuddy(false); if (state.saving) save(); };
$('surpriseBuddy').onclick = () => {
  const choices = searchBuddies($('buddySearch').value, {generation:state.generation, type:state.type});
  if (choices.length) selectBuddy(choices[Math.floor(Math.random() * choices.length)].id);
};
// Scene props are physical discoveries, not a lesson menu.
for(const [id,key] of [['plants','plantProp'],['homes','fishProp'],['numbers','blocksProp'],['shapes','shapesProp'],['sounds','beeProp'],['story','storyProp']]) {
  const prop=document.createElement('button');prop.id='discover-'+id;prop.className='scene-prop prop-'+id;prop.dataset.word=key;
  const picture=document.createElement('span');picture.className='prop-art';picture.innerHTML=art(id);
  const label=document.createElement('span');label.textContent=t(key);prop.append(picture,label);$('sceneProps').append(prop);
  prop.onclick=async()=>{
    openDialog('activityDialog'); $('activityCaption').textContent=t('takeTime');
    $('activityBuddyName').textContent=buddyById(state.buddy).name+' '+t('says');
    const hero=$('buddyCharacter img'),portrait=$('activityBuddy');
    portrait.style.visibility=hero?'visible':'hidden';portrait.onerror=()=>{portrait.style.visibility='hidden';};
    if(hero)portrait.src=hero.src;else portrait.removeAttribute('src');
    const epoch=state.epoch;
    try {
      activityLoading ||= import('./activity-player.js');
      const {createActivityPlayer}=await activityLoading;
      if(epoch!==state.epoch || !$('activityDialog').open)return;
      activityPlayer ||= createActivityPlayer({
        say:(text,src)=>{cancelPending();caption(text);currentAudioSrc=src;speak(text,{audioSrc:src});},
        celebrate:id=>{if(!celebrated.has(id)){celebrated.add(id);$('activityDialog').dataset.celebration=id;particles($('activityParticles'));}},
        finish:()=>$('finish').click(), sound:()=>state.sound, toggleSound:()=>$('readAloud').click(), word:t,
      });
      activityPlayer.open(id);
    } catch {$('activityCaption').textContent=t('offline');}
  };
}
$('keyboardButton').onclick = () => { openDialog('keyboardDialog'); $('questionInput').focus(); };
$('questionForm').onsubmit = e => {
  e.preventDefault(); const text = $('questionInput').value.trim();
  if (text.length < 2) { $('questionInput').focus(); return; }
  $('keyboardDialog').close(); $('questionInput').value = ''; askQuestion(text);
};
function particles(root = $('particles'),mark='♡') {
  if (reduced.matches) return;
  root.replaceChildren();
  for (let i = 0; i < 7; i++) {
    const p = document.createElement('span'); p.className = 'particle'; p.textContent = i % 2 ? '✦' : mark;
    p.style.setProperty('--x', `${Math.cos(i * .9) * 150}px`); p.style.setProperty('--y', `${Math.sin(i * .9) * 120 - 40}px`);
    root.append(p); p.onanimationend = () => p.remove();
  }
}
function trick(kind) {
  clearTimeout(trickTimer); const target = $('buddyTap'); delete target.dataset.trick;
  // Restart the finite reaction even for a second tap of the same kind.
  target.getAnimations().forEach(animation=>animation.cancel());
  requestAnimationFrame(()=>{target.dataset.trick=kind;});
  trickTimer=setTimeout(() => { if (target.dataset.trick === kind) delete target.dataset.trick; }, 1500);
}
const reactions=[['tap-hop','♡','tapHello'],['giggle','♫','tapGiggle'],['peek','◉','tapPeek'],['spin','✧','tapSpin'],['wiggle','❀','tapWiggle'],['stretch','☀','tapStretch']];
let lastReaction=-1;
$('buddyTap').onclick=()=>{
  if(!['idle','error'].includes(state.mode))return;
  const offset=1+Math.floor(Math.random()*(reactions.length-1));lastReaction=(lastReaction+offset)%reactions.length;
  const [animation,mark,line]=reactions[lastReaction];trick(animation);particles(undefined,mark);caption(t(line));
  if(reduced.matches)$('tapWord').textContent=t(line);
};
function scheduleIdle() {
  clearTimeout(idleTimer);
  if (document.hidden || reduced.matches || state.mode==='asleep') return;
  idleTimer = setTimeout(() => {
    if (state.mode === 'idle' && !$('buddyTap').dataset.trick && !document.querySelector('dialog[open]')) trick(['blink', 'bob', 'breathe', 'tilt', 'yawn'][Math.floor(Math.random() * 3)]);
    scheduleIdle();
  }, 6000 + Math.random() * 8000);
}
/** Authored lines may supply a local prerecorded asset; browser speech is the fallback. */
async function speak(text, { audioSrc = currentAudioSrc } = {}) {
  const epoch = state.epoch; let fellBack=false;
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
    if (epoch !== state.epoch || fellBack) return; fellBack=true;
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
  if (state.sound && ['idle', 'error', 'speaking'].includes(state.mode)) {cancelPending();speak($('captionText').textContent);}
  else if (!state.sound) {
    clearTimeout(speechTimer); audio?.pause();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (state.mode === 'speaking') setMode('idle');
  }
};
function boundedAnswer(value) {
  if (typeof value !== 'string' || !value.trim() || containsNSFW(value)) throw Error('answer');
  if (/streak|daily goal|star counters?|point counters?|collect them all|come back tomorrow|don['’]t leave|do not leave|miss(?:ed|ing) out|you lost|hurry|countdown|time(?: is)? running out|earn.*points|lonely|abandon|ask me another|what else|follow.up|keep chatting|turn on notifications/i.test(value)) throw Error('answer');
  const sentences = value.replace(/[*#]/g, '').split(/(?<=[.!?])\s+/).filter(s => !s.includes('?')).slice(0, 3);
  if (!sentences.length || sentences.some(s => s.trim().split(/\s+/).length > 8)) throw Error('answer');
  const answer=sentences.join(' ').trim();
  if(answer.length>180)throw Error('answer');
  return answer;
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
  const timeout=setTimeout(()=>controller.abort(),path==='chat'?55000:25000);
  try {
    const response = await fetch(`/.netlify/functions/${path}`, { method: 'POST', headers:{'X-PokeLearn-Consent':'1',...(payload instanceof FormData?{}:{'Content-Type':'application/json'})}, body: payload instanceof FormData ? payload : JSON.stringify(payload), signal: controller.signal, cache: 'no-store' });
    let result;try{result=await response.json();}catch{throw Object.assign(Error('provider'),{code:response.status===429?'RATE_LIMITED':'RESTING'});}
    if(!response.ok || ['RESTING','OFFLINE','RATE_LIMITED','TYPE_INSTEAD'].includes(result.code))throw Object.assign(Error('provider'),{code:result.code||'RESTING'});return result;
  } finally { clearTimeout(timeout); }
}
function showProviderState(error,voice=false){
  const states={OFFLINE:['offline','offline'],RATE_LIMITED:['rateLimited','rate-limited'],TYPE_INSTEAD:['tryTyping','type-instead'],PRIVATE_INPUT:['trustedAdult','resting'],CONSENT_REQUIRED:['answerRest','resting']};
  const [line,mode]=states[error?.code]||[voice?'tryTyping':'answerRest',voice?'type-instead':'resting'];friendlyError(line,mode);
}
async function askQuestion(text) {
  if (!permitted()) return;
  cancelPending(); state.answered = false;
  if (MOCK && containsNSFW(text)) { friendlyError('trustedAdult'); return; }
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
      const result=await post('chat',{question:text,buddyId:state.buddy},controller);
      answer = boundedAnswer(result?.choices?.[0]?.message?.content);
    }
    if (epoch !== state.epoch || state.answered) return;
    state.answered = true; caption(answer); request = null; speak(answer);
  } catch(error) {
    if(epoch===state.epoch)showProviderState(error);
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
      if (blob.size > 2 * 1024 * 1024) { friendlyError(); return; }
      form.append('file', blob, blob.type.includes('mp4')?'recording.m4a':blob.type.includes('ogg')?'recording.ogg':'recording.webm');
      form.append('model', 'valsea-transcribe');
      form.append('language', { en: 'english', si: 'sinhala', ta: 'tamil' }[state.language]);
      request = new AbortController();
      try {
        const result = await post('transcribe', form, request);
        if (epoch !== state.epoch) return;
        if(result.answer){state.answered=true;request=null;caption(boundedAnswer(result.answer));speak($('captionText').textContent);return;}
        if (typeof result.text !== 'string' || result.text.trim().length < 2) throw Error('empty');
        request = null; askQuestion(result.text);
      } catch(error) {if(epoch===state.epoch)showProviderState(error,true);}
    };
    currentRecorder.start(); setMode('listening'); caption(t('listening'));
    monitorSilence(acquired, epoch);
    autoStopTimer = setTimeout(stopListening, 30000);
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
      setMode('asleep'); updateBuddy(false);$('sleepingBuddy').replaceChildren(buddyImage(state.buddy,{shiny:state.shiny,lazy:false})); $('endScreen').hidden = false;
      for(const node of document.querySelectorAll('#main > header,#main > nav,.buddy-label,.buddy-space,.voice-dock')){node.inert=true;node.hidden=true;}document.querySelector('footer').hidden=true;
      $('endTitle').textContent = t('pauseTitle'); $('endCaption').textContent = t('goodbye'); $('wakeButton').focus();
    }, reduced.matches ? 0 : 1200);
  }, reduced.matches ? 0 : 1400);
};
$('wakeButton').onclick = () => { for(const node of document.querySelectorAll('#main > header,#main > nav,.buddy-label,.buddy-space,.voice-dock')){node.inert=false;node.hidden=false;}document.querySelector('footer').hidden=false; $('endScreen').hidden = true; celebrated.delete('pause'); setMode('idle'); updateBuddy();scheduleIdle(); $('micButton').focus(); };
addEventListener('pagehide', () => { cancelPending(); clearTimeout(idleTimer); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelPending(); clearTimeout(idleTimer);updateBuddy(false); if (state.mode !== 'asleep') { setMode('idle'); caption(t('takeTime')); } }
  else {updateBuddy(false);scheduleIdle();}
});
addEventListener('offline', () => { if (!MOCK && ['permission', 'listening', 'thinking'].includes(state.mode)) friendlyError('offline'); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* Captions remain available without offline setup. */ });
restore(); updateLanguage(); scheduleIdle();
$('micButton').disabled = true; $('changeBuddy').disabled = true;
loadBuddies().then(() => { state.ready = true; updateBuddy(); setMode('idle'); $('changeBuddy').disabled = false; })
  .catch(() => { state.ready = false; $('changeBuddy').disabled = false; $('micButton').disabled = false; $('chooserStatus').textContent = 'Buddy pictures need another visit online.'; });
window.__STUDIO_QA__ = { snapshot: () => ({ state: state.mode, buddyState: state.mode, buddy: state.buddy, shiny: state.shiny, moving:state.moving, reaction:lastReaction, catalog: buddyCount(), saving: state.saving, consent: state.consent, requestActive: !!request, recording: !!recorder, mock: MOCK, sound: state.sound, language: state.language, reducedMotion: reduced.matches, answered: state.answered, chooser: chooser.snapshot(), activity: activityPlayer?.snapshot(), celebrations:[...celebrated] }) };
