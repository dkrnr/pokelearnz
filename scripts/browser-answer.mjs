import {readVoiceStream} from '../voice.js';
/** Playwright responses support JSON fixtures and the browser's checked sentence stream. */
export async function readBrowserAnswer(response){
 if(response.headers()['content-type']?.includes('application/x-ndjson'))return readVoiceStream(new Response(await response.body()),()=>{});
 return response.json();
}
