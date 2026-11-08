(() => {
  'use strict';
  const C = window.DAVIXINI_SUPABASE_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const enc = encodeURIComponent;
  const IC = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
    music: '<path d="M9 18V5l12-2v13"/><ellipse cx="5.5" cy="18" rx="3.5" ry="2"/><ellipse cx="17.5" cy="16" rx="3.5" ry="2"/>',
    albums: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    artist: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.5V20"/>',
    heart: '<path d="M20.8 8.7c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z"/>',
    play: '<path d="m8 5 11 7-11 7Z"/>',
    pause: '<path d="M8 5h3v14H8zM15 5h3v14h-3z"/>',
    prev: '<path d="M6 5v14M19 6 8 12l11 6Z"/>',
    next: '<path d="M18 5v14M5 6l11 6-11 6Z"/>',
    shuffle: '<path d="m18 14 3 3-3 3M3 7h2.5c5 0 7 10 12 10H21M18 4l3 3-3 3M3 17h2.5c1.6 0 2.8-1.2 4-2.7M14 9.7c1-1.5 2.1-2.7 3.5-2.7H21"/>',
    repeat: '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',
    queue: '<path d="M4 6h16M4 12h11M4 18h8"/><path d="m17 15 4 3-4 3Z"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>'
  };
  const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const clock = s => { s = isFinite(s) ? s : 0; return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };
  const fmt = s => (s ? clock(s) : '');
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const rest = async (table, cols) => {
    const r = await fetch(`${C.url}/rest/v1/${table}?select=${cols}`, { headers: { apikey: C.publishableKey } });
    if (!r.ok) throw new Error(`${table} ${r.status}`);
    return r.json();
  };
  const media = p => (p ? `${C.url}/storage/v1/object/public/${C.bucket}/${p.split('/').map(enc).join('/')}` : '');

  const S = { tracks: [], albums: [], artists: [] };
  let byTrack = new Map(), byAlbum = new Map(), byArtist = new Map();
  let ctx = [];
  const likes = new Set(store.get('dt-likes', []));

  async function loadData() {
    const [al, tr, ar] = await Promise.all([
      rest('library_albums', 'id,data,cover_path'),
      rest('library_tracks', 'id,album_id,data,audio_path,artwork_path'),
      rest('library_artists', 'id,data')
    ]);
    const people = d => (Array.isArray(d.artistIds) ? d.artistIds : []);
    const label = d => d.artist || d.artistName || '';
    const when = d => Number(d.addedAt) || Date.parse(d.createdAt || d.importedAt) || 0;
    S.artists = ar.map(r => ({ id: r.id, name: r.data.name || r.id, bio: r.data.bio || '' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    S.albums = al.map(r => ({
      id: r.id, title: r.data.title || r.data.name || 'Sin título', artistIds: people(r.data), artistText: label(r.data),
      year: r.data.year || '', genre: r.data.genre || '', desc: r.data.description || '',
      order: r.data.trackIds || [], cover: media(r.cover_path)
    }));
    S.tracks = tr.map(r => ({
      id: r.id, title: r.data.title || r.data.name || 'Sin título', albumId: r.album_id, artistIds: people(r.data),
      artistText: label(r.data), genre: r.data.genre || '', year: r.data.year || '', duration: Number(r.data.duration) || 0,
      added: when(r.data), src: media(r.audio_path), art: media(r.artwork_path)
    })).filter(t => t.src);
    byTrack = new Map(S.tracks.map(t => [t.id, t]));
    byAlbum = new Map(S.albums.map(a => [a.id, a]));
    byArtist = new Map(S.artists.map(a => [a.id, a]));
  }

  const who = x => {
    const n = x.artistIds.map(id => byArtist.get(id)?.name).filter(Boolean);
    return n.length ? n.join(', ') : x.artistText;
  };
  const artistLinks = x => x.artistIds.map(id => byArtist.get(id)).filter(Boolean)
    .map(a => `<a href="#/artist/${enc(a.id)}">${esc(a.name)}</a>`).join(', ') || esc(x.artistText);
  const artFor = t => byAlbum.get(t.albumId)?.cover || t.art || '';
  const pic = src => (src ? `<img loading="lazy" src="${esc(src)}" alt="">` : `<div class="ph">${ic('music')}</div>`);
  const byNew = (a, b) => b.added - a.added;

  const rows = (list, numbered) => `<ul class="list">${list.map((t, i) => `
    <li class="row${cur() === t.id ? ' on' : ''}" data-play="${esc(t.id)}">${numbered ? `<span class="n">${i + 1}</span>` : ''}${pic(artFor(t))}
    <span class="t"><b>${esc(t.title)}</b><small>${esc(who(t))}</small></span>
    <button class="like" data-like="${esc(t.id)}" aria-label="Me gusta" aria-pressed="${likes.has(t.id)}">${ic('heart')}</button><time>${fmt(t.duration)}</time></li>`).join('')}</ul>`;
  const albumCards = list => `<div class="grid">${list.map(a => `
    <div class="card"><a href="#/album/${enc(a.id)}">${pic(a.cover)}</a><button class="cplay" data-album="${esc(a.id)}" aria-label="Reproducir álbum">${ic('play')}</button><a href="#/album/${enc(a.id)}"><b>${esc(a.title)}</b><small>${esc([who(a), a.year].filter(Boolean).join(', '))}</small></a></div>`).join('')}</div>`;
  const artistRows = list => `<ul class="list">${list.map(a => {
    const n = S.tracks.filter(t => t.artistIds.includes(a.id)).length;
    return `<li><a class="row" href="#/artist/${enc(a.id)}"><span class="av">${esc([...a.name][0] || '')}</span><span class="t"><b>${esc(a.name)}</b><small>${plural(n, 'canción', 'canciones')}</small></span></a></li>`;
  }).join('')}</ul>`;
  const empty = t => `<p class="sub">${t}</p>`;
  const show = (html, list = []) => { $('#view').innerHTML = html; ctx = list.map(t => t.id); };
  const toast = t => { const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (e.hidden = true), 2200); };
  const share = () => navigator.clipboard.writeText(location.href).then(() => toast('Enlace copiado.'), () => toast('No se pudo copiar el enlace.'));
  const head = (cover, inner) => `<div class="head">${pic(cover)}<div>${inner}</div></div>`;
  const acts = extra => `<p class="acts">${extra}<button class="btn" data-share>Copiar enlace</button></p>`;

  const views = {
    home() {
      const latest = [...S.tracks].sort(byNew).slice(0, 10);
      show(`<h1>Davixiniverso</h1><p class="sub">${plural(S.tracks.length, 'canción', 'canciones')}, ${plural(S.albums.length, 'álbum', 'álbumes')} y ${plural(S.artists.length, 'artista', 'artistas')}.</p>${S.tracks.length ? '<p class="acts"><button class="btn solid" data-all="play">Reproducir todo</button><button class="btn" data-all="shuffle">Aleatorio</button></p>' : ''}` +
        (S.tracks.length
          ? `<h2>Lo último</h2>${rows(latest)}${S.albums.length ? `<h2>Álbumes</h2>${albumCards(S.albums.slice(0, 6))}` : ''}${S.artists.length ? `<h2>Artistas</h2>${artistRows(S.artists.slice(0, 6))}` : ''}`
          : empty('Todavía no hay música publicada.')), [...S.tracks].sort(byNew));
    },
    songs(g) {
      const genres = [...new Set(S.tracks.map(t => t.genre).filter(Boolean))].sort();
      const list = S.tracks.filter(t => !g || t.genre === g).sort(byNew);
      show(`<h1>Canciones</h1>${genres.length ? `<p class="tags"><a href="#/songs"${g ? '' : ' aria-current="page"'}>Todas</a>${genres.map(x => `<a href="#/songs/${enc(x)}"${x === g ? ' aria-current="page"' : ''}>${esc(x)}</a>`).join('')}</p>` : ''}${list.length ? rows(list) : empty('No hay canciones todavía.')}`, list);
    },
    albums() { show(`<h1>Álbumes</h1>${S.albums.length ? albumCards(S.albums) : empty('No hay álbumes todavía.')}`); },
    album(id) {
      const a = byAlbum.get(id); if (!a) return views.nf();
      const pos = t => { const i = a.order.indexOf(t.id); return i < 0 ? 1e9 : i; };
      const list = S.tracks.filter(t => t.albumId === id).sort((x, y) => (pos(x) - pos(y)) || (x.added - y.added));
      show(head(a.cover, `<h1>${esc(a.title)}</h1><p>${artistLinks(a)}</p><p class="sub">${esc([a.year, a.genre].filter(Boolean).join(', '))}</p>${a.desc ? `<p class="sub">${esc(a.desc)}</p>` : ''}${acts('<button class="btn" data-all="play">Reproducir</button><button class="btn" data-all="shuffle">Aleatorio</button>')}`) + (list.length ? rows(list, true) : empty('Este álbum aún no tiene canciones.')), list);
    },
    artists() { show(`<h1>Artistas</h1>${S.artists.length ? artistRows(S.artists) : empty('No hay artistas todavía.')}`); },
    artist(id) {
      const a = byArtist.get(id); if (!a) return views.nf();
      const al = S.albums.filter(x => x.artistIds.includes(id));
      const list = S.tracks.filter(t => t.artistIds.includes(id)).sort(byNew);
      show(`<h1>${esc(a.name)}</h1>${a.bio ? `<p class="sub">${esc(a.bio)}</p>` : ''}${acts(list.length ? '<button class="btn" data-all="play">Reproducir</button><button class="btn" data-all="shuffle">Aleatorio</button>' : '')}${al.length ? `<h2>Álbumes</h2>${albumCards(al)}` : ''}${list.length ? `<h2>Canciones</h2>${rows(list)}` : ''}`, list);
    },
    song(id) {
      const t = byTrack.get(id); if (!t) return views.nf();
      const al = byAlbum.get(t.albumId);
      show(head(artFor(t), `<h1>${esc(t.title)}</h1><p>${artistLinks(t)}</p>${al ? `<p class="sub">En <a href="#/album/${enc(al.id)}">${esc(al.title)}</a></p>` : ''}${acts(`<button class="btn" data-play="${esc(t.id)}">Reproducir</button>`)}`), [t]);
    },
    likes() {
      const list = S.tracks.filter(t => likes.has(t.id)).sort(byNew);
      show(`<h1>Me gusta</h1>${list.length ? rows(list) : empty('Marca canciones con «Me gusta» y aparecerán aquí. Se guardan solo en este navegador.')}`, list);
    },
    search(q) {
      const n = norm(q);
      const tr = S.tracks.filter(t => norm(`${t.title} ${who(t)} ${t.genre}`).includes(n));
      const al = S.albums.filter(a => norm(`${a.title} ${who(a)}`).includes(n));
      const ar = S.artists.filter(a => norm(a.name).includes(n));
      show(`<h1>Buscar</h1><p class="sub">Resultados para «${esc(q)}».</p>${ar.length ? `<h2>Artistas</h2>${artistRows(ar)}` : ''}${al.length ? `<h2>Álbumes</h2>${albumCards(al)}` : ''}${tr.length ? `<h2>Canciones</h2>${rows(tr)}` : ''}${tr.length + al.length + ar.length ? '' : empty('No hay resultados.')}`, tr);
    },
    nf() { show(`<h1>No encontrado</h1><p class="sub">Esa página no existe. <a href="#/">Volver al inicio</a>.</p>`); }
  };

  function route() {
    const [page = '', arg = ''] = location.hash.replace(/^#\/?/, '').split('/').map(s => { try { return decodeURIComponent(s); } catch { return s; } });
    (Object.hasOwn(views, page || 'home') ? views[page || 'home'] : views.nf)(arg);
    document.querySelectorAll('#nav a').forEach(a => (a.dataset.p === page ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    window.scrollTo(0, 0);
  }

  /* reproductor */
  const au = $('#au');
  document.querySelectorAll('[data-i]').forEach(n => (n.innerHTML = ic(n.dataset.i)));
  let queue = [], qi = -1, shuffle = false, repeat = 0;
  const cur = () => queue[qi];

  function playId(id, list) {
    queue = list && list.includes(id) ? [...list] : [id];
    qi = queue.indexOf(id);
    loadCurrent(true);
  }
  function loadCurrent(go) {
    const t = byTrack.get(cur()); if (!t) return;
    au.src = t.src;
    $('#player').hidden = false;
    $('#pTitle').textContent = t.title;
    $('#pArtist').textContent = who(t);
    $('#pArt').innerHTML = pic(artFor(t));
    $('#npArt').innerHTML = pic(artFor(t)); $('#npTitle').textContent = t.title; $('#npArtist').textContent = who(t);
    document.title = `${t.title} en davixiniTracker`;
    paintLike();
    document.querySelectorAll('.row[data-play]').forEach(r => r.classList.toggle('on', r.dataset.play === t.id));
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: who(t), album: byAlbum.get(t.albumId)?.title || '', artwork: artFor(t) ? [{ src: artFor(t) }] : [] });
    }
    if (go) au.play().catch(() => {});
  }
  function step(d) {
    if (!queue.length) return;
    if (shuffle && d > 0 && queue.length > 1) { let n; do { n = Math.floor(Math.random() * queue.length); } while (n === qi); qi = n; }
    else qi = (qi + d + queue.length) % queue.length;
    loadCurrent(true);
  }
  const setPlay = on => document.querySelectorAll('#play,#npPlay').forEach(b => (b.innerHTML = ic(on ? 'pause' : 'play')));
  const toggle = () => { if (!au.src) return; au.paused ? au.play().catch(() => {}) : au.pause(); };
  const prev = () => { if (au.currentTime > 3) au.currentTime = 0; else step(-1); };
  function toggleLike(id) {
    likes.has(id) ? likes.delete(id) : likes.add(id);
    store.set('dt-likes', [...likes]);
    paintLike();
    if (location.hash === '#/likes') route();
  }
  function paintLike() {
    const on = likes.has(cur());
    $('#pLike').setAttribute('aria-pressed', on);
    document.querySelectorAll('[data-like]').forEach(b => b.setAttribute('aria-pressed', likes.has(b.dataset.like)));
  }
  function renderQueue() {
    $('#qList').innerHTML = queue.length ? `<ul class="list">${queue.map((id, i) => { const t = byTrack.get(id); return `<li class="row${i === qi ? ' on' : ''}" data-qi="${i}"><span class="t"><b>${esc(t.title)}</b><small>${esc(who(t))}</small></span></li>`; }).join('')}</ul>` : empty('La cola está vacía.');
  }

  au.addEventListener('play', () => { setPlay(true); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; });
  au.addEventListener('pause', () => { setPlay(false); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; });
  au.addEventListener('timeupdate', () => {
    $('#el').textContent = clock(au.currentTime);
    $('#tot').textContent = clock(au.duration);
    const v = au.duration ? (au.currentTime / au.duration) * 1000 : 0;
    $('#seek').value = v; $('#npSeek').value = v;
  });
  au.addEventListener('ended', () => {
    if (repeat === 2) { au.currentTime = 0; au.play(); }
    else if (repeat === 1 || shuffle || qi < queue.length - 1) step(1);
  });
  au.addEventListener('error', () => toast('No se pudo reproducir esta canción.'));
  for (const s of ['#seek', '#npSeek']) $(s).addEventListener('input', e => { if (au.duration) au.currentTime = (e.target.value / 1000) * au.duration; });
  $('#vol').value = store.get('dt-vol', 0.8); au.volume = +$('#vol').value;
  $('#vol').addEventListener('input', e => { au.volume = +e.target.value; store.set('dt-vol', +e.target.value); });
  $('#play').onclick = toggle; $('#next').onclick = () => step(1); $('#prev').onclick = prev;
  $('#shuf').onclick = e => { shuffle = !shuffle; e.currentTarget.setAttribute('aria-pressed', shuffle); };
  $('#rep').onclick = e => { repeat = (repeat + 1) % 3; const b = e.currentTarget; b.title = ['Repetir', 'Repetir todo', 'Repetir una'][repeat]; b.dataset.n = repeat === 2 ? '1' : ''; b.setAttribute('aria-pressed', repeat > 0); };
  $('#pLike').onclick = () => cur() && toggleLike(cur());
  $('#qBtn').onclick = () => { renderQueue(); $('#queue').showModal(); };

  if ('mediaSession' in navigator) {
    const m = navigator.mediaSession;
    m.setActionHandler('play', toggle); m.setActionHandler('pause', toggle);
    m.setActionHandler('previoustrack', prev); m.setActionHandler('nexttrack', () => step(1));
    m.setActionHandler('seekto', d => { au.currentTime = d.seekTime; });
  }

  document.addEventListener('click', e => {
    const cl = e.target.closest('[data-close]'); if (cl) { cl.closest('dialog').close(); return; }
    const cmd = e.target.closest('[data-cmd]'); if (cmd) { ({ prev, next: () => step(1), play: toggle })[cmd.dataset.cmd](); return; }
    const pa = e.target.closest('[data-album]');
    if (pa) {
      const id = pa.dataset.album, al = byAlbum.get(id);
      const pos = t => { const i = al.order.indexOf(t.id); return i < 0 ? 1e9 : i; };
      const l = S.tracks.filter(t => t.albumId === id).sort((x, y) => (pos(x) - pos(y)) || (x.added - y.added)).map(t => t.id);
      if (l.length) playId(l[0], l); else toast('Este álbum aún no tiene canciones.');
      return;
    }
    if (e.target.closest('.now')) { if (cur()) $('#np').showModal(); return; }
    const like = e.target.closest('[data-like]'); if (like) { toggleLike(like.dataset.like); return; }
    const pl = e.target.closest('[data-play]'); if (pl) { playId(pl.dataset.play, ctx); return; }
    const all = e.target.closest('[data-all]');
    if (all && ctx.length) {
      shuffle = all.dataset.all === 'shuffle'; $('#shuf').setAttribute('aria-pressed', shuffle);
      playId(shuffle ? ctx[Math.floor(Math.random() * ctx.length)] : ctx[0], ctx); return;
    }
    if (e.target.closest('[data-share]')) { share(); return; }
    const q = e.target.closest('[data-qi]'); if (q) { qi = +q.dataset.qi; loadCurrent(true); renderQueue(); }
  });
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/' && !e.target.closest('input,textarea,select')) { e.preventDefault(); $('#q').focus(); return; }
    if (e.target.closest('input,textarea,select,button,a,dialog')) return;
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight') au.currentTime += 5;
    else if (e.key === 'ArrowLeft') au.currentTime -= 5;
  });
  let st;
  $('#q').addEventListener('input', e => { clearTimeout(st); st = setTimeout(() => { const q = e.target.value.trim(); q ? views.search(q) : route(); }, 150); });

  (async () => {
    try { await loadData(); }
    catch { $('#view').innerHTML = '<h1>Sin conexión</h1><p class="sub">No se pudo cargar la música. Revisa tu conexión y recarga la página.</p>'; return; }
    addEventListener('hashchange', route);
    route();
    const song = /^#\/song\//.test(location.hash);
    if (!song) $('#player').hidden = true;
  })();
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
})();
