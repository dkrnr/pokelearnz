/** Swappable buddy boundary: Pokémon identity never leaks into the scene controller. */
const BASE = "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon";
export const spriteHosts = ["cdn.jsdelivr.net"];
export const buddyAssets = ["/assets/buddies/25.png", "/assets/buddies/1.png"];
export const defaultBuddyId = 25;
let catalog = [], personalities = {};
export async function loadBuddies() {
  const [list, voices] = await Promise.all([
    fetch("/buddy-catalog.json").then(r => { if (!r.ok) throw Error("catalog"); return r.json(); }),
    fetch("/pokemonPersonalities.json").then(r => r.json()).catch(() => ({})),
  ]);
  catalog = list;
  personalities = voices;
  return list;
}
export const formatName = name => name.split("-").map(s => s[0].toUpperCase() + s.slice(1)).join(" ");
export function buddyById(id) {
  const item = catalog.find(b => b.id === Number(id));
  return item ? { ...item, name: formatName(item.name) } : { id: 25, name: "Pikachu", types: ["electric"] };
}
export function searchBuddies(query) {
  const text = query.toLowerCase().trim().replace(/^#/, "");
  return catalog.filter(b => String(b.id) === text || b.name.replaceAll("-", " ").includes(text));
}
export const buddyCount = () => catalog.length;
export function buddyPersonality(id) {
  return personalities[id] || `You are ${buddyById(id).name}, a gentle learning buddy.`;
}
export const typeMarks = {
  normal: "●", fire: "♨", water: "≈", electric: "ϟ", grass: "❧", ice: "❄",
  fighting: "✊", poison: "◉", ground: "▰", flying: "〰", psychic: "◎", bug: "❋",
  rock: "◆", ghost: "♟", dragon: "♜", dark: "☾", steel: "⬡", fairy: "✧",
};
export function typeChips(types) {
  const holder = document.createElement("span");
  holder.className = "type-chips";
  for (const type of types) {
    const chip = document.createElement("span");
    chip.className = `type-chip type-${type}`;
    chip.textContent = `${typeMarks[type]} ${type}`;
    holder.append(chip);
  }
  return holder;
}
export function spriteUrl(id, shiny = false, animated = false) {
  return animated ? `${BASE}/other/showdown/${shiny ? "shiny/" : ""}${id}.gif`
    : `${BASE}/other/home/${shiny ? "shiny/" : ""}${id}.png`;
}
export function buddyImage(id, { shiny = false, animated = false, lazy = true, thumbnail = false } = {}) {
  const buddy = buddyById(id), img = document.createElement("img");
  img.alt = buddy.name + (shiny ? " · shiny" : "");
  img.width = 160; img.height = 160;
  img.referrerPolicy = "no-referrer";
  img.crossOrigin = "anonymous";
  if (lazy) img.loading = "lazy";
  img.decoding = "async";
  img.src = thumbnail ? `${BASE}/${shiny ? "shiny/" : ""}${id}.png` : spriteUrl(id, shiny, animated);
  img.onload = () => { img.dataset.loaded = "true"; };
  let fallback = 0;
  img.onerror = () => {
    if (animated && fallback++ === 0) { img.src = spriteUrl(id, shiny); return; }
    const local = `/assets/buddies/${id}.png`;
    if (!shiny && buddyAssets.includes(local) && img.getAttribute("src") !== local) { img.src = local; return; }
    const label = document.createElement("span");
    label.className = "sprite-unavailable";
    label.textContent = `${buddy.name} · picture needs internet`;
    img.replaceWith(label);
  };
  return img;
}
export function mountBuddy(root, id, shiny = false, reducedMotion = false) {
  root.replaceChildren(buddyImage(id, { shiny, animated: !reducedMotion, lazy: false }));
  return buddyById(id);
}

export function buddyGreeting(id) { return Number(id) === 25 ? 'Pika! ' : ''; }
