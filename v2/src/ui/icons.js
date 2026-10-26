// The interface icons: small vector drawings on a 24-unit grid, stroked in the current text colour.
// icon('map') returns an <svg>; the coin, gem and star are filled and coloured (see index.html).
const P = {
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  heroes: 'M12 3a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4zM4 21c0-4.4 3.6-7 8-7s8 2.6 8 7',
  helm: 'M5 13a7 7 0 0 1 14 0v6H14v-4h-4v4H5zM12 6V3',
  shop: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  scroll: 'M7 4h11a2 2 0 0 1 0 4h-1v10a2 2 0 0 1-2 2H6a2 2 0 0 1 0-4h1zM10 9h5M10 13h5',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9 17h6',
  gear: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1',
  back: 'M15 5l-7 7 7 7',
  left: 'M14 6l-6 6 6 6',
  right: 'M10 6l6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  sword: 'M14 4h6v6L9 21l-3-3zM6 18l-3 3M5 14l5 5',
  swords: 'M4 4l10 10M4 4h4M4 4v4M20 4 10 14M20 4h-4M20 4v4M8 16l-3 3M16 16l3 3M7 13l4 4M17 13l-4 4',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  flag: 'M6 21V4M6 4h11l-2 4 2 4H6',
  fast: 'M4 6l7 6-7 6zM12 6l7 6-7 6z',
  flee: 'M10 4H5v16h5M14 8l4 4-4 4M18 12H9',
  home: 'M4 11l8-7 8 7M6 10v10h12V10',
  check: 'M5 12l5 5 9-10',
  skip: 'M5 6l7 6-7 6zM14 6l7 6-7 6zM21 5v14',
  up: 'M12 19V5M6 11l6-6 6 6',
  bag: 'M6 7h12l1 13H5zM9 7a3 3 0 0 1 6 0',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z',
  skull: 'M12 3a7 7 0 0 0-7 7c0 2.6 1.4 4.6 3 5.6V19h8v-3.4c1.6-1 3-3 3-5.6a7 7 0 0 0-7-7zM9 11h.01M15 11h.01M10 19v2M14 19v2',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  fire: 'M12 21c-3.9 0-7-2.7-7-6.5 0-3.5 3-5.5 4-9 1.5 1.5 2 3 2 4.5C13 8 14 6 14 4c3 2.5 5 6 5 10.5 0 3.8-3.1 6.5-7 6.5z',
};
export function icon(name, size = 20, cls = '') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size);
  s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'ico ' + cls);
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', P[name] || P.star);
  s.append(p);
  return s;
}
