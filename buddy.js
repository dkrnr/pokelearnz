/** Swappable buddy boundary; keep identities, artwork sources and lookup indexes here. */
const BASE = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon';
export const spriteHosts = ['cdn.jsdelivr.net'];
export const buddyAssets = ['/assets/buddies/25-official.webp', '/assets/buddies/25.png', '/assets/buddies/1.png'];
export const defaultBuddyId = 25;
export const defaultHero = '/assets/buddies/25-official.webp';
let catalog = [], index = new Map(), personalitiesPromise;
if (typeof document !== 'undefined') {
  const connection = document.createElement('link');
  connection.rel = 'preconnect'; connection.href = new URL(BASE).origin; connection.crossOrigin = 'anonymous';
  document.head.append(connection);
}
const searchKey = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replaceAll('♀','f').replaceAll('♂','m').replace(/[^a-z0-9]/g,'');
export const formatName = name => name.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
export async function loadBuddies() {
  const response = await fetch('/buddy-catalog.json');
  if (!response.ok) throw Error('catalog');
  catalog = (await response.json()).map(b => ({ ...b, displayName:formatName(b.name), searchName:searchKey(b.name) }));
  index = new Map(catalog.map(b => [b.id, b]));
  return catalog;
}
export function buddyById(id) {
  const item = index.get(Number(id));
  if (item) return { ...item, name:item.displayName };
  return Number(id) === defaultBuddyId ? {id:25, name:'Pikachu', types:['electric']} : {id:Number(id), name:`Buddy ${id}`, types:[]};
}
export const generations = [
  [1,151], [152,251], [252,386], [387,493], [494,649], [650,721], [722,809], [810,905], [906,1025],
].map(([start,end], index) => ({id:String(index+1), start, end, label:`Gen ${index+1}`}));
export function searchBuddies(query, {generation='all', type=''} = {}) {
  const text = searchKey(query), number = /^\d+$/.test(text) ? Number(text) : null;
  const range = generations.find(g => g.id === generation);
  return catalog.filter(b => (!range || (b.id >= range.start && b.id <= range.end)) && (!type || b.types.includes(type)) && (number === null ? b.searchName.includes(text) : b.id === number));
}
export const buddyCount = () => catalog.length;
export async function buddyPersonality(id) {
  personalitiesPromise ||= fetch('/pokemonPersonalities.json').then(r => r.json()).catch(() => ({}));
  const voices = await personalitiesPromise;
  return voices[id] || `You are ${buddyById(id).name}, a gentle learning buddy.`;
}
export const typeMarks = {
  normal:'●', fire:'♨', water:'≈', electric:'ϟ', grass:'❧', ice:'❄', fighting:'✊', poison:'◉', ground:'▰',
  flying:'〰', psychic:'◎', bug:'❋', rock:'◆', ghost:'♟', dragon:'♜', dark:'☾', steel:'⬡', fairy:'✧',
};
export function typeChips(types) {
  const holder = document.createElement('span'); holder.className = 'type-chips';
  for (const type of types) {
    const chip = document.createElement('span'); chip.className = `type-chip type-${type}`;
    chip.textContent = `${typeMarks[type]} ${type}`; holder.append(chip);
  }
  return holder;
}
export function spriteUrl(id, shiny = false, fallback = false) {
  if (Number(id) === defaultBuddyId && !shiny && !fallback) return defaultHero;
  return `${BASE}/other/${fallback ? 'home' : 'official-artwork'}/${shiny ? 'shiny/' : ''}${id}.png`;
}
export function buddyImage(id, {shiny = false, lazy = true, thumbnail = false} = {}) {
  const buddy = buddyById(id), img = document.createElement('img');
  img.alt = buddy.name + (shiny ? ' · shiny' : ''); img.width = thumbnail ? 96 : 475; img.height = thumbnail ? 96 : 475;
  img.referrerPolicy = 'no-referrer'; img.crossOrigin = 'anonymous'; img.decoding = 'async';
  img.loading = lazy ? 'lazy' : 'eager'; if (!thumbnail) img.fetchPriority = 'high';
  img.src = thumbnail ? `${BASE}/${shiny ? 'shiny/' : ''}${id}.png` : spriteUrl(id, shiny);
  img.onload = () => { img.dataset.loaded = 'true'; };
  let fallback = false;
  img.onerror = () => {
    if (!thumbnail && !fallback) { fallback = true; img.src = spriteUrl(id, shiny, true); return; }
    const local = `/assets/buddies/${id}.png`;
    if (!shiny && buddyAssets.includes(local) && img.getAttribute('src') !== local) { img.src = local; return; }
    const label = document.createElement('span'); label.className = 'sprite-unavailable';
    label.textContent = `${buddy.name} · picture needs internet`; img.replaceWith(label);
  };
  return img;
}
export function mountBuddy(root, id, shiny = false) {
  const current = root.querySelector('img');
  if (current?.getAttribute('src') !== spriteUrl(id, shiny)) root.replaceChildren(buddyImage(id, {shiny, lazy:false}));
  return buddyById(id);
}
export function buddyGreeting(id) { return Number(id) === 25 ? 'Pika! ' : ''; }
