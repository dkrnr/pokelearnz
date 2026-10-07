import {createGroq} from './groq.mjs';
import {createOpenRouter} from './openrouter.mjs';
import {ApiError} from '../common.mjs';
/** Register a new adapter here; chat, safety, quotas, retries and UI need no changes. */
export function createProvider(options={}){
 const name=(options.env||process.env).AI_PROVIDER||'openrouter';
 if(name==='groq')return createGroq(options);
 if(name==='openrouter')return createOpenRouter(options);
 throw new ApiError('RESTING');
}

/** Capacity order is fixed; absent credentials never cause a request. */
export function createProviders(options={}){return [createGroq(options),createOpenRouter(options)].filter(provider=>provider.configured());}
