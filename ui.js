/* davixiniTracker · componentes de interfaz, reproductor visible, panel contextual y menús */
(() => {
  'use strict';
  const { $, $$, esc, enc, icon, clock, long, plural, toast, store, emit, on, hydrate } = DT;
  const P = DT.player;

  DT.pic = (src, cls = '') => (Array.isArray(src)
    ? `<div class="mosaic ${cls}">${src.map(s => `<img loading="lazy" decoding="async" src="${esc(s)}" alt="">`).join('')}</div>`
    : src ? `<img class="${cls}" loading="lazy" decoding="async" src="${esc(src)}" alt="">` : `<div class="ph ${cls}">${icon('music')}</div>`);
  const pic = DT.pic;

  /* ---------- contextos de reproducción: cada lista pintada recuerda sus identificadores ---------- */
  DT.ctx = new Map(); let ctxN = 0;
  DT.ctxKey = (ids, o = {}) => { const k = `c${++ctxN}`; DT.ctx.set(k, { ids, o }); return k; };
  const rowHtml = (t, i, o) => {
    const on = P.current()?.id === t.id;
    return `<li class="row${on ? ' on' : ''}" data-play="${esc(t.id)}"${o.dnd ? ` data-dnd="${o.dnd}" data-idx="${i}" draggable="true"` : ''}${on ? ' aria-current="true"' : ''}>
      ${o.sel ? `<input class="sel" type="checkbox" data-sel="${esc(t.id)}" aria-label="Seleccionar ${esc(t.title)}"${o.selected?.has(t.id) ? ' checked' : ''}>` : ''}
      ${o.dnd ? `<span class="grip" aria-hidden="true">${icon('grip')}</span>` : ''}
      ${o.n ? `<span class="n">${i + 1}</span>` : ''}
      ${o.art === false ? '' : `<span class="art">${pic(t.cover)}</span>`}
      <span class="t"><b>${esc(t.title)}</b><small>${esc(t.who)}${o.when ? ` · ${esc(o.when(t, i))}` : ''}</small></span>
      ${o.album && t.albumTitle ? `<a class="alb" href="#/album/${enc(t.albumId)}">${esc(t.albumTitle)}</a>` : o.album ? '<span class="alb"></span>' : ''}
      <button class="like" data-like="${esc(t.id)}" aria-label="Me gusta" aria-pressed="${DT.likes.has(t.id)}">${icon('heart')}</button>
      <time>${t.duration ? clock(t.duration) : ''}</time>
      <button class="more" data-more="${esc(t.id)}"${o.plist ? ` data-plist="${o.plist}" data-pidx="${i}"` : ''} aria-label="Más opciones de ${esc(t.title)}" aria-haspopup="menu">${icon('more')}</button>
    </li>`;
  };
  const PAGE = 120;
  DT.rows = (list, o = {}) => {
    if (!list.length) return '';
    const key = DT.ctxKey(list.map(t => t.id), o), reg = DT.ctx.get(key); reg.list = list;
    const first = list.slice(0, PAGE).map((t, i) => rowHtml(t, i, o)).join('');
    const more = list.length > PAGE ? `<li class="more-li"><button class="btn" data-act="rows-more" data-key="${key}" data-from="${PAGE}">Mostrar más (${list.length - PAGE})</button></li>` : '';
    return `<ul class="list${o.compact ? ' compact' : ''}" data-ctx="${key}">${first}${more}</ul>`;
  };
  DT.rowsMore = btn => {
    const reg = DT.ctx.get(btn.dataset.key), from = +btn.dataset.from, li = btn.closest('li'), ul = li.parentElement;
    const chunk = reg.list.slice(from, from + PAGE);
    li.insertAdjacentHTML('beforebegin', chunk.map((t, i) => rowHtml(t, from + i, reg.o)).join(''));
    if (from + PAGE >= reg.list.length) li.remove(); else { btn.dataset.from = from + PAGE; btn.textContent = `Mostrar más (${reg.list.length - from - PAGE})`; }
    hydrate(ul);
  };

  DT.card = (a, sub) => `<div class="card"><div class="cv"><a href="#/album/${enc(a.id)}" tabindex="-1" aria-hidden="true">${pic(a.cover)}</a><button class="cplay" data-album="${esc(a.id)}" aria-label="Reproducir ${esc(a.title)}">${icon('play')}</button></div>
    <a class="cap" href="#/album/${enc(a.id)}"><b>${esc(a.title)}</b><small>${esc(sub ?? [a.who, a.year].filter(Boolean).join(' · '))}</small></a></div>`;
  DT.bubble = a => `<a class="bubble" href="#/artist/${enc(a.id)}"><span class="av">${a.image ? `<img loading="lazy" src="${esc(a.image)}" alt="">` : esc([...a.name][0] || '')}</span><b>${esc(a.name)}</b><small>${plural(DT.tracksOfArtist(a.id).length, 'canción', 'canciones')}</small></a>`;
  DT.plCard = l => `<div class="card"><div class="cv"><a href="#/playlist/${enc(l.id)}" tabindex="-1" aria-hidden="true">${pic(DT.plCover(l))}</a><button class="cplay" data-plplay="${esc(l.id)}" aria-label="Reproducir ${esc(l.name)}">${icon('play')}</button></div>
    <a class="cap" href="#/playlist/${enc(l.id)}"><b>${esc(l.name)}</b><small>${plural(l.ids.length, 'canción', 'canciones')}</small></a></div>`;
  DT.empty = (title, text, action = '') => `<div class="empty"><h2>${title}</h2><p>${text}</p>${action}</div>`;
  DT.secHead = (title, link) => `<div class="sechead"><h2>${title}</h2>${link ? `<a class="more-link" href="${link[0]}">${link[1]}</a>` : ''}</div>`;
  DT.playBtns = (key, extra = '') => `<button class="btn solid" data-act="playctx" data-key="${key}">${icon('play')}Reproducir</button><button class="btn" data-act="shufctx" data-key="${key}">${icon('shuffle')}Aleatorio</button>${extra}`;

  /* ---------- menús ---------- */
  DT.addToList = (anchor, ids) => {
    const items = DT.pl.all().map(l => ({ label: l.name, icon: 'playlist', run: () => { const n = DT.pl.add(l.id, ids); toast(n ? `Añadido a «${l.name}».` : `Ya estaba en «${l.name}».`); } }));
    items.push(items.length ? '-' : null, { label: 'Nueva lista…', icon: 'plus', run: async () => {
      const name = await DT.ask({ title: 'Nueva lista', input: 'Nombre', ok: 'Crear' }); if (!name) return;
      DT.pl.create(name, ids); toast(`Lista «${name}» creada.`);
    } });
    DT.menu(anchor, items);
  };
  DT.trackMenu = (anchor, id, ctx = {}) => {
    const t = DT.track(id); if (!t) return;
    const al = DT.album(t.albumId);
    DT.menu(anchor, [
      { label: 'Reproducir', icon: 'play', run: () => P.play([id], id) },
      { label: 'Reproducir a continuación', icon: 'queue', run: () => { P.enqueue([id], true); toast('Se reproducirá a continuación.'); } },
      { label: 'Añadir a la cola', icon: 'plus', run: () => { P.enqueue([id]); toast('Añadida a la cola.'); } },
      { label: 'Añadir a una lista…', icon: 'playlist', run: () => setTimeout(() => DT.addToList(anchor.isConnected ? anchor : $('#view'), [id]), 0) },
      { label: DT.likes.has(id) ? 'Quitar de favoritos' : 'Añadir a favoritos', icon: 'heart', run: () => DT.likes.toggle(id) },
      '-',
      al && { label: 'Ir al álbum', icon: 'albums', run: () => (location.hash = `#/album/${enc(al.id)}`) },
      ...t.artistIds.filter(a => DT.artist(a)).slice(0, 3).map(a => ({ label: `Ir a ${DT.artist(a).name}`, icon: 'artist', run: () => (location.hash = `#/artist/${enc(a)}`) })),
      { label: 'Radio de esta canción', icon: 'radio', run: () => DT.radio('track', id) },
      { label: 'Información', icon: 'info', run: () => DT.infoDialog(id) },
      { label: 'Copiar enlace', icon: 'copy', run: () => DT.copyLink(`#/song/${enc(id)}`) },
      ctx.plist && '-',
      ctx.plist && { label: 'Subir en la lista', icon: 'up', run: () => DT.pl.move(ctx.plist, ctx.pidx, ctx.pidx - 1) },
      ctx.plist && { label: 'Bajar en la lista', icon: 'down', run: () => DT.pl.move(ctx.plist, ctx.pidx, ctx.pidx + 1) },
      ctx.plist && { label: 'Quitar de esta lista', icon: 'trash', danger: true, run: () => DT.pl.removeAt(ctx.plist, ctx.pidx) }
    ]);
  };
  DT.copyLink = hash => {
    const url = `${location.origin}${location.pathname}${hash}`;
    (navigator.clipboard?.writeText(url) || Promise.reject()).then(() => toast('Enlace copiado.'), () => toast('No se pudo copiar el enlace.', 'error'));
  };
  DT.infoDialog = id => {
    const t = DT.track(id); if (!t) return;
    const pl = DT.stats.counts(), n = pl.plays.get(id) || 0, last = pl.last.get(id);
    const row = (k, v) => (v ? `<dt>${k}</dt><dd>${v}</dd>` : '');
    const d = $('#dlg');
    d.className = 'sm';
    d.innerHTML = `<button class="x ib" data-close aria-label="Cerrar">${icon('close')}</button><h2>${esc(t.title)}</h2><dl class="info">
      ${row('Artistas', DT.artistLinks(t))}${row('Álbum', t.albumTitle ? `<a href="#/album/${enc(t.albumId)}">${esc(t.albumTitle)}</a>` : '')}${row('Género', esc(t.genre))}${row('Año', esc(t.year))}
      ${row('Duración', t.duration ? clock(t.duration) : '')}${row('Formato', esc(t.ext.toUpperCase()))}
      ${row('Reproducciones', n ? `${n} (este navegador)` : 'Ninguna todavía')}${row('Última vez', last ? new Date(last).toLocaleString('es') : '')}
      ${row('Créditos', esc(t.credits).replace(/\n/g, '<br>'))}</dl>`;
    d.showModal();
  };

  /* ---------- «radio» a partir de metadatos reales (artista, género, álbum); no es un recomendador ---------- */
  DT.radio = (kind, id) => {
    let seed = [], pool = [], name = '';
    if (kind === 'artist') { seed = DT.tracksOfArtist(id); name = DT.artist(id)?.name; const g = new Set(seed.map(t => t.genre).filter(Boolean)); pool = DT.S.tracks.filter(t => g.has(t.genre)); }
    else if (kind === 'album') { seed = DT.tracksOfAlbum(id); name = DT.album(id)?.title; const a = DT.album(id); pool = a ? a.artistIds.flatMap(x => DT.tracksOfArtist(x)) : []; }
    else { const t = DT.track(id); seed = t ? [t] : []; name = t?.title; pool = DT.S.tracks.filter(x => x.id !== id && (x.genre && x.genre === t.genre || x.artistIds.some(a => t.artistIds.includes(a)) || (x.albumId && x.albumId === t.albumId))); }
    const ids = [...new Set([...DT.shuffled(seed), ...DT.shuffled(pool)].map(t => t.id))].slice(0, 60);
    if (!ids.length) { toast('No hay suficientes canciones para crear la radio.'); return; }
    P.play(ids, ids[0], { shuffleOn: false });
    toast(`Radio de «${name}»: ${plural(ids.length, 'canción', 'canciones')} por artista y género.`);
  };

  /* ---------- reproductor visible ---------- */
  const setPressed = (sel, v) => $$(sel).forEach(b => b.setAttribute('aria-pressed', v));
  const paintState = () => {
    const playing = P.isPlaying(), busy = P.isLoading();
    $$('.playbtn').forEach(b => { b.innerHTML = icon(playing ? 'pause' : 'play'); b.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir'); b.toggleAttribute('aria-busy', busy); });
    document.body.dataset.playing = playing ? '1' : '0';
    $('#player').classList.toggle('mixing', P.fading());
  };
  const paintMode = () => {
    setPressed('.c-shuf', P.shuffle());
    $$('.c-rep').forEach(b => { b.setAttribute('aria-pressed', P.repeat() > 0); b.dataset.n = P.repeat() === 2 ? '1' : ''; b.title = ['Repetir', 'Repetir todo', 'Repetir una'][P.repeat()]; b.setAttribute('aria-label', b.title); });
  };
  const paintLike = () => {
    const id = P.current()?.id;
    setPressed('[data-cmd=like]', !!id && DT.likes.has(id));
    $$('[data-like]').forEach(b => b.setAttribute('aria-pressed', DT.likes.has(b.dataset.like)));
  };
  const paintVol = () => {
    $('#vol').value = P.muted() ? 0 : P.volume(); $('#vol').style.setProperty('--p', `${($('#vol').value) * 100}%`);
    $('#muteBtn').innerHTML = icon(P.muted() || P.volume() === 0 ? 'mute' : 'volume');
  };
  let drag = false;
  const paintTime = ({ pos, dur }) => {
    const ok = Number.isFinite(dur) && dur > 0, v = ok ? (pos / dur) * 1000 : 0;
    $$('[data-t=el]').forEach(e => { if (!drag) e.textContent = clock(pos); });
    $$('[data-t=tot]').forEach(e => (e.textContent = ok ? clock(dur) : (P.current()?.duration ? clock(P.current().duration) : '0:00')));
    if (!drag) $$('.seek').forEach(r => { r.value = v; r.style.setProperty('--p', `${v / 10}%`); r.disabled = !ok; });
  };
  const paintTrack = () => {
    const t = P.current();
    document.body.dataset.player = t ? (DT.settings.get('mini') ? 'mini' : 'on') : 'off';
    $('#player').dataset.mode = DT.settings.get('mini') ? 'mini' : 'full';
    if (!t) { $('#np').open && $('#np').close(); return; }
    $('#pTitle').textContent = t.title; $('#pArtist').textContent = t.who;
    $('#pArt').innerHTML = pic(t.cover);
    $('#npArt').innerHTML = pic(t.cover); $('#npTitle').textContent = t.title; $('#npArtist').innerHTML = DT.artistLinks(t);
    $$('.row[data-play]').forEach(r => { const on = r.dataset.play === t.id; r.classList.toggle('on', on); on ? r.setAttribute('aria-current', 'true') : r.removeAttribute('aria-current'); });
    paintLike(); paintTime(P.time());
    if (DT.settings.get('animPlayer') && DT.motion() === 'full') { $('#pArt').animate?.([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: DT.dur(), easing: 'cubic-bezier(.2,.7,.2,1)' }); }
    DT.tint(t.cover);
    renderPanes();
  };
  on('player:track', paintTrack);
  on('player:state', paintState);
  on('player:time', paintTime);
  on('player:mode', () => { paintMode(); });
  on('player:volume', paintVol);
  on('player:fade', paintState);
  on('likes', paintLike);
  on('player:sleep', () => { const s = P.sleep(); $('#xfBtn').classList.toggle('active', !!s); });

  /* color dominante de la portada para el fondo opcional (si el servidor de imágenes no permite leer píxeles, simplemente no se aplica) */
  const tints = new Map();
  DT.tint = src => {
    const r = document.documentElement;
    if (!src) { r.style.removeProperty('--tint'); return; }
    if (tints.has(src)) { r.style.setProperty('--tint', tints.get(src)); return; }
    if (DT.settings.get('bg') !== 'cover') return;
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 16;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 16, 16);
        const d = g.getImageData(0, 0, 16, 16).data; let R = 0, G = 0, B = 0, W = 0;
        for (let i = 0; i < d.length; i += 4) { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]), w = 0.15 + (mx - mn) / 255; R += d[i] * w; G += d[i + 1] * w; B += d[i + 2] * w; W += w; }
        const v = `rgb(${Math.round(R / W)} ${Math.round(G / W)} ${Math.round(B / W)})`;
        tints.set(src, v); r.style.setProperty('--tint', v);
      } catch { r.style.removeProperty('--tint'); }
    };
    img.onerror = () => r.style.removeProperty('--tint');
    img.src = src;
  };
  on('settings', k => { if (k === 'bg' || k === '*') DT.tint(DT.settings.get('bg') === 'cover' ? P.current()?.cover : ''); if (k === 'mini' || k === '*') paintTrack(); });

  /* ---------- panel contextual y panel del reproductor ampliado ---------- */
  const panes = {
    queue() {
      const es = P.entries(), qi = P.index();
      if (!es.length) return DT.empty('La cola está vacía', 'Reproduce algo o añade canciones desde el menú de cada fila.');
      const item = (e, i, past) => {
        const t = DT.track(e.id); if (!t) return '';
        return `<li class="qrow${i === qi ? ' on' : ''}${past ? ' past' : ''}" data-qi="${i}" data-dnd="queue" data-idx="${i}" draggable="${i === qi ? 'false' : 'true'}">
          <span class="grip" aria-hidden="true">${i === qi ? '' : icon('grip')}</span><span class="art">${pic(t.cover)}</span>
          <span class="t"><b>${esc(t.title)}</b><small>${esc(t.who)}</small></span>
          ${i === qi ? '' : `<span class="qact"><button data-qmove="${i}" data-d="-1" aria-label="Subir">${icon('up')}</button><button data-qmove="${i}" data-d="1" aria-label="Bajar">${icon('down')}</button><button data-qrm="${i}" aria-label="Quitar de la cola">${icon('close')}</button></span>`}</li>`;
      };
      const next = es.slice(qi + 1).map((e, k) => item(e, qi + 1 + k)).join('');
      const past = es.slice(0, qi).map((e, k) => item(e, k, true)).join('');
      const nx = DT.track(es[qi + 1]?.id);
      return `<div class="q-head"><span>${plural(es.length, 'canción', 'canciones')}</span><span class="qa"><button class="btn sm" data-act="queue-save">Guardar como lista</button><button class="btn sm" data-act="queue-clear">Vaciar</button></span></div>
        <h3 class="eyebrow">Ahora</h3><ul class="qlist">${item(es[qi], qi)}</ul>
        <h3 class="eyebrow">Siguiente${nx ? `: <span class="nx">${esc(nx.title)}</span>` : ''}</h3>
        ${next ? `<ul class="qlist">${next}</ul>` : `<p class="sub">No hay más canciones en la cola${P.repeat() === 1 ? '' : '. Activa repetir para volver a empezar'}.</p>`}
        ${past ? `<details class="prev"><summary>Anteriores (${qi})</summary><ul class="qlist">${past}</ul></details>` : ''}`;
    },
    now() {
      const t = P.current(); if (!t) return DT.empty('Nada sonando', 'Elige una canción para ver aquí su información.');
      const al = DT.album(t.albumId), credits = t.credits || al?.credits || '';
      return `<div class="now-card">${pic(t.cover)}<h3>${esc(t.title)}</h3><p>${DT.artistLinks(t)}</p>
        <dl class="info">${al ? `<dt>Álbum</dt><dd><a href="#/album/${enc(al.id)}">${esc(al.title)}</a></dd>` : ''}${t.genre ? `<dt>Género</dt><dd>${esc(t.genre)}</dd>` : ''}${t.year ? `<dt>Año</dt><dd>${esc(t.year)}</dd>` : ''}</dl>
        ${credits ? `<h3 class="eyebrow">Créditos</h3><p class="pre">${esc(credits)}</p>` : ''}</div>`;
    },
    lyrics() {
      const t = P.current(); if (!t) return DT.empty('Nada sonando', 'Elige una canción para ver su letra.');
      return t.lyrics ? `<p class="pre lyrics">${esc(t.lyrics)}</p>` : DT.empty('Sin letra', 'Esta canción no tiene letra. Se puede añadir desde Administrar → Editar canción.');
    },
    credits() {
      const t = P.current(); if (!t) return '';
      const al = DT.album(t.albumId), c = [t.credits && `<h3 class="eyebrow">Canción</h3><p class="pre">${esc(t.credits)}</p>`, al?.credits && `<h3 class="eyebrow">Álbum</h3><p class="pre">${esc(al.credits)}</p>`].filter(Boolean).join('');
      return c || DT.empty('Sin créditos', 'No hay créditos registrados para esta canción ni para su álbum.');
    },
    album() {
      const t = P.current(), al = t && DT.album(t.albumId);
      if (!al) return DT.empty('Sin álbum', 'Esta canción no pertenece a ningún álbum.');
      return `<div class="alb-mini"><h3>${esc(al.title)}</h3><p class="sub">${esc([al.who, al.year].filter(Boolean).join(' · '))}</p>${al.desc ? `<p class="sub">${esc(al.desc)}</p>` : ''}</div>${DT.rows(DT.tracksOfAlbum(al.id), { n: true, art: false })}`;
    }
  };
  let npTab = 'queue';
  const tabsState = (root, tab) => $$('[role=tab]', root).forEach(b => { const on = b.dataset.tab === tab; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
  function renderPanes() {
    const rp = $('#rp');
    if (!rp.hidden) { const tab = DT.settings.get('panelTab'); tabsState($('#rpTabs'), tab); $('#rpBody').innerHTML = panes[tab](); hydrate($('#rpBody')); }
    if ($('#np').open) { tabsState($('#npTabs'), npTab); $('#npPane').innerHTML = panes[npTab](); hydrate($('#npPane')); }
  }
  DT.renderPanes = renderPanes;
  on('player:queue', () => { const q = !$('#rp').hidden && DT.settings.get('panelTab') === 'queue' || $('#np').open && npTab === 'queue'; if (q) renderPanes(); });
  DT.setPanel = open => {
    DT.settings.set('panel', open);
    $('#rp').hidden = !open; document.body.dataset.panel = open ? 'open' : 'closed';
    $('#panelBtn').setAttribute('aria-pressed', open); renderPanes();
  };
  DT.setPanelTab = tab => { DT.settings.set('panelTab', tab); renderPanes(); };
  DT.setNpTab = tab => { npTab = tab; renderPanes(); };
  DT.openNp = tab => {
    if (!P.current()) return;
    if (tab) npTab = tab;
    const d = $('#np'); if (!d.open) d.showModal();
    if (DT.motion() === 'full') d.animate?.([{ transform: 'translateY(6%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: DT.dur(), easing: 'cubic-bezier(.2,.7,.2,1)' });
    paintTrack();
  };

  /* ---------- crossfade y temporizador a mano desde el reproductor ---------- */
  DT.xfPop = anchor => {
    const el = document.createElement('div'); el.className = 'pop xf'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Crossfade y temporizador');
    const s = DT.settings.all(), sl = P.sleep();
    el.innerHTML = `<div class="sw-row"><label for="xfOn">Crossfade</label><input id="xfOn" class="sw" type="checkbox" role="switch"${s.xfade ? ' checked' : ''}></div>
      <div class="xf-dur"><label for="xfSec">Duración</label><output id="xfOut">${s.xfadeSec} s</output></div>
      <input id="xfSec" class="rng" type="range" min="0" max="12" step="1" value="${s.xfadeSec}" aria-describedby="xfTicks" style="--p:${(s.xfadeSec / 12) * 100}%">
      <div class="ticks" id="xfTicks" aria-hidden="true"><span>0</span><span>3</span><span>6</span><span>9</span><span>12 s</span></div>
      ${P.canFade ? '' : '<p class="note">Este navegador no permite mezclar dos canciones (volumen fijo por el sistema). Las canciones seguirán una tras otra.</p>'}
      <hr><label for="sleepSel">Temporizador de apagado</label>
      <select id="sleepSel"><option value="0">Desactivado</option><option value="15">En 15 minutos</option><option value="30">En 30 minutos</option><option value="45">En 45 minutos</option><option value="60">En 1 hora</option><option value="eot">Al terminar la canción</option></select>
      <p class="sleepnote" id="sleepNote"></p><a class="more-link" href="#/settings/transitions">Más ajustes de transiciones y reproducción</a>`;
    DT.pop(anchor, el);
    const note = () => { const x = P.sleep(); $('#sleepNote', el).textContent = x?.at ? `Se apagará a las ${new Date(x.at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}.` : x?.eot ? 'Se detendrá al terminar esta canción.' : ''; };
    if (sl) $('#sleepSel', el).value = sl.eot ? 'eot' : String(Math.round((sl.at - Date.now()) / 60000 / 15) * 15 || 15);
    note();
    $('#xfOn', el).onchange = e => DT.settings.set('xfade', e.target.checked);
    $('#xfSec', el).oninput = e => { DT.settings.set('xfadeSec', +e.target.value); $('#xfOut', el).textContent = `${e.target.value} s`; e.target.style.setProperty('--p', `${(e.target.value / 12) * 100}%`); };
    $('#sleepSel', el).onchange = e => { P.setSleep(e.target.value === 'eot' ? 'eot' : +e.target.value); note(); };
    $('#xfOn', el).focus();
  };

  /* actualiza el aspecto del botón de crossfade según el ajuste */
  const paintXf = () => { $$('#xfBtn,#npXf').forEach(b => b.setAttribute('aria-pressed', DT.settings.get('xfade') && DT.settings.get('xfadeSec') > 0)); };
  on('settings', paintXf);

  DT.initPlayerUi = () => {
    hydrate(); paintState(); paintMode(); paintVol(); paintXf();
    $('#player').hidden = !P.current(); paintTrack();
    document.body.dataset.panel = DT.settings.get('panel') ? 'open' : 'closed';
    $('#rp').hidden = !DT.settings.get('panel'); $('#panelBtn').setAttribute('aria-pressed', DT.settings.get('panel')); renderPanes();
  };
  DT.seekDrag = v => { drag = v; };
  DT.seekPreview = e => {
    const t = P.time(), dur = Number.isFinite(t.dur) ? t.dur : 0, pos = (e.target.value / 1000) * dur;
    $$('[data-t=el]').forEach(x => (x.textContent = clock(pos))); $$('.seek').forEach(r => { if (r !== e.target) r.value = e.target.value; r.style.setProperty('--p', `${e.target.value / 10}%`); });
  };
  DT.long = long; DT.store = store; DT.emit = emit;
})();
