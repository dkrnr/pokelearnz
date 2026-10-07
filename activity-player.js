/** Finite authored interactions. This module never calls a question/voice provider. */
import { activityById, plantTools } from './activities.js';
import { art } from './art.js';
import { recordingFor } from './authored-audio.js';
const $ = id => document.getElementById(id);
export function createActivityPlayer({say, celebrate, finish, sound, toggleSound, word}) {
  let lesson, step, count, solved, selected, placed, helpers, order, phase, lineKey;
  const workspace = $('activityWorkspace');
  function button(id, icon, label, action) {
    const node = document.createElement('button'); node.id=id; node.className='sticker activity-choice';
    const mark=document.createElement('span'); mark.textContent=icon; mark.setAttribute('aria-hidden','true');
    const text=document.createElement('span'); text.textContent=label; node.append(mark,text); node.onclick=action; return node;
  }
  function line(text, key) {
    lineKey=key; $('activityCaption').textContent=text;
    say(text,recordingFor(key));
  }
  function announce(text,key=lesson.id+'.prompt') { line(text,key); }
  function prompt() { return lesson.steps?.[step]?.prompt || lesson.prompt; }
  function feedback(text) { $('activityFeedback').textContent=text; }
  function success(text) {
    solved=true; feedback(text); $('nextStep').hidden=false; $('nextStep').focus({preventScroll:true});
    announce(text,lesson.id+'.fact.'+step);
  }
  function render(announcePrompt=true) {
    phase='activity'; solved=false; selected=null; count=0; order=[];
    workspace.replaceChildren(); $('activityFeedback').textContent=''; $('activityRecap').hidden=true;
    $('nextStep').hidden=true; $('resetStep').hidden=false;
    delete $('activityFigure').dataset.helpers;
    $('activityFigure').innerHTML=art(lesson.id);
    const controls=document.createElement('div'); controls.className='activity-choices'; workspace.append(controls);
    if (lesson.type==='build-plant') {
      $('activityFigure').dataset.helpers=helpers.join(' ');
      for (const tool of plantTools) controls.append(button('tool-'+tool.id,tool.icon,tool.label,()=>{
        if(solved) return;
        if(tool.id===lesson.steps[step].target) { helpers.push(tool.id); $('activityFigure').dataset.helpers=helpers.join(' '); success(lesson.steps[step].fact); }
        else feedback('Look at what the plant needs.');
      }));
    }
    if (lesson.type==='build-number') {
      const blocks=document.createElement('div'); blocks.id='numberBlocks'; blocks.className='number-blocks'; workspace.prepend(blocks);
      const draw=()=> { blocks.replaceChildren(...Array.from({length:count},()=>{const block=document.createElement('span'); block.textContent='▣'; block.setAttribute('aria-label','one block'); return block;})); $('addBlock').disabled=solved||count>=8; $('removeBlock').disabled=solved||!count; };
      controls.append(button('removeBlock','−','Remove',()=>{count--;draw();}),button('addBlock','+','Add block',()=>{count++;draw();}),button('checkGroup','✓','Check',()=>{
        if(solved) return; if(count===lesson.steps[step].target) success(lesson.fact); else feedback('Touch each block. Count slowly.');
      })); draw();
    }
    if (lesson.type==='sort') {
      const animals=document.createElement('div'); animals.className='animal-choices'; workspace.prepend(animals);
      lesson.items.forEach((item,i)=>{
        if(placed.includes(i)) return;
        const animal=button('animal-'+i,item.icon,item.label,()=>{if(solved)return;selected=i;for(const node of animals.children)node.setAttribute('aria-pressed',String(node.id==='animal-'+i));feedback('Now tap its home.');});
        animal.setAttribute('aria-pressed','false'); animals.append(animal);
      });
      for(const bin of lesson.bins) controls.append(button('bin-'+bin.id,bin.icon,bin.label,()=>{
        if(solved) return;
        if(selected===null) {feedback('Tap an animal first.');return;}
        if(lesson.items[selected].target!==bin.id){feedback('Think about where this animal lives.');return;}
        placed.push(selected); $('animal-'+selected).disabled=true; $('animal-'+selected).setAttribute('aria-pressed','false'); selected=null;
        if(placed.length===lesson.items.length) success(lesson.fact); else feedback('That animal has a home.');
      }));
    }
    if (lesson.type==='match') {
      const item=lesson.items[step], picture=document.createElement('div'); picture.className='activity-picture';
      const icon=document.createElement('span'); icon.textContent=item.icon; icon.setAttribute('aria-hidden','true');
      const label=document.createElement('strong');label.textContent=item.label;picture.append(icon,label);workspace.prepend(picture);
      for(const choice of lesson.choices) controls.append(button('choice-'+choice.id,choice.icon,choice.label,()=>{
        if(solved)return; if(choice.id===item.target)success(lesson.fact);else feedback('Look closely. Try a different match.');
      }));
    }
    if (lesson.type==='order') {
      const sequence=document.createElement('div'); sequence.className='story-sequence';workspace.prepend(sequence);
      for(const i of [2,0,1]){const item=lesson.steps[step].items[i];controls.append(button('story-'+i,item.icon,item.label,()=>{
        if(solved)return;if(i!==order.length){feedback('Think about what happens next.');return;}
        order.push(i);$('story-'+i).disabled=true; const label=document.createElement('span');label.textContent=item.icon+' '+item.label;sequence.append(label);
        if(order.length===3)success(lesson.fact);else feedback('Your story is taking shape.');
      }));}
    }
    if(announcePrompt)announce(prompt(),lesson.id+'.prompt.'+step);
  }
  function recap() {
    phase='recap'; solved=true; workspace.replaceChildren(); $('nextStep').hidden=true; $('resetStep').hidden=true;
    $('activityRecap').hidden=false; $('activityNote').textContent=lesson.note; $('activityOutside').textContent=lesson.outside;
    $('activityFeedback').textContent='A lovely discovery.'; line(lesson.recap,lesson.id+'.recap');
    celebrate(lesson.id); $('completeActivity').focus({preventScroll:true});
  }
  $('nextStep').onclick=()=>{
    if(!solved)return;
    step++;
    const total=lesson.type==='sort'?1:(lesson.steps||lesson.items).length;
    if(step>=total) recap(); else render();
  };
  $('resetStep').onclick=()=>{
    if(lesson.type==='build-plant'&&solved)helpers.pop(); if(lesson.type==='sort')placed=[]; render();
  };
  $('activityRead').onclick=()=>{toggleSound();$('activityRead').setAttribute('aria-pressed',String(sound()));};
  $('completeActivity').onclick=()=>{$('activityDialog').close();finish();};
  return {
    open(id) {
      lesson=activityById(id);step=0;placed=[];helpers=[];phase='intro';
      $('activityParticles').replaceChildren(); delete $('activityDialog').dataset.celebration;
      $('activityTitle').textContent=lesson.title; $('activityRead').setAttribute('aria-pressed',String(sound()));
      $('activityRead').lastElementChild.textContent=word('readAloud'); $('completeActivity').lastElementChild.textContent=word('done');
      render(false); // Intro and first prompt stay together in the visible caption.
      line(lesson.intro+' '+prompt(),lesson.id+'.intro');
    },
    snapshot(){return {id:lesson?.id,phase,step,count,solved,helpers:[...(helpers||[])],placed:[...(placed||[])],lineKey};},
  };
}
