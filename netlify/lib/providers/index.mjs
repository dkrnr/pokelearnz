import {createOpenRouter} from './openrouter.mjs';
import {ApiError} from '../common.mjs';
/** Register a new adapter here; chat, safety, quotas, retries and UI need no changes. */
export function createProvider(options={}){
 const name=(options.env||process.env).AI_PROVIDER||'openrouter';
 if(name==='openrouter')return createOpenRouter(options);
 throw new ApiError('RESTING');
}
