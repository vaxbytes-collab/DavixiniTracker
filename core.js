/* davixiniTracker · núcleo: utilidades, iconos, eventos, menús y diálogos */
(() => {
  'use strict';
  const DT = (window.DT = { C: window.DAVIXINI_SUPABASE_CONFIG, views: {} });
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const enc = encodeURIComponent;
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const clock = s => {
    s = Number.isFinite(s) && s > 0 ? s : 0;
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(Math.floor(s % 60)).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
  };
  const long = s => {
    s = Math.round(s || 0);
    if (s < 60) return `${s} s`;
    const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    return h ? `${h} h ${m} min` : `${m} min`;
  };
  const plural = (n, one, many) => `${n.toLocaleString('es')} ${n === 1 ? one : many}`;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    del: k => { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } }
  };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  /* aleatoriedad reproducible (para «álbum del día», «descubrimiento semanal»…) */
  const seeded = seed => {
    let h = 1779033703 ^ String(seed).length;
    for (const c of String(seed)) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  };
  const shuffled = (arr, rnd = Math.random) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const IC = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
    explore: '<circle cx="12" cy="12" r="9.5"/><path d="m15.8 8.2-2 5.6-5.6 2 2-5.6Z"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    library: '<path d="M4 4v16M9 4v16M14.5 5.5l5 14M14.5 5.5 12.6 6l5 13.5"/>',
    music: '<path d="M9 18V5l12-2v13"/><ellipse cx="5.5" cy="18" rx="3.5" ry="2"/><ellipse cx="17.5" cy="16" rx="3.5" ry="2"/>',
    albums: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    artist: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.5V20"/>',
    playlist: '<path d="M4 6h12M4 11h12M4 16h6M17 13v7M13.5 16.5h7"/>',
    heart: '<path d="M20.8 8.7c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z"/>',
    clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>',
    chart: '<path d="M4 20h16M7 20v-7M12 20V5M17 20v-10"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    play: '<path d="m8 5 11 7-11 7Z"/>',
    pause: '<path d="M8 5h3v14H8zM15 5h3v14h-3z"/>',
    prev: '<path d="M6 5v14M19 6 8 12l11 6Z"/>',
    next: '<path d="M18 5v14M5 6l11 6-11 6Z"/>',
    shuffle: '<path d="m18 14 3 3-3 3M3 7h2.5c5 0 7 10 12 10H21M18 4l3 3-3 3M3 17h2.5c1.6 0 2.8-1.2 4-2.7M14 9.7c1-1.5 2.1-2.7 3.5-2.7H21"/>',
    repeat: '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',
    queue: '<path d="M4 6h16M4 12h11M4 18h8"/><path d="m17 15 4 3-4 3Z"/>',
    xfade: '<path d="M3 8c5 0 6 8 11 8h7M3 16c5 0 6-8 11-8h7"/>',
    volume: '<path d="M4 9v6h4l5 4V5L8 9Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9Z"/><path d="m17 9 5 6M22 9l-5 6"/>',
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    shrink: '<path d="M20 10h-6V4M4 14h6v6M14 10l7-7M3 21l7-7"/>',
    more: '<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
    grip: '<g fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></g>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m4.5 12.5 5 5L20 6.5"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16ZM13.5 6.5l4 4"/>',
    share: '<path d="M12 15V3M7 8l5-5 5 5M5 14v6h14v-6"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 20h14"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><g fill="currentColor" stroke="none"><circle cx="8.5" cy="8.5" r="1.3"/><circle cx="15.5" cy="15.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/></g>',
    radio: '<circle cx="12" cy="12" r="1.8"/><path d="M7.7 7.7a6 6 0 0 0 0 8.6M16.3 7.7a6 6 0 0 1 0 8.6M4.7 4.7a10.3 10.3 0 0 0 0 14.6M19.3 4.7a10.3 10.3 0 0 1 0 14.6"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4M9.5 2.5h5"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.01"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    flame: '<path d="M12 21c-4 0-6.5-2.8-6.5-6.2 0-3.3 2.5-5 3.5-8.3 2.5 1.5 3.7 3.5 3.7 5.5 1-.7 1.5-1.8 1.7-3 2.5 2 3.6 3.8 3.6 5.8 0 3.4-2.5 6.2-6 6.2Z"/>'
  };
  const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;
  const hydrate = (root = document) => $$('[data-i]', root).forEach(n => { n.innerHTML = icon(n.dataset.i); });

  const bus = new EventTarget();
  const emit = (n, d) => bus.dispatchEvent(new CustomEvent(n, { detail: d }));
  const on = (n, f) => bus.addEventListener(n, e => f(e.detail));

  let toastT;
  const toast = (t, kind = '') => {
    const e = $('#toast'); e.textContent = t; e.dataset.kind = kind; e.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => (e.hidden = true), kind === 'error' ? 4200 : 2400);
  };

  /* superficie flotante genérica: menús y paneles junto a un botón */
  let floating = null;
  const closeFloat = (focusBack = false) => {
    if (!floating) return;
    const { el, anchor, off } = floating; floating = null;
    off(); el.remove(); anchor.setAttribute?.('aria-expanded', 'false');
    if (focusBack && anchor.isConnected) anchor.focus();
  };
  const pop = (anchor, el, { onClose } = {}) => {
    closeFloat();
    document.body.append(el);
    const place = () => {
      const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
      let x = clamp(r.right - w, 8, innerWidth - w - 8);
      let y = r.bottom + 6; if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 6);
      el.style.left = `${x}px`; el.style.top = `${y}px`;
    };
    place();
    const down = e => { if (!el.contains(e.target) && !anchor.contains(e.target)) closeFloat(); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); closeFloat(true); } };
    const scroll = e => { if (el.contains(e.target)) return; if (!anchor.isConnected) closeFloat(); else place(); };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('keydown', key, true);
    addEventListener('resize', place);
    addEventListener('scroll', scroll, true);
    const off = () => {
      document.removeEventListener('pointerdown', down, true); document.removeEventListener('keydown', key, true);
      removeEventListener('resize', place); removeEventListener('scroll', scroll, true); onClose?.();
    };
    floating = { el, anchor, off };
    anchor.setAttribute?.('aria-expanded', 'true');
    return closeFloat;
  };
  const menu = (anchor, items) => {
    const el = document.createElement('div');
    el.className = 'menu'; el.setAttribute('role', 'menu');
    const list = items.filter(Boolean);
    el.innerHTML = list.map((it, i) => (it === '-' ? '<hr role="separator">' :
      `<button role="menuitem" type="button" data-k="${i}"${it.danger ? ' class="danger"' : ''}>${it.icon ? icon(it.icon) : '<span class="gap"></span>'}<span>${esc(it.label)}</span></button>`)).join('');
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const it = list[+b.dataset.k]; closeFloat(); it.run?.();
    });
    el.addEventListener('keydown', e => {
      const bs = $$('button', el), i = bs.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
    });
    pop(anchor, el);
    $('button', el)?.focus({ preventScroll: true });
  };

  /* diálogo de confirmación / entrada de texto (sin confirm() ni prompt() nativos) */
  const ask = ({ title, text = '', input = null, value = '', ok = 'Aceptar', danger = false }) => new Promise(res => {
    const d = $('#ask');
    d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2>${text ? `<p class="sub">${esc(text)}</p>` : ''}${input ? `<label for="askIn">${esc(input)}</label><input id="askIn" type="text" value="${esc(value)}" autocomplete="off" required>` : ''}<p class="acts"><button class="btn${danger ? ' danger' : ' solid'}" value="ok">${esc(ok)}</button><button class="btn" value="no" formnovalidate>Cancelar</button></p></form>`;
    const f = $('form', d);
    d.onclose = () => res(d.returnValue === 'ok' ? (input ? $('#askIn', d)?.value.trim() || null : true) : (input ? null : false));
    d.returnValue = 'no';
    d.showModal();
    $('#askIn', d)?.select();
    f.addEventListener('submit', () => { if (input && !$('#askIn', d).value.trim()) d.returnValue = 'no'; });
  });

  Object.assign(DT, { $, $$, esc, enc, norm, clock, long, plural, clamp, store, uid, seeded, shuffled, icon, hydrate, emit, on, toast, pop, menu, ask, closeFloat });
})();
