/* davixiniTracker · enrutado, eventos globales, atajos y arranque */
(() => {
  'use strict';
  const { $, $$, enc, icon, plural, toast, store, on, hydrate } = DT;
  const P = DT.player, V = DT.views;
  const isMobile = () => matchMedia('(max-width: 860px)').matches;
  const dec = s => { try { return decodeURIComponent(s); } catch { return s; } };
  const NAVMAP = { song: 'songs', album: 'albums', artist: 'artists', playlist: 'playlists', import: 'playlists', wrapped: 'stats', '': '' };
  let page = '', arg = '';
  DT.page = () => page || 'home';

  async function route(quiet) {
    const parts = location.hash.replace(/^#\/?/, '').split('/').map(dec);
    const name = parts[0] || 'home';
    const same = quiet && name === (page || 'home');
    page = parts[0] || ''; arg = parts[1] || '';
    DT.closeFloat(); DT.ctx.clear();
    const key = NAVMAP[page] ?? page;
    $$('#nav a, #tabbar a, .side-foot a').forEach(a => (a.dataset.p === key ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    const fn = Object.hasOwn(V, name) ? V[name] : V.nf, y = scrollY;
    if (!quiet) await DT.trans.out($('#view'));
    DT.quietNext = !!quiet;
    try { fn(parts[1], parts[2]); } catch (err) { console.error(err); $('#view').innerHTML = `<h1>Error</h1><p class="sub">No se pudo mostrar esta página: ${DT.esc(err.message)}</p>`; }
    DT.quietNext = false;
    scrollTo(0, same ? y : 0);
  }
  DT.refresh = () => route(true);
  addEventListener('hashchange', () => { route(); if (document.activeElement !== $('#q')) $('#view').focus({ preventScroll: true }); });

  /* ---------- búsqueda ---------- */
  let st;
  $('#q').addEventListener('input', e => {
    clearTimeout(st);
    st = setTimeout(() => {
      const q = e.target.value.trim(), target = q ? `#/search/${enc(q)}` : '#/search';
      if (page === 'search') { history.replaceState(null, '', target); route(true); } else location.hash = target;
    }, 140);
  });
  $('#q').addEventListener('keydown', e => { if (e.key === 'Enter') DT.saveSearch(e.target.value); });
  $('#q').addEventListener('focus', () => { if (page !== 'search' && !$('#q').value) location.hash = '#/search'; });

  /* ---------- acciones de la interfaz ---------- */
  const albumIds = id => DT.tracksOfAlbum(id).map(t => t.id);
  const cmds = {
    toggle: P.toggle, next: P.next, prev: P.prev, shuffle: P.toggleShuffle, repeat: P.cycleRepeat, mute: P.toggleMute,
    like: () => { const t = P.current(); if (t) DT.likes.toggle(t.id); }
  };
  const ctxIds = key => DT.ctx.get(key)?.ids || [];
  const selIds = () => [...DT.songsState.sel];
  const rerenderSongs = () => V.songs(arg, true);
  const acts = {
    playctx: b => P.play(ctxIds(b.dataset.key), undefined, { shuffleOn: false }),
    shufctx: b => P.play(ctxIds(b.dataset.key), undefined, { shuffleOn: true }),
    'rows-more': b => DT.rowsMore(b),
    reroll: () => DT.reroll(),
    'home-config': () => DT.homeConfig(),
    'open-np': () => DT.openNp(),
    panel: () => DT.setPanel(false),
    'queue-save': async () => {
      const name = await DT.ask({ title: 'Guardar la cola como lista', input: 'Nombre de la lista', value: 'Mi cola', ok: 'Guardar' });
      if (name) { const l = DT.pl.create(name, [...new Set(P.queue())]); toast(`Lista «${l.name}» guardada.`); }
    },
    'queue-clear': () => P.clear(),
    'queue-album': b => { const n = P.enqueue(albumIds(b.dataset.id)); toast(`${plural(n, 'canción añadida', 'canciones añadidas')} a la cola.`); },
    radio: b => DT.radio(b.dataset.kind, b.dataset.id),
    'share-link': b => DT.copyLink(b.dataset.hash),
    'pl-new': async () => { const n = await DT.ask({ title: 'Nueva lista', input: 'Nombre', ok: 'Crear' }); if (n) location.hash = `#/playlist/${enc(DT.pl.create(n).id)}`; },
    'pl-add': b => DT.plAddDialog(b.dataset.id),
    'pl-menu': b => {
      const id = b.dataset.id, l = DT.pl.get(id);
      DT.menu(b, [
        { label: 'Cambiar nombre', icon: 'edit', run: async () => { const n = await DT.ask({ title: 'Cambiar nombre', input: 'Nombre', value: l.name, ok: 'Guardar' }); if (n) DT.pl.rename(id, n); } },
        { label: 'Cambiar portada', icon: 'albums', run: () => DT.plCoverPick(id) },
        l.cover && { label: 'Quitar portada propia', icon: 'close', run: () => DT.pl.setCover(id, '') },
        { label: 'Duplicar', icon: 'copy', run: () => { const c = DT.pl.duplicate(id); location.hash = `#/playlist/${enc(c.id)}`; } },
        { label: 'Copiar enlace para compartir', icon: 'share', run: () => { if (l.ids.length > 70) toast('Lista larga: el enlace puede no funcionar en todos los sitios.'); const url = DT.pl.link(id); navigator.clipboard?.writeText(url).then(() => toast('Enlace copiado.'), () => toast('No se pudo copiar el enlace.', 'error')); } },
        '-',
        { label: 'Eliminar lista', icon: 'trash', danger: true, run: async () => { if (await DT.ask({ title: `¿Eliminar «${l.name}»?`, text: 'Las canciones no se borran de la biblioteca.', ok: 'Eliminar', danger: true })) { DT.pl.remove(id); location.hash = '#/playlists'; } } }
      ]);
    },
    'pl-import': b => { const p = DT.pl.parse(b.dataset.payload); if (p) { const l = DT.pl.create(p.name, p.ids); location.hash = `#/playlist/${enc(l.id)}`; toast('Lista guardada.'); } },
    'log-clear': async () => { if (await DT.ask({ title: '¿Borrar el historial?', text: 'Se eliminan las escuchas registradas y las estadísticas. No se puede deshacer.', ok: 'Borrar', danger: true })) { DT.log.clear(); toast('Historial borrado.'); if (['history', 'stats', 'settings'].includes(page)) DT.refresh(); } },
    'clear-recent': () => { store.del('dt-recent-q'); DT.refresh(); },
    'rand-album': () => { const l = DT.S.albums.filter(a => DT.tracksOfAlbum(a.id).length); if (l.length) { const a = l[Math.floor(Math.random() * l.length)]; P.play(albumIds(a.id), undefined, { shuffleOn: false }); location.hash = `#/album/${enc(a.id)}`; } },
    roulette: () => { const l = DT.S.tracks; if (l.length) { const t = l[Math.floor(Math.random() * l.length)]; P.play([t.id], t.id); toast(`Ruleta: ${t.title}`); } },
    'play-weekly': () => { const l = DT.weekly().map(t => t.id); if (l.length) P.play(l, l[0], { shuffleOn: false }); },
    'play-unplayed': () => { const l = DT.stats.unplayed().map(t => t.id); if (l.length) P.play(l, undefined, { shuffleOn: true }); },
    'play-forgotten': () => { const l = DT.stats.forgotten(30).map(t => t.id); if (l.length) P.play(l, undefined, { shuffleOn: true }); },
    'sel-toggle': () => { DT.songsState.selecting = !DT.songsState.selecting; rerenderSongs(); },
    'sel-end': () => { DT.songsState.selecting = false; rerenderSongs(); },
    'sel-all': () => { const k = $('#view [data-ctx]')?.dataset.ctx; ctxIds(k).forEach(i => DT.songsState.sel.add(i)); rerenderSongs(); },
    'sel-play': () => { P.play(selIds(), undefined, { shuffleOn: false }); },
    'sel-queue': () => { toast(`${plural(P.enqueue(selIds()), 'canción añadida', 'canciones añadidas')} a la cola.`); },
    'sel-list': b => DT.addToList(b, selIds()),
    'sel-like': () => { selIds().forEach(i => { if (!DT.likes.has(i)) DT.likes.toggle(i); }); toast('Añadidas a favoritos.'); },
    'data-export': () => DT.dataExport(),
    'data-import': () => DT.dataImport(),
    'settings-reset': async () => { if (await DT.ask({ title: '¿Restablecer ajustes?', text: 'Se recuperan los valores por defecto.', ok: 'Restablecer', danger: true })) { DT.settings.replaceAll({}); DT.views.settings(); } },
    'wrap-dl': () => DT.wrapDownload(), 'wrap-share': () => DT.wrapShare(),
    retry: () => location.reload()
  };

  document.addEventListener('click', e => {
    const t = e.target;
    const lnk = t.closest('a[href^="#/"]');
    if (lnk) { t.closest('dialog')?.close(); if (page === 'search' && t.closest('#view')) DT.saveSearch($('#q').value); }
    const cl = t.closest('[data-close]'); if (cl) { cl.closest('dialog').close(); return; }
    const cmd = t.closest('[data-cmd]'); if (cmd) { cmds[cmd.dataset.cmd]?.(); return; }
    const sf = t.closest('[data-sf]'); if (sf) { DT.searchFilter(sf.dataset.sf); route(true); return; }
    const al = t.closest('[data-album]'); if (al) { const ids = albumIds(al.dataset.album); if (ids.length) P.play(ids, undefined, { shuffleOn: false }); else toast('Este álbum aún no tiene canciones.'); return; }
    const pp = t.closest('[data-plplay]'); if (pp) { const l = DT.pl.get(pp.dataset.plplay); if (l?.ids.some(DT.track)) P.play(l.ids.filter(DT.track), undefined, { shuffleOn: false }); else toast('La lista está vacía.'); return; }
    const lk = t.closest('[data-like]'); if (lk) { DT.likes.toggle(lk.dataset.like); return; }
    const mo = t.closest('[data-more]'); if (mo) { DT.trackMenu(mo, mo.dataset.more, mo.dataset.plist ? { plist: mo.dataset.plist, pidx: +mo.dataset.pidx } : {}); return; }
    const qm = t.closest('[data-qmove]'); if (qm) { const i = +qm.dataset.qmove; P.move(i, i + +qm.dataset.d); return; }
    const qr = t.closest('[data-qrm]'); if (qr) { P.removeAt(+qr.dataset.qrm); return; }
    const act = t.closest('[data-act]'); if (act) { acts[act.dataset.act]?.(act); return; }
    const tab = t.closest('[data-tab]'); if (tab) { tab.closest('#npTabs') ? DT.setNpTab(tab.dataset.tab) : DT.setPanelTab(tab.dataset.tab); return; }
    const qrow = t.closest('[data-qi]'); if (qrow && !t.closest('button')) { P.playAt(+qrow.dataset.qi); return; }
    const row = t.closest('[data-play]');
    if (row && !t.closest('a,button,input,select')) {
      if (DT.songsState.selecting && page === 'songs') { const cb = $('.sel', row); if (cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change', { bubbles: true })); } return; }
      const id = row.dataset.play, ids = row.hasAttribute('data-solo') ? [id] : ctxIds(row.closest('[data-ctx]')?.dataset.ctx);
      if (P.current()?.id === id) P.toggle(); else P.play(ids.length ? ids : [id], id);
      return;
    }
    if (row && t.closest('button[data-play]')) { P.play([row.dataset.play], row.dataset.play); return; }
    if (t.closest('#now') && !t.closest('a')) { DT.openNp(); return; }
    if (t.closest('#qBtn')) { if (isMobile()) DT.openNp('queue'); else { const open = !DT.settings.get('panel') || DT.settings.get('panelTab') !== 'queue'; DT.setPanelTab('queue'); DT.setPanel(open); } return; }
    if (t.closest('#panelBtn')) { if (isMobile()) DT.openNp('queue'); else DT.setPanel(!DT.settings.get('panel')); return; }
    if (t.closest('#xfBtn,#npXf')) { DT.xfPop(t.closest('#xfBtn,#npXf')); return; }
    if (t.closest('#miniBtn')) { DT.settings.set('mini', true); return; }
    if (t.closest('#miniExp')) { DT.settings.set('mini', false); return; }
    if (t.closest('#expBtn')) { DT.openNp(); return; }
    if (t.closest('#back')) { history.back(); return; }
    if (t.closest('#fwd')) { history.forward(); return; }
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.id === 'now') { e.preventDefault(); DT.openNp(); } });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches?.('[data-sel]')) { t.checked ? DT.songsState.sel.add(t.dataset.sel) : DT.songsState.sel.delete(t.dataset.sel); const n = DT.songsState.sel.size; $$('.selbar button:not([data-act=sel-end]):not([data-act=sel-all])').forEach(b => (b.disabled = !n)); const lab = $('.selbar b'); if (lab) lab.textContent = n ? plural(n, 'seleccionada', 'seleccionadas') : 'Elige canciones'; }
    else if (t.id === 'songSort') { DT.songsState.setSort(t.value); rerenderSongs(); }
    else if (t.id === 'albumSort') { DT.setUi('albumSort', t.value); V.albums(); }
    else if (t.id === 'period') { location.hash = `#/${t.dataset.base}/${t.value}`; }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'songFilter') { DT.songsState.setFilter(t.value); V.songs(arg, 'focus'); }
    else if (t.classList?.contains('seek')) DT.seekPreview(e);
    else if (t.id === 'vol') { P.setVolume(+t.value); t.style.setProperty('--p', `${t.value * 100}%`); }
  });
  /* el arrastre de la barra de progreso solo salta a la nueva posición al soltar */
  document.addEventListener('pointerdown', e => { if (e.target.classList?.contains('seek')) DT.seekDrag(true); });
  document.addEventListener('change', e => { if (e.target.classList?.contains('seek')) { const { dur } = P.time(); if (Number.isFinite(dur)) P.seek((e.target.value / 1000) * dur); DT.seekDrag(false); } });
  document.addEventListener('pointerup', () => setTimeout(() => DT.seekDrag(false), 0));

  /* ---------- arrastrar y soltar (cola y listas) ---------- */
  let src = null;
  document.addEventListener('dragstart', e => {
    const r = e.target.closest?.('[data-dnd]'); if (!r) return;
    src = { type: r.dataset.dnd, idx: +r.dataset.idx }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(src.idx)); r.classList.add('dragging');
  });
  document.addEventListener('dragover', e => { const r = e.target.closest?.('[data-dnd]'); if (r && src && r.dataset.dnd === src.type) { e.preventDefault(); $$('.over').forEach(x => x !== r && x.classList.remove('over')); r.classList.add('over'); } });
  document.addEventListener('drop', e => {
    const r = e.target.closest?.('[data-dnd]'); if (!r || !src || r.dataset.dnd !== src.type) return;
    e.preventDefault(); const to = +r.dataset.idx;
    if (src.type === 'queue') P.move(src.idx, to); else if (src.type === 'pl') DT.pl.move(arg, src.idx, to);
  });
  document.addEventListener('dragend', () => { src = null; $$('.dragging,.over').forEach(x => x.classList.remove('dragging', 'over')); });

  /* ---------- atajos de teclado ---------- */
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    const tg = e.target;
    if (tg.closest?.('input,textarea,select,[contenteditable],[role=menuitem],[role=tab],#ask')) { if (e.key === '/' && tg.id !== 'q' && !tg.closest('input,textarea,select')) { /* nada */ } else return; }
    if (e.key === '/') { e.preventDefault(); $('#q').focus(); return; }
    if (e.key === '?') { e.preventDefault(); DT.shortcutsDialog(); return; }
    if (e.code === 'Space') { if (tg.closest('button,a,summary')) return; e.preventDefault(); P.toggle(); return; }
    const k = e.key.toLowerCase();
    if (e.key === 'ArrowRight') { e.preventDefault(); e.shiftKey ? P.next() : P.seekBy(5); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? P.prev() : P.seekBy(-5); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); P.setVolume(P.volume() + 0.05); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); P.setVolume(P.volume() - 0.05); }
    else if (k === 'm') P.toggleMute(); else if (k === 's') P.toggleShuffle(); else if (k === 'r') P.cycleRepeat();
    else if (k === 'l') cmds.like(); else if (k === 'q') document.querySelector('#panelBtn').click();
  });

  /* ---------- reacciones a eventos ---------- */
  on('likes', () => { if (page === 'likes') DT.refresh(); });
  on('playlists', () => { if (['playlists', 'playlist', 'library'].includes(page)) DT.refresh(); });
  on('player:track', () => { if (!page) { const h = $('#hero'); if (h) { h.outerHTML = DT.homeHero(); hydrate($('#view')); } else if (P.current()) DT.refresh(); } });
  on('player:state', () => { if (!page) { const h = $('#hero'); if (h) { h.outerHTML = DT.homeHero(); hydrate($('#view')); } } });
  on('settings', k => { if (k === 'home' && !page) return; if (['grid', 'cover', 'density'].includes(k)) return; });

  /* sesión de Supabase (solo para mostrar el acceso de administración si existe) */
  const session = () => {
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^sb-.*-auth-token$/.test(k)) { const v = JSON.parse(localStorage.getItem(k)); if (v?.user?.email) return v.user.email; } } } catch { /* sin acceso */ }
    return '';
  };

  /* ---------- arranque ---------- */
  hydrate();
  (async () => {
    try { await DT.load(); }
    catch (err) {
      console.error(err);
      $('#view').innerHTML = `<header class="phead"><h1>Sin conexión</h1></header><p class="sub">No se pudo cargar la música (${DT.esc(err.message)}). Revisa tu conexión.</p><p><button class="btn solid" data-act="retry">Reintentar</button></p>`;
      DT.initPlayerUi(); return;
    }
    P.restore();
    DT.initPlayerUi();
    const mail = session();
    if (mail) { $('#sess').textContent = mail; $('#sess').hidden = false; $('#adminLink').hidden = false; }
    route();
  })();
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(err => console.warn('[davixini] sw', err)));
})();
