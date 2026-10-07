/** Browser recorder integration with a generated silent-output audio stream; providers are fixtures. */
import assert from 'node:assert/strict';
import {validateAudio} from '../netlify/lib/audio.mjs';
import { chromium } from 'playwright';
const base = process.env.POKELEARN_TEST_URL || 'http://127.0.0.1:4178';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width:390, height:844 }, hasTouch:true }), page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('pokelearn_voice_v3', JSON.stringify({ consent:true }));
    window.__tracks = [];
    navigator.mediaDevices.getUserMedia = async () => {
      const audio = new AudioContext(), output = audio.createMediaStreamDestination();
      const tone = audio.createOscillator(), level = audio.createGain();
      // Tone then silence, routed only to MediaStream, never device speakers.
      level.gain.setValueAtTime(.3, audio.currentTime);
      level.gain.setValueAtTime(0, audio.currentTime + 1.4);
      tone.connect(level).connect(output); tone.start(); await audio.resume();
      for (const track of output.stream.getTracks()) {
        const stop = track.stop.bind(track);
        track.stop = () => { stop(); audio.close().catch(() => {}); };
        window.__tracks.push(track);
      }
      return output.stream;
    };
  });
  const calls = [];
  await page.route('**/.netlify/functions/**', async route => {
    calls.push({ path:new URL(route.request().url()).pathname, body:route.request().postData(),bytes:route.request().postDataBuffer(),mime:route.request().headers()['content-type'] });
    const transcribe = route.request().url().endsWith('transcribe');
    await route.fulfill({ contentType:'application/json', body:JSON.stringify(transcribe
      ? { text:'Why do leaves need light?' }
      : {answer:'Leaves use light to make food.',source:'ai',model:'fixture',code:'OK'}) });
  });
  await page.goto(base, { waitUntil:'domcontentloaded' });
  await page.waitForFunction(() => window.__STUDIO_QA__?.snapshot().catalog === 1025);
  assert.equal(calls.length, 0); await page.locator('#micButton').click();
  await page.waitForFunction(() => window.__STUDIO_QA__.snapshot().state === 'listening');
  const began = Date.now();
  await page.waitForFunction(() => window.__STUDIO_QA__.snapshot().state === 'speaking', {}, { timeout:10000 });
  assert.ok(Date.now() - began < 10000, 'RMS silence should finish before the quiet-device ceiling');
  assert.deepEqual(calls.map(c => c.path), ['/.netlify/functions/transcribe', '/.netlify/functions/chat']);
  const upload=await new Response(calls[0].bytes,{headers:{'Content-Type':calls[0].mime}}).formData(),recording=upload.get('file');const inspected=await validateAudio(Buffer.from(await recording.arrayBuffer()),recording.type);assert.ok(inspected.duration>1 && inspected.duration<10);
  assert.match(calls[0].body, /audio\/webm|audio\/mp4|audio\/ogg/);
  assert.equal(JSON.parse(calls[1].body).question, 'Why do leaves need light?');
  assert.equal(await page.evaluate(() => window.__tracks.every(t => t.readyState === 'ended')), true);
  await page.locator('#micButton').click(); calls.length = 0; await page.locator('#micButton').click();
  await page.waitForFunction(() => window.__STUDIO_QA__.snapshot().state === 'listening');
  await page.locator('#changeBuddy').click(); await page.waitForTimeout(1000);
  assert.equal(calls.length, 0);
  assert.equal(await page.evaluate(() => window.__tracks.every(t => t.readyState === 'ended')), true);
  await page.locator('#buddyDialog [data-close]').click();await page.locator('#micButton').click();await page.waitForFunction(()=>window.__STUDIO_QA__.snapshot().state==='listening');await page.locator('#discover-plants').click();await page.locator('#tool-light').waitFor();assert.equal(await page.evaluate(()=>window.__tracks.every(t=>t.readyState==='ended')),true);assert.equal((await page.evaluate(()=>window.__STUDIO_QA__.snapshot())).recording,false);assert.equal(await page.locator('#micLabel').innerText(),'Tap to talk');assert.equal(calls.length,0);
  console.log('PASS browser MediaRecorder, RMS silence auto-end, transcription → answer contracts, track release and cancellation (generated stream, mocked providers)');
} finally { await browser.close(); }
