(() => {
  'use strict';
  const C = window.DAVIXINI_SUPABASE_CONFIG;
  const sb = supabase.createClient(C.url, C.publishableKey);
  const $ = s => document.querySelector(s);
  const root = $('#adm');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TABLE = { tracks: 'library_tracks', albums: 'library_albums', artists: 'library_artists' };
  let artists = [], albums = [], tracks = [], note = '';
  const say = t => { note = t; const l = $('#log'); if (l) l.textContent = t; };
  const ext = f => (f.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin');
  const nameOf = r => r.data.name || r.data.title || r.id;
  const opts = (list, label) => list.map(r => `<option value="${esc(r.id)}">${esc(label(r))}</option>`).join('');
  const names = r => (r.data.artistIds || []).map(id => artists.find(a => a.id === id)?.data.name).filter(Boolean).join(', ');
  const duration = f => new Promise(res => {
    const a = new Audio(), u = URL.createObjectURL(f);
    const done = d => { URL.revokeObjectURL(u); res(d || 0); };
    a.preload = 'metadata'; a.onloadedmetadata = () => done(a.duration); a.onerror = () => done(0); a.src = u;
  });
  async function upload(path, file) {
    const { error } = await sb.storage.from(C.bucket).upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream', cacheControl: '31536000' });
    if (error) throw error;
    return path;
  }
  async function refresh() {
    const res = await Promise.all([
      sb.from('library_artists').select('id,data'),
      sb.from('library_albums').select('id,data,cover_path'),
      sb.from('library_tracks').select('id,album_id,data,audio_path,artwork_path')
    ]);
    for (const r of res) if (r.error) throw r.error;
    [artists, albums, tracks] = res.map(r => r.data);
    artists.sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'es'));
    tracks.sort((a, b) => (b.data.addedAt || 0) - (a.data.addedAt || 0));
  }

  function loginView() {
    root.innerHTML = `<h1>Entrar</h1><p class="sub" id="log">${esc(note || 'Solo las cuentas autorizadas en Supabase pueden publicar.')}</p>
      <form id="fLogin"><label for="em">Correo</label><input id="em" name="email" type="email" autocomplete="username" required>
      <label for="pw">Contraseña</label><input id="pw" name="password" type="password" autocomplete="current-password" required>
      <p><button class="btn">Iniciar sesión</button></p></form>`;
  }

  function view() {
    root.innerHTML = `<h1>Administrar</h1><p class="sub" id="log">${esc(note || 'Solo lo que subas aquí aparece en la web.')}</p>
      <h2>Subir canciones</h2>
      <form id="fTrack"><label>Archivos de audio (el título sale del nombre del archivo)</label><input type="file" name="files" accept="audio/*" multiple required>
      <label>Álbum</label><select name="album"><option value="">Sin álbum</option>${opts(albums, r => r.data.title || r.id)}</select>
      <label>Artistas (hasta 10; Ctrl o ⌘ para elegir varios)</label><select name="artists" multiple size="5">${opts(artists, nameOf)}</select>
      <label>Género</label><input type="text" name="genre"><label>Año</label><input type="number" name="year" min="1900" max="2100">
      <p><button class="btn">Subir</button></p></form>
      <h2>Nuevo artista</h2>
      <form id="fArtist"><label>Nombre</label><input type="text" name="name" required><label>Biografía</label><textarea name="bio" rows="3"></textarea><p><button class="btn">Crear artista</button></p></form>
      <h2>Nuevo álbum</h2>
      <form id="fAlbum"><label>Título</label><input type="text" name="title" required>
      <label>Artistas</label><select name="artists" multiple size="4">${opts(artists, nameOf)}</select>
      <label>Año</label><input type="number" name="year" min="1900" max="2100"><label>Género</label><input type="text" name="genre">
      <label>Descripción</label><textarea name="desc" rows="3"></textarea><label>Portada</label><input type="file" name="cover" accept="image/*">
      <p><button class="btn">Crear álbum</button></p></form>
      ${section('tracks', `Canciones (${tracks.length})`, tracks, r => `${names(r)}${r.album_id ? ' · en un álbum' : ''}`)}
      ${section('albums', `Álbumes (${albums.length})`, albums, names)}
      ${section('artists', `Artistas (${artists.length})`, artists, () => '')}`;
  }
  const section = (kind, title, list, sub) => `<h2>${title}</h2><ul class="list">${list.map(r => `<li class="row" style="cursor:default"><span class="t"><b>${esc(nameOf(r))}</b><small>${esc(sub(r))}</small></span><button class="like" data-act="rename" data-k="${kind}" data-id="${esc(r.id)}">Renombrar</button><button class="like" data-act="del" data-k="${kind}" data-id="${esc(r.id)}">Borrar</button></li>`).join('')}</ul>`;

  const forms = {
    async fLogin(e) {
      const fd = new FormData(e.target);
      const { error } = await sb.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('password') });
      if (error) { say('No se pudo entrar: ' + error.message); return; }
      note = ''; boot();
    },
    async fTrack(e) {
      const fd = new FormData(e.target), files = fd.getAll('files').filter(f => f.size);
      const album = fd.get('album') || null, artistIds = fd.getAll('artists').slice(0, 10), added = [];
      try {
        for (const [i, file] of files.entries()) {
          say(`Subiendo ${i + 1} de ${files.length}: ${file.name}`);
          const id = crypto.randomUUID();
          const audio_path = await upload(`audio/${id}/audio.${ext(file)}`, file);
          const { error } = await sb.from('library_tracks').insert({ id, album_id: album, audio_path, data: { title: file.name.replace(/\.[^.]+$/, ''), artistIds, genre: fd.get('genre') || '', year: fd.get('year') || '', duration: await duration(file), addedAt: Date.now() + i } });
          if (error) throw error;
          added.push(id);
        }
        if (album && added.length) {
          const a = albums.find(x => x.id === album);
          const { error } = await sb.from('library_albums').update({ data: { ...a.data, trackIds: [...(a.data.trackIds || []), ...added] }, updated_at: new Date().toISOString() }).eq('id', album);
          if (error) throw error;
        }
        say(`Publicadas ${added.length} canciones.`);
      } catch (err) { say(`Error tras ${added.length} canciones: ${err.message || err}`); }
      await refresh(); view();
    },
    async fArtist(e) {
      const fd = new FormData(e.target);
      const { error } = await sb.from('library_artists').insert({ id: crypto.randomUUID(), data: { name: fd.get('name').trim(), bio: fd.get('bio').trim() } });
      say(error ? 'Error: ' + error.message : 'Artista creado.');
      await refresh(); view();
    },
    async fAlbum(e) {
      const fd = new FormData(e.target), id = crypto.randomUUID(), cover = fd.get('cover');
      try {
        const cover_path = cover && cover.size ? await upload(`covers/${id}/cover.${ext(cover)}`, cover) : null;
        const { error } = await sb.from('library_albums').insert({ id, cover_path, data: { title: fd.get('title').trim(), artistIds: fd.getAll('artists').slice(0, 10), year: fd.get('year') || '', genre: fd.get('genre') || '', description: fd.get('desc').trim(), trackIds: [] } });
        if (error) throw error;
        say('Álbum creado.');
      } catch (err) { say('Error: ' + (err.message || err)); }
      await refresh(); view();
    }
  };

  async function act(btn) {
    const { act: a, k, id } = btn.dataset, table = TABLE[k];
    const row = { tracks, albums, artists }[k].find(r => r.id === id);
    try {
      if (a === 'rename') {
        const title = prompt('Nuevo nombre', nameOf(row)); if (!title || !title.trim()) return;
        const data = { ...row.data, [k === 'artists' ? 'name' : 'title']: title.trim() };
        const { error } = await sb.from(table).update({ data, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error; say('Nombre actualizado.');
      } else {
        if (!confirm(`¿Borrar «${nameOf(row)}»? No se puede deshacer.`)) return;
        const files = [row.audio_path, row.artwork_path, row.cover_path].filter(Boolean);
        if (k === 'albums') await sb.from('library_tracks').update({ album_id: null }).eq('album_id', id);
        const { error } = await sb.from(table).delete().eq('id', id);
        if (error) throw error;
        if (files.length) await sb.storage.from(C.bucket).remove(files);
        say('Borrado.');
      }
    } catch (err) { say('Error: ' + (err.message || err)); }
    await refresh(); view();
  }

  root.addEventListener('submit', async e => {
    const h = forms[e.target.id]; if (!h) return;
    e.preventDefault();
    const b = e.target.querySelector('button'); b.disabled = true;
    try { await h(e); } finally { if (b.isConnected) b.disabled = false; }
  });
  root.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) act(b); });
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
