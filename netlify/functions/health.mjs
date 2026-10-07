import {reply} from '../lib/common.mjs';
export const config={path:['/api/health','/.netlify/functions/health']};
export default async function(request){if(request.method!=='GET')return reply({code:'METHOD_NOT_ALLOWED'},405);return reply({groq:!!process.env.GROQ_API_KEY,openrouter:!!process.env.OPENROUTER_KEY,valsea:!!process.env.VALSEA_KEY});}
