/** Bounded, synthetic English TTS benchmark. Never record people or log credentials. */
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createTranscribe} from '../netlify/functions/transcribe.mjs';
import {validateAudio} from '../netlify/lib/audio.mjs';
import {wordError} from './voice-score.mjs';
const run=promisify(execFile);
if(process.env.CI||!process.env.VALSEA_KEY){console.log('SKIP live voice benchmark: CI or no VALSEA_KEY. Synthetic/offline tests still run.');process.exit(0);}
const tts=process.env.VOICE_TTS||'espeak-ng';
try{await run(tts,['--version']);await run('ffmpeg',['-version']);}catch{console.log('SKIP live voice benchmark: espeak-ng and ffmpeg are required (VOICE_TTS can select a local espeak-ng binary).');process.exit(0);}
const questions=[
 'Why is the sky blue?', 'How do plants grow?', 'Why does ice float?', 'What do axolotls eat?',
 'Where does rain come from?', 'Why is the moon bright?', 'How do bees make honey?', 'Why are leaves green?',
 'Can fish sleep?', 'Why do stars twinkle?', 'How do birds fly?', 'What makes a rainbow?',
 'Why do I get hiccups?', 'How does a magnet work?', 'Why is the sea salty?', 'What do worms do?',
 'Why do cats purr?', 'How many legs does a spider have?', 'Why do we have shadows?', 'Can a seed grow in the dark?',
];
let attempts=0;const handler=createTranscribe({reserve:async()=>{if(++attempts>80)throw Error('benchmark cap');}});
const dir=await mkdtemp(join(tmpdir(),'pokelearnz-voice-')),results=[];
const quantile=(rows,key,p)=>{const values=rows.map(r=>r[key]).filter(Number.isFinite).sort((a,b)=>a-b);return values.length?values[Math.ceil(values.length*p)-1]:null;};
const began=new Date().toISOString();let engine='espeak-ng';
try{
 engine=(await run(tts,['--version'])).stdout.split('\n')[0].replace(/Data at:.*/,'').trim();
 for(const [index,question]of questions.entries()){
  const wav=join(dir,`${index}.wav`),variant=index%2?'en-us+f3':'en-us';
  await run(tts,['-v',variant,'-s',String(index%2?155:165),'-p',String(index%2?65:55),'-w',wav,question]);
  for(const [format,codec]of [['webm','libopus'],['mp4','aac']]){
   const file=join(dir,`${index}.${format}`),mime=`audio/${format}`;
   await run('ffmpeg',['-loglevel','error','-y','-i',wav,'-af','apad=pad_dur=0.3','-c:a',codec,'-ar','48000',file]);
   const buffer=await readFile(file),audio=await validateAudio(buffer,mime),form=new FormData();
   form.append('file',new Blob([buffer],{type:mime}),`synthetic.${format}`);form.append('model','valsea-transcribe');form.append('language','english');
   const started=performance.now(),before=attempts;
   let status,body;try{
    const response=await handler(new Request('http://localhost/api/transcribe',{method:'POST',headers:{Origin:'http://localhost','X-PokeLearn-Consent':'1'},body:form}));status=response.status;body=await response.json();
   }catch{status=0;body={code:'BENCHMARK_FAILED'};}
   const row={question,format,ttsVoice:variant,durationMs:Math.round(audio.duration*1000),latencyMs:Math.round(performance.now()-started),status,code:body.code,attempts:attempts-before,transcript:body.text||null,...wordError(question,body.text||'')};
   results.push(row);console.log(JSON.stringify({question:index+1,format,status,code:row.code,wer:row.wer,latencyMs:row.latencyMs,attempts:row.attempts}));
  }
 }
 const summaries=['webm','mp4'].map(format=>{
  const rows=results.filter(r=>r.format===format),errors=rows.reduce((n,r)=>n+r.errors,0),words=rows.reduce((n,r)=>n+r.words,0);
  return {format,samples:rows.length,ok:rows.filter(r=>r.code==='OK').length,exact:rows.filter(r=>r.exact).length,wordErrorRate:errors/words,wordAccuracy:Math.max(0,1-errors/words),medianLatencyMs:quantile(rows,'latencyMs',.5),p95LatencyMs:quantile(rows,'latencyMs',.95)};
 });
 const report={checkedAt:began,synthetic:true,notice:"Synthetic local TTS audio is not real children's speech. This measures English espeak-ng recognition only, not child/accent/noise/device accuracy.",engine,uniqueQuestions:20,recordings:40,providerAttempts:attempts,scope:'Real Valsea via production transcription handler; in-process benchmark cap replaces hosted quotas. No deployed requests or settings changes.',summaries,results};
 await writeFile(process.env.VOICE_REPORT||'docs/redesign/STAGE-8-VOICE.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({summaries,providerAttempts:attempts}));
 if(results.some(r=>r.code!=='OK'))process.exitCode=1;
}finally{await rm(dir,{recursive:true,force:true});}
