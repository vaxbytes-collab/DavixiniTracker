/* davixiniTracker · páginas */
(() => {
  'use strict';
  const { $, $$, esc, enc, icon, clock, long, plural, norm, store, toast, hydrate } = DT;
  const P = DT.player, V = DT.views, S = DT.S;
  const { pic, rows, card, bubble, empty, secHead, playBtns } = DT;
  const ui = store.get('dt-ui', { songSort: 'new', albumSort: 'new', artistSort: 'name' });
  const setUi = (k, v) => { ui[k] = v; store.set('dt-ui', ui); };
  DT.setUi = setUi;
  DT.setUi = setUi;
  const byNew = (a, b) => b.added - a.added;
  const sum = l => l.reduce((n, t) => n + (t.duration || 0), 0);

  let token = 0;
  DT.show = async (html, init, quiet) => {
    const my = ++token, v = $('#view');
    v.innerHTML = html; hydrate(v);
    init?.(v);
    if (my === token && !quiet && !DT.quietNext) await DT.trans.into(v, $('#routebar'));
  };
  const select = (id, label, opts, val) => `<label class="sel-wrap"><span>${label}</span><select id="${id}">${opts.map(([v, l]) => `<option value="${v}"${v === val ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
  const dayOfYear = d => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  const isoWeek = d => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); return `${t.getUTCFullYear()}-W${Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7)}`; };
  const sessionSeed = (() => { try { return sessionStorage.getItem('dt-seed') || (sessionStorage.setItem('dt-seed', String(Date.now())), sessionStorage.getItem('dt-seed')); } catch { return String(Date.now()); } })();
  let reroll = 0;
  DT.reroll = () => { reroll++; V.home(); };

  /* ---------- selecciones reutilizables ---------- */
  const weekly = () => {
    const rnd = DT.seeded(`w${isoWeek(new Date())}`), un = DT.stats.unplayed(), pool = DT.shuffled(un.length >= 12 ? un : S.tracks, rnd);
    const used = new Set(), out = [];
    for (const t of pool) { const k = t.artistIds[0] || t.id; if (used.has(k) && out.length < pool.length / 2) continue; used.add(k); out.push(t); if (out.length === 12) break; }
    return out;
  };
  DT.weekly = weekly;
  const albumOfDay = () => S.albums.length ? [...S.albums].sort((a, b) => a.id.localeCompare(b.id))[Math.floor(DT.seeded(`d${DT.stats.dayKey(Date.now())}`)() * S.albums.length)] : null;
  const recs = () => {
    const s = DT.stats.summary('all'); if (s.plays < 5 || !s.genres.length) return null;
    const top = s.genres.slice(0, 2).map(g => g.id), pl = DT.stats.counts().plays;
    const pool = S.tracks.filter(t => top.includes(t.genre) && !pl.has(t.id));
    return pool.length ? { genres: top, list: DT.shuffled(pool, DT.seeded(`r${DT.stats.dayKey(Date.now())}`)).slice(0, 10) } : null;
  };

  DT.weeklyIds = () => weekly().map(t => t.id);
  const homeBuilders = {
    continue() {
      const t = P.current(); if (!t) return '';
      const playing = P.isPlaying(), pos = P.time().pos;
      return `<section class="hero" id="hero"><div class="hero-art"><a href="#/song/${enc(t.id)}" tabindex="-1">${pic(t.cover)}</a></div><div class="hero-t"><p class="eyebrow">${playing ? 'Sonando ahora' : 'Continuar escuchando'}</p><h2 class="hero-h"><a href="#/song/${enc(t.id)}">${esc(t.title)}</a></h2><p class="hero-by">${DT.artistLinks(t)}${t.albumTitle ? ` · <a href="#/album/${enc(t.albumId)}">${esc(t.albumTitle)}</a>` : ''}</p>
        <p class="acts"><button class="btn solid" data-cmd="toggle">${icon(playing ? 'pause' : 'play')}${playing ? 'Pausar' : pos > 5 ? `Retomar en ${clock(pos)}` : 'Reproducir'}</button><button class="btn" data-act="open-np">Ampliar</button></p></div></section>`;
    },
    recent() {
      const ids = DT.stats.recentTracks(8).map(DT.track); if (!ids.length) return '';
      return `<section>${secHead('Escuchado recientemente', ['#/history', 'Ver historial'])}${rows(ids, { compact: true })}</section>`;
    },
    latest() {
      const l = [...S.tracks].sort(byNew).slice(0, 8); if (!l.length) return '';
      return `<section>${secHead('Últimas incorporaciones', ['#/songs', 'Todas las canciones'])}<div class="cols2">${rows(l, { compact: true })}</div></section>`;
    },
    albums() {
      const l = [...S.albums].filter(a => DT.tracksOfAlbum(a.id).length).sort((a, b) => b.added - a.added).slice(0, 12); if (!l.length) return '';
      return `<section>${secHead('Álbumes', ['#/albums', 'Ver todos'])}<div class="strip">${l.map(a => card(a)).join('')}</div></section>`;
    },
    albumDay() {
      const a = albumOfDay(); if (!a || !DT.tracksOfAlbum(a.id).length) return '';
      return `<section class="aod"><div class="aod-art">${pic(a.cover)}</div><div><p class="eyebrow">Álbum del día</p><h2><a href="#/album/${enc(a.id)}">${esc(a.title)}</a></h2><p class="sub">${esc([a.who, a.year, plural(DT.tracksOfAlbum(a.id).length, 'canción', 'canciones')].filter(Boolean).join(' · '))}</p><p class="acts"><button class="btn solid" data-album="${esc(a.id)}">${icon('play')}Escuchar álbum</button></p></div></section>`;
    },
    recs() {
      const r = recs(); if (!r) return '';
      return `<section>${secHead('Según tu historial')}<p class="sub">Canciones que aún no has escuchado de ${r.genres.map(esc).join(' y ')}, los géneros que más reproduces.</p>${rows(r.list, { compact: true })}</section>`;
    },
    weekly() {
      const l = weekly(); if (l.length < 3) return '';
      const key = DT.ctxKey(l.map(t => t.id));
      return `<section>${secHead('Descubrimiento semanal')}<p class="sub">Doce canciones, una selección fija cada semana que prioriza lo que aún no has escuchado.</p><p class="acts">${playBtns(key)}</p>${rows(l, { compact: true })}</section>`;
    },
    artists() {
      const s = DT.stats.summary('all'); const l = s.artists.slice(0, 8).map(x => DT.artist(x.id)).filter(Boolean); if (!l.length) return '';
      return `<section>${secHead('Tus artistas', ['#/artists', 'Ver todos'])}<div class="strip bubbles">${l.map(bubble).join('')}</div></section>`;
    },
    playlists() {
      const l = DT.pl.all().slice(0, 8); if (!l.length) return '';
      return `<section>${secHead('Tus listas', ['#/playlists', 'Ver todas'])}<div class="strip">${l.map(DT.plCard).join('')}</div></section>`;
    },
    random() {
      const l = DT.shuffled(S.tracks, DT.seeded(`${sessionSeed}${reroll}`)).slice(0, 8); if (l.length < 4) return '';
      return `<section>${secHead('Canciones al azar')}<p class="acts"><button class="btn sm" data-act="reroll">${icon('dice')}Otras</button></p>${rows(l, { compact: true })}</section>`;
    },
    forgotten() {
      const l = DT.shuffled(DT.stats.forgotten(30), DT.seeded(`f${DT.stats.dayKey(Date.now())}`)).slice(0, 6); if (!l.length) return '';
      return `<section>${secHead('Canciones olvidadas')}<p class="sub">Las escuchaste hace más de 30 días.</p>${rows(l, { compact: true })}</section>`;
    }
  };
  DT.homeHero = () => homeBuilders.continue();

  V.home = () => {
    const cfg = DT.settings.get('home').filter(h => h.on);
    const body = cfg.map(h => homeBuilders[h.id]?.() || '').join('');
    DT.show(`<header class="phead"><div><h1>Davixiniverso</h1><p class="sub">${[plural(S.tracks.length, 'canción', 'canciones'), plural(S.albums.length, 'álbum', 'álbumes'), plural(S.artists.length, 'artista', 'artistas')].join(' · ')}</p></div>
      <p class="acts"><button class="btn" data-act="home-config">${icon('sliders')}Personalizar inicio</button></p></header>
      ${S.tracks.length ? (body || empty('Inicio vacío', 'Has ocultado todas las secciones.', '<p><button class="btn solid" data-act="home-config">Elegir secciones</button></p>')) : empty('Todavía no hay música publicada', 'Cuando se suba la primera canción aparecerá aquí.')}`);
  };
  DT.homeConfig = () => {
    const d = $('#dlg'); d.className = 'sm';
    const names = { continue: 'Continuar escuchando', recent: 'Escuchado recientemente', latest: 'Últimas incorporaciones', albums: 'Álbumes', albumDay: 'Álbum del día', recs: 'Según tu historial', weekly: 'Descubrimiento semanal', artists: 'Tus artistas', playlists: 'Tus listas', random: 'Canciones al azar', forgotten: 'Canciones olvidadas' };
    const draw = () => {
      d.innerHTML = `<button class="x ib" data-close aria-label="Cerrar">${icon('close')}</button><h2>Secciones del inicio</h2><p class="sub">Ordena y oculta. Las secciones sin contenido no se muestran aunque estén activas.</p><ul class="homecfg">${DT.settings.get('home').map((h, i) => `<li><label><input type="checkbox" data-hk="${h.id}"${h.on ? ' checked' : ''}> ${names[h.id]}</label><span><button class="ib" data-hm="${i}" data-d="-1" aria-label="Subir ${names[h.id]}"${i === 0 ? ' disabled' : ''}>${icon('up')}</button><button class="ib" data-hm="${i}" data-d="1" aria-label="Bajar ${names[h.id]}"${i === 10 ? ' disabled' : ''}>${icon('down')}</button></span></li>`).join('')}</ul>`;
    };
    d.onclick = e => {
      const m = e.target.closest('[data-hm]'), k = e.target.closest('[data-hk]');
      if (m) { const l = [...DT.settings.get('home')], i = +m.dataset.hm, j = i + +m.dataset.d; [l[i], l[j]] = [l[j], l[i]]; DT.settings.set('home', l); draw(); $(`[data-hm="${j}"][data-d="${m.dataset.d}"]`, d)?.focus(); }
      if (k) { DT.settings.set('home', DT.settings.get('home').map(h => (h.id === k.dataset.hk ? { ...h, on: k.checked } : h))); }
    };
    d.onclose = () => { d.onclick = null; if (DT.page() === 'home') V.home(); };
    draw(); d.showModal();
  };

  V.library = () => {
    const stats = [['songs', 'Canciones', plural(S.tracks.length, 'canción', 'canciones'), 'music'], ['albums', 'Álbumes', plural(S.albums.length, 'álbum', 'álbumes'), 'albums'], ['artists', 'Artistas', plural(S.artists.length, 'artista', 'artistas'), 'artist'],
      ['playlists', 'Listas', plural(DT.pl.all().length, 'lista', 'listas'), 'playlist'], ['likes', 'Favoritos', plural(DT.likes.all().filter(DT.track).length, 'canción', 'canciones'), 'heart'], ['history', 'Historial', plural(DT.log.all().length, 'escucha', 'escuchas'), 'clock'], ['stats', 'Estadísticas', 'Tu música en cifras', 'chart'], ['settings', 'Ajustes', 'Apariencia, crossfade y más', 'sliders']];
    DT.show(`<header class="phead"><h1>Biblioteca</h1></header><ul class="hub">${stats.map(([p, t, s, i]) => `<li><a href="#/${p}"><i data-i="${i}"></i><span><b>${t}</b><small>${s}</small></span>${icon('right')}</a></li>`).join('')}</ul>`);
  };

  /* ---------- Explorar ---------- */
  V.explore = () => {
    const years = [...new Set(S.albums.map(a => Number(a.year)).filter(Boolean))].sort((a, b) => b - a);
    const wk = weekly(), un = DT.stats.unplayed(), fg = DT.stats.forgotten(30);
    const tool = (act, t, s, i, off) => `<li><button data-act="${act}"${off ? ' disabled' : ''}><i data-i="${i}"></i><span><b>${t}</b><small>${s}</small></span></button></li>`;
    DT.show(`<header class="phead"><h1>Explorar</h1></header>
      <ul class="tools-list">
        ${tool('rand-album', 'Álbum aleatorio', 'Uno al azar de la biblioteca', 'albums', !S.albums.length)}
        ${tool('roulette', 'Ruleta musical', 'Una canción al azar, ya sonando', 'dice', !S.tracks.length)}
        ${tool('play-weekly', 'Descubrimiento semanal', `${wk.length} canciones, cambia cada semana`, 'explore', wk.length < 3)}
        ${tool('play-unplayed', 'Sin escuchar', un.length ? `${plural(un.length, 'canción', 'canciones')} que nunca has reproducido` : 'Lo has escuchado todo', 'music', !un.length || !DT.log.all().length)}
        ${tool('play-forgotten', 'Canciones olvidadas', fg.length ? `${plural(fg.length, 'canción', 'canciones')} sin escuchar en 30 días` : 'Aún no hay canciones olvidadas', 'clock', !fg.length)}
      </ul>
      ${S.genres.length ? `<section>${secHead('Géneros')}<p class="tags">${S.genres.map(([g, n]) => `<a href="#/songs/${enc(g)}">${esc(g)} <small>${n}</small></a>`).join('')}</p></section>` : ''}
      ${years.length ? `<section>${secHead('Línea temporal')}<p class="sub">Álbumes por año de lanzamiento.</p><div class="timeline">${years.map(y => `<div class="tl-row"><b class="tl-y">${y}</b><div class="strip">${S.albums.filter(a => Number(a.year) === y).map(a => card(a)).join('')}</div></div>`).join('')}</div></section>` : ''}
      ${!S.genres.length && !years.length ? empty('Faltan metadatos', 'Cuando las canciones tengan género y los álbumes tengan año podrás explorar por ellos.') : ''}`);
  };

  /* ---------- Buscar ---------- */
  let sFilter = 'all';
  const recentQ = () => store.get('dt-recent-q', []);
  DT.saveSearch = q => { q = q.trim(); if (q.length < 2) return; store.set('dt-recent-q', [q, ...recentQ().filter(x => x !== q)].slice(0, 8)); };
  V.search = (q = '') => {
    const n = norm(q).trim();
    if (!n) {
      const rq = recentQ();
      return DT.show(`<header class="phead"><h1>Buscar</h1></header>
        ${rq.length ? `<section>${secHead('Búsquedas recientes')}<p class="tags">${rq.map(x => `<a href="#/search/${enc(x)}">${esc(x)}</a>`).join('')}</p><p><button class="btn sm" data-act="clear-recent">Borrar búsquedas recientes</button></p></section>` : ''}
        ${S.genres.length ? `<section>${secHead('Géneros')}<p class="tags">${S.genres.slice(0, 16).map(([g]) => `<a href="#/search/${enc(g)}">${esc(g)}</a>`).join('')}</p></section>` : ''}
        ${S.artists.length ? `<section>${secHead('Artistas')}<div class="strip bubbles">${S.artists.slice(0, 10).map(bubble).join('')}</div></section>` : ''}`);
    }
    const f = list => list.filter(x => x.q.includes(n));
    const tr = f(S.tracks), al = f(S.albums), ar = f(S.artists), gn = S.genres.filter(([g]) => norm(g).includes(n)), pl = DT.pl.all().filter(l => norm(l.name).includes(n));
    const total = tr.length + al.length + ar.length + gn.length + pl.length;
    const tabs = [['all', 'Todo', total], ['tracks', 'Canciones', tr.length], ['albums', 'Álbumes', al.length], ['artists', 'Artistas', ar.length], ['lists', 'Listas', pl.length], ['genres', 'Géneros', gn.length]].filter(([k, , c]) => k === 'all' || c);
    if (!tabs.some(t => t[0] === sFilter)) sFilter = 'all';
    const all = sFilter === 'all', lim = (arr, k, nn) => (all ? arr.slice(0, nn) : arr);
    const more = (k, len, nn) => (all && len > nn ? ` <button class="more-link" data-sf="${k}">Ver las ${len}</button>` : '');
    const show = k => all || sFilter === k;
    DT.show(`<header class="phead"><h1>Buscar</h1><p class="sub">${total ? `${plural(total, 'resultado', 'resultados')} para «${esc(q)}»` : ''}</p></header>
      ${total ? `<p class="tags" role="group" aria-label="Filtrar resultados">${tabs.map(([k, l, c]) => `<button class="chip" data-sf="${k}" aria-pressed="${k === sFilter}">${l} <small>${c}</small></button>`).join('')}</p>` : ''}
      ${show('artists') && ar.length ? `<section><div class="sechead"><h2>Artistas</h2>${more('artists', ar.length, 6)}</div><div class="strip bubbles">${lim(ar, 'artists', 6).map(bubble).join('')}</div></section>` : ''}
      ${show('albums') && al.length ? `<section><div class="sechead"><h2>Álbumes</h2>${more('albums', al.length, 6)}</div><div class="strip">${lim(al, 'albums', 6).map(a => card(a)).join('')}</div></section>` : ''}
      ${show('tracks') && tr.length ? `<section><div class="sechead"><h2>Canciones</h2>${more('tracks', tr.length, 5)}</div>${rows(lim(tr, 'tracks', 5), { album: true })}</section>` : ''}
      ${show('lists') && pl.length ? `<section>${secHead('Listas')}<div class="strip">${pl.map(DT.plCard).join('')}</div></section>` : ''}
      ${show('genres') && gn.length ? `<section>${secHead('Géneros')}<p class="tags">${gn.map(([g, c]) => `<a href="#/songs/${enc(g)}">${esc(g)} <small>${c}</small></a>`).join('')}</p></section>` : ''}
      ${total ? '' : empty('Sin resultados', `No hay nada que coincida con «${esc(q)}». Prueba con otro título, artista, álbum o género.`)}`);
  };
  DT.searchFilter = k => { sFilter = k; };

  /* ---------- Canciones (con orden, filtro y selección múltiple) ---------- */
  const sel = new Set(); let selecting = false, songFilter = '';
  const sorters = {
    new: ['Recientes', (a, b) => b.added - a.added], title: ['Título', (a, b) => a.title.localeCompare(b.title, 'es')],
    artist: ['Artista', (a, b) => a.who.localeCompare(b.who, 'es') || a.title.localeCompare(b.title, 'es')], album: ['Álbum', (a, b) => a.albumTitle.localeCompare(b.albumTitle, 'es')],
    dur: ['Duración', (a, b) => b.duration - a.duration], plays: ['Más escuchadas', (a, b) => (DT.stats.counts().plays.get(b.id) || 0) - (DT.stats.counts().plays.get(a.id) || 0)]
  };
  V.songs = (g, keep) => {
    const genre = g || '';
    const n = norm(songFilter);
    const list = S.tracks.filter(t => (!genre || t.genre === genre) && (!n || t.q.includes(n))).sort(sorters[ui.songSort]?.[1] || sorters.new[1]);
    const key = DT.ctxKey(list.map(t => t.id));
    const bar = selecting ? `<div class="selbar" role="toolbar" aria-label="Acciones para la selección"><b>${sel.size ? plural(sel.size, 'seleccionada', 'seleccionadas') : 'Elige canciones'}</b>
      <button class="btn sm solid" data-act="sel-play"${sel.size ? '' : ' disabled'}>${icon('play')}Reproducir</button><button class="btn sm" data-act="sel-queue"${sel.size ? '' : ' disabled'}>A la cola</button><button class="btn sm" data-act="sel-list"${sel.size ? '' : ' disabled'}>A una lista</button><button class="btn sm" data-act="sel-like"${sel.size ? '' : ' disabled'}>Favoritos</button><button class="btn sm" data-act="sel-all">Seleccionar las ${list.length}</button><button class="btn sm" data-act="sel-end">Terminar</button></div>` : '';
    const html = `<header class="phead"><div><h1>${genre ? esc(genre) : 'Canciones'}</h1><p class="sub">${plural(list.length, 'canción', 'canciones')} · ${long(sum(list))}</p></div></header>
      ${S.genres.length ? `<p class="tags"><a href="#/songs"${genre ? '' : ' aria-current="page"'}>Todas</a>${S.genres.map(([x]) => `<a href="#/songs/${enc(x)}"${x === genre ? ' aria-current="page"' : ''}>${esc(x)}</a>`).join('')}</p>` : ''}
      <div class="toolbar"><label class="filter"><i data-i="search"></i><input id="songFilter" type="search" placeholder="Filtrar esta lista" value="${esc(songFilter)}" aria-label="Filtrar canciones"></label>
        ${select('songSort', 'Ordenar', Object.entries(sorters).map(([k, v]) => [k, v[0]]), ui.songSort)}
        <button class="btn sm" data-act="sel-toggle" aria-pressed="${selecting}">${icon('check')}Seleccionar</button>
        ${list.length ? `<span class="acts">${playBtns(key)}</span>` : ''}</div>${bar}
      ${list.length ? rows(list, { album: true, sel: selecting, selected: sel }) : empty('Nada que mostrar', songFilter ? 'Ninguna canción coincide con el filtro.' : 'No hay canciones todavía.')}`;
    if (keep) {
      const pos = $('#songFilter')?.selectionStart; DT.show(html, null, true);
      const nf = $('#songFilter'); if (nf && keep === 'focus') { nf.focus(); nf.setSelectionRange(pos ?? nf.value.length, pos ?? nf.value.length); }
    } else DT.show(html);
  };
  DT.songsState = { sel, get selecting() { return selecting; }, set selecting(v) { selecting = v; if (!v) sel.clear(); }, setFilter: v => { songFilter = v; }, setSort: v => setUi('songSort', v) };

  /* ---------- Álbumes ---------- */
  V.albums = () => {
    const sorts = { new: ['Recientes', (a, b) => b.added - a.added], title: ['Título', (a, b) => a.title.localeCompare(b.title, 'es')], artist: ['Artista', (a, b) => a.who.localeCompare(b.who, 'es')], year: ['Año', (a, b) => (Number(b.year) || 0) - (Number(a.year) || 0)] };
    const list = [...S.albums].sort(sorts[ui.albumSort]?.[1] || sorts.new[1]);
    DT.show(`<header class="phead"><div><h1>Álbumes</h1><p class="sub">${plural(list.length, 'álbum', 'álbumes')}</p></div>${list.length ? select('albumSort', 'Ordenar', Object.entries(sorts).map(([k, v]) => [k, v[0]]), ui.albumSort) : ''}</header>
      ${list.length ? `<div class="grid">${list.map(a => card(a)).join('')}</div>` : empty('No hay álbumes', 'Todavía no se ha publicado ningún álbum.')}`);
  };
  V.album = id => {
    const a = DT.album(id); if (!a) return V.nf();
    const list = DT.tracksOfAlbum(id), key = DT.ctxKey(list.map(t => t.id)), c = DT.stats.completion(id), hasLog = DT.log.all().length > 0;
    DT.show(`<header class="head">${pic(a.cover, 'big')}<div><p class="eyebrow">Álbum</p><h1>${esc(a.title)}</h1><p class="by">${DT.artistLinks(a)}</p>
      <p class="sub">${esc([a.year, a.genre, plural(list.length, 'canción', 'canciones'), long(sum(list))].filter(Boolean).join(' · '))}</p>
      ${hasLog && list.length ? `<p class="sub done"><span class="meter" role="img" aria-label="${c.done} de ${c.total} canciones escuchadas"><i style="width:${(c.done / c.total) * 100}%"></i></span>${c.done === c.total ? 'Álbum completado' : `${c.done} de ${c.total} escuchadas`}</p>` : ''}
      ${a.desc ? `<p class="sub">${esc(a.desc)}</p>` : ''}
      <p class="acts">${list.length ? playBtns(key) : ''}${list.length ? `<button class="btn" data-act="queue-album" data-id="${esc(id)}">${icon('queue')}A la cola</button><button class="btn" data-act="radio" data-kind="album" data-id="${esc(id)}">${icon('radio')}Radio</button>` : ''}<button class="btn" data-act="share-link" data-hash="#/album/${enc(id)}">${icon('copy')}Copiar enlace</button></p></div></header>
      ${list.length ? rows(list, { n: true }) : empty('Álbum sin canciones', 'Este álbum aún no tiene canciones.')}
      ${a.credits ? `<section><h2>Créditos</h2><p class="pre">${esc(a.credits)}</p></section>` : ''}${a.notes ? `<section><h2>Notas</h2><p class="pre">${esc(a.notes)}</p></section>` : ''}`);
  };

  /* ---------- Artistas ---------- */
  V.artists = () => {
    DT.show(`<header class="phead"><div><h1>Artistas</h1><p class="sub">${plural(S.artists.length, 'artista', 'artistas')}</p></div></header>${S.artists.length ? `<div class="grid bubbles">${S.artists.map(bubble).join('')}</div>` : empty('No hay artistas', 'Todavía no se ha creado ningún artista.')}`);
  };
  V.artist = id => {
    const a = DT.artist(id); if (!a) return V.nf();
    const albums = DT.albumsOfArtist(id), list = DT.tracksOfArtist(id), key = DT.ctxKey(list.map(t => t.id));
    const loose = list.filter(t => !t.albumId || !albums.some(x => x.id === t.albumId));
    const top = [...list].sort((x, y) => (DT.stats.counts().plays.get(y.id) || 0) - (DT.stats.counts().plays.get(x.id) || 0)).filter(t => DT.stats.counts().plays.get(t.id)).slice(0, 5);
    DT.show(`<header class="head artist-head"><div class="av big">${a.image ? `<img src="${esc(a.image)}" alt="">` : esc([...a.name][0] || '')}</div><div><p class="eyebrow">Artista</p><h1>${esc(a.name)}</h1><p class="sub">${esc([plural(albums.length, 'álbum', 'álbumes'), plural(list.length, 'canción', 'canciones'), list.length ? long(sum(list)) : ''].filter(Boolean).join(' · '))}</p>
      <p class="acts">${list.length ? playBtns(key) + `<button class="btn" data-act="radio" data-kind="artist" data-id="${esc(id)}">${icon('radio')}Radio</button>` : ''}<button class="btn" data-act="share-link" data-hash="#/artist/${enc(id)}">${icon('copy')}Copiar enlace</button></p></div></header>
      ${a.bio ? `<section><h2>Biografía</h2><p class="pre bio">${esc(a.bio)}</p></section>` : ''}
      ${top.length ? `<section>${secHead('Lo que más escuchas')}${rows(top, { compact: true })}</section>` : ''}
      ${albums.length ? `<section>${secHead('Discografía')}<div class="strip">${albums.map(x => card(x, [x.year, plural(DT.tracksOfAlbum(x.id).length, 'canción', 'canciones')].filter(Boolean).join(' · '))).join('')}</div></section>` : ''}
      ${loose.length ? `<section>${secHead(albums.length ? 'Otras canciones' : 'Canciones')}${rows(loose, { album: true })}</section>` : ''}
      ${a.credits ? `<section><h2>Créditos</h2><p class="pre">${esc(a.credits)}</p></section>` : ''}
      ${!list.length && !albums.length ? empty('Sin música', 'Este artista aún no tiene canciones ni álbumes.') : ''}`);
  };

  V.song = id => {
    const t = DT.track(id); if (!t) return V.nf();
    const n = DT.stats.counts().plays.get(id) || 0;
    DT.show(`<header class="head">${pic(t.cover, 'big')}<div><p class="eyebrow">Canción</p><h1>${esc(t.title)}</h1><p class="by">${DT.artistLinks(t)}</p>
      <p class="sub">${t.albumTitle ? `En <a href="#/album/${enc(t.albumId)}">${esc(t.albumTitle)}</a>` : ''}${[t.year, t.genre, t.duration ? clock(t.duration) : ''].filter(Boolean).length ? ` · ${esc([t.year, t.genre, t.duration ? clock(t.duration) : ''].filter(Boolean).join(' · '))}` : ''}${n ? ` · ${plural(n, 'reproducción', 'reproducciones')} aquí` : ''}</p>
      <p class="acts"><button class="btn solid" data-play="${esc(id)}" data-solo>${icon('play')}Reproducir</button><button class="btn" data-more="${esc(id)}">${icon('more')}Más</button><button class="btn" data-act="share-link" data-hash="#/song/${enc(id)}">${icon('copy')}Copiar enlace</button></p></div></header>
      ${t.lyrics ? `<section><h2>Letra</h2><p class="pre lyrics">${esc(t.lyrics)}</p></section>` : ''}${t.credits ? `<section><h2>Créditos</h2><p class="pre">${esc(t.credits)}</p></section>` : ''}`);
  };

  /* ---------- Listas ---------- */
  V.playlists = () => {
    const l = DT.pl.all();
    DT.show(`<header class="phead"><div><h1>Listas</h1><p class="sub">Se guardan en este navegador. Puedes compartirlas con un enlace.</p></div><p class="acts"><button class="btn solid" data-act="pl-new">${icon('plus')}Nueva lista</button></p></header>
      ${l.length ? `<div class="grid">${l.map(DT.plCard).join('')}</div>` : empty('Aún no tienes listas', 'Crea una y añade canciones desde el menú ⋯ de cualquier canción.', `<p><button class="btn solid" data-act="pl-new">${icon('plus')}Crear la primera</button></p>`)}`);
  };
  V.playlist = id => {
    const l = DT.pl.get(id); if (!l) return V.nf();
    const list = l.ids.map(DT.track).filter(Boolean), key = DT.ctxKey(l.ids.filter(DT.track));
    const missing = l.ids.length - list.length;
    DT.show(`<header class="head">${pic(DT.plCover(l), 'big')}<div><p class="eyebrow">Lista</p><h1>${esc(l.name)}</h1><p class="sub">${plural(list.length, 'canción', 'canciones')} · ${long(sum(list))}${missing ? ` · ${missing} ya no existen en la biblioteca` : ''}</p>
      <p class="acts">${list.length ? playBtns(key) : ''}<button class="btn" data-act="pl-add" data-id="${esc(id)}">${icon('plus')}Añadir canciones</button><button class="btn" data-act="pl-menu" data-id="${esc(id)}" aria-haspopup="menu">${icon('more')}Más</button></p></div></header>
      ${list.length ? rows(l.ids.map(DT.track).filter(Boolean), { dnd: 'pl', plist: id, album: true }) : empty('Lista vacía', 'Añade canciones desde aquí o con el menú ⋯ de cualquier canción.')}`);
  };
  V.import = payload => {
    const p = DT.pl.parse(payload);
    if (!p || !p.ids.length) return DT.show(empty('Enlace no válido', 'Esta lista compartida no se pudo leer o sus canciones ya no están en la biblioteca.', '<p><a class="btn" href="#/">Ir al inicio</a></p>'));
    const key = DT.ctxKey(p.ids);
    DT.show(`<header class="phead"><div><p class="eyebrow">Lista compartida</p><h1>${esc(p.name)}</h1><p class="sub">${plural(p.ids.length, 'canción', 'canciones')}</p></div><p class="acts">${playBtns(key)}<button class="btn" data-act="pl-import" data-payload="${esc(payload)}">${icon('plus')}Guardar en mis listas</button></p></header>${rows(p.ids.map(DT.track), { album: true })}`);
  };

  V.likes = () => {
    const list = DT.likes.all().map(DT.track).filter(Boolean), key = DT.ctxKey(list.map(t => t.id));
    DT.show(`<header class="phead"><div><h1>Favoritos</h1><p class="sub">${plural(list.length, 'canción', 'canciones')} · guardados en este navegador</p></div>${list.length ? `<p class="acts">${playBtns(key)}</p>` : ''}</header>
      ${list.length ? rows([...list].reverse(), { album: true }) : empty('Sin favoritos', 'Pulsa el corazón de una canción y aparecerá aquí.')}`);
  };

  V.history = () => {
    const log = DT.log.all();
    if (!log.length) return DT.show(`<header class="phead"><h1>Historial</h1></header>${empty('Todavía no hay historial', 'Cada canción que escuches durante más de unos segundos quedará registrada aquí. El historial se guarda en este navegador.')}`);
    const items = [];
    for (let i = log.length - 1; i >= 0 && items.length < 400; i--) { const t = DT.track(log[i][0]); if (t) items.push({ t, ts: log[i][1] }); }
    const today = DT.stats.dayKey(Date.now()), yest = DT.stats.dayKey(Date.now() - DT.stats.DAY), groups = new Map();
    for (const it of items) { const k = DT.stats.dayKey(it.ts); (groups.get(k) || groups.set(k, []).get(k)).push(it); }
    DT.show(`<header class="phead"><div><h1>Historial</h1><p class="sub">${plural(log.length, 'escucha', 'escuchas')} registradas en este navegador</p></div><p class="acts"><button class="btn" data-act="log-clear">${icon('trash')}Borrar historial</button></p></header>
      ${[...groups].map(([k, l]) => `<section class="day"><h2>${k === today ? 'Hoy' : k === yest ? 'Ayer' : new Date(`${k}T12:00:00`).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>${rows(l.map(x => x.t), { when: (t, i) => new Date(l[i].ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }), compact: true })}</section>`).join('')}
      ${log.length > items.length ? '<p class="sub">Se muestran las escuchas más recientes.</p>' : ''}`);
  };

  V.nf = () => DT.show(`<header class="phead"><h1>No encontrado</h1></header><p class="sub">Esa página o elemento no existe. <a href="#/">Volver al inicio</a>.</p>`);

  /* ---------- acciones de la vista de listas ---------- */
  DT.plAddDialog = id => {
    const l = DT.pl.get(id); if (!l) return;
    const d = $('#dlg'); d.className = 'md';
    let q = '';
    const draw = () => {
      const n = norm(q), list = S.tracks.filter(t => !n || t.q.includes(n)).slice(0, 60);
      $('#addList').innerHTML = list.map(t => `<li class="row"><span class="art">${pic(t.cover)}</span><span class="t"><b>${esc(t.title)}</b><small>${esc(t.who)}</small></span>${l.ids.includes(t.id) ? `<span class="in">${icon('check')}En la lista</span>` : `<button class="btn sm" data-addto="${esc(t.id)}">Añadir</button>`}</li>`).join('') || '<li class="sub">Sin resultados.</li>';
    };
    d.innerHTML = `<button class="x ib" data-close aria-label="Cerrar">${icon('close')}</button><h2>Añadir a «${esc(l.name)}»</h2><label class="filter"><i data-i="search"></i><input id="addQ" type="search" placeholder="Buscar canciones" aria-label="Buscar canciones para añadir"></label><ul class="list" id="addList"></ul>`;
    hydrate(d); draw();
    $('#addQ').oninput = e => { q = e.target.value; draw(); };
    d.onclick = e => { const b = e.target.closest('[data-addto]'); if (b) { DT.pl.add(id, [b.dataset.addto]); draw(); } };
    d.onclose = () => { d.onclick = null; if (DT.page() === 'playlist') V.playlist(id); };
    d.showModal(); $('#addQ').focus();
  };
  DT.plCoverPick = id => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      const img = new Image(), url = URL.createObjectURL(f);
      img.onload = () => {
        const c = document.createElement('canvas'), s = 360, m = Math.min(img.width, img.height); c.width = c.height = s;
        c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
        URL.revokeObjectURL(url); DT.pl.setCover(id, c.toDataURL('image/jpeg', 0.82)); toast('Portada actualizada.');
      };
      img.onerror = () => { URL.revokeObjectURL(url); toast('No se pudo leer esa imagen.', 'error'); };
      img.src = url;
    };
    inp.click();
  };
})();
