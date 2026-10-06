/** Explicit zero-price IDs only. Availability is checked by npm run check:models. */
export const models=Object.freeze(['google/gemma-4-31b-it:free','nvidia/nemotron-3-super-120b-a12b:free','google/gemma-4-26b-a4b-it:free']);
export const modelTimeoutMs=8000;
export const brainDeadlineMs=50000;
export const routing=Object.freeze({data_collection:'deny',zdr:true,allow_fallbacks:false,require_parameters:true,max_price:{prompt:0,completion:0}});
