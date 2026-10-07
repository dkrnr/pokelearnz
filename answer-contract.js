/** Shared transport contract. Provider/control text is never a child's answer. */
const normalize=value=>value.normalize('NFKC').replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g,'');
export function isClassifierOutput(value){
 if(typeof value!=='string')return false;
 const text=normalize(value).replace(/[_-]/g,' ');
 return /\b(?:user|assistant|input|output|content|prompt|response)\s+(?:safety|classification|moderation)\b/i.test(text)
  || /\b(?:safety|moderation|classification|guard)\s*(?:result|status|label|score)?\s*[:=]\s*(?:safe|unsafe|allow|deny|pass|fail|true|false|\d)/i.test(text)
  || /^\s*(?:safe|unsafe|allow|deny|pass|fail)[.!\s]*$/i.test(text);
}
export function validAnswer(value){
 if(typeof value!=='string'||!value.trim()||value.length>180||isClassifierOutput(value))return false;
 if(/[^\p{Script=Latin}0-9\s.,!:'’“”\-]/u.test(value)||/[\n\r]/.test(value))return false;
 const sentences=value.trim().split(/(?<=[.!])\s+/);
 return sentences.length<=3&&sentences.every(s=>/[.!]$/.test(s)&&s.split(/\s+/).length<=8);
}
export function readAnswer(body){
 if(!body||!validAnswer(body.answer)||!['ai','authored','fallback','safety','mock'].includes(body.source))throw Object.assign(Error('Invalid answer contract'),{code:'INVALID_ANSWER'});
 return body.answer.trim();
}
