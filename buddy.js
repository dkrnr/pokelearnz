/** Swappable character boundary. App code uses only this neutral contract. */
export const buddies = [
  { id: 'pip', name: 'Pip', kind: 'original', description: 'An original little leaf friend.' },
  { id: '25', name: 'Pikachu', kind: 'sprite', src: '/assets/buddies/25.png', description: 'Unofficial fan character.' },
  { id: '1', name: 'Bulbasaur', kind: 'sprite', src: '/assets/buddies/1.png', description: 'Unofficial fan character.' },
];
export const buddyAssets = buddies.filter(b => b.src).map(b => b.src);
export function buddyById(id) { return buddies.find(b => b.id === String(id)) || buddies[0]; }
export function mountBuddy(root, id) {
  const buddy = buddyById(id);
  root.replaceChildren();
  if (buddy.kind === 'sprite') {
    const img = document.createElement('img');
    img.src = buddy.src; img.alt = buddy.name; img.className = 'buddy-sprite';
    img.addEventListener('error', () => { root.replaceChildren(original()); root.setAttribute('aria-label', buddy.name); });
    root.append(img);
  } else root.append(original());
  root.setAttribute('aria-label', buddy.name);
  return buddy;
}
function original() {
  const el = document.createElement('div');
  el.className = 'pip'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i class="pip-leaf"></i><i class="pip-arm left"></i><i class="pip-arm right"></i><i class="pip-eye left"></i><i class="pip-eye right"></i><i class="pip-cheek left"></i><i class="pip-cheek right"></i><i class="pip-mouth"></i><i class="pip-foot left"></i><i class="pip-foot right"></i>';
  return el;
}
