/** A bounded, keyboard-accessible window onto the complete buddy catalog. */
export function createChooser(viewport, root, cell) {
  let items = [], columns = 3, rowHeight = 214, frame, lastRange = '', focusIndex = -1;
  const mounted = new Map();
  root.setAttribute('role', 'list'); root.style.position = 'relative';
  function render() {
    const width = viewport.clientWidth;
    columns = width >= 800 ? 6 : width >= 550 ? 4 : 3;
    rowHeight = width < 550 ? 204 : 220;
    const rows = Math.ceil(items.length / columns);
    root.style.height = `${rows * rowHeight}px`;
    const firstRow = Math.max(0, Math.floor(viewport.scrollTop / rowHeight) - 1);
    const finalRow = Math.min(rows, Math.ceil((viewport.scrollTop + viewport.clientHeight) / rowHeight) + 1);
    const start = firstRow * columns, end = Math.min(items.length, finalRow * columns);
    const range = `${start}:${end}:${width}`;
    if (range === lastRange) return;
    lastRange = range;
    for (const [index, node] of mounted) if (index < start || index >= end) { node.remove(); mounted.delete(index); }
    const gap = 10, tileWidth = (width - gap * (columns - 1)) / columns;
    for (let index = start; index < end; index++) {
      let node = mounted.get(index);
      if (!node) {
        node = document.createElement('div'); node.className = 'virtual-buddy'; node.setAttribute('role', 'listitem');
        node.setAttribute('aria-posinset', String(index + 1)); node.setAttribute('aria-setsize', String(items.length));
        node.dataset.index = index; node.append(cell(items[index].id));
        const next=[...mounted].sort((a,b)=>a[0]-b[0]).find(([i])=>i>index)?.[1];
        root.insertBefore(node,next||null); mounted.set(index, node);
      }
      node.style.width = `${tileWidth}px`; node.style.height = `${rowHeight - gap}px`;
      node.style.transform = `translate3d(${index % columns * (tileWidth + gap)}px, ${Math.floor(index / columns) * rowHeight}px, 0)`;
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; render(); }); }
  viewport.addEventListener('scroll', schedule, { passive:true });
  new ResizeObserver(() => { lastRange = ''; schedule(); }).observe(viewport);
  root.addEventListener('focusin', e => { const tile = e.target.closest('.virtual-buddy'); if (tile) focusIndex = Number(tile.dataset.index); });
  root.addEventListener('keydown', e => {
    const delta = { ArrowRight:1, ArrowLeft:-1, ArrowDown:columns, ArrowUp:-columns }[e.key];
    if (delta === undefined && !['Home','End'].includes(e.key)) return;
    e.preventDefault();
    focusIndex = Math.max(0, Math.min(items.length - 1, e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : focusIndex + delta));
    viewport.scrollTop = Math.floor(focusIndex / columns) * rowHeight;
    lastRange = ''; render(); mounted.get(focusIndex)?.querySelector('button')?.focus({ preventScroll:true });
  });
  return {
    setItems(next) {
      items = next; for (const node of mounted.values()) node.remove(); mounted.clear(); lastRange = '';
      viewport.scrollTop = 0; render();
    },
    refresh() { lastRange = ''; render(); },
    snapshot() { return {total:items.length, mounted:mounted.size, columns, rowHeight, scrollTop:viewport.scrollTop}; },
  };
}
