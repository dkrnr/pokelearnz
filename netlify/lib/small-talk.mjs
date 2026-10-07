/** Exact whole-utterance matches; mixed personal/distress inputs still go through safety first. */
const normalize=value=>value.normalize('NFKC').toLowerCase().replace(/[’]/g,"'").trim().replace(/[!?.,]+$/g,'').trim().replace(/\s+/g,' ');
export function smallTalk(question,buddy){
 const text=normalize(question),name=buddy.name.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' ');
 const cue=buddy.id===25?'Pika!':buddy.types.includes('fire')?'A warm wave!':buddy.types.includes('water')?'A splash and a wave!':buddy.types.includes('grass')?'A leafy wave!':'Hello!';
 if(/^(?:hi|hello|hey)(?: there| buddy| pikachu)?$/.test(text))return {kind:'greeting',answer:`${cue} What would you like to learn?`};
 if(/^(?:thanks|thank you|thanks a lot|thank you buddy)$/.test(text))return {kind:'small-talk',answer:`${cue} You're welcome. That was a fun little find.`};
 if(/^(?:bye|goodbye|bye bye|see you|good night)$/.test(text))return {kind:'small-talk',answer:`${cue} Bye for now. Rest well.`};
 if(/^(?:what's your name|what is your name|who are you)$/.test(text))return {kind:'small-talk',answer:`I'm ${name}. We can learn, then rest.`};
 if(/^(?:i'm bored|i am bored|im bored)$/.test(text))return {kind:'small-talk',answer:`${cue} Try a little leaf hunt. A quiet pause is fine too.`};
 if(/^(?:how are you|how are you doing)$/.test(text))return {kind:'small-talk',answer:`${cue} I'm a pretend pal. I'm set for a little wonder.`};
 return null;
}
