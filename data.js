/* davixiniTracker · biblioteca (Supabase), favoritos, listas locales y registro de escucha */
(() => {
  'use strict';
  const { C, enc, norm, store, uid, emit } = DT;
  const S = (DT.S = { tracks: [], albums: [], artists: [] });
  const idx = { track: new Map(), album: new Map(), artist: new Map(), albumTracks: new Map(), artistTracks: new Map(), artistAlbums: new Map() };
  DT.track = id => idx.track.get(id);
  DT.album = id => idx.album.get(id);
  DT.artist = id => idx.artist.get(id);
  DT.tracksOfAlbum = id => idx.albumTracks.get(id) || [];
  DT.tracksOfArtist = id => idx.artistTracks.get(id) || [];
  DT.albumsOfArtist = id => idx.artistAlbums.get(id) || [];
  DT.media = p => (p ? `${C.url}/storage/v1/object/public/${C.bucket}/${p.split('/').map(enc).join('/')}` : '');

  async function rest(table, cols, optional) {
    const out = [];
    for (let off = 0; ; off += 1000) {
      const r = await fetch(`${C.url}/rest/v1/${table}?select=${cols}&order=id&limit=1000&offset=${off}`, { headers: { apikey: C.publishableKey } });
      if (!r.ok) {
        if (optional) { console.warn(`[davixini] ${table}: HTTP ${r.status}. ¿Falta ejecutar la migración?`); return out; }
        throw new Error(`${table} ${r.status}`);
      }
      const rows = await r.json(); out.push(...rows);
      if (rows.length < 1000) break;
    }
    return out;
  }

  DT.load = async () => {
    const [al, tr, ar] = await Promise.all([
      rest('library_albums', 'id,data,cover_path'),
      rest('library_tracks', 'id,album_id,data,audio_path,artwork_path'),
      rest('library_artists', 'id,data', true)
    ]);
    const people = d => (Array.isArray(d.artistIds) ? d.artistIds : []);
    const label = d => d.artist || d.artistName || '';
    const when = d => Number(d.addedAt) || Date.parse(d.createdAt || d.importedAt) || 0;
    S.artists = ar.map(r => ({ id: r.id, name: r.data.name || r.id, bio: r.data.bio || '', image: DT.media(r.data.imagePath), credits: r.data.credits || '' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    S.albums = al.map(r => ({
      id: r.id, title: r.data.title || r.data.name || 'Sin título', artistIds: people(r.data), artistText: label(r.data),
      year: r.data.year || '', genre: r.data.genre || '', desc: r.data.description || '', credits: r.data.credits || '', notes: r.data.notes || '',
      order: r.data.trackIds || [], cover: DT.media(r.cover_path), added: 0
    }));
    S.tracks = tr.map(r => ({
      id: r.id, title: r.data.title || r.data.name || 'Sin título', albumId: r.album_id, artistIds: people(r.data),
      artistText: label(r.data), genre: r.data.genre || '', year: r.data.year || '', duration: Number(r.data.duration) || 0,
      credits: r.data.credits || '', lyrics: r.data.lyrics || '', added: when(r.data), src: DT.media(r.audio_path),
      art: DT.media(r.artwork_path), ext: (r.audio_path || '').split('.').pop().toLowerCase()
    })).filter(t => t.src);
    for (const k of Object.keys(idx)) idx[k] = new Map();
    for (const t of S.tracks) idx.track.set(t.id, t);
    for (const a of S.albums) idx.album.set(a.id, a);
    for (const a of S.artists) idx.artist.set(a.id, a);
    for (const t of S.tracks) {
      if (t.albumId) (idx.albumTracks.get(t.albumId) || idx.albumTracks.set(t.albumId, []).get(t.albumId)).push(t);
      for (const id of t.artistIds) (idx.artistTracks.get(id) || idx.artistTracks.set(id, []).get(id)).push(t);
    }
    for (const a of S.albums) {
      const pos = t => { const i = a.order.indexOf(t.id); return i < 0 ? 1e9 : i; };
      const list = idx.albumTracks.get(a.id);
      if (list) { list.sort((x, y) => (pos(x) - pos(y)) || (x.added - y.added)); a.added = Math.max(...list.map(t => t.added)); }
      for (const id of a.artistIds) (idx.artistAlbums.get(id) || idx.artistAlbums.set(id, []).get(id)).push(a);
    }
    for (const list of idx.artistAlbums.values()) list.sort((x, y) => (Number(y.year) || 0) - (Number(x.year) || 0));
    for (const list of idx.artistTracks.values()) list.sort((x, y) => y.added - x.added);
    for (const t of S.tracks) {
      t.albumTitle = idx.album.get(t.albumId)?.title || '';
      t.cover = idx.album.get(t.albumId)?.cover || t.art || '';
      t.who = t.artistIds.map(id => idx.artist.get(id)?.name).filter(Boolean).join(', ') || t.artistText;
      t.q = norm(`${t.title} ${t.who} ${t.albumTitle} ${t.genre} ${t.year}`);
    }
    for (const a of S.albums) { a.who = a.artistIds.map(id => idx.artist.get(id)?.name).filter(Boolean).join(', ') || a.artistText; a.q = norm(`${a.title} ${a.who} ${a.genre} ${a.year}`); }
    for (const a of S.artists) a.q = norm(a.name);
    S.genres = [...S.tracks.reduce((m, t) => (t.genre && m.set(t.genre, (m.get(t.genre) || 0) + 1), m), new Map())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'));
    emit('data');
  };
  DT.artistLinks = x => {
    const l = (x.artistIds || []).map(id => idx.artist.get(id)).filter(Boolean).map(a => `<a href="#/artist/${enc(a.id)}">${DT.esc(a.name)}</a>`);
    return l.length ? l.join(', ') : DT.esc(x.artistText || x.who || '');
  };

  /* ---------- favoritos (clave heredada «dt-likes») ---------- */
  const likes = new Set(store.get('dt-likes', []));
  DT.likes = {
    has: id => likes.has(id), all: () => [...likes],
    toggle(id) { likes.has(id) ? likes.delete(id) : likes.add(id); store.set('dt-likes', [...likes]); emit('likes', id); return likes.has(id); },
    replace(ids) { likes.clear(); ids.forEach(i => likes.add(i)); store.set('dt-likes', [...likes]); emit('likes'); }
  };

  /* ---------- listas de reproducción del usuario (guardadas en este navegador) ---------- */
  const PL = 'dt-playlists';
  let lists = store.get(PL, []);
  const save = () => { if (!store.set(PL, lists)) DT.toast('No se pudo guardar: el almacenamiento del navegador está lleno.', 'error'); emit('playlists'); };
  DT.pl = {
    all: () => lists,
    get: id => lists.find(l => l.id === id),
    create(name, ids = []) { const l = { id: uid(), name: name.trim() || 'Lista nueva', ids: [...ids], created: Date.now(), updated: Date.now(), cover: '' }; lists.unshift(l); save(); return l; },
    rename(id, name) { const l = DT.pl.get(id); if (l && name.trim()) { l.name = name.trim(); l.updated = Date.now(); save(); } },
    remove(id) { lists = lists.filter(l => l.id !== id); save(); },
    duplicate(id) { const l = DT.pl.get(id); return l && DT.pl.create(`${l.name} (copia)`, l.ids); },
    add(id, ids) {
      const l = DT.pl.get(id); if (!l) return 0;
      const fresh = ids.filter(i => !l.ids.includes(i)); l.ids.push(...fresh); l.updated = Date.now(); save(); return fresh.length;
    },
    removeAt(id, i) { const l = DT.pl.get(id); if (l) { l.ids.splice(i, 1); l.updated = Date.now(); save(); } },
    move(id, from, to) { const l = DT.pl.get(id); if (!l || to < 0 || to >= l.ids.length) return; l.ids.splice(to, 0, l.ids.splice(from, 1)[0]); l.updated = Date.now(); save(); },
    setCover(id, dataUrl) { const l = DT.pl.get(id); if (l) { l.cover = dataUrl; save(); } },
    replaceAll(arr) { lists = Array.isArray(arr) ? arr : []; save(); },
    /* enlace compartible: la biblioteca es la misma para todos, basta con enviar los identificadores */
    link(id) {
      const l = DT.pl.get(id); if (!l) return '';
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ n: l.name, i: l.ids.filter(i => DT.track(i)) })))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return `${location.origin}${location.pathname}#/import/${payload}`;
    },
    parse(payload) { try { const o = JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))))); return { name: String(o.n || 'Lista compartida'), ids: (o.i || []).filter(i => DT.track(i)) }; } catch { return null; } }
  };
  DT.plCover = l => {
    if (l.cover) return l.cover;
    const covers = [...new Set(l.ids.map(i => DT.track(i)?.cover).filter(Boolean))].slice(0, 4);
    return covers.length >= 4 ? covers : covers[0] || '';
  };

  /* ---------- registro de escucha: una entrada por sesión de escucha de ≥ 5 s ---------- */
  const LOG = 'dt-log';
  let log = store.get(LOG, []).filter(e => Array.isArray(e) && e.length >= 4);
  let stamp = 0;
  DT.log = {
    all: () => log,
    stamp: () => stamp,
    add(e) {
      log.push(e); if (log.length > 40000) log = log.slice(-40000);
      stamp++; if (!store.set(LOG, log)) { log = log.slice(-Math.floor(log.length / 2)); store.set(LOG, log); }
      emit('log');
    },
    clear() { log = []; stamp++; store.del(LOG); emit('log'); },
    replace(arr) { log = (Array.isArray(arr) ? arr : []).filter(e => Array.isArray(e) && e.length >= 4); stamp++; store.set(LOG, log); emit('log'); }
  };
})();
