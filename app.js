import { activities, activityById, plantTools } from './activities.js';
import { art } from './art.js';
import { buddies, buddyById, mountBuddy } from './buddy.js';
import { languages } from './locales.js';
import { containsNSFW } from './safety.js';
const $ = id => document.getElementById(id);
const STORAGE_KEY = 'pokelearn_camp_v1';
const MOCK = ['localhost','127.0.0.1','[::1]'].includes(location.hostname) && new URL(location.href).searchParams.get('mock') === '1';
const state = {screen:'play',activity:null,step:0,helpers:[],count:0,placed:[],selected:null,ordered:[],solved:false,feedback:'',buddy:'pip',buddyState:'idle',saving:false,completed:false,language:'en',sound:false,onlineAllowed:false,epoch:0,request:null,recording:null,stream:null,permissionPending:false,answered:false};
const celebrated = new Set();
let speechText = '', audioContext, workerRegistration, installPrompt, refreshRequested=false, requestTimer;
function el(tag, cls, text) { const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text; return n; }
function btn(icon,label,handler,cls='',id) {
  const b=el('button',cls); b.type='button'; if(id)b.id=id;
  const i=el('span','',icon); i.setAttribute('aria-hidden','true'); b.append(i,el('span','',label)); b.addEventListener('click',handler); return b;
}
function pic(icon, label) { const n=el('div','work-picture'); const i=el('div','big-picture',icon); i.setAttribute('aria-hidden','true'); n.append(i,el('p','picture-name',label)); return n; }
function picture(id) { const n=el('div','work-picture'); n.innerHTML=art(id); return n; }
function mood(value) {
  state.buddyState=value; $('buddyStage').dataset.state=value;
  $('buddyMood').textContent=({idle:'is ready!',listening:'is listening.',thinking:'is thinking.',celebrating:'says: you did it!',goodbye:'waves goodbye!',unavailable:'is here with you.'})[value];
}
function updateBuddy() { const b=mountBuddy($('buddyCharacter'),state.buddy); $('buddyName').textContent=b.name; }
function stopSpeech() { if(window.speechSynthesis) speechSynthesis.cancel(); }
function voiceFailure() { $('speechNotice').hidden=false; $('speechStatus').textContent="My reading voice isn't ready. Ask a grown-up."; mood('unavailable'); }
function speak(text) {
  speechText=text; stopSpeech();
  if(!window.speechSynthesis || !window.SpeechSynthesisUtterance) { voiceFailure(); return; }
  try {
  const voice=speechSynthesis.getVoices().find(v=>v.localService && /^en([_-]|$)/i.test(v.lang));
  if(!voice) { voiceFailure(); return; }
  $('speechNotice').hidden=true;
  const utterance=new SpeechSynthesisUtterance(text); utterance.voice=voice; utterance.lang=voice.lang; utterance.rate=.85;
  const epoch=state.epoch;
  utterance.onstart=()=>{if(epoch===state.epoch)mood('listening');};
  utterance.onend=()=>{if(epoch===state.epoch)mood(state.screen==='goodbye'?'goodbye':'idle');};
  utterance.onerror=e=>{if(epoch===state.epoch && !['canceled','interrupted'].includes(e.error))voiceFailure();};
  speechSynthesis.speak(utterance);
  } catch {voiceFailure();}
}
function sound() {
  if(!state.sound)return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    const oscillator=audioContext.createOscillator(), gain=audioContext.createGain();
    oscillator.type='sine'; oscillator.frequency.setValueAtTime(520,audioContext.currentTime); oscillator.frequency.linearRampToValueAtTime(660,audioContext.currentTime+.15);
    gain.gain.setValueAtTime(.035,audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.22);
    oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime+.23);
  } catch { state.sound=false; updateSound(); }
}
function updateSound() { $('soundButton').setAttribute('aria-pressed',String(state.sound)); $('soundButton').lastElementChild.textContent=state.sound?'Sound on':'Sound off'; }
function save() {
  if(!state.saving)return;
  try {localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,consent:true,buddy:{id:state.buddy},shiny:false,completed:state.completed}));}
  catch {state.saving=false; storageStatus('This browser cannot save. Activities still work.');}
}
function restore() {
  try { const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    // Migrate only an explicitly consented record; validate through the local module.
    if(data?.version===1 && data.consent===true) {state.saving=true;state.buddy=buddyById(data.buddy?.id).id;state.completed=data.completed===true;}
    for(const key of Object.keys(localStorage))if((/^pokelearn|^pokeLearn/.test(key))&&key!==STORAGE_KEY)localStorage.removeItem(key);
  } catch { /* Optional storage never blocks learning. */ }
}
function storageStatus(message) { $('storageStatus').textContent=message || (state.saving?'Saving is on. Only buddy choice and completion are saved.':'Saving is off. This visit stays temporary.'); $('saveAccept').disabled=state.saving; }
function withdraw() {
  state.saving=false;let ok=true;
  try {for(const key of Object.keys(localStorage))if(/^pokelearn|^pokeLearn/.test(key))localStorage.removeItem(key);}catch{ok=false;}
  storageStatus(ok?'Saving is off. Previous app data is cleared.':'This browser cannot clear storage. Saving is off.');
}
function releaseMic() {
  const r=state.recording; state.recording=null;
  if(r) {r.onstop=null;r.ondataavailable=null;r.onerror=null;if(r.state!=='inactive')try{r.stop();}catch{}}
  state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;state.permissionPending=false;
}
function cancelPending() { state.epoch++;clearTimeout(requestTimer);state.request?.abort();state.request=null;releaseMic();stopSpeech(); }
function focusHeading() { const h=$('screen').querySelector('h2');if(h){h.tabIndex=-1;h.focus({preventScroll:true});} }
function go(screen) {cancelPending();state.screen=screen;$('speechNotice').hidden=true;render();focusHeading();window.scrollTo({top:0,behavior:'instant'});}
function start(id) {cancelPending();state.activity=activityById(id);resetStep();state.step=0;state.placed=[];state.screen='activity';render();focusHeading();window.scrollTo({top:0,behavior:'instant'});}
function resetStep() {state.helpers=[];state.count=0;state.selected=null;state.ordered=[];state.solved=false;state.feedback='';}
function instructions(text, cls='bench-instruction', extra='') {const n=el('div',cls);n.append(el('p','',text),btn('◖))','Listen',()=>speak(`${text} ${extra}`)));return n;}
function feedback(box) {
  const f=el('div','feedback');const text=state.feedback||'Take your time. Try an idea.';
  const p=el('p','',text);p.id='activityFeedback';p.setAttribute('role','status');
  f.append(p,btn('◖))','Listen',()=>speak(text)));box.append(f);
}
function setFeedback(message,solved=false) {state.feedback=message;state.solved=solved;if(solved)sound();renderActivity();}
function next() {
  if(!state.solved)return;
  const a=state.activity;
  const length=a.type==='sort'?1:(a.steps||a.items).length;
  if(state.step+1>=length){state.completed=true;save();state.screen='recap';render();if(!celebrated.has(a.id)){celebrated.add(a.id);mood('celebrating');sound();}focusHeading();return;}
  const helpers=[...state.helpers];state.step++;resetStep();if(a.type==='build-plant')state.helpers=helpers;renderActivity();focusHeading();
}
function render() {
  document.body.dataset.screen=state.screen;
  $('playNav').setAttribute('aria-current',state.screen==='play'?'page':'false');$('askNav').setAttribute('aria-current',state.screen==='ask'?'page':'false');
  const titles={play:["Let's play and learn!","Pick something. We'll try it together."],activity:['Try it with me!','Little hands can make big discoveries.'],recap:['You did it!','You made a little discovery.'],ask:['What makes you wonder?','Ask with a grown-up nearby.'],goodbye:['Bye for now!','Time for a little real-world wonder.']};
  const [title,message]=titles[state.screen];$('heroTitle').textContent=title;$('heroMessage').textContent=message;
  mood(state.screen==='goodbye'?'goodbye':'idle');
  if(state.screen==='play')renderShelf();else if(state.screen==='activity')renderActivity();else if(state.screen==='recap')renderRecap();else if(state.screen==='ask')renderAsk();else renderGoodbye();
}
function renderShelf() {
  const root=$('screen');root.replaceChildren();const head=el('div','shelf-heading');head.append(el('h2','','Pick a little adventure'),el('p','','No rush. Stop anytime.'));root.append(head);
  const grid=el('div','activity-grid');for(const a of activities){const b=btn(a.icon,a.title,()=>start(a.id),`activity-card ${a.color}`,`discover-${a.id}`);b.replaceChildren();const image=el('div','card-picture');image.innerHTML=art(a.id);const copy=el('div','card-copy');copy.append(el('span','card-subject',a.subject));const title=el('span','card-title');const arrow=el('span','card-arrow','→');arrow.setAttribute('aria-hidden','true');title.append(el('span','',a.title),arrow);copy.append(title,el('span','card-description','Try • touch • discover'));b.append(image,copy);grid.append(b);}root.append(grid,el('p','shelf-note','☀ One little discovery is plenty.'));
}
function renderActivity() {
  const focused=document.activeElement?.id;const a=state.activity, root=$('screen');root.replaceChildren();
  const box=el('section',`bench ${a.color}`);const head=el('div','bench-header'),title=el('div','bench-title');title.append(el('span','subject',`${a.icon} ${a.subject}`),el('h2','',a.title));head.append(title,btn('←','All activities',()=>go('play')));box.append(head);
  const step=a.steps?.[state.step],item=a.items?.[state.step];
  const prompt=step?.prompt || a.prompt;
  const instruction=instructions(prompt, 'bench-instruction', a.observe);box.append(instruction,el('p','observe',a.observe));
  if(a.type==='build-plant') {
    const work=el('div','workbench plant-workbench'),visual=picture('plants');visual.dataset.helpers=state.helpers.join(',');
    const helpers=el('div','helpers');helpers.setAttribute('role','group');helpers.setAttribute('aria-label','Plant helpers');for(const id of state.helpers){const tool=plantTools.find(t=>t.id===id);const span=el('span','',tool.icon);span.setAttribute('role','img');span.setAttribute('aria-label',tool.label);helpers.append(span);}visual.append(helpers);
    const tools=el('div','plant-tools');for(const tool of plantTools){const b=btn(tool.icon,tool.label,()=>{if(tool.id===step.target){state.helpers=[...state.helpers.filter(id=>id!==tool.id),tool.id];setFeedback(step.fact,true);}else setFeedback('Try the helper in the picture.');},'',`tool-${tool.id}`);b.disabled=state.solved;tools.append(b);}work.append(visual,tools);box.append(work);
  } else if(a.type==='build-number') {
    const work=el('div','workbench'),visual=el('div','work-picture');const target=el('p','number-target');target.append(el('span','','Make'),el('strong','',String(step.target)));visual.append(target);
    const blocks=el('div','block-group');blocks.setAttribute('role','img');blocks.setAttribute('aria-label',`${state.count} blocks`);for(let i=0;i<state.count;i++)blocks.append(el('span','block','•'));visual.append(blocks);
    const controls=el('div','number-controls');controls.append(btn('+','Add a block',()=>{if(state.count<8){state.count++;state.feedback='';state.solved=false;renderActivity();}},'','addBlock'),btn('−','Take one away',()=>{if(state.count>0){state.count--;state.solved=false;state.feedback='';renderActivity();}},'','removeBlock'),btn('✓','Check my group',()=>setFeedback(state.count===step.target?'Yes! Each block counts once.':'Touch each block. Count them slowly.',state.count===step.target),'primary','checkGroup'));work.append(visual,controls);box.append(work);
  } else if(a.type==='sort') {
    const layout=el('div','sort-layout'),choices=el('div','animal-choices');a.items.forEach((item,index)=>{if(state.placed.some(p=>p.index===index))return;const b=btn(item.icon,item.label,()=>{state.selected=index;state.feedback=`${item.label}. Tap its home.`;renderActivity();},'',`animal-${index}`);b.firstElementChild.className='choice-icon';b.setAttribute('aria-pressed',String(state.selected===index));choices.append(b);});layout.append(choices);
    const bins=el('div','bins');for(const bin of a.bins){const b=btn(bin.icon,bin.label,()=>{if(state.selected===null){setFeedback('Tap an animal first.');return;}const selected=a.items[state.selected];if(selected.target!==bin.id){setFeedback('Look at this animal. Try another home.');return;}state.placed.push({index:state.selected,bin:bin.id});state.selected=null;setFeedback(`${selected.label} lives here.`,state.placed.length===a.items.length);},'',`bin-${bin.id}`);const animals=el('span','bin-animals',state.placed.filter(p=>p.bin===bin.id).map(p=>a.items[p.index].icon).join(' '));animals.setAttribute('aria-hidden','true');b.append(animals);bins.append(b);}layout.append(bins);box.append(layout);
  } else if(a.type==='match') {
    const work=el('div','workbench'),visual=pic(item.icon,item.label),choices=el('div','choices');for(const choice of a.choices){const b=btn(choice.icon,choice.label,()=>setFeedback(choice.id===item.target?`${item.label} matches ${choice.label}.`:'Look and listen. Try another match.',choice.id===item.target),'',`choice-${choice.id}`);b.firstElementChild.className='choice-icon';b.disabled=state.solved;choices.append(b);}work.append(visual,choices);box.append(work);
  } else if(a.type==='order') {
    const visual=el('div','work-picture story-picture'),slots=el('div','story-slots');for(let i=0;i<3;i++){const slot=el('div','story-slot');const chosen=state.ordered[i];slot.append(el('span','',chosen===undefined?'?':step.items[chosen].icon),el('small','',['First','Next','Last'][i]));slots.append(slot);}visual.append(slots);box.append(visual);
    const choices=el('div','choices story-choices');for(const index of [2,0,1]){const item=step.items[index];const b=btn(item.icon,item.label,()=>{if(index!==state.ordered.length){setFeedback('Think about what happens before this.');return;}state.ordered.push(index);setFeedback(state.ordered.length===3?a.fact:`${item.label}. What happens next?`,state.ordered.length===3);},'',`story-${index}`);b.firstElementChild.className='choice-icon';b.disabled=state.ordered.includes(index);choices.append(b);}box.append(choices);
  }
  feedback(box);const actions=el('div','bench-actions');actions.append(btn('↻','Start this step',()=>{const earlier=a.type==='build-plant'?a.steps.slice(0,state.step).map(s=>s.target):[];resetStep();state.helpers=earlier;if(a.type==='sort')state.placed=[];renderActivity();},'','resetStep'));const continueButton=btn('→','Next',next,'primary','nextStep');continueButton.disabled=!state.solved;actions.append(continueButton);box.append(actions);root.append(box);if(focused){const candidate=$(focused);if(candidate&&!candidate.disabled)candidate.focus({preventScroll:true});else if(state.solved)$('nextStep').focus({preventScroll:true});}
}
function renderRecap() {
  const a=state.activity,root=$('screen');root.replaceChildren();const box=el('section',`bench ${a.color}`);box.append(el('h2','','A little discovery!'));
  const layout=el('div','recap-layout');const illustration=el('div');illustration.innerHTML=art(a.id);const copy=el('div','recap-copy');copy.append(el('p','discovery-fact',a.recap),el('p','recap-note',a.note),btn('◖))','Listen',()=>speak(`${a.recap} ${a.note} ${a.outside}`)));layout.append(illustration,copy);box.append(layout,outside(a.outside));box.append(btn('☀','Done for now',()=>go('goodbye'),'primary','completeActivity'));root.append(box);
}
function outside(text) {const n=el('div','outside');const icon=el('span','outside-icon','☀');icon.setAttribute('aria-hidden','true');n.append(icon,el('p','',text));return n;}
function renderGoodbye() {
  const root=$('screen');root.replaceChildren();const box=el('section','end-card');const icon=el('span','end-icon','🌿');icon.setAttribute('aria-hidden','true');const text=state.activity?.outside || 'Go find a shadow with a grown-up.';box.append(icon,el('h2','','Done for now'),el('p','','You can stop whenever you like.'),outside(text),btn('◖))','Listen',()=>speak(`Done for now. ${text}`)),btn('▦','Back to play',()=>go('play')));root.append(box);
}
function renderAsk() {
  state.answered=false;const root=$('screen');root.replaceChildren();const box=el('section','question-card');box.append(el('h2','','One little question'),el('p','','Keep names and addresses private.'));
  if(MOCK)box.append(el('p','dev-note','Development mock. This answer is a fixture.'));
  if(!state.onlineAllowed&&!MOCK)box.append(instructions('Ask a grown-up to turn this on.'));
  const form=el('form');form.id='questionForm';const label=el('label','','What do you wonder?');label.htmlFor='questionInput';const input=el('textarea');input.id='questionInput';input.maxLength=300;input.placeholder='Why do leaves need light?';form.append(label,input);
  const row=el('div','button-row');const ask=btn('↑','Ask',()=>{} ,'primary','askButton');ask.type='submit';const mic=btn('●','Talk',record,'','micBtn');mic.setAttribute('aria-pressed','false');const stop=btn('■','Stop',()=>{cancelPending();busy(false);status('Stopped. Take your time.');mood('idle');},'','cancelQuestion');stop.hidden=true;row.append(ask,mic,stop);form.append(row);form.addEventListener('submit',e=>{e.preventDefault();if(!state.request&&!state.recording&&!state.permissionPending)askQuestion(input.value);});box.append(form);
  const statusRow=el('div','status-row');const p=el('p','','Questions need internet. Activities work offline.');p.id='questionStatus';p.setAttribute('role','status');statusRow.append(p,btn('◖))','Listen',()=>speak(p.textContent)));box.append(statusRow);
  const retry=btn('↻','Try again',()=>{if(retry.dataset.voice==='true')record();else askQuestion($('questionInput').value);},'','retryQuestion');retry.hidden=true;box.append(retry);
  const answer=el('div','answer-box');answer.id='answer';answer.hidden=true;const text=el('p');text.id='answerText';answer.append(el('h3','','A little explanation'),text,btn('◖))','Listen',()=>speak(text.textContent)),btn('☀','Done for now',()=>go('goodbye'),'primary'));box.append(answer);root.append(box);
}
function status(text,retry=false,voice=false) {if(!$('questionStatus'))return;$('questionStatus').textContent=text;$('retryQuestion').hidden=!retry;$('retryQuestion').dataset.voice=String(voice);}
function busy(value) {if(!$('questionForm'))return;if(!value&&!state.recording){$('micBtn').lastElementChild.textContent='Talk';$('micBtn').setAttribute('aria-pressed','false');}$('askButton').disabled=value;$('micBtn').disabled=value;$('questionInput').disabled=value;$('cancelQuestion').hidden=!value;}
function permitted() {if(MOCK||state.onlineAllowed)return true;status('Ask a grown-up to turn this on.');return false;}
async function post(path,payload,controller) {
  const timeout=setTimeout(()=>controller.abort('timeout'),15000);requestTimer=timeout;
  try{const res=await fetch(`/.netlify/functions/${path}`,{method:'POST',headers:payload instanceof FormData?undefined:{'Content-Type':'application/json'},body:payload instanceof FormData?payload:JSON.stringify(payload),signal:controller.signal});if(!res.ok)throw Error(String(res.status));return await res.json();}finally{clearTimeout(timeout);}
}
const SYSTEM_PROMPT='You are a warm learning helper for children aged 6–9. Use at most four accurate short sentences, each at most eight words. Answer once. Never pressure children to continue. Do not ask follow-up questions or suggest another chat. Never use streaks, daily goals, reward counters, guilt, countdowns, notifications or return reminders. Never request names, addresses or personal information. Never imply loneliness or dependency. Harmful or sensitive questions need a trusted grown-up. Distinguish fiction from real science. Reply in English. Use no markdown.';
function boundedAnswer(answer) {
  if(typeof answer!=='string'||!answer.trim()||containsNSFW(answer))throw Error('unsafe-or-empty');
  if(/streak|daily goal|come back tomorrow|earn.*points|lonely|abandon|ask me another|what else|follow.up/i.test(answer))throw Error('unbounded');
  const sentences=answer.replace(/\*|#/g,'').split(/(?<=[.!?])\s+/).filter(s=>!s.includes('?')).slice(0,4);
  if(!sentences.length)throw Error('empty');
  // Reject overlong model sentences instead of presenting truncated facts.
  if(sentences.some(s=>s.trim().split(/\s+/).length>8))throw Error('reading-level');
  return sentences.join(' ').trim();
}
async function askQuestion(text) {
  if(state.answered||!permitted())return;
  if(text.trim().length<2){status('Type a little question first.');return;}
  if(containsNSFW(text)){status('Ask a trusted grown-up about this.');return;}
  if(!navigator.onLine&&!MOCK){status('Questions need internet. Our activities still work.',true);mood('unavailable');return;}
  cancelPending();const epoch=state.epoch,controller=new AbortController();state.request=controller;busy(true);$('answer').hidden=true;status('Let me think about that.');mood('thinking');
  try {
    const data=MOCK?{choices:[{message:{content:'Leaves use light to make food. Roots take in water.'}}]}:await post('chat',{messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:text.trim()}]},controller);
    if(epoch!==state.epoch)return;
    const answer=boundedAnswer(data?.choices?.[0]?.message?.content);$('answerText').textContent=answer;$('answer').hidden=false;$('questionForm').hidden=true;state.answered=true;status('That is our little explanation.');mood('idle');$('answer').tabIndex=-1;$('answer').focus();
  } catch(error) {
    if(epoch!==state.epoch)return;
    status(/429|402/.test(error.message)?'Questions are taking a break. Activities still work.':"I couldn't get an answer. Activities still work.",true);mood('unavailable');
  } finally {if(epoch===state.epoch){state.request=null;busy(false);}}
}
async function record() {
  if(state.recording){state.recording.stop();return;}
  if(state.request||state.permissionPending||state.answered||!permitted())return;
  if(!navigator.onLine){status('Voice needs internet. You can type instead.',true,true);return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){status("My microphone isn't ready. You can type.",true,true);mood('unavailable');return;}
  cancelPending();const epoch=state.epoch;state.permissionPending=true;busy(true);status('Ask your grown-up about microphone permission.');
  try {
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(epoch!==state.epoch){stream.getTracks().forEach(t=>t.stop());return;}
    state.stream=stream;state.permissionPending=false;
    const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg;codecs=opus'].find(m=>MediaRecorder.isTypeSupported(m));
    const recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);state.recording=recorder;const chunks=[];
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>{if(epoch!==state.epoch)return;cancelPending();busy(false);status("I couldn't hear that. You can type.",true,true);mood('unavailable');};
    recorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());if(epoch!==state.epoch)return;state.recording=null;state.stream=null;
      $('micBtn').lastElementChild.textContent='Talk';$('micBtn').setAttribute('aria-pressed','false');
      if(!chunks.length){busy(false);status("I couldn't hear that. You can type.",true,true);mood('unavailable');return;}
      const controller=new AbortController();state.request=controller;busy(true);mood('thinking');status('Turning your voice into words.');
      const form=new FormData();const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});form.append('file',blob,blob.type.includes('mp4')?'recording.mp4':'recording.webm');form.append('model','valsea-transcribe');form.append('language',({en:'english',si:'sinhala',ta:'tamil'})[state.language]);
      try {const data=await post('transcribe',form,controller);if(epoch!==state.epoch)return;if(typeof data.text!=='string'||data.text.trim().length<2)throw Error('empty');$('questionInput').value=data.text.slice(0,300);status('Check these words. Tap Ask when ready.');mood('idle');}
      catch{if(epoch===state.epoch){status("I couldn't hear that. You can type.",true,true);mood('unavailable');}}
      finally{if(epoch===state.epoch){state.request=null;busy(false);}}
    };
    recorder.start();busy(true);$('micBtn').disabled=false;$('micBtn').lastElementChild.textContent='Stop talking';$('micBtn').setAttribute('aria-pressed','true');status('I am listening. Tap Stop talking.');mood('listening');
  }catch{if(epoch===state.epoch){releaseMic();busy(false);status("My microphone didn't open. You can type.",true,true);mood('unavailable');}}
}
$('playNav').addEventListener('click',()=>go('play'));$('askNav').addEventListener('click',()=>go('ask'));$('finish').addEventListener('click',()=>go('goodbye'));
$('heroListen').addEventListener('click',()=>{const content=$('screen').innerText;speak(`${$('heroTitle').textContent} ${$('heroMessage').textContent} ${content}`);});
$('speechRetry').addEventListener('click',()=>speak(speechText));
$('soundButton').addEventListener('click',()=>{state.sound=!state.sound;updateSound();if(state.sound)sound();else audioContext?.suspend().catch(()=>{});});
let dialogTrigger;
$('grownupOpen').addEventListener('click',()=>{cancelPending();if(state.screen==='ask'){busy(false);$('micBtn').lastElementChild.textContent='Talk';$('micBtn').setAttribute('aria-pressed','false');}dialogTrigger=document.activeElement;$('grownupDialog').showModal();storageStatus();});
$('grownupDialog').querySelector('[data-close]').addEventListener('click',()=>$('grownupDialog').close());
$('grownupDialog').addEventListener('close',()=>dialogTrigger?.focus());
$('onlineConsent').addEventListener('change',e=>{state.onlineAllowed=e.target.checked;cancelPending();if(state.screen==='ask')renderAsk();});
$('saveAccept').addEventListener('click',()=>{state.saving=true;save();if(state.saving)storageStatus();});$('saveReject').addEventListener('click',withdraw);$('clearData').addEventListener('click',withdraw);
for(const b of buddies){const button=btn(b.kind==='original'?'🌱':'☺',b.name,()=>{cancelPending();state.buddy=b.id;updateBuddy();save();for(const choice of $('buddyChoices').children)choice.setAttribute('aria-pressed',String(choice.dataset.buddy===state.buddy));});button.dataset.buddy=b.id;button.setAttribute('aria-pressed',String(b.id===state.buddy));$('buddyChoices').append(button);}
$('language').addEventListener('change',e=>{state.language=e.target.value;$('languageNotice').textContent=state.language==='en'?'Lessons and local read-aloud are in English.':'This language is an unreviewed draft. Lessons and local read-aloud stay in English. Only optional voice transcription uses this language.';});
function networkStatus(){$('connectionBanner').hidden=navigator.onLine;}
addEventListener('online',networkStatus);addEventListener('offline',()=>{cancelPending();networkStatus();if(state.screen==='ask'){busy(false);status('Questions need internet. Our activities still work.',true);}});
addEventListener('pagehide',cancelPending);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelPending();audioContext?.suspend().catch(()=>{});if(state.screen==='ask')busy(false);}});
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('nativeInstall').hidden=false;});
$('nativeInstall').addEventListener('click',async()=>{if(!installPrompt)return;await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('nativeInstall').hidden=true;});
addEventListener('appinstalled',()=>{$('installStatus').textContent='App installed.';$('nativeInstall').hidden=true;installPrompt=null;});
$('updateButton').addEventListener('click',()=>{if(state.screen==='activity'||state.request||state.recording||state.permissionPending){$('updateStatus').textContent='Finish or leave this activity before updating.';return;}if(workerRegistration?.waiting){refreshRequested=true;workerRegistration.waiting.postMessage({type:'ACTIVATE_UPDATE'});}});
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').then(reg=>{workerRegistration=reg;const show=()=>{if(reg.waiting&&navigator.serviceWorker.controller)$('updateBanner').hidden=false;};show();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',show));}).catch(()=>{$('connectionBanner').hidden=false;$('connectionBanner').textContent='Offline setup failed. Try loading again online.';});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshRequested)location.reload();});}
restore();updateBuddy();for(const choice of $('buddyChoices').children)choice.setAttribute('aria-pressed',String(choice.dataset.buddy===state.buddy));storageStatus();networkStatus();render();
// Read-only diagnostics for browser regressions. No private questions or recordings.
window.__STUDIO_QA__={snapshot:()=>({state:state.screen,buddyState:state.buddyState,saving:state.saving,completed:state.completed,requestActive:!!state.request,recording:!!state.recording,permissionPending:state.permissionPending,step:state.step,solved:state.solved,count:state.count,placed:state.placed.length,helpers:[...state.helpers],sound:state.sound,mock:MOCK,language:state.language,reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches})};
