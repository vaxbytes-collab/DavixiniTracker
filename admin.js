(() => {
  'use strict';
  const C = window.DAVIXINI_SUPABASE_CONFIG;
  const sb = supabase.createClient(C.url, C.publishableKey);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = $('#adm');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const TABLE = { tracks: 'library_tracks', albums: 'library_albums', artists: 'library_artists' };
  const AUDIO_EXT = ['mp3', 'flac', 'wav', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'webm'];
  const MAX = 52428800; // límite del bucket (supabase-setup.sql)
  let artists = [], albums = [], tracks = [], tab = 'upload', note = '', noteErr = false, filter = '';
  const sel = new Set();
  let pending = []; // cola de subida

  const say = (t, err = false) => { note = t; noteErr = err; const l = $('#log'); if (l) { l.textContent = t; l.className = `status${err ? ' err' : ''}`; l.hidden = !t; } };
  const ext = f => (f.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin');
  const nameOf = r => r.data.name || r.data.title || r.id;
  const opts = (list, label, chosen = []) => list.map(r => `<option value="${esc(r.id)}"${chosen.includes(r.id) ? ' selected' : ''}>${esc(label(r))}</option>`).join('');
  const names = r => (r.data.artistIds || []).map(id => artists.find(a => a.id === id)?.data.name).filter(Boolean).join(', ');
  const mb = n => `${(n / 1048576).toFixed(1)} MB`;
  const url = p => (p ? `${C.url}/storage/v1/object/public/${C.bucket}/${p.split('/').map(encodeURIComponent).join('/')}` : '');
  const now = () => new Date().toISOString();

  const ask = ({ title, text = '', ok = 'Aceptar', danger = false }) => new Promise(res => {
    const d = $('#ask');
    d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2><p class="sub">${esc(text)}</p><p class="acts"><button class="btn${danger ? ' danger' : ' solid'}" value="ok">${esc(ok)}</button><button class="btn" value="no">Cancelar</button></p></form>`;
    d.returnValue = 'no'; d.onclose = () => res(d.returnValue === 'ok'); d.showModal();
  });
  const toast = (t, kind) => { const e = $('#toast'); e.textContent = t; e.dataset.kind = kind || ''; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (e.hidden = true), 3200); };

  const duration = f => new Promise(res => {
    const a = new Audio(), u = URL.createObjectURL(f);
    const done = d => { URL.revokeObjectURL(u); res(Number.isFinite(d) ? d : 0); };
    a.preload = 'metadata'; a.onloadedmetadata = () => done(a.duration); a.onerror = () => done(0); a.src = u;
  });
  /* subida con progreso real (XMLHttpRequest permite medir los bytes enviados) */
  async function upload(path, file, onProgress) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('La sesión ha caducado. Vuelve a entrar.');
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open('POST', `${C.url}/storage/v1/object/${C.bucket}/${path.split('/').map(encodeURIComponent).join('/')}`);
      x.setRequestHeader('apikey', C.publishableKey); x.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      x.setRequestHeader('x-upsert', 'true'); x.setRequestHeader('cache-control', 'max-age=31536000'); x.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      x.upload.onprogress = e => e.lengthComputable && onProgress?.(e.loaded / e.total);
      x.onload = () => (x.status >= 200 && x.status < 300 ? resolve(path) : reject(new Error(`Storage respondió ${x.status}: ${(x.responseText || '').slice(0, 160)}`)));
      x.onerror = () => reject(new Error('Error de red al subir el archivo.'));
      x.send(file);
    });
  }
  async function refresh() {
    const res = await Promise.all([sb.from('library_artists').select('id,data'), sb.from('library_albums').select('id,data,cover_path'), sb.from('library_tracks').select('id,album_id,data,audio_path,artwork_path')]);
    for (const r of res) if (r.error) throw r.error;
    [artists, albums, tracks] = res.map(r => r.data);
    artists.sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'es'));
    tracks.sort((a, b) => (b.data.addedAt || 0) - (a.data.addedAt || 0));
  }

  function loginView() {
    root.innerHTML = `<h1>Entrar</h1><p id="log" class="status${noteErr ? ' err' : ''}"${note ? '' : ' hidden'}>${esc(note)}</p><p class="sub">Solo las cuentas autorizadas en Supabase pueden publicar.</p>
      <form id="fLogin" class="panel"><label for="em">Correo</label><input id="em" name="email" type="email" autocomplete="username" required>
      <label for="pw">Contraseña</label><input id="pw" name="password" type="password" autocomplete="current-password" required>
      <p><button class="btn solid">Iniciar sesión</button></p></form>`;
  }

  /* ---------- vistas por pestaña ---------- */
  const TABS = [['upload', 'Subir canciones'], ['tracks', 'Canciones'], ['albums', 'Álbumes'], ['artists', 'Artistas'], ['review', 'Revisión']];
  function view() {
    const body = { upload: uploadTab, tracks: () => listTab('tracks'), albums: () => listTab('albums'), artists: () => listTab('artists'), review: reviewTab }[tab]();
    root.innerHTML = `<h1>Administrar</h1><p id="log" class="status${noteErr ? ' err' : ''}"${note ? '' : ' hidden'}>${esc(note)}</p>
      <div class="atabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${k === tab}">${l}${k === 'tracks' ? ` (${tracks.length})` : k === 'albums' ? ` (${albums.length})` : k === 'artists' ? ` (${artists.length})` : ''}</button>`).join('')}</div>${body}`;
    if (tab === 'upload') drawQueue();
  }
  const uploadTab = () => `<form id="fTrack" class="panel">
      <label class="drop" id="drop"><input type="file" id="files" accept="audio/*,.flac,.opus,.m4a" multiple>Arrastra aquí los archivos de audio o pulsa para elegirlos<br><small>${AUDIO_EXT.join(', ')} · máximo ${mb(MAX)} por archivo</small></label>
      <ul class="queue" id="queue"></ul>
      <div class="grid2"><div><label for="tAlbum">Álbum</label><select id="tAlbum"><option value="">Sin álbum</option>${opts(albums, r => r.data.title || r.id)}</select>
      <label for="tGenre">Género</label><input type="text" id="tGenre"><label for="tYear">Año</label><input type="number" id="tYear" min="1900" max="2100"></div>
      <div><label for="tArtists">Artistas (hasta 10; Ctrl o ⌘ para elegir varios)</label><select id="tArtists" multiple size="7">${opts(artists, nameOf)}</select></div></div>
      <p><button class="btn solid" id="goUpload" disabled>Subir</button></p></form>`;
  function drawQueue() {
    const q = $('#queue'); if (!q) return;
    q.innerHTML = pending.map((p, i) => `<li data-i="${i}"><input type="text" data-title="${i}" value="${esc(p.title)}" aria-label="Título"${p.state === 'up' || p.state === 'ok' ? ' disabled' : ''}><span class="meta">${mb(p.file.size)}${p.dur ? ` · ${Math.floor(p.dur / 60)}:${String(Math.floor(p.dur % 60)).padStart(2, '0')}` : ''}</span>
      <div class="prog ${p.state === 'ok' ? 'done' : p.state === 'bad' ? 'fail' : ''}"><i style="width:${Math.round(p.pct * 100)}%"></i></div>${p.err ? `<span class="st-bad">${esc(p.err)}</span>` : ''}</li>`).join('');
    const b = $('#goUpload'); if (b) b.disabled = !pending.some(p => p.state === 'new');
  }
  async function addFiles(list) {
    for (const f of list) {
      const e = ext(f); let err = '';
      if (!AUDIO_EXT.includes(e) && !f.type.startsWith('audio/')) err = 'Formato no admitido.';
      else if (f.size > MAX) err = `Supera el límite de ${mb(MAX)} del bucket (${mb(f.size)}). Comprímelo o sube el límite en Supabase → Storage.`;
      else if (f.size === 0) err = 'El archivo está vacío.';
      pending.push({ file: f, title: f.name.replace(/\.[^.]+$/, ''), state: err ? 'bad' : 'new', pct: 0, err, dur: err ? 0 : await duration(f) });
      if (!err && !pending.at(-1).dur) pending.at(-1).err = 'No se pudo leer la duración: el navegador quizá no reproduce este formato (se subirá igualmente).';
    }
    drawQueue();
  }
  const filtered = k => {
    const l = { tracks, albums, artists }[k], n = norm(filter);
    return n ? l.filter(r => norm(`${nameOf(r)} ${names(r)} ${r.data.genre || ''}`).includes(n)) : l;
  };
  function listTab(k) {
    const list = filtered(k), singular = { tracks: 'canción', albums: 'álbum', artists: 'artista' }[k];
    const newForm = k === 'artists' ? `<form id="fArtist" class="panel"><h2>Nuevo artista</h2><div class="grid2"><div><label>Nombre</label><input type="text" name="name" required></div><div><label>Imagen (opcional)</label><input type="file" name="image" accept="image/*"></div></div><label>Biografía</label><textarea name="bio" rows="3"></textarea><p><button class="btn solid">Crear artista</button></p></form>`
      : k === 'albums' ? `<form id="fAlbum" class="panel"><h2>Nuevo álbum</h2><div class="grid2"><div><label>Título</label><input type="text" name="title" required><label>Año</label><input type="number" name="year" min="1900" max="2100"><label>Género</label><input type="text" name="genre"></div>
        <div><label>Artistas</label><select name="artists" multiple size="5">${opts(artists, nameOf)}</select><label>Portada</label><input type="file" name="cover" accept="image/*"></div></div><label>Descripción</label><textarea name="desc" rows="2"></textarea><p><button class="btn solid">Crear álbum</button></p></form>` : '';
    const bulk = sel.size ? `<div class="bulk" role="toolbar"><b>${sel.size} seleccionados</b>${k === 'tracks' ? '<button class="btn sm" data-act="bulk-album">Asignar álbum</button><button class="btn sm" data-act="bulk-genre">Cambiar género</button>' : ''}<button class="btn sm danger" data-act="bulk-del">Borrar</button><button class="btn sm" data-act="bulk-clear">Quitar selección</button></div>` : '';
    return `${newForm}<div class="toolbar"><label class="filter"><input id="aFilter" type="search" placeholder="Filtrar" value="${esc(filter)}" aria-label="Filtrar"></label>${list.length ? `<button class="btn sm" data-act="sel-all" data-k="${k}">Seleccionar los ${list.length}</button>` : ''}</div>${bulk}
      <ul class="list alist">${list.map(r => `<li class="row"><input class="sel" type="checkbox" data-sel="${esc(r.id)}" aria-label="Seleccionar"${sel.has(r.id) ? ' checked' : ''}>${thumb(k, r)}<span class="t"><b>${esc(nameOf(r))}</b><small>${esc(k === 'tracks' ? `${names(r)}${r.album_id ? ` · ${albums.find(a => a.id === r.album_id)?.data.title || 'álbum'}` : ''}` : k === 'albums' ? names(r) : '')}</small></span><button class="btn sm" data-act="edit" data-k="${k}" data-id="${esc(r.id)}">Editar</button><button class="btn sm" data-act="del" data-k="${k}" data-id="${esc(r.id)}">Borrar</button></li>`).join('') || `<li class="sub">No hay ${singular === 'canción' ? 'canciones' : singular + 's'}.</li>`}</ul>`;
  }
  const thumb = (k, r) => {
    const p = k === 'albums' ? r.cover_path : k === 'tracks' ? (albums.find(a => a.id === r.album_id)?.cover_path || r.artwork_path) : r.data.imagePath;
    return k === 'artists' && !p ? `<span class="art"><span class="av" style="font-size:1rem">${esc([...nameOf(r)][0] || '')}</span></span>` : p ? `<span class="art"><img src="${esc(url(p))}" alt=""></span>` : '<span class="art"><div class="ph"></div></span>';
  };
  /* revisión: duplicados y metadatos incompletos (solo informa; no borra nada) */
  function reviewTab() {
    const groups = new Map();
    for (const t of tracks) { const k = `${norm(t.data.title)}|${(t.data.artistIds || []).slice().sort().join(',')}`; (groups.get(k) || groups.set(k, []).get(k)).push(t); }
    const dupes = [...groups.values()].filter(g => g.length > 1);
    const sin = (label, list) => `<li><b>${label}</b>: ${list.length ? `${list.length} — ${list.slice(0, 8).map(r => esc(nameOf(r))).join(', ')}${list.length > 8 ? '…' : ''}` : 'ninguno'}</li>`;
    return `<h2>Posibles duplicados</h2><p class="sub">Canciones con el mismo título y los mismos artistas.</p>${dupes.length ? `<ul class="dupes">${dupes.map(g => `<li><b>${esc(g[0].data.title)}</b> ×${g.length}${g.map(t => `<small>${esc(t.audio_path)} · ${t.album_id ? esc(albums.find(a => a.id === t.album_id)?.data.title || 'álbum') : 'sin álbum'} · <button class="btn sm" data-act="edit" data-k="tracks" data-id="${esc(t.id)}">Editar</button> <button class="btn sm" data-act="del" data-k="tracks" data-id="${esc(t.id)}">Borrar</button></small>`).join('')}</li>`).join('')}</ul>` : '<p>No se han encontrado duplicados.</p>'}
      <h2>Metadatos incompletos</h2><ul class="dupes">${sin('Canciones sin artista', tracks.filter(t => !(t.data.artistIds || []).length))}${sin('Canciones sin álbum', tracks.filter(t => !t.album_id))}${sin('Canciones sin género', tracks.filter(t => !t.data.genre))}${sin('Canciones sin duración', tracks.filter(t => !t.data.duration))}${sin('Álbumes sin portada', albums.filter(a => !a.cover_path))}${sin('Álbumes sin canciones', albums.filter(a => !tracks.some(t => t.album_id === a.id)))}${sin('Artistas sin imagen', artists.filter(a => !a.data.imagePath))}</ul>`;
  }

  /* ---------- escritura ---------- */
  const forms = {
    async fLogin(e) {
      const fd = new FormData(e.target);
      const { error } = await sb.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('password') });
      if (error) { say(`No se pudo entrar: ${error.message}`, true); return; }
      note = ''; boot();
    },
    async fAlbum(e) {
      const fd = new FormData(e.target), id = crypto.randomUUID(), cover = fd.get('cover');
      try {
        if (cover?.size && !cover.type.startsWith('image/')) throw new Error('La portada debe ser una imagen.');
        const cover_path = cover?.size ? await upload(`covers/${id}/cover.${ext(cover)}`, cover) : null;
        const { error } = await sb.from('library_albums').insert({ id, cover_path, data: { title: fd.get('title').trim(), artistIds: fd.getAll('artists').slice(0, 10), year: fd.get('year') || '', genre: fd.get('genre') || '', description: fd.get('desc').trim(), trackIds: [] } });
        if (error) throw error; say('Álbum creado.');
      } catch (err) { say(`Error: ${err.message || err}`, true); }
      await refresh(); view();
    },
    async fArtist(e) {
      const fd = new FormData(e.target), id = crypto.randomUUID(), img = fd.get('image');
      try {
        if (img?.size && !img.type.startsWith('image/')) throw new Error('La imagen no es válida.');
        const imagePath = img?.size ? await upload(`artists/${id}/image.${ext(img)}`, img) : '';
        const { error } = await sb.from('library_artists').insert({ id, data: { name: fd.get('name').trim(), bio: fd.get('bio').trim(), ...(imagePath ? { imagePath } : {}) } });
        if (error) throw error; say('Artista creado.');
      } catch (err) { say(`Error: ${err.message || err}`, true); }
      await refresh(); view();
    }
  };
  async function doUpload() {
    const album = $('#tAlbum').value || null, artistIds = [...$('#tArtists').selectedOptions].map(o => o.value).slice(0, 10), genre = $('#tGenre').value, year = $('#tYear').value, added = [];
    const todo = pending.filter(p => p.state === 'new'); $('#goUpload').disabled = true;
    let n = 0;
    for (const p of todo) {
      const id = crypto.randomUUID(); p.state = 'up'; p.err = ''; n++; say(`Subiendo ${n} de ${todo.length}: ${p.file.name}`); drawQueue();
      try {
        const audio_path = await upload(`audio/${id}/audio.${ext(p.file)}`, p.file, f => { p.pct = f; const bar = $(`li[data-i="${pending.indexOf(p)}"] .prog i`); if (bar) bar.style.width = `${Math.round(f * 100)}%`; });
        const { error } = await sb.from('library_tracks').insert({ id, album_id: album, audio_path, data: { title: p.title.trim() || p.file.name, artistIds, genre, year, duration: p.dur, addedAt: Date.now() + n } });
        if (error) { await sb.storage.from(C.bucket).remove([audio_path]); throw error; }
        added.push(id); p.state = 'ok'; p.pct = 1;
      } catch (err) { p.state = 'bad'; p.err = err.message || String(err); }
      drawQueue();
    }
    if (album && added.length) {
      const a = albums.find(x => x.id === album);
      const { error } = await sb.from('library_albums').update({ data: { ...a.data, trackIds: [...(a.data.trackIds || []), ...added] }, updated_at: now() }).eq('id', album);
      if (error) say(`Las canciones se subieron pero no se pudo actualizar el orden del álbum: ${error.message}`, true);
    }
    const failed = todo.filter(p => p.state === 'bad').length;
    say(`Publicadas ${added.length} de ${todo.length}.${failed ? ` ${failed} con error (revisa la lista).` : ''}`, !!failed);
    await refresh(); const keep = pending.filter(p => p.state === 'bad'); pending = keep; tab = failed ? 'upload' : 'tracks'; view();
  }
  const patch = (k, id, data, extra = {}) => sb.from(TABLE[k]).update({ ...extra, data, updated_at: now() }).eq('id', id);
  async function removeRows(k, ids) {
    const rows = ids.map(id => ({ tracks, albums, artists }[k].find(r => r.id === id))).filter(Boolean);
    const files = rows.flatMap(r => [r.audio_path, r.artwork_path, r.cover_path, r.data.imagePath]).filter(Boolean);
    if (k === 'albums') for (const id of ids) await sb.from('library_tracks').update({ album_id: null }).eq('album_id', id);
    if (k === 'tracks') for (const a of albums) { const t = (a.data.trackIds || []).filter(x => !ids.includes(x)); if (t.length !== (a.data.trackIds || []).length) await patch('albums', a.id, { ...a.data, trackIds: t }); }
    if (k === 'artists') {
      for (const t of tracks) if ((t.data.artistIds || []).some(x => ids.includes(x))) await patch('tracks', t.id, { ...t.data, artistIds: t.data.artistIds.filter(x => !ids.includes(x)) });
      for (const a of albums) if ((a.data.artistIds || []).some(x => ids.includes(x))) await patch('albums', a.id, { ...a.data, artistIds: a.data.artistIds.filter(x => !ids.includes(x)) });
    }
    const { error } = await sb.from(TABLE[k]).delete().in('id', ids);
    if (error) throw error;
    if (files.length) { const r = await sb.storage.from(C.bucket).remove(files); if (r.error) say(`Se borró el registro pero algún archivo no se pudo eliminar: ${r.error.message}`, true); }
  }
  async function act(btn) {
    const { act: a, k, id } = btn.dataset;
    try {
      if (a === 'edit') return editDialog(k, { tracks, albums, artists }[k].find(r => r.id === id));
      if (a === 'del') {
        const row = { tracks, albums, artists }[k].find(r => r.id === id);
        if (!await ask({ title: `¿Borrar «${nameOf(row)}»?`, text: k === 'albums' ? 'Las canciones del álbum no se borran: quedan sin álbum.' : 'Se elimina también el archivo almacenado. No se puede deshacer.', ok: 'Borrar', danger: true })) return;
        await removeRows(k, [id]); sel.delete(id); say('Borrado.');
      } else if (a === 'sel-all') { filtered(k).forEach(r => sel.add(r.id)); view(); return; }
      else if (a === 'bulk-clear') { sel.clear(); view(); return; }
      else if (a === 'bulk-del') {
        const ids = [...sel]; if (!await ask({ title: `¿Borrar ${ids.length} elementos?`, text: 'No se puede deshacer.', ok: 'Borrar todo', danger: true })) return;
        await removeRows(tab, ids); sel.clear(); say(`${ids.length} elementos borrados.`);
      } else if (a === 'bulk-genre') {
        const g = prompt('Nuevo género para los seleccionados (vacío para quitarlo)'); if (g === null) return;
        for (const id of sel) { const t = tracks.find(x => x.id === id); await patch('tracks', id, { ...t.data, genre: g.trim() }); } say('Género actualizado.');
      } else if (a === 'bulk-album') {
        const t = prompt(`Título exacto del álbum:\n${albums.map(x => `· ${x.data.title}`).join('\n')}`); if (t === null) return;
        const al = albums.find(x => norm(x.data.title) === norm(t)); if (!al) return say('No existe un álbum con ese título.', true);
        const ids = [...sel];
        for (const old of albums) if (old.id !== al.id) { const keep = (old.data.trackIds || []).filter(x => !ids.includes(x)); if (keep.length !== (old.data.trackIds || []).length) await patch('albums', old.id, { ...old.data, trackIds: keep }); }
        for (const id of ids) await sb.from('library_tracks').update({ album_id: al.id, updated_at: now() }).eq('id', id);
        await patch('albums', al.id, { ...al.data, trackIds: [...new Set([...(al.data.trackIds || []), ...ids])] }); say('Álbum asignado.');
      }
    } catch (err) { say(`Error: ${err.message || err}`, true); }
    await refresh(); view();
  }

  const FIELDS = {
    tracks: [['title', 'Título', 'text'], ['album_id', 'Álbum', 'album'], ['artistIds', 'Artistas', 'artists'], ['genre', 'Género', 'text'], ['year', 'Año', 'number'], ['credits', 'Créditos', 'area'], ['lyrics', 'Letra', 'area']],
    albums: [['title', 'Título', 'text'], ['artistIds', 'Artistas', 'artists'], ['year', 'Año', 'number'], ['genre', 'Género', 'text'], ['description', 'Descripción', 'area'], ['credits', 'Créditos', 'area'], ['notes', 'Notas', 'area'], ['cover', 'Cambiar portada', 'file'], ['order', 'Orden de las canciones', 'order']],
    artists: [['name', 'Nombre', 'text'], ['bio', 'Biografía', 'area'], ['credits', 'Créditos', 'area'], ['image', 'Cambiar imagen', 'file']]
  };
  let editing = null, order = [];
  function drawOrder() {
    $('#orderList').innerHTML = order.map((id, i) => `<li><span>${i + 1}. ${esc(tracks.find(t => t.id === id)?.data.title || id)}</span><button type="button" class="btn sm" data-o="${i}" data-d="-1"${i ? '' : ' disabled'} aria-label="Subir">↑</button><button type="button" class="btn sm" data-o="${i}" data-d="1"${i < order.length - 1 ? '' : ' disabled'} aria-label="Bajar">↓</button></li>`).join('') || '<li class="sub">Este álbum no tiene canciones.</li>';
  }
  function editDialog(k, row) {
    editing = { k, row };
    const field = ([key, label, type]) => {
      const v = key === 'album_id' ? row.album_id : row.data[key];
      let el;
      if (type === 'album') el = `<select name="${key}"><option value="">Sin álbum</option>${albums.map(a => `<option value="${esc(a.id)}"${a.id === v ? ' selected' : ''}>${esc(a.data.title || a.id)}</option>`).join('')}</select>`;
      else if (type === 'artists') el = `<select name="${key}" multiple size="5">${opts(artists, nameOf, v || [])}</select>`;
      else if (type === 'area') el = `<textarea name="${key}" rows="${key === 'lyrics' ? 6 : 3}">${esc(v)}</textarea>`;
      else if (type === 'file') el = `<input type="file" name="${key}" accept="image/*">`;
      else if (type === 'order') return `<label>${label}</label><ul class="order" id="orderList"></ul>`;
      else el = `<input type="${type}" name="${key}" value="${esc(v)}"${key === 'title' || key === 'name' ? ' required' : ''}>`;
      return `<label>${label}</label>${el}`;
    };
    $('#editBody').innerHTML = `<h2>Editar</h2>${FIELDS[k].map(field).join('')}<p class="acts"><button class="btn solid">Guardar</button><button type="button" class="btn" data-close>Cancelar</button></p>`;
    if (k === 'albums') {
      const own = tracks.filter(t => t.album_id === row.id), ord = row.data.trackIds || [];
      order = own.map(t => t.id).sort((a, b) => { const i = ord.indexOf(a), j = ord.indexOf(b); return (i < 0 ? 1e9 : i) - (j < 0 ? 1e9 : j); }); drawOrder();
    }
    $('#dlg').showModal();
  }
  $('#fEdit').addEventListener('submit', async e => {
    e.preventDefault();
    const { k, row } = editing, fd = new FormData(e.target), data = { ...row.data }, p = {};
    const btn = e.submitter; if (btn) btn.disabled = true;
    try {
      for (const [key, , type] of FIELDS[k]) {
        if (key === 'album_id') p.album_id = fd.get(key) || null;
        else if (key === 'artistIds') data.artistIds = fd.getAll(key).slice(0, 10);
        else if (type === 'order') data.trackIds = order;
        else if (type === 'file') {
          const f = fd.get(key); if (!(f && f.size)) continue;
          if (!f.type.startsWith('image/')) throw new Error('El archivo elegido no es una imagen.');
          if (k === 'albums') { p.cover_path = await upload(`covers/${row.id}/${Date.now()}.${ext(f)}`, f); if (row.cover_path) await sb.storage.from(C.bucket).remove([row.cover_path]); }
          else { data.imagePath = await upload(`artists/${row.id}/${Date.now()}.${ext(f)}`, f); if (row.data.imagePath) await sb.storage.from(C.bucket).remove([row.data.imagePath]); }
        } else data[key] = String(fd.get(key) ?? '').trim();
      }
      if (k === 'tracks' && p.album_id !== row.album_id) {
        for (const a of albums) { const ids = a.data.trackIds || []; if (a.id === row.album_id && ids.includes(row.id)) await patch('albums', a.id, { ...a.data, trackIds: ids.filter(x => x !== row.id) }); if (a.id === p.album_id && !ids.includes(row.id)) await patch('albums', a.id, { ...a.data, trackIds: [...ids, row.id] }); }
      }
      const { error } = await patch(k, row.id, data, p); if (error) throw error;
      say('Cambios guardados.'); $('#dlg').close();
    } catch (err) { say(`Error: ${err.message || err}`, true); $('#dlg').close(); }
    await refresh(); view();
  });
  $('#dlg').addEventListener('click', e => {
    const c = e.target.closest('[data-close]'); if (c) $('#dlg').close();
    const o = e.target.closest('[data-o]'); if (o) { const i = +o.dataset.o, j = i + +o.dataset.d; [order[i], order[j]] = [order[j], order[i]]; drawOrder(); }
  });

  /* ---------- eventos ---------- */
  root.addEventListener('submit', async e => {
    const h = forms[e.target.id]; if (!h) return;
    e.preventDefault(); const b = e.target.querySelector('button'); b.disabled = true;
    try { await h(e); } finally { if (b.isConnected) b.disabled = false; }
  });
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; sel.clear(); filter = ''; view(); return; }
    if (e.target.closest('#goUpload')) { e.preventDefault(); doUpload(); return; }
    const b = e.target.closest('[data-act]'); if (b) act(b);
  });
  root.addEventListener('change', e => {
    if (e.target.id === 'files') { addFiles([...e.target.files]); e.target.value = ''; }
    else if (e.target.dataset.sel) { e.target.checked ? sel.add(e.target.dataset.sel) : sel.delete(e.target.dataset.sel); view(); }
  });
  root.addEventListener('input', e => {
    if (e.target.dataset.title !== undefined) pending[+e.target.dataset.title].title = e.target.value;
    else if (e.target.id === 'aFilter') { filter = e.target.value; const pos = e.target.selectionStart; view(); const f = $('#aFilter'); f.focus(); f.setSelectionRange(pos, pos); }
  });
  root.addEventListener('dragover', e => { const d = e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
  root.addEventListener('dragleave', e => e.target.closest('#drop')?.classList.remove('over'));
  root.addEventListener('drop', e => { const d = e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.remove('over'); addFiles([...e.dataTransfer.files]); } });
  $('#out').onclick = async () => { await sb.auth.signOut(); $('#out').hidden = true; loginView(); };

  async function boot() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { loginView(); return; }
    $('#out').hidden = false;
    const { data: ok } = await sb.rpc('is_library_admin');
    if (!ok) { root.innerHTML = '<h1>Sin permiso</h1><p class="sub">Esta cuenta no es administradora. Añade su UUID a la tabla library_admins en Supabase.</p>'; return; }
    try { await refresh(); view(); } catch (err) { root.innerHTML = `<h1>Error</h1><p class="sub">${esc(err.message || err)}</p>`; }
  }
  boot();
})();
