import {safeOutput} from '../netlify/lib/child-safety.mjs';
import {readAnswer} from '../answer-contract.js';
export function assessLiveResult({body,status,caption,facts}) {
 let validated=false;try{validated=readAnswer(body)===caption&&safeOutput(caption,{greeting:body.source==='authored'&&body.kind==='greeting'});}catch{}
 const gracefulLimit=status===200&&validated&&body.code==='OK'&&body.source!=='ai'&&body.source!=='cache'&&['DAILY_LIMIT','PROVIDER_UNAVAILABLE'].includes(body.lastError);
 return {validated,gracefulLimit,pass:status===200&&validated&&body.code==='OK'&&(gracefulLimit||facts.test(caption))};
}
