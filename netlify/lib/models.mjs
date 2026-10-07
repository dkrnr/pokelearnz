import {ApiError} from './common.mjs';
/** Defaults verified against the catalog. Override the ordered list without code changes. */
export const models=Object.freeze(['nvidia/nemotron-3-super-120b-a12b:free','google/gemma-4-31b-it:free','google/gemma-4-26b-a4b-it:free']);
export function getModels(env=process.env){
 const list=(env.OPENROUTER_MODELS||models.join(',')).split(',').map(id=>id.trim());
 if(list.length>5||!list.length||new Set(list).size!==list.length||list.some(id=>!/^[-a-zA-Z0-9_.]+\/[-a-zA-Z0-9_.]+:free$/.test(id)||/(?:guard|safety|classif|moderat|embed|rerank)/i.test(id)))throw new ApiError('ANSWER_MODEL_REQUIRED');
 return list;
}
export const modelTimeoutMs=4000;
export const brainDeadlineMs=14000;
export function getRouting(env=process.env){
 const privacy=env.AI_PRIVACY||'account';
 if(!['account','strict'].includes(privacy))throw new ApiError('RESTING');
 // Account mode inherits existing OpenRouter privacy options; never overwrites them with "allow".
 return {...(privacy==='strict'?{data_collection:'deny',zdr:true}:{}),allow_fallbacks:false,require_parameters:true,max_price:{prompt:0,completion:0}};
}
