/** Swappable, same-origin recordings for authored lines only. Never child recordings. */
export const recordings = {};
// Add e.g. 'plants.intro':'/assets/audio/plants-intro.mp3'. See assets/audio/README.md.
export function recordingFor(key) {
  const path=recordings[key];
  return typeof path==='string' && /^\/assets\/audio\/[\w-]+\.(mp3|wav|ogg)$/.test(path) ? path : undefined;
}
