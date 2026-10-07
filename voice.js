/** Shared recording bounds and calm local voice styles. Captions never depend on audio. */
export const recordingLimits = Object.freeze({ minMs:700, maxMs:30000, quietMs:6000, silenceMs:1400 });
const styles = {
  normal:[1,.88], fire:[1.12,.94], water:[.95,.84], electric:[1.2,.96], grass:[1.02,.86],
  ice:[1.08,.82], fighting:[.9,.92], poison:[.96,.86], ground:[.88,.84], flying:[1.15,.92],
  psychic:[1.08,.85], bug:[1.18,.9], rock:[.82,.8], ghost:[.9,.82], dragon:[.85,.88],
  dark:[.88,.84], steel:[.92,.86], fairy:[1.22,.9],
};
export function voiceStyle(types=[]){const [pitch,rate]=styles[types[0]]||styles.normal;return {pitch,rate};}
export function silenceDetector(began){
  let lastVoice=began, voicedMs=0, previous=began, noise=.004;
  return (rms,now)=>{
    const elapsed=now-began, delta=Math.min(150,Math.max(0,now-previous));previous=now;
    // Track quiet samples only: a loud start must not become the noise floor.
    if(rms<.015)noise=noise*.95+rms*.05;
    if(rms>Math.max(.012,noise*3)){voicedMs+=delta;lastVoice=now;}
    const heardVoice=voicedMs>=200;
    return {heardVoice,stop:elapsed>=recordingLimits.maxMs||
      (heardVoice&&elapsed>=recordingLimits.minMs&&now-lastVoice>=recordingLimits.silenceMs)||
      (!heardVoice&&elapsed>=recordingLimits.quietMs)};
  };
}
/** NDJSON can split anywhere, including inside a UTF-8 character. Bound incomplete frames. */
export async function readVoiceStream(response,onSentence,signal){
  const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',sentences=[],result;
  function frame(line){
    if(!line)return;const event=JSON.parse(line);
    if(event.type==='error')throw Object.assign(Error('voice stream'),{code:event.code});
    if(event.type==='sentence'){
      if(result||event.index!==sentences.length||sentences.length>=3||typeof event.text!=='string'||event.text.length>180)throw Error('voice stream');
      sentences.push(event.text);onSentence(event.text,event);
    }else if(event.type==='done'){
      if(result||event.answer!==sentences.join(' '))throw Error('voice stream');result=event;
    }else throw Error('voice stream');
  }
  try{
    while(true){if(signal?.aborted)throw Object.assign(Error('cancelled'),{code:'CANCELLED'});
      const {done,value}=await reader.read();pending+=decoder.decode(value,{stream:!done});
      let at;while((at=pending.indexOf('\n'))>=0){frame(pending.slice(0,at));pending=pending.slice(at+1);}
      if(pending.length>2048)throw Error('voice stream');if(done)break;
    }
    if(pending)frame(pending);if(!result)throw Error('incomplete voice stream');return result;
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
