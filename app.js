(() => {
  'use strict';

  const DB_NAME = 'MiMusicaBiblioteca';
  const DB_VERSION = 4;
  const AUDIO_ACCEPTED = new Set(['mp3','m4a','aac','ogg','opus','wav','flac','webm','mp4','aiff','aif','wma']);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const root = $('#viewRoot');
  const audio = $('#audioEngine');
  const backdrop = $('#modalBackdrop');
  const modal = $('#modalPanel');
  const modalContent = $('#modalContent');
  const iconPaths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
    albums: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    music: '<path d="M9 18V5l12-2v13"/><ellipse cx="5.5" cy="18" rx="3.5" ry="2"/><ellipse cx="17.5" cy="16" rx="3.5" ry="2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    heart: '<path d="M20.8 8.7c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.1.9-1.2 2.1-1.4-.5a7.7 7.7 0 0 1-1.5.9l-.3 1.5h-2.4l-.3-1.5a7.7 7.7 0 0 1-1.5-.9l-1.4.5-1.2-2.1 1.1-.9a7.7 7.7 0 0 1 0-1.8l-1.1-.9 1.2-2.1 1.4.5a7.7 7.7 0 0 1 1.5-.9l.3-1.5h2.4l.3 1.5a7.7 7.7 0 0 1 1.5.9l1.4-.5 1.2 2.1-1.1.9a7.7 7.7 0 0 1 0 1.8Z"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z"/>',
    upload: '<path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 16v4h16v-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    play: '<path d="m8 5 11 7-11 7Z"/>',
    pause: '<path d="M8 5h3v14H8zM15 5h3v14h-3z"/>',
    previous: '<path d="M6 5v14M19 6 8 12l11 6Z"/>',
    next: '<path d="M18 5v14M5 6l11 6-11 6Z"/>',
    shuffle: '<path d="m18 14 3 3-3 3M3 7h2.5c5 0 7 10 12 10H21M18 4l3 3-3 3M3 17h2.5c1.6 0 2.8-1.2 4-2.7M14 9.7c1-1.5 2.1-2.7 3.5-2.7H21"/>',
    repeat: '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',
    queue: '<path d="M4 6h16M4 12h11M4 18h8"/><path d="m17 15 4 3-4 3Z"/>',
    volume: '<path d="M4 10v4h4l5 4V6l-5 4Z"/><path d="M17 9a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    edit: '<path d="m4 16-.8 4.8L8 20l11.6-11.6a2.1 2.1 0 0 0-3-3Z"/><path d="m14.8 6.2 3 3"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',
    download: '<path d="M12 4v12m-4-4 4 4 4-4"/><path d="M4 20h16"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    heartFilled: '<path d="M20.8 8.7c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z" fill="currentColor"/>',
    musicNote: '<path d="M9 18V5l12-2v13"/><ellipse cx="5.5" cy="18" rx="3.5" ry="2"/><ellipse cx="17.5" cy="16" rx="3.5" ry="2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    artist: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.5V20"/>',
    wave: '<path d="M2 10v4m4-8v12m4-16v20m4-14v8m4-11v14m4-10v6"/>',
    replace: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 1M4 17l2 1a7 7 0 0 0 12.4-3"/>',
    expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3"/>'
  };
  const icon = (name, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${iconPaths[name] || iconPaths.musicNote}</svg>`;
  $$('[data-icon]').forEach(node => { const name = node.dataset.icon; node.innerHTML = icon(name); });

  let db;
  let albums = [];
  let tracks = [];
  let playlists = [];
  let artists = [];
  let view = 'home';
  let activeAlbumId = null;
  let activePlaylistId = null;
  let activeArtist = null;
  let activeGenre = null;
  let songSortMode = 'title';
  let replacementTrackId = null;
  let queue = [];
  let queueIndex = -1;
  let shuffle = false;
  let repeatMode = 'off'; // off | all | one
  let playbackRate = 1;
  let cloudConfigured = false;
  let cloudAdmin = false;
  let pendingCover = null;
  let pendingCoverUrl = null;
  let removePendingCover = false;
  let currentObjectUrl = null;
  let toastTimeouts = new Set();
  const objectUrls = new Map();

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const hueFor = value => [...String(value || 'mi música')].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 360, 0);
  const formatTime = seconds => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.floor(seconds);
    const s = String(total % 60).padStart(2,'0');
    const m = Math.floor(total / 60);
    return m >= 60 ? `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}:${s}` : `${m}:${s}`;
  };
  const formatBytes = bytes => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B','KB','MB','GB','TB'];
    const i = Math.min(Math.floor(Math.log(bytes)/Math.log(1024)), units.length-1);
    return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
  };
  const formatDate = value => value ? new Intl.DateTimeFormat('es', { day:'numeric', month:'short', year:'numeric' }).format(new Date(value)) : '—';
  const getAlbum = id => albums.find(item => item.id === id);
  const getTrack = id => tracks.find(item => item.id === id);
  const getPlaylist = id => playlists.find(item => item.id === id);
  const tracksForAlbum = album => (album?.trackIds || []).map(getTrack).filter(Boolean);
  const tracksForPlaylist = playlist => (playlist?.trackIds || []).map(getTrack).filter(Boolean);
  const albumForTrack = track => getAlbum(track?.albumId);
  const coverForTrack = track => albumForTrack(track)?.cover || track?.artwork || null;
  const trackCoverMarkup = track => { const cover=coverForTrack(track); return `<span class="track-thumb">${cover ? `<img src="${cachedObjectUrl(cover)}" alt="">` : icon('musicNote')}</span>`; };
  const titleFromFile = name => String(name || 'sin título').replace(/\.[^.]+$/, '').replace(/[._]+/g, ' ').trim() || 'sin título';

  function toast(message, type = 'info') {
    const node = document.createElement('div');
    node.className = `toast ${type === 'error' ? 'error' : ''}`;
    node.textContent = message;
    $('#toastRegion').append(node);
    const timer = setTimeout(() => { node.remove(); toastTimeouts.delete(timer); }, 3400);
    toastTimeouts.add(timer);
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('este navegador no permite almacenar la biblioteca.'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = event => {
        const database = request.result;
        if (!database.objectStoreNames.contains('albums')) database.createObjectStore('albums', { keyPath: 'id' });
        if (!database.objectStoreNames.contains('tracks')) database.createObjectStore('tracks', { keyPath: 'id' });
        if (!database.objectStoreNames.contains('playlists')) database.createObjectStore('playlists', { keyPath: 'id' });
        if (!database.objectStoreNames.contains('artists')) database.createObjectStore('artists', { keyPath: 'id' });
        const tx = request.transaction;
        if (event.oldVersion < 2 && database.objectStoreNames.contains('tracks')) {
          const store = tx.objectStore('tracks');
          store.openCursor().onsuccess = e => {
            const cursor = e.target.result;
            if (!cursor) return;
            const track = cursor.value;
            cursor.update({ ...track, favorite: Boolean(track.favorite), lastPlayedAt: track.lastPlayedAt || 0, artist: track.artist || '' });
            cursor.continue();
          };
        }
        if (event.oldVersion < 3 && database.objectStoreNames.contains('albums')) {
          const store = tx.objectStore('albums');
          store.openCursor().onsuccess = e => {
            const cursor = e.target.result;
            if (!cursor) return;
            if (!cursor) return;
            const album = cursor.value;
            cursor.update({ ...album, year: album.year || '', genre: album.genre || '', trackIds: album.trackIds || [] });
            cursor.continue();
          };
        }
      };
      request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
      request.onerror = () => reject(request.error || new Error('no se pudo abrir la base de datos.'));
      request.onblocked = () => reject(new Error('cierra otras pestañas de davixiniTracker y vuelve a intentarlo.'));
    });
  }

  function transactionDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('no se pudo guardar el cambio.'));
      tx.onabort = () => reject(tx.error || new Error('la operación se canceló.'));
    });
  }

  function requestValue(request) {
    return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
  }

  async function refreshData() {
    const tx = db.transaction(['albums','tracks','playlists','artists'], 'readonly');
    const done = transactionDone(tx);
    const [a,t,p,ar] = await Promise.all([
      requestValue(tx.objectStore('albums').getAll()),
      requestValue(tx.objectStore('tracks').getAll()),
      requestValue(tx.objectStore('playlists').getAll()),
      requestValue(tx.objectStore('artists').getAll())
    ]);
    await done;
    albums = a.sort((x,y) => (y.createdAt || 0) - (x.createdAt || 0));
    tracks = t;
    playlists = p.sort((x,y) => (y.createdAt || 0) - (x.createdAt || 0));
    artists = ar.sort((x,y) => (x.name || '').localeCompare(y.name || '', 'es'));
    updateCounts();
    updateStorage();
  }

  async function replaceLocalLibrary(snapshot) {
    const tx = db.transaction(['albums','tracks','playlists','artists'], 'readwrite');
    const done = transactionDone(tx);
    const albumStore = tx.objectStore('albums');
    const trackStore = tx.objectStore('tracks');
    const playlistStore = tx.objectStore('playlists');
    const artistStore = tx.objectStore('artists');
    albumStore.clear(); trackStore.clear(); playlistStore.clear(); artistStore.clear();
    (snapshot.albums || []).forEach(item => albumStore.put(item));
    (snapshot.tracks || []).forEach(item => trackStore.put(item));
    (snapshot.playlists || []).forEach(item => playlistStore.put(item));
    (snapshot.artists || []).forEach(item => artistStore.put(item));
    await done;
    await refreshData();
  }

  function updateCloudControls() {
    document.body.classList.toggle('visitor-mode', cloudConfigured && !cloudAdmin);
    const access = $('#adminAccessButton');
    const publish = $('#publishCloudButton');
    if (!cloudConfigured) {
      access.hidden = true;
      publish.hidden = true;
      return;
    }
    access.hidden = false;
    access.textContent = cloudAdmin ? 'cerrar sesión admin' : 'acceso admin';
    publish.hidden = !cloudAdmin;
  }

  function cloudLoginModal() {
    showModal('acceso administrador', 'zona privada', `<form id="cloudLoginForm">
      <div class="form-field"><label for="cloudEmail">correo de administrador</label><input id="cloudEmail" type="email" autocomplete="username" required></div>
      <div class="form-field"><label for="cloudPassword">contraseña</label><input id="cloudPassword" type="password" autocomplete="current-password" required></div>
      <p class="form-hint">solo las cuentas autorizadas desde supabase pueden publicar canciones. no hay registro público.</p>
      <div class="modal-footer"><button type="button" class="button button-secondary" data-modal-close>cancelar</button><button type="submit" class="button button-primary">iniciar sesión</button></div>
    </form>`);
  }

  async function mergeLocalLibrary(snapshot) {
    const albumMap = new Map(albums.map(item => [item.id, item]));
    for (const remote of snapshot.albums || []) {
      const local = albumMap.get(remote.id);
      albumMap.set(remote.id, local
        ? { ...local, ...remote, trackIds: [...new Set([...(remote.trackIds || []), ...(local.trackIds || [])])] }
        : remote);
    }
    const trackMap = new Map(tracks.map(item => [item.id, item]));
    for (const remote of snapshot.tracks || []) trackMap.set(remote.id, remote);
    const artistMap = new Map(artists.map(item => [item.id, item]));
    for (const remote of snapshot.artists || []) artistMap.set(remote.id, remote);
    const playlistMap = new Map(playlists.map(item => [item.id, item]));
    for (const remote of snapshot.playlists || []) {
      const local = playlistMap.get(remote.id);
      playlistMap.set(remote.id, local
        ? { ...local, ...remote, trackIds: [...new Set([...(remote.trackIds || []), ...(local.trackIds || [])])] }
        : remote);
    }
    await replaceLocalLibrary({
      albums: [...albumMap.values()],
      tracks: [...trackMap.values()],
      playlists: [...playlistMap.values()],
      artists: [...artistMap.values()]
    });
  }

  async function refreshPublishedLibrary() {
    const snapshot = await window.DavixiniCloud.loadLibrary();
    const hasRemote = snapshot.albums.length || snapshot.tracks.length || snapshot.playlists.length || snapshot.artists.length;
    if (hasRemote) await mergeLocalLibrary(snapshot);
    return Boolean(hasRemote);
  }

  async function publishCloudLibrary() {
    if (!cloudAdmin) return;
    const button = $('#publishCloudButton');
    button.disabled = true;
    button.textContent = 'publicando…';
    try {
      await window.DavixiniCloud.publishLibrary(albums, tracks, playlists, artists);
      toast('biblioteca publicada. ya está disponible para visitantes.');
    } catch (error) {
      toast('no se pudo publicar: ' + (error.message || 'error'), 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'publicar cambios';
    }
  }

  function updateCounts() {
    $('#albumCount').textContent = albums.length;
    $('#songCount').textContent = tracks.length;
    $('#playlistCount').textContent = playlists.length;
    $('#artistCount').textContent = artistCollection().length;
    $('#genreCount').textContent = new Set(tracks.map(t => t.genre || getAlbum(t.albumId)?.genre).filter(Boolean)).size;
  }

  async function updateStorage() {
    try {
      const estimate = await navigator.storage?.estimate?.();
      if (!estimate) { $('#storageUsed').textContent = formatBytes(tracks.reduce((sum,t)=>sum+(t.size||t.blob?.size||0),0)); return; }
      const used = estimate.usage || tracks.reduce((sum,t)=>sum+(t.size||t.blob?.size||0),0);
      $('#storageUsed').textContent = `${formatBytes(used)} usados`;
      const percent = estimate.quota ? Math.min(100, used / estimate.quota * 100) : 0;
      $('#storageBar').style.width = `${percent}%`;
    } catch (_) { $('#storageUsed').textContent = formatBytes(tracks.reduce((sum,t)=>sum+(t.size||t.blob?.size||0),0)); }
  }

  function cachedObjectUrl(blob) {
    if (!blob) return '';
    if (!objectUrls.has(blob)) objectUrls.set(blob, URL.createObjectURL(blob));
    return objectUrls.get(blob);
  }

  function coverMarkup(item, extraClass = '') {
    const cover = item?.cover || item?.artwork || null;
    const backgroundHue = hueFor(item?.id || item?.title || item?.name);
    return `<div class="cover-art ${extraClass}" style="--cover-hue:${backgroundHue}">${cover ? `<img src="${cachedObjectUrl(cover)}" alt="" loading="lazy">` : '<span class="cover-placeholder">♪</span>'}</div>`;
  }

  function emptyState(title, description, action = '', actionText = '') {
    return `<section class="empty-state"><div class="empty-state-icon">${icon('music')}</div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p>${action ? `<button class="button button-primary" data-action="${action}">${icon('plus')}${escapeHTML(actionText)}</button>` : ''}</section>`;
  }

  function pageHeader(kicker, title, description, action = '') {
    return `<header class="page-header"><div><p class="page-kicker">${escapeHTML(kicker)}</p><h1>${escapeHTML(title)}</h1><p class="page-description">${escapeHTML(description)}</p></div>${action}</header>`;
  }

  function sectionHeading(title, description = '', action = '') {
    return `<div class="section-heading"><div><h2>${escapeHTML(title)}</h2>${description ? `<p>${escapeHTML(description)}</p>` : ''}</div>${action}</div>`;
  }

  function albumCard(album) {
    const count = tracksForAlbum(album).length;
    const detail = [album.artist || 'artista desconocido', album.year].filter(Boolean).join(' · ');
    return `<article class="album-card">
      <button class="card-open" data-action="open-album" data-id="${escapeHTML(album.id)}" aria-label="Abrir ${escapeHTML(album.title)}" style="display:block;width:100%;padding:0;border:0;background:transparent;text-align:left;cursor:pointer">
        ${coverMarkup(album)}<h3>${escapeHTML(album.title)}</h3><p>${escapeHTML(detail)}</p>
      </button>
      <div class="card-meta"><span>${count} ${count === 1 ? 'canción' : 'canciones'}</span><span>${album.genre ? escapeHTML(album.genre) : 'álbum'}</span></div>
      <button class="card-play" data-action="play-album" data-id="${escapeHTML(album.id)}" aria-label="Reproducir ${escapeHTML(album.title)}">${icon('play')}</button>
    </article>`;
  }

  function playlistCard(playlist) {
    const count = tracksForPlaylist(playlist).length;
    return `<article class="playlist-card">
      <button data-action="open-playlist" data-id="${escapeHTML(playlist.id)}" style="display:block;width:100%;padding:0;border:0;background:transparent;text-align:left;cursor:pointer">
        <div class="cover-art playlist-mark"><span class="cover-placeholder">≡</span></div><h3>${escapeHTML(playlist.name)}</h3><p>${escapeHTML(playlist.description || 'playlist')}</p>
      </button>
      <div class="card-meta"><span>${count} ${count === 1 ? 'canción' : 'canciones'}</span><span>playlist</span></div>
      <button class="card-play" data-action="play-playlist" data-id="${escapeHTML(playlist.id)}" aria-label="Reproducir ${escapeHTML(playlist.name)}" ${count ? '' : 'disabled'}>${icon('play')}</button>
    </article>`;
  }

  function trackRow(track, index, options = {}) {
    const album = albumForTrack(track);
    const isPlaying = track.id === currentTrackId();
    const favoriteIcon = track.favorite ? 'heartFilled' : 'heart';
    const duration = track.duration ? formatTime(track.duration) : '—';
    const secondary = track.artist || album?.artist || 'artista desconocido';
    const sortable = Boolean(options.sortType);
    return `<div class="track-row ${isPlaying ? 'is-playing' : ''}" data-track-row="${escapeHTML(track.id)}" ${sortable ? `data-sort-type="${escapeHTML(options.sortType)}" data-sort-id="${escapeHTML(options.sortId)}"` : ''}>
      <span class="track-index">${sortable ? '<span class="track-drag-handle" draggable="true" data-drag-track="' + escapeHTML(track.id) + '" title="arrastrar para reordenar" aria-label="arrastra para reordenar">⠿</span>' : ''}<span>${isPlaying && !audio.paused ? '♫' : index + 1}</span></span>
      <button class="track-main" data-action="play-track" data-id="${escapeHTML(track.id)}" aria-label="Reproducir ${escapeHTML(track.title)}">
        ${trackCoverMarkup(track)}
        <span class="track-copy"><strong>${escapeHTML(track.title)}</strong><small>${escapeHTML(secondary)}</small></span>
      </button>
      <span class="track-album" title="${escapeHTML(album?.title || '')}">${escapeHTML(album?.title || 'sin álbum')}</span>
      <span class="track-duration">${duration}</span>
      <span class="track-actions">
        <button class="track-action ${track.favorite ? 'is-favorite' : ''}" data-action="toggle-favorite" data-id="${escapeHTML(track.id)}" aria-label="${track.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}" title="${track.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}">${icon(favoriteIcon, track.favorite ? 'class="fill-heart"' : '')}</button>
        <button class="track-action" data-action="add-to-playlist" data-id="${escapeHTML(track.id)}" aria-label="Añadir a playlist" title="Añadir a playlist">${icon('list')}</button>
        <button class="track-action" data-action="edit-track" data-id="${escapeHTML(track.id)}" aria-label="Editar canción" title="Editar metadatos">${icon('edit')}</button>
        <button class="track-action" data-action="track-more" data-id="${escapeHTML(track.id)}" aria-label="Más acciones" title="Más acciones">${icon('more')}</button>
      </span>
    </div>`;
  }

  function trackTable(list, options = {}) {
    if (!list.length) return emptyState(options.emptyTitle || 'no hay canciones aquí', options.emptyDescription || 'importa archivos de audio para llenar esta lista.', options.emptyAction || 'import-audio', options.emptyButton || 'importar música');
    return `<div class="track-table ${options.compact ? 'compact' : ''}" ${options.sortType ? `data-sort-type="${escapeHTML(options.sortType)}" data-sort-id="${escapeHTML(options.sortId)}"` : ''}>
      <div class="track-head"><span>#</span><span>título</span><span>álbum</span><span>duración</span><span style="text-align:right">acciones</span></div>
      ${list.map((track,index) => trackRow(track,index,options)).join('')}
    </div>`;
  }

  function statsMarkup() {
    const totalSize = tracks.reduce((sum,track)=>sum+(track.size||track.blob?.size||0),0);
    return `<div class="stats-row">
      <div class="stat-card"><strong>${albums.length}</strong><span>álbumes</span></div>
      <div class="stat-card"><strong>${tracks.length}</strong><span>canciones</span></div>
      <div class="stat-card"><strong>${artistCollection().length}</strong><span>artistas</span></div>
      <div class="stat-card"><strong>${genreCollection().length}</strong><span>géneros</span></div>
      <div class="stat-card"><strong>${playlists.length}</strong><span>playlists</span></div>
      <div class="stat-card"><strong>${formatBytes(totalSize)}</strong><span>audio guardado</span></div>
    </div>`;
  }

  function renderHome() {
    const latestAlbums = [...albums].slice(0,6);
    const latestTracks = [...tracks].sort((a,b)=>(b.addedAt||0)-(a.addedAt||0)).slice(0,6);
    root.innerHTML = `<section class="home-hero">
        <div class="home-hero-copy">
          <p class="home-hero-eyebrow">DAVIXINITRACKER <span>·</span> TU ARCHIVO PERSONAL</p>
          <h1>tu música.<br><span>tus reglas.</span></h1>
          <p class="home-hero-description">todo lo que has guardado, ordenado a tu manera. sin algoritmo y en una biblioteca compartida.</p>
          <div class="home-hero-actions"><button class="button button-primary" data-action="play-all-shuffle">${icon('shuffle')} escuchar algo</button><button class="button button-secondary" data-action="new-album">${icon('plus')} crear álbum</button></div>
          <div class="home-hero-meta"><span><i></i> ${cloudConfigured ? 'biblioteca compartida' : 'biblioteca local'}</span><span>${tracks.length} pistas</span><span>${albums.length} álbumes</span></div>
        </div>
        <div class="home-hero-art" aria-hidden="true"><div class="hero-orbit hero-orbit-one"></div><div class="hero-orbit hero-orbit-two"></div><div class="hero-record"><div class="hero-record-label">♫</div></div><span class="hero-note hero-note-one">♪</span><span class="hero-note hero-note-two">♫</span><span class="hero-art-caption">PLAY IT YOUR WAY</span></div>
      </section>${pageHeader('archivo personal','tu música','Álbumes, canciones y playlists de tu biblioteca compartida.', `<button class="button button-primary" data-action="new-album">${icon('plus')} crear álbum</button>`)}
      ${statsMarkup()}
      <section class="section-block">${sectionHeading('álbumes', `${albums.length} en tu biblioteca`, `<button class="text-button" data-view="albums">ver todos ${icon('arrow')}</button>`)}
        ${albums.length ? `<div class="album-grid">${latestAlbums.map(albumCard).join('')}</div>` : emptyState('tu biblioteca está vacía','crea un álbum o importa algunas canciones para empezar.','new-album','crear primer álbum')}
      </section>
      ${latestTracks.length ? `<section class="section-block">${sectionHeading('añadidas recientemente','Las últimas canciones que importaste', `<button class="text-button" data-view="songs">ver canciones ${icon('arrow')}</button>`)}${trackTable(latestTracks,{compact:true})}</section>` : ''}`;
    setBreadcrumb('inicio');
  }

  function renderAlbums() {
    root.innerHTML = `${pageHeader('colección','álbumes','Crea discos, recopilaciones y bandas sonoras.', `<button class="button button-primary" data-action="new-album">${icon('plus')} nuevo álbum</button>`)}
      ${albums.length ? `<div class="album-grid">${albums.map(albumCard).join('')}</div>` : emptyState('todavía no hay álbumes','crea tu primer álbum y después añade archivos de audio.','new-album','crear álbum')}`;
    setBreadcrumb('álbumes');
  }

  function renderSongs() {
    const sorted = [...tracks].sort((a,b)=>{
      if(songSortMode==='artist') return (a.artist||getAlbum(a.albumId)?.artist||'').localeCompare(b.artist||getAlbum(b.albumId)?.artist||'', 'es') || a.title.localeCompare(b.title,'es');
      if(songSortMode==='album') return (getAlbum(a.albumId)?.title||'').localeCompare(getAlbum(b.albumId)?.title||'', 'es') || a.title.localeCompare(b.title,'es');
      if(songSortMode==='recent') return (b.addedAt||0)-(a.addedAt||0);
      if(songSortMode==='duration') return (b.duration||0)-(a.duration||0);
      return (a.title||'').localeCompare(b.title||'', 'es');
    });
    const sortControl = '<select class="sort-select" id="songSortSelect" aria-label="Ordenar canciones"><option value="title">título</option><option value="artist">artista</option><option value="album">álbum</option><option value="recent">recientes</option><option value="duration">duración</option></select>';
    root.innerHTML = pageHeader('biblioteca','canciones',tracks.length + ' canciones en tu colección.', '<button class="button button-primary" data-action="import-audio">' + icon('upload') + ' importar música</button>') +
      '<div class="detail-toolbar"><h2>todas las canciones</h2>' + sortControl + '</div>' + trackTable(sorted,{emptyTitle:'no hay canciones',emptyDescription:'importa archivos MP3 u otros formatos de audio compatibles con tu navegador.'});
    const selector=$('#songSortSelect'); if(selector) selector.value=songSortMode;
    setBreadcrumb('canciones');
  }

  function renderFavorites() {
    const list = tracks.filter(track=>track.favorite).sort((a,b)=>(b.lastPlayedAt||b.addedAt||0)-(a.lastPlayedAt||a.addedAt||0));
    root.innerHTML = `${pageHeader('tu colección','favoritos',`${list.length} canciones guardadas.`, '')}${trackTable(list,{emptyTitle:'aún no guardaste favoritos',emptyDescription:'pulsa el corazón de una canción para encontrarla aquí.'})}`;
    setBreadcrumb('favoritos');
  }

  function renderRecent() {
    const list = tracks.filter(track=>track.lastPlayedAt).sort((a,b)=>b.lastPlayedAt-a.lastPlayedAt);
    root.innerHTML = `${pageHeader('historial','reproducidas','Canciones que has escuchado en este navegador.','')}${trackTable(list,{emptyTitle:'todavía no hay reproducciones',emptyDescription:'las canciones aparecerán aquí después de escucharlas.'})}`;
    setBreadcrumb('reproducidas');
  }

  function renderPlaylists() {
    root.innerHTML = `${pageHeader('colección','playlists','Agrupa canciones de distintos álbumes.', `<button class="button button-primary" data-action="new-playlist">${icon('plus')} nueva playlist</button>`)}
      ${playlists.length ? `<div class="playlist-grid">${playlists.map(playlistCard).join('')}</div>` : emptyState('no hay playlists','crea una playlist para reunir canciones de distintos álbumes.','new-playlist','crear playlist')}`;
    setBreadcrumb('playlists');
  }

  function renderAlbumDetail() {
    const album = getAlbum(activeAlbumId);
    if (!album) { view='albums'; render(); return; }
    const list = tracksForAlbum(album);
    root.innerHTML = `<button class="button button-secondary back-button" data-view="albums">← volver a álbumes</button>
      <section class="album-hero">${coverMarkup(album)}<div class="album-hero-copy"><p class="page-kicker">álbum</p><h1>${escapeHTML(album.title)}</h1><p class="artist">${escapeHTML(album.artist || 'artista desconocido')}</p>${album.description ? `<p class="description">${escapeHTML(album.description)}</p>` : ''}<div class="album-details">${[album.year,album.genre,`${list.length} ${list.length===1?'canción':'canciones'}`].filter(Boolean).map(escapeHTML).join(' · ')} · añadido ${formatDate(album.createdAt)}</div>
        <div class="inline-actions"><button class="button button-primary" data-action="play-album" data-id="${escapeHTML(album.id)}" ${list.length?'':'disabled'}>${icon('play')} reproducir</button><button class="button button-secondary" data-action="add-to-album" data-id="${escapeHTML(album.id)}">${icon('plus')} añadir música</button><button class="button button-secondary" data-action="edit-album" data-id="${escapeHTML(album.id)}">${icon('edit')} editar</button><button class="button button-danger" data-action="delete-album" data-id="${escapeHTML(album.id)}">${icon('trash')} eliminar</button></div></div></section>
      <div class="detail-toolbar"><h2>canciones</h2><span class="form-hint">arrastra el símbolo ⠿ para ordenar; en móvil usa el menú de cada canción.</span></div>
      ${trackTable(list,{sortType:'album',sortId:album.id,emptyTitle:'este álbum está vacío',emptyDescription:'añade archivos de audio desde tu dispositivo o arrástralos hasta esta página.',emptyAction:'add-to-album-current',emptyButton:'añadir música'})}
      <div class="drop-zone" id="albumDropZone" data-album-drop="${escapeHTML(album.id)}">arrastra aquí archivos de audio para añadirlos a este álbum</div>`;
    setBreadcrumb(`álbumes / ${album.title}`);
  }

  function renderPlaylistDetail() {
    const playlist = getPlaylist(activePlaylistId);
    if (!playlist) { view='playlists'; render(); return; }
    const list = tracksForPlaylist(playlist);
    root.innerHTML = `<button class="button button-secondary back-button" data-view="playlists">← volver a playlists</button>
      <section class="album-hero"><div class="cover-art playlist-mark"><span class="cover-placeholder">≡</span></div><div class="album-hero-copy"><p class="page-kicker">playlist</p><h1>${escapeHTML(playlist.name)}</h1><p class="artist">${escapeHTML(playlist.description || 'sin descripción')}</p><div class="album-details">${list.length} ${list.length===1?'canción':'canciones'} · creada ${formatDate(playlist.createdAt)}</div><div class="inline-actions"><button class="button button-primary" data-action="play-playlist" data-id="${escapeHTML(playlist.id)}" ${list.length?'':'disabled'}>${icon('play')} reproducir</button><button class="button button-secondary" data-action="add-tracks-playlist" data-id="${escapeHTML(playlist.id)}">${icon('plus')} añadir canciones</button><button class="button button-secondary" data-action="edit-playlist" data-id="${escapeHTML(playlist.id)}">${icon('edit')} editar</button><button class="button button-danger" data-action="delete-playlist" data-id="${escapeHTML(playlist.id)}">${icon('trash')} eliminar</button></div></div></section>
      <div class="detail-toolbar"><h2>lista de reproducción</h2><span class="form-hint">arrastra ⠿ o abre el menú de una pista para cambiar el orden · ${list.length} pistas</span></div>
      ${trackTable(list,{sortType:'playlist',sortId:playlist.id,emptyTitle:'esta playlist está vacía',emptyDescription:'añade canciones de cualquiera de tus álbumes.',emptyAction:'add-tracks-playlist-current',emptyButton:'añadir canciones'})}`;
    setBreadcrumb(`playlists / ${playlist.name}`);
  }

  function artistCollection() {
    const map = new Map();
    tracks.forEach(track => {
      const name = (track.artist || getAlbum(track.albumId)?.artist || '').trim();
      if (!name) return;
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(track);
    });
    artists.forEach(artist => { if (artist.name && !map.has(artist.name)) map.set(artist.name, []); });
    return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es'));
  }

  function getArtist(name) { return artists.find(item => item.name === name || item.id === name); }

  function artistForm(artist = null) {
    showModal(artist ? 'editar artista' : 'nuevo artista', 'davixiniverso', `<form id="artistForm">
      <div class="form-field"><label for="artistName">nombre del artista *</label><input id="artistName" maxlength="100" required value="${escapeHTML(artist?.name || '')}" placeholder="nombre artístico"></div>
      <div class="form-field"><label for="artistBio">biografía</label><textarea id="artistBio" maxlength="700" placeholder="cuenta quién es este artista">${escapeHTML(artist?.bio || '')}</textarea></div>
      <input type="hidden" id="editingArtistId" value="${escapeHTML(artist?.id || '')}">
      <div class="modal-footer"><button type="button" class="button button-secondary" data-modal-close>cancelar</button><button type="submit" class="button button-primary">${artist ? 'guardar cambios' : 'crear artista'}</button></div>
    </form>`);
  }

  async function saveArtistForm(event) {
    event.preventDefault();
    const id = $('#editingArtistId').value || uid();
    const current = artists.find(item => item.id === id);
    const name = $('#artistName').value.trim();
    if (!name) return;
    if (artists.some(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase() && item.id !== id)) { toast('ya existe un perfil con ese nombre.', 'error'); return; }
    const artist = { ...(current || {}), id, name, bio: $('#artistBio').value.trim(), createdAt: current?.createdAt || Date.now(), updatedAt: Date.now() };
    try {
      const tx = db.transaction('artists', 'readwrite'); tx.objectStore('artists').put(artist); await transactionDone(tx);
      await refreshData(); closeModal(); activeArtist = name; view = 'artist'; render(); toast(current ? 'perfil actualizado.' : 'artista creado.');
    } catch (error) { toast('no se pudo guardar el artista: ' + error.message, 'error'); }
  }

  function genreCollection() {
    const map = new Map();
    tracks.forEach(track => {
      const name = (track.genre || getAlbum(track.albumId)?.genre || '').trim();
      if (!name) return;
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(track);
    });
    return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es'));
  }

  function renderArtists() {
    const groups = artistCollection();
    const cards = groups.map(([name, list]) => {
      const profile = getArtist(name);
      const initial = escapeHTML(name.slice(0,1).toUpperCase());
      return '<button class="artist-card" data-action="open-artist" data-id="' + escapeHTML(name) + '"><span class="artist-initial">' + initial + '</span><span><strong>' + escapeHTML(name) + '</strong><small>' + list.length + (list.length===1?' canción':' canciones') + (profile?.bio ? ' · perfil' : '') + '</small></span></button>';
    }).join('');
    const action = cloudConfigured && !cloudAdmin ? '' : '<button class="button button-primary" data-action="new-artist">＋ crear artista</button>';
    root.innerHTML = pageHeader('davixiniverso','artistas','perfiles oficiales y discografías del universo Davixini.', action) +
      (cards ? '<div class="artist-grid">' + cards + '</div>' : emptyState('todavía no hay artistas','los perfiles que crees aparecerán aquí junto a su música.','new-artist','crear primer artista'));
    setBreadcrumb('artistas');
  }

  function renderGenres() {
    const groups = genreCollection();
    const cards = groups.map(([name, list], index) => {
      const hue = (index * 47 + 330) % 360;
      return '<button class="genre-card" style="background:linear-gradient(125deg, hsla(' + hue + ',78%,54%,.18), hsla(' + ((hue+90)%360) + ',75%,52%,.17)),var(--surface)" data-action="open-genre" data-id="' + escapeHTML(name) + '"><span><strong>' + escapeHTML(name) + '</strong><small>' + list.length + (list.length===1?' canción':' canciones') + '</small></span></button>';
    }).join('');
    root.innerHTML = pageHeader('colección','géneros','Explora tu biblioteca por sonido.') +
      (cards ? '<div class="genre-grid">' + cards + '</div>' : emptyState('todavía no hay géneros','edita una canción o un álbum para asignarle un género.'));
    setBreadcrumb('géneros');
  }

  function renderArtistDetail() {
    const name = activeArtist;
    const profile = getArtist(name);
    const list = tracks.filter(track => (track.artist || getAlbum(track.albumId)?.artist || '').trim() === name);
    const actions = '<button class="button button-primary" data-action="play-artist" data-id="' + escapeHTML(name) + '">' + icon('play') + ' reproducir todo</button>' + (profile && (!cloudConfigured || cloudAdmin) ? '<button class="button button-secondary" data-action="edit-artist" data-id="' + escapeHTML(profile.id) + '">' + icon('edit') + ' editar perfil</button>' : '');
    root.innerHTML = '<button class="button button-secondary back-button" data-view="artists">← volver a artistas</button>' +
      pageHeader('davixiniverso','',name,actions).replace('<h1></h1>','<h1>' + escapeHTML(name) + '</h1>') +
      (profile?.bio ? '<p class="artist-biography">' + escapeHTML(profile.bio) + '</p>' : '') +
      '<div class="detail-toolbar"><h2>discografía</h2><span class="form-hint">' + list.length + ' pistas</span></div>' + trackTable(list);
    setBreadcrumb('artistas / ' + name);
  }

  function renderGenreDetail() {
    const name = activeGenre;
    const list = tracks.filter(track => (track.genre || getAlbum(track.albumId)?.genre || '').trim() === name);
    root.innerHTML = '<button class="button button-secondary back-button" data-view="genres">← volver a géneros</button>' +
      pageHeader('género','',name,'<button class="button button-primary" data-action="play-genre" data-id="' + escapeHTML(name) + '">' + icon('play') + ' reproducir todo</button>').replace('<h1></h1>','<h1>' + escapeHTML(name) + '</h1>') +
      '<div class="detail-toolbar"><h2>canciones</h2><span class="form-hint">' + list.length + ' pistas</span></div>' + trackTable(list);
    setBreadcrumb('géneros / ' + name);
  }

  function renderSearch() {
    const query = $('#globalSearch').value.trim().toLocaleLowerCase();
    if (!query) { view='home'; render(); return; }
    const matchingAlbums = albums.filter(a=>`${a.title} ${a.artist||''} ${a.genre||''}`.toLocaleLowerCase().includes(query));
    const matchingTracks = tracks.filter(t=>`${t.title} ${t.artist||''} ${t.genre||''} ${t.fileName||''} ${getAlbum(t.albumId)?.title||''} ${getAlbum(t.albumId)?.genre||''}`.toLocaleLowerCase().includes(query));
    const matchingPlaylists = playlists.filter(p=>`${p.name} ${p.description||''}`.toLocaleLowerCase().includes(query));
    root.innerHTML = `${pageHeader('búsqueda',`resultados para “${query}”`,`${matchingAlbums.length} álbumes · ${matchingTracks.length} canciones · ${matchingPlaylists.length} playlists`,'')}
      ${matchingAlbums.length?`<section class="section-block">${sectionHeading('álbumes') }<div class="album-grid">${matchingAlbums.map(albumCard).join('')}</div></section>`:''}
      ${matchingPlaylists.length?`<section class="section-block">${sectionHeading('playlists')}<div class="playlist-grid">${matchingPlaylists.map(playlistCard).join('')}</div></section>`:''}
      ${matchingTracks.length?`<section class="section-block">${sectionHeading('canciones')}${trackTable(matchingTracks)}</section>`:''}
      ${!matchingAlbums.length&&!matchingTracks.length&&!matchingPlaylists.length?emptyState('sin resultados','no se encontraron coincidencias en tu biblioteca.'):''}`;
    setBreadcrumb('búsqueda');
  }

  function setBreadcrumb(value) { $('#breadcrumb').innerHTML = `biblioteca <span>/</span> ${escapeHTML(value)}`; }
  function setNavState() {
    const navView = ['album','playlist'].includes(view) ? (view==='album'?'albums':'playlists') : view==='artist'?'artists':view==='genre'?'genres':view;
    $$('#mainNav [data-view], .mobile-nav [data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===navView));
  }
  function currentTrackId() { return queueIndex >= 0 ? queue[queueIndex] : null; }
  function render() {
    setNavState();
    if (view==='home') renderHome();
    else if (view==='search') renderSearch();
    else if (view==='albums') renderAlbums();
    else if (view==='songs') renderSongs();
    else if (view==='playlists') renderPlaylists();
    else if (view==='artists') renderArtists();
    else if (view==='genres') renderGenres();
    else if (view==='artist') renderArtistDetail();
    else if (view==='genre') renderGenreDetail();
    else if (view==='favorites') renderFavorites();
    else if (view==='recent') renderRecent();
    else if (view==='album') renderAlbumDetail();
    else if (view==='playlist') renderPlaylistDetail();
    else renderHome();
    updatePlayer();
  }

  function showModal(title, kicker, html, wide = false) {
    $('#modalTitle').textContent = title;
    $('#modalKicker').textContent = kicker;
    modal.classList.toggle('modal-wide', wide);
    modalContent.innerHTML = html;
    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    $('#modalClose').focus();
  }
  function closeModal() {
    backdrop.hidden = true;
    document.body.style.overflow = '';
    if (pendingCoverUrl) URL.revokeObjectURL(pendingCoverUrl);
    pendingCover = null; pendingCoverUrl = null; removePendingCover = false;
    $('#coverFileInput').value = '';
  }

  function albumForm(album = null) {
    pendingCover = null; removePendingCover = false;
    const cover = album?.cover ? `<img src="${cachedObjectUrl(album.cover)}" alt="">` : '<span class="cover-placeholder">♪</span>';
    showModal(album?'editar álbum':'nuevo álbum','detalles del álbum', `<form id="albumForm">
      <div class="form-grid">
        <div class="form-field full"><label for="albumTitle">nombre del álbum *</label><input id="albumTitle" name="title" maxlength="100" required value="${escapeHTML(album?.title||'')}" placeholder="nombre del álbum"></div>
        <div class="form-field"><label for="albumArtist">artista</label><input id="albumArtist" name="artist" maxlength="100" value="${escapeHTML(album?.artist||'')}" placeholder="artista o grupo"></div>
        <div class="form-field"><label for="albumYear">año</label><input id="albumYear" name="year" inputmode="numeric" maxlength="4" value="${escapeHTML(album?.year||'')}" placeholder="2026"></div>
        <div class="form-field full"><label for="albumGenre">género</label><input id="albumGenre" name="genre" maxlength="60" value="${escapeHTML(album?.genre||'')}" placeholder="género musical"></div>
        <div class="form-field full"><label for="albumDescription">descripción</label><textarea id="albumDescription" name="description" maxlength="500" placeholder="opcional">${escapeHTML(album?.description||'')}</textarea></div>
      </div>
      <div class="cover-editor"><div class="cover-art" id="coverPreview">${cover}</div><div><button type="button" class="button button-secondary" id="chooseCoverButton">${icon('upload')} elegir portada</button><p class="form-hint">jpg, png, webp o cualquier imagen compatible.</p><button type="button" class="text-button" id="removeCoverButton">quitar portada</button></div></div>
      <div class="modal-footer"><button type="button" class="button button-secondary" data-modal-close>cancelar</button><button type="submit" class="button button-primary">${album?'guardar cambios':'crear álbum'}</button></div>
      <input type="hidden" id="editingAlbumId" value="${escapeHTML(album?.id||'')}">
    </form>`);
  }

  function playlistForm(playlist = null) {
    showModal(playlist?'editar playlist':'nueva playlist','playlists', `<form id="playlistForm"><div class="form-field"><label for="playlistName">nombre *</label><input id="playlistName" maxlength="100" required value="${escapeHTML(playlist?.name||'')}" placeholder="nombre de la playlist"></div><div class="form-field"><label for="playlistDescription">descripción</label><textarea id="playlistDescription" maxlength="300" placeholder="opcional">${escapeHTML(playlist?.description||'')}</textarea></div><input type="hidden" id="editingPlaylistId" value="${escapeHTML(playlist?.id||'')}"><div class="modal-footer"><button type="button" class="button button-secondary" data-modal-close>cancelar</button><button class="button button-primary" type="submit">${playlist?'guardar cambios':'crear playlist'}</button></div></form>`);
  }

  function trackForm(track) {
    const album = albumForTrack(track);
    showModal('editar canción','metadatos de la pista', `<form id="trackForm"><div class="form-grid"><div class="form-field full"><label for="trackTitle">título *</label><input id="trackTitle" required maxlength="160" value="${escapeHTML(track.title)}"></div><div class="form-field"><label for="trackArtist">artista</label><input id="trackArtist" maxlength="120" value="${escapeHTML(track.artist||'')}"></div><div class="form-field"><label for="trackGenre">género</label><input id="trackGenre" maxlength="60" value="${escapeHTML(track.genre||'')}" placeholder="género"></div><div class="form-field"><label for="trackYear">año</label><input id="trackYear" maxlength="4" inputmode="numeric" value="${escapeHTML(track.year||'')}"></div><div class="form-field"><label for="trackAlbum">álbum</label><select id="trackAlbum"><option value="">sin álbum</option>${albums.map(a=>`<option value="${escapeHTML(a.id)}" ${a.id===track.albumId?'selected':''}>${escapeHTML(a.title)}</option>`).join('')}</select></div></div><p class="form-hint">audio guardado · ${formatBytes(track.size||track.blob?.size||0)}</p><input type="hidden" id="editingTrackId" value="${escapeHTML(track.id)}"><div class="modal-footer"><button type="button" class="button button-secondary" data-modal-close>cancelar</button><button type="submit" class="button button-primary">guardar cambios</button></div></form>`);
  }

  function chooseAlbumForImport() {
    if (!albums.length) { toast('crea un álbum antes de importar música.'); albumForm(); return; }
    showModal('elige un álbum','importar archivos', `<div class="modal-list">${albums.map(album=>`<button class="modal-list-item" data-action="select-import-album" data-id="${escapeHTML(album.id)}">${coverMarkup(album)}<span><strong>${escapeHTML(album.title)}</strong><small>${escapeHTML(album.artist||'artista desconocido')} · ${tracksForAlbum(album).length} canciones</small></span><span class="item-end">${icon('arrow')}</span></button>`).join('')}</div><div class="modal-footer"><button class="button button-secondary" data-modal-close>cancelar</button><button class="button button-primary" data-action="new-album-for-import">${icon('plus')} crear álbum</button></div>`);
  }

  function choosePlaylist(trackId) {
    if (!playlists.length) { toast('crea una playlist primero.'); playlistForm(); return; }
    showModal('añadir a playlist','guardar canción', `<div class="modal-list">${playlists.map(p=>`<button class="modal-list-item" data-action="add-track-to-playlist" data-id="${escapeHTML(p.id)}" data-track="${escapeHTML(trackId)}"><div class="cover-art playlist-mark"><span class="cover-placeholder">≡</span></div><span><strong>${escapeHTML(p.name)}</strong><small>${tracksForPlaylist(p).length} canciones</small></span><span class="item-end">${icon('plus')}</span></button>`).join('')}</div><div class="modal-footer"><button class="button button-secondary" data-modal-close>cancelar</button><button class="button button-primary" data-action="new-playlist-for-track" data-track="${escapeHTML(trackId)}">${icon('plus')} nueva playlist</button></div>`);
  }

  function addTracksToPlaylistModal(playlistId) {
    const playlist = getPlaylist(playlistId);
    if (!playlist) return;
    const candidates = tracks.filter(t=>!(playlist.trackIds||[]).includes(t.id));
    showModal(`añadir canciones`,playlist.name, `${candidates.length ? `<div class="modal-list">${candidates.map(track=>`<button class="modal-list-item" data-action="append-to-playlist" data-id="${escapeHTML(track.id)}" data-playlist="${escapeHTML(playlistId)}">${trackCoverMarkup(track)}<span><strong>${escapeHTML(track.title)}</strong><small>${escapeHTML(albumForTrack(track)?.title||track.artist||'sin álbum')}</small></span><span class="item-end">${icon('plus')}</span></button>`).join('')}</div>` : '<p class="form-hint">no hay más canciones por añadir.</p>'}<div class="modal-footer"><button class="button button-secondary" data-modal-close>cerrar</button></div>`, true);
  }

  function showQueue() {
    const queuedTracks = queue.map((id,index)=>({track:getTrack(id),index})).filter(item=>item.track);
    showModal('cola de reproducción',`${queuedTracks.length} canciones`, `${queuedTracks.length ? `<div class="modal-list">${queuedTracks.map(({track,index})=>`<div class="modal-list-item ${index===queueIndex?'queue-current':''}"><button class="track-main" data-action="queue-play" data-index="${index}" style="flex:1">${trackCoverMarkup(track)}<span class="track-copy"><strong>${escapeHTML(track.title)}</strong><small>${escapeHTML(albumForTrack(track)?.title||track.artist||'')}</small></span></button><span class="queue-reorder"><button class="track-action" data-action="queue-move-up" data-index="${index}" aria-label="Mover arriba" ${index===0?"disabled":""}>↑</button><button class="track-action" data-action="queue-move-down" data-index="${index}" aria-label="Mover abajo" ${index===queuedTracks.length-1?"disabled":""}>↓</button></span><button class="track-action" data-action="queue-remove" data-index="${index}" aria-label="Quitar de la cola">${icon('close')}</button></div>`).join('')}</div>` : '<p class="form-hint">la cola está vacía. reproduce un álbum o una playlist para llenarla.</p>'}<div class="modal-footer">${queuedTracks.length?'<button class="button button-danger" data-action="queue-clear">vaciar cola</button>':''}<button class="button button-secondary" data-modal-close>cerrar</button></div>`, true);
  }

  function settingsModal() {
    const total = tracks.reduce((sum,t)=>sum+(t.size||t.blob?.size||0),0);
    showModal('ajustes y copias','tu biblioteca', `<div class="settings-section"><h3>copia de seguridad</h3><p>exporta tus álbumes, portadas, playlists y archivos de audio en un único archivo JSON. puede ocupar bastante espacio.</p><div class="settings-actions"><button class="button button-primary" data-action="export-backup">${icon('download')} exportar biblioteca</button><button class="button button-secondary" data-action="import-backup">${icon('upload')} restaurar copia</button></div><p class="settings-note">tamaño aproximado de audio: ${formatBytes(total)}. guarda la copia en otro dispositivo o unidad.</p></div>
      <div class="settings-section"><h3>reproducción</h3><p>atajos: espacio reproduce o pausa, flechas cambian posición y volumen, F abre o cierra el reproductor y Ctrl/⌘ + K busca. también puedes cambiar la velocidad desde el reproductor a pantalla completa.</p><div class="settings-actions"><button class="button button-secondary" data-action="reset-player">restablecer volumen y reproducción</button></div></div>
      <div class="settings-section"><h3>datos y almacenamiento</h3><p>este navegador conserva una copia de trabajo. el catálogo compartido y sus archivos se publican en supabase cuando el administrador pulsa “publicar cambios”.</p><div class="settings-actions"><button class="button button-danger" data-action="clear-library">borrar biblioteca de este navegador</button></div></div>
      <div class="settings-section"><h3>acerca de</h3><p>davixiniTracker no tiene publicidad ni analítica. supabase almacena la biblioteca compartida y controla quién puede modificarla.</p><p class="settings-note">Los formatos reproducibles dependen del navegador y del sistema operativo.</p></div>`);
  }

  function openFilePicker(albumId) {
    const input = $('#audioFileInput');
    input.dataset.albumId = albumId || '';
    input.value = '';
    input.click();
  }

  async function readTextFrame(bytes, encoding) {
    if (!bytes?.length) return '';
    try {
      if (encoding === 0) return new TextDecoder('iso-8859-1').decode(bytes).replace(/\0/g,'').trim();
      if (encoding === 1) return new TextDecoder('utf-16').decode(bytes).replace(/\0/g,'').trim();
      if (encoding === 2) return new TextDecoder('utf-16be').decode(bytes).replace(/\0/g,'').trim();
      return new TextDecoder('utf-8').decode(bytes).replace(/\0/g,'').trim();
    } catch (_) { return ''; }
  }

  function syncSafeInt(bytes, offset) { return (bytes[offset]&0x7f)<<21 | (bytes[offset+1]&0x7f)<<14 | (bytes[offset+2]&0x7f)<<7 | (bytes[offset+3]&0x7f); }
  function normalInt(bytes, offset) { return (bytes[offset]<<24) | (bytes[offset+1]<<16) | (bytes[offset+2]<<8) | bytes[offset+3]; }

  async function parseId3(file) {
    const result = { title:'', artist:'', album:'', year:'', genre:'', artwork:null };
    try {
      const head = new Uint8Array(await file.slice(0, Math.min(file.size, 12 * 1024 * 1024)).arrayBuffer());
      if (head.length >= 10 && String.fromCharCode(...head.slice(0,3)) === 'ID3') {
        const version = head[3];
        const tagEnd = Math.min(head.length, 10 + syncSafeInt(head,6));
        let pos = 10;
        while (pos + 10 <= tagEnd) {
          const frameId = String.fromCharCode(...head.slice(pos,pos+4));
          if (!/^[A-Z0-9]{4}$/.test(frameId)) break;
          const size = version === 4 ? syncSafeInt(head,pos+4) : normalInt(head,pos+4);
          if (!Number.isFinite(size) || size <= 0 || pos + 10 + size > tagEnd) break;
          const payload = head.slice(pos+10,pos+10+size);
          if (frameId[0] === 'T' && payload.length > 1) {
            const text = await readTextFrame(payload.slice(1),payload[0]);
            const fields = { TIT2:'title',TPE1:'artist',TALB:'album',TDRC:'year',TYER:'year',TCON:'genre' };
            if (fields[frameId] && !result[fields[frameId]]) result[fields[frameId]] = text;
          }
          if (frameId === 'APIC' && payload.length > 10 && !result.artwork) {
            const enc = payload[0];
            let cursor = 1;
            while (cursor < payload.length && payload[cursor] !== 0) cursor++;
            const mime = new TextDecoder().decode(payload.slice(1,cursor)) || 'image/jpeg';
            cursor += 2;
            if (enc === 1 || enc === 2) { while (cursor+1 < payload.length && !(payload[cursor]===0&&payload[cursor+1]===0)) cursor+=2; cursor+=2; }
            else { while (cursor < payload.length && payload[cursor] !== 0) cursor++; cursor++; }
            if (cursor < payload.length) result.artwork = new Blob([payload.slice(cursor)],{type:mime});
          }
          pos += 10 + size;
        }
      }
    } catch (_) { /* los tags dañados no deben impedir importar el archivo */ }
    if (!result.title) result.title = titleFromFile(file.name);
    return result;
  }

  async function importFiles(fileList, albumId) {
    const targetAlbum = getAlbum(albumId);
    if (!targetAlbum) { toast('elige un álbum válido para importar.','error'); return; }
    const files = [...fileList].filter(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      return file.type.startsWith('audio/') || AUDIO_ACCEPTED.has(extension);
    });
    if (!files.length) { toast('no encontré archivos de audio compatibles.','error'); return; }
    let rejected = fileList.length - files.length;
    toast(`importando ${files.length} ${files.length===1?'archivo':'archivos'}…`);
    const newTracks = [];
    const albumTrackIds = [...(targetAlbum.trackIds||[])];
    let duplicates = 0;
    for (const file of files) {
      if (!file.size) { rejected++; continue; }
      const duplicate = tracks.some(track=>track.albumId===albumId && track.fileName===file.name && (track.size||track.blob?.size)===file.size);
      if (duplicate) { duplicates++; continue; }
      const meta = await parseId3(file);
      const track = {
        id:uid(), albumId, title:meta.title || titleFromFile(file.name), artist:meta.artist || '',
        albumName:meta.album || '', year:meta.year || '', genre:meta.genre || '',
        fileName:file.name, mimeType:file.type || 'audio/mpeg', size:file.size, blob:file,
        artwork:meta.artwork, duration:0, favorite:false, addedAt:Date.now(), lastPlayedAt:0
      };
      newTracks.push(track); albumTrackIds.push(track.id);
      if (!targetAlbum.cover && meta.artwork && !newTracks.some(t=>t._coverUsed)) { targetAlbum.cover = meta.artwork; track._coverUsed = true; }
    }
    if (!newTracks.length) { toast(duplicates ? 'esas canciones ya están en este álbum.' : 'no se pudo importar ningún archivo.','error'); return; }
    try {
      const tx = db.transaction(['albums','tracks'],'readwrite');
      const albumStore = tx.objectStore('albums');
      const trackStore = tx.objectStore('tracks');
      for (const track of newTracks) { delete track._coverUsed; trackStore.add(track); }
      albumStore.put({...targetAlbum,trackIds:albumTrackIds});
      await transactionDone(tx);
      await refreshData();
      view='album'; activeAlbumId=albumId; render();
      const parts = [`${newTracks.length} ${newTracks.length===1?'canción importada':'canciones importadas'}`];
      if (duplicates) parts.push(`${duplicates} duplicadas`);
      if (rejected) parts.push(`${rejected} archivos no compatibles`);
      toast(parts.join(' · '));
    } catch (error) {
      const msg = error?.name==='QuotaExceededError' ? 'no hay espacio suficiente en el almacenamiento del navegador.' : `no se pudo importar: ${error.message||'error'}`;
      toast(msg,'error');
    }
  }

  async function saveAlbumForm(event) {
    event.preventDefault();
    const id = $('#editingAlbumId').value || uid();
    const current = getAlbum(id);
    const title = $('#albumTitle').value.trim();
    if (!title) return;
    const album = {
      ...(current||{}), id, title, artist:$('#albumArtist').value.trim(), year:$('#albumYear').value.trim(),
      genre:$('#albumGenre').value.trim(), description:$('#albumDescription').value.trim(),
      cover:removePendingCover ? null : (pendingCover || current?.cover || null), trackIds:current?.trackIds || [], createdAt:current?.createdAt || Date.now(), updatedAt:Date.now()
    };
    try {
      const tx = db.transaction('albums','readwrite'); tx.objectStore('albums').put(album); await transactionDone(tx);
      await refreshData(); closeModal();
      if (current) { view='album'; activeAlbumId=id; toast('álbum actualizado.'); }
      else { view='album'; activeAlbumId=id; toast('álbum creado.'); }
      render();
    } catch (error) { toast(`no se pudo guardar el álbum: ${error.message}`,'error'); }
  }

  async function savePlaylistForm(event) {
    event.preventDefault();
    const id = $('#editingPlaylistId').value || uid();
    const current = getPlaylist(id);
    const name = $('#playlistName').value.trim();
    if (!name) return;
    const playlist = { ...(current||{}), id, name, description:$('#playlistDescription').value.trim(), trackIds:current?.trackIds||[], createdAt:current?.createdAt||Date.now(), updatedAt:Date.now() };
    try { const tx=db.transaction('playlists','readwrite'); tx.objectStore('playlists').put(playlist); await transactionDone(tx); await refreshData(); closeModal(); view='playlist'; activePlaylistId=id; render(); toast(current?'playlist actualizada.':'playlist creada.'); }
    catch(error) { toast(`no se pudo guardar: ${error.message}`,'error'); }
  }

  async function saveTrackForm(event) {
    event.preventDefault();
    const id = $('#editingTrackId').value;
    const track = getTrack(id);
    if (!track) return;
    const targetAlbumId = $('#trackAlbum').value || null;
    const updated = {...track,title:$('#trackTitle').value.trim(),artist:$('#trackArtist').value.trim(),genre:$('#trackGenre').value.trim(),year:$('#trackYear').value.trim(),albumId:targetAlbumId};
    if (!updated.title) return;
    try {
      const tx = db.transaction(['tracks','albums'],'readwrite');
      tx.objectStore('tracks').put(updated);
      if (track.albumId !== targetAlbumId) {
        const oldAlbum=getAlbum(track.albumId), newAlbum=getAlbum(targetAlbumId);
        if (oldAlbum) tx.objectStore('albums').put({...oldAlbum,trackIds:oldAlbum.trackIds.filter(tid=>tid!==id)});
        if (newAlbum) tx.objectStore('albums').put({...newAlbum,trackIds:[...(newAlbum.trackIds||[]),id]});
      }
      await transactionDone(tx); await refreshData(); closeModal(); render(); updatePlayer(); toast('datos de la canción actualizados.');
    } catch(error) { toast(`no se pudo actualizar: ${error.message}`,'error'); }
  }

  async function toggleFavorite(id) {
    const track=getTrack(id); if(!track) return;
    try { const tx=db.transaction('tracks','readwrite'); tx.objectStore('tracks').put({...track,favorite:!track.favorite}); await transactionDone(tx); await refreshData(); render(); updatePlayer(); }
    catch(error) { toast(`no se pudo actualizar el favorito: ${error.message}`,'error'); }
  }

  async function replaceTrackAudio(id, file) {
    const track = getTrack(id);
    if (!track || !file) return;
    const extension = (file.name.split('.').pop() || '').toLowerCase();
    if (!file.type.startsWith('audio/') && !AUDIO_ACCEPTED.has(extension)) {
      toast('elige un archivo de audio compatible.', 'error');
      return;
    }
    if (!file.size) { toast('el archivo seleccionado está vacío.', 'error'); return; }
    // sustituye únicamente el audio y sus datos técnicos: título, nombre original,
    // artista, portada, álbum, favoritos y playlists permanecen intactos.
    const updated = {...track, blob:file,
      mimeType:file.type || track.mimeType || 'audio/mpeg', size:file.size,
      duration:0, replacedAt:Date.now()};
    try {
      const tx = db.transaction('tracks', 'readwrite');
      tx.objectStore('tracks').put(updated);
      await transactionDone(tx);
      const wasCurrent = currentTrackId() === id;
      const wasPlaying = wasCurrent && !audio.paused;
      if (wasCurrent) audio.pause();
      // primero refresca el registro y después carga el audio nuevo: así el evento
      // loadedmetadata nunca puede guardar por accidente el Blob anterior.
      await refreshData();
      if (wasCurrent) {
        if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = URL.createObjectURL(file);
        audio.src = currentObjectUrl;
        audio.load();
        if (wasPlaying) audio.play().catch(() => toast('archivo sustituido, pero el navegador no pudo reproducirlo.', 'error'));
      }
      closeModal(); render();
      toast('audio sustituido. se conservaron título, metadatos, portada, favoritos y playlists.');
    } catch (error) {
      toast(error?.name === 'QuotaExceededError' ? 'no hay espacio suficiente para guardar el nuevo archivo.' : 'no se pudo sustituir: ' + (error.message || 'error'), 'error');
    }
  }

  function downloadTrack(id) {
    const track = getTrack(id);
    if (!track?.blob) { toast('el archivo original ya no está disponible.', 'error'); return; }
    const url = URL.createObjectURL(track.blob);
    const link = document.createElement('a');
    link.href = url; link.download = track.fileName || ((track.title || 'cancion') + '.mp3'); link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('descarga iniciada.');
  }

  async function duplicateTrack(id) {
    const source = getTrack(id);
    if (!source) return;
    const duplicate = {...source, id:uid(), title:source.title + ' (copia)', addedAt:Date.now(), lastPlayedAt:0, favorite:false};
    try {
      const tx = db.transaction(['tracks','albums'],'readwrite');
      tx.objectStore('tracks').add(duplicate);
      const album = getAlbum(source.albumId);
      if (album) tx.objectStore('albums').put({...album,trackIds:[...(album.trackIds||[]),duplicate.id]});
      await transactionDone(tx); await refreshData(); closeModal(); render();
      toast('canción duplicada.');
    } catch (error) { toast('no se pudo duplicar la canción: ' + error.message,'error'); }
  }

  async function removeTrack(id) {
    const track=getTrack(id); if(!track) return;
    if(!confirm(`¿quitar “${track.title}” de tu biblioteca?`)) return;
    try {
      const tx=db.transaction(['tracks','albums','playlists'],'readwrite');
      tx.objectStore('tracks').delete(id);
      for(const album of albums) if((album.trackIds||[]).includes(id)) tx.objectStore('albums').put({...album,trackIds:album.trackIds.filter(tid=>tid!==id)});
      for(const playlist of playlists) if((playlist.trackIds||[]).includes(id)) tx.objectStore('playlists').put({...playlist,trackIds:playlist.trackIds.filter(tid=>tid!==id)});
      await transactionDone(tx);
      const removedQueueIndex=queue.indexOf(id);
      if(currentTrackId()===id) stopPlayback();
      else if(removedQueueIndex>=0) { queue.splice(removedQueueIndex,1); if(removedQueueIndex<queueIndex) queueIndex--; }
      if(queueIndex>=queue.length) queueIndex=queue.length-1;
      await refreshData(); render(); toast('canción eliminada.');
    } catch(error) { toast(`no se pudo eliminar: ${error.message}`,'error'); }
  }

  async function removeAlbum(id) {
    const album=getAlbum(id); if(!album) return;
    if(!confirm(`¿eliminar el álbum “${album.title}” y sus ${album.trackIds.length} canciones?`)) return;
    const ids=new Set(album.trackIds||[]);
    try {
      const tx=db.transaction(['albums','tracks','playlists'],'readwrite');
      tx.objectStore('albums').delete(id);
      for(const tid of ids) tx.objectStore('tracks').delete(tid);
      for(const playlist of playlists) tx.objectStore('playlists').put({...playlist,trackIds:playlist.trackIds.filter(tid=>!ids.has(tid))});
      await transactionDone(tx);
      const currentWasRemoved=ids.has(currentTrackId());
      if(currentWasRemoved) stopPlayback();
      else { const removedBefore=queue.slice(0,queueIndex).filter(tid=>ids.has(tid)).length; queue=queue.filter(tid=>!ids.has(tid)); queueIndex-=removedBefore; }
      if(queueIndex>=queue.length) queueIndex=queue.length-1;
      await refreshData(); view='albums'; activeAlbumId=null; render(); toast('álbum eliminado.');
    } catch(error) { toast(`no se pudo eliminar: ${error.message}`,'error'); }
  }

  async function removePlaylist(id) {
    const playlist=getPlaylist(id); if(!playlist) return;
    if(!confirm(`¿eliminar la playlist “${playlist.name}”? las canciones originales no se eliminarán.`)) return;
    try { const tx=db.transaction('playlists','readwrite'); tx.objectStore('playlists').delete(id); await transactionDone(tx); await refreshData(); view='playlists'; activePlaylistId=null; render(); toast('playlist eliminada.'); }
    catch(error) { toast(`no se pudo eliminar: ${error.message}`,'error'); }
  }

  async function appendTrackToPlaylist(trackId, playlistId, keepOpen = false) {
    const playlist=getPlaylist(playlistId); const track=getTrack(trackId);
    if(!playlist||!track) return;
    if((playlist.trackIds||[]).includes(trackId)) { toast('esa canción ya está en la playlist.'); return; }
    try { const tx=db.transaction('playlists','readwrite'); tx.objectStore('playlists').put({...playlist,trackIds:[...playlist.trackIds,trackId]}); await transactionDone(tx); await refreshData(); if(keepOpen) addTracksToPlaylistModal(playlistId); else closeModal(); if(view==='playlist'&&activePlaylistId===playlistId) render(); toast('canción añadida a la playlist.'); }
    catch(error) { toast(`no se pudo añadir: ${error.message}`,'error'); }
  }

  async function removeFromPlaylist(trackId, playlistId) {
    const playlist=getPlaylist(playlistId); if(!playlist) return;
    try { const tx=db.transaction('playlists','readwrite'); tx.objectStore('playlists').put({...playlist,trackIds:playlist.trackIds.filter(id=>id!==trackId)}); await transactionDone(tx); await refreshData(); render(); toast('canción quitada de la playlist.'); }
    catch(error) { toast(`no se pudo quitar: ${error.message}`,'error'); }
  }

  async function reorderTrackInCollection(type, collectionId, trackId, targetTrackId, insertBefore = true) {
    const collection = type === 'album' ? getAlbum(collectionId) : type === 'playlist' ? getPlaylist(collectionId) : null;
    if (!collection || trackId === targetTrackId) return;
    const ids = [...(type === 'album' ? collection.trackIds || [] : collection.trackIds || [])];
    const from = ids.indexOf(trackId);
    const to = ids.indexOf(targetTrackId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    const targetAfterRemoval = ids.indexOf(targetTrackId);
    if (targetAfterRemoval < 0) return;
    ids.splice(targetAfterRemoval + (insertBefore ? 0 : 1), 0, trackId);
    try {
      const storeName = type === 'album' ? 'albums' : 'playlists';
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put({...collection, trackIds:ids});
      await transactionDone(tx);
      await refreshData();
      render();
    } catch (error) {
      toast('no se pudo guardar el nuevo orden: ' + (error.message || 'error'), 'error');
    }
  }

  async function moveTrackInCollection(type, collectionId, trackId, delta) {
    const collection = type === 'album' ? getAlbum(collectionId) : type === 'playlist' ? getPlaylist(collectionId) : null;
    if (!collection) return;
    const ids = [...(collection.trackIds || [])];
    const index = ids.indexOf(trackId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      const storeName = type === 'album' ? 'albums' : 'playlists';
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put({...collection, trackIds:ids});
      await transactionDone(tx);
      await refreshData();
      render();
    } catch (error) {
      toast('no se pudo guardar el nuevo orden: ' + (error.message || 'error'), 'error');
    }
  }

  function startQueue(list, startIndex=0) {
    const usable=list.filter(track=>track && track.blob);
    if(!usable.length) { toast('no hay archivos reproducibles en esta lista.'); return; }
    queue=usable.map(track=>track.id);
    queueIndex=Math.max(0,Math.min(startIndex,queue.length-1));
    playCurrent();
  }

  function playCurrent() {
    window.DavixiniCrossfade?.cancel();
    const track=getTrack(queue[queueIndex]);
    window.__davixiniCurrentTrackId = track?.id || null;
    if(!track?.blob) { toast('el archivo ya no está disponible.','error'); return; }
    if(currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl=URL.createObjectURL(track.blob);
    audio.src=currentObjectUrl;
    audio.playbackRate=playbackRate;
    audio.play().then(()=>updatePlayer()).catch(()=>toast('el navegador no pudo reproducir este formato.','error'));
    const updated={...track,lastPlayedAt:Date.now()};
    const tx=db.transaction('tracks','readwrite'); tx.objectStore('tracks').put(updated); tx.oncomplete=()=>{refreshData().catch(()=>{});};
    updatePlayer();
  }

  function stopPlayback() {
    window.DavixiniCrossfade?.cancel();
    audio.pause(); audio.removeAttribute('src'); audio.load();
    if(currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl=null; queue=[]; queueIndex=-1; window.__davixiniCurrentTrackId=null; updatePlayer();
  }

  function nextTrack(direction=1) {
    window.DavixiniCrossfade?.cancel();
    if(!queue.length) return;
    if(shuffle && direction>0 && queue.length>1) {
      let next=queueIndex; while(next===queueIndex) next=Math.floor(Math.random()*queue.length); queueIndex=next;
    } else {
      const next=queueIndex+direction;
      if(next<0) queueIndex=repeatMode==='all'?queue.length-1:0;
      else if(next>=queue.length) { if(repeatMode==='all') queueIndex=0; else { stopPlayback(); return; } }
      else queueIndex=next;
    }
    playCurrent();
  }

  // API pequeño para que el segundo reproductor pueda consultar y confirmar
  // la siguiente pista sin romper la cola ni los controles existentes.
  window.DavixiniPlayback = {
    getNextForCrossfade() {
      if(!queue.length || queueIndex<0) return null;
      let index;
      if(repeatMode==='one') index=queueIndex;
      else if(shuffle && queue.length>1) {
        index=queueIndex;
        while(index===queueIndex) index=Math.floor(Math.random()*queue.length);
      } else {
        index=queueIndex+1;
        if(index>=queue.length) {
          if(repeatMode==='all') index=0;
          else return null;
        }
      }
      const track=getTrack(queue[index]);
      if(!track?.blob) return null;
      return {index,id:track.id,blob:track.blob};
    },
    async commitCrossfade(index,id,url,resumeTime,volume) {
      if(queue[index]!==id || !getTrack(id)?.blob) throw new Error('la cola cambió durante la transición.');
      const previousUrl=currentObjectUrl;
      const previousTime=audio.currentTime;
      const previousIndex=queueIndex;
      const previousId=window.__davixiniCurrentTrackId;
      // Espera a los metadatos de la URL solicitada, no a los que pueda
      // conservar temporalmente el elemento de audio de la pista anterior.
      const waitForSourceMetadata=(expectedUrl)=>new Promise((resolve,reject)=>{
        const matches=()=>audio.src===expectedUrl;
        if(matches() && audio.readyState>=1 && Number.isFinite(audio.duration)) return resolve();
        let timer;
        const cleanup=()=>{audio.removeEventListener('loadedmetadata',onReady);audio.removeEventListener('error',onError);clearTimeout(timer);};
        const onReady=()=>{if(!matches())return;cleanup();resolve();};
        const onError=()=>{if(!matches())return;cleanup();reject(new Error('el navegador no pudo cargar la canción entrante.'));};
        audio.addEventListener('loadedmetadata',onReady);
        audio.addEventListener('error',onError);
        timer=setTimeout(()=>{cleanup();reject(new Error('la canción entrante no terminó de cargar sus metadatos.'));},12000);
        if(matches() && audio.readyState>=1 && Number.isFinite(audio.duration)){cleanup();resolve();}
      });
      const seekAndWait=(target,expectedUrl)=>new Promise((resolve,reject)=>{
        const safeTarget=Math.max(0,Math.min(Number(target)||0,Math.max(0,audio.duration-0.01)));
        if(audio.src===expectedUrl && !audio.seeking && Math.abs(audio.currentTime-safeTarget)<0.025) return resolve();
        let timer;
        const cleanup=()=>{audio.removeEventListener('seeked',onSeeked);audio.removeEventListener('error',onError);clearTimeout(timer);};
        const onSeeked=()=>{
          if(audio.src!==expectedUrl)return;
          cleanup();
          if(Math.abs(audio.currentTime-safeTarget)>0.12) return reject(new Error('el navegador no respetó la posición exacta de la canción.'));
          resolve();
        };
        const onError=()=>{if(audio.src!==expectedUrl)return;cleanup();reject(new Error('falló la búsqueda de posición de la canción entrante.'));};
        audio.addEventListener('seeked',onSeeked);
        audio.addEventListener('error',onError);
        timer=setTimeout(()=>{cleanup();reject(new Error('el navegador tardó demasiado en fijar la posición de la canción.'));},10000);
        try{
          audio.currentTime=safeTarget;
          if(!audio.seeking && Math.abs(audio.currentTime-safeTarget)<0.025){cleanup();resolve();}
        }catch(error){cleanup();reject(error);}
      });
      try {
        // al cambiar el src puede quedar encolado el evento ended del audio anterior.
        // lo ignoramos durante el relevo para que no reinicie ni avance la pista nueva.
        audio.pause();
        queueIndex=index;
        window.__davixiniCurrentTrackId=id;
        currentObjectUrl=url;
        audio.src=url;
        audio.playbackRate=playbackRate;
        audio.load();
        await waitForSourceMetadata(url);
        await seekAndWait(resumeTime,url);
        audio.volume=Math.min(1,Math.max(0,Number(volume)||0));
        const track=getTrack(id);
        if(track) {
          const tx=db.transaction('tracks','readwrite');
          tx.objectStore('tracks').put({...track,lastPlayedAt:Date.now()});
          tx.oncomplete=()=>refreshData().catch(()=>{});
        }
        updatePlayer();
        await audio.play();
        // Mantén protegida la nueva pista justo después del relevo por si el
        // navegador entrega tarde el ended que pertenecía al recurso anterior.
        window.__davixiniCrossfadeSuppressEndedUntil = performance.now() + 1200;
        if(previousUrl && previousUrl!==url) URL.revokeObjectURL(previousUrl);
        updatePlayer();
        return true;
      } catch(error) {
        audio.pause();
        queueIndex=previousIndex;
        window.__davixiniCurrentTrackId=previousId;
        currentObjectUrl=previousUrl;
        if(previousUrl) {
          audio.src=previousUrl;
          audio.load();
          try {
            await waitForSourceMetadata(previousUrl);
            await seekAndWait(previousTime,previousUrl);
            audio.volume=Math.min(1,Math.max(0,Number(volume)||0));
            await audio.play();
          } catch(_) {}
        }
        updatePlayer();
        throw error;
      }
    }
  };

  function updatePlayer() {
    const id=currentTrackId();
    const track=getTrack(id);
    const album=albumForTrack(track);
    $('#playerTrackTitle').textContent=track?.title||'nada reproduciéndose';
    $('#playerTrackArtist').textContent=track ? [track.artist||album?.artist,album?.title].filter(Boolean).join(' · ') || 'artista desconocido' : 'elige una canción';
    const artwork=coverForTrack(track);
    const cover=$('#playerArtwork');
    cover.innerHTML=artwork?`<img src="${cachedObjectUrl(artwork)}" alt="">`:'<span class="artwork-placeholder">♪</span>';
    $('#playButton').innerHTML=icon(audio.paused?'play':'pause');
    $('#playButton').setAttribute('aria-label',audio.paused?'reproducir':'pausar');
    $('#shuffleButton').classList.toggle('active',shuffle);
    $('#repeatButton').classList.toggle('active',repeatMode!=='off');
    $('#repeatButton').innerHTML=icon('repeat');
    $('#repeatButton').title=`Repetir: ${repeatMode==='off'?'desactivado':repeatMode==='all'?'toda la cola':'una canción'}`;
    $('#repeatButton').setAttribute('aria-label',$('#repeatButton').title);
    $('#favoriteCurrent').disabled=!track;
    $('#favoriteCurrent').classList.toggle('active',Boolean(track?.favorite));
    $('#favoriteCurrent').innerHTML=icon(track?.favorite?'heartFilled':'heart');
    $('#expandPlayerButton').disabled=!track;
    $('#elapsedTime').textContent=formatTime(audio.currentTime||0);
    $('#totalTime').textContent=formatTime(audio.duration||track?.duration||0);
    if(!Number.isFinite(audio.duration)||audio.duration<=0) $('#seekBar').value=0;
    $('#viewRoot [data-track-row]').forEach(row=>row.classList.toggle('is-playing',row.dataset.trackRow===id));
    updateFullPlayer(track,album,artwork);
  }

  function updateFullPlayer(track,album,artwork) {
    const panel=$('#fullPlayer');
    const cover=$('#fullPlayerArtwork');
    const coverUrl=artwork?cachedObjectUrl(artwork):'';
    cover.innerHTML=coverUrl?`<img src="${coverUrl}" alt="">`:'<span class="full-player-placeholder">♪</span>';
    panel.style.setProperty('--full-cover-image',coverUrl?`url("${coverUrl}")`:'none');
    $('#fullPlayerTitle').textContent=track?.title||'elige una canción';
    $('#fullPlayerArtist').textContent=track?[track.artist||album?.artist,album?.title].filter(Boolean).join(' · ')||'artista desconocido':'tu biblioteca te espera';
    $('#fullPlayerPlay').innerHTML=icon(audio.paused?'play':'pause');
    $('#fullPlayerPlay').setAttribute('aria-label',audio.paused?'reproducir':'pausar');
    $('#fullPlayerShuffle').classList.toggle('active',shuffle);
    $('#fullPlayerRepeat').classList.toggle('active',repeatMode!=='off');
    $('#fullPlayerFavorite').disabled=!track;
    $('#fullPlayerFavorite').classList.toggle('active',Boolean(track?.favorite));
    $('#fullPlayerFavorite').innerHTML=icon(track?.favorite?'heartFilled':'heart');
    $('#fullPlayerElapsed').textContent=formatTime(audio.currentTime||0);
    $('#fullPlayerTotal').textContent=formatTime(audio.duration||track?.duration||0);
    $('#fullPlayerSeekBar').value=Number.isFinite(audio.duration)&&audio.duration>0?audio.currentTime/audio.duration*1000:0;
    $('#fullPlayerVolume').value=audio.volume;
    $('#fullPlayerSpeed').value=String(playbackRate);
    $('#fullPlayerQueue').disabled=!queue.length;
    $('#fullPlayerShuffle').disabled=!track;
    $('#fullPlayerRepeat').disabled=!track;
    panel.classList.toggle('is-playing',Boolean(track&&!audio.paused));
  }

  function setFullPlayerVisible(visible) {
    const panel=$('#fullPlayer');
    if(visible&&!currentTrackId()) { toast('primero reproduce una canción para abrir el reproductor.'); return; }
    if(visible) {
      panel.hidden=false;
      panel.setAttribute('aria-hidden','false');
      document.body.classList.add('full-player-open');
      updatePlayer();
      $('#fullPlayerClose').focus();
      if(typeof panel.requestFullscreen==='function' && !document.fullscreenElement) {
        try { const request=panel.requestFullscreen({navigationUI:'hide'}); if(request&&typeof request.catch==='function') request.catch(()=>{}); }
        catch (_) { /* el panel sigue ocupando el viewport */ }
      }
    } else {
      panel.hidden=true;
      panel.setAttribute('aria-hidden','true');
      document.body.classList.remove('full-player-open');
      if(document.fullscreenElement===panel && document.exitFullscreen) { const exit=document.exitFullscreen(); if(exit&&typeof exit.catch==='function') exit.catch(()=>{}); }
      $('#expandPlayerButton').focus();
    }
  }

  document.addEventListener('fullscreenchange',()=>{
    const panel=$('#fullPlayer');
    if(document.fullscreenElement!==panel && !panel.hidden) {
      panel.hidden=true;
      panel.setAttribute('aria-hidden','true');
      document.body.classList.remove('full-player-open');
      $('#expandPlayerButton').focus();
    }
  });

  async function toggleCurrentFavorite() { const id=currentTrackId(); if(id) await toggleFavorite(id); }

  function base64FromBlob(blob) {
    return blob.arrayBuffer().then(buffer=>{
      const bytes=new Uint8Array(buffer); let binary=''; const chunk=0x8000;
      for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
      return btoa(binary);
    });
  }
  function blobFromBase64(data, type='application/octet-stream') {
    const binary=atob(data); const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return new Blob([bytes],{type});
  }

  async function exportBackup() {
    closeModal();
    const total=tracks.reduce((sum,t)=>sum+(t.size||t.blob?.size||0),0);
    if(total>300*1024*1024 && !confirm(`la biblioteca ocupa ${formatBytes(total)}. el archivo de copia será aún mayor y puede necesitar bastante memoria. ¿continuar?`)) return;
    toast('preparando copia de seguridad…');
    try {
      const backup={app:'davixiniTracker',legacyApp:'Mi música',formatVersion:1,exportedAt:new Date().toISOString(),albums:[],tracks:[],playlists:[]};
      backup.albums=await Promise.all(albums.map(async a=>({...a,cover:a.cover?{type:a.cover.type,data:await base64FromBlob(a.cover)}:null})));
      backup.tracks=await Promise.all(tracks.map(async t=>({...t,blob:t.blob?{type:t.blob.type,data:await base64FromBlob(t.blob)}:null,artwork:t.artwork?{type:t.artwork.type,data:await base64FromBlob(t.artwork)}:null})));
      backup.playlists=playlists;
      const file=new Blob([JSON.stringify(backup)],{type:'application/json'});
      const url=URL.createObjectURL(file); const link=document.createElement('a'); link.href=url; link.download=`davixiniTracker-backup-${new Date().toISOString().slice(0,10)}.json`; link.click();
      setTimeout(()=>URL.revokeObjectURL(url),4000); toast('copia de seguridad descargada.');
    } catch(error) { toast(`no se pudo crear la copia: ${error.message}`,'error'); }
  }

  async function restoreBackup(file) {
    if(!file) return;
    try {
      const backup=JSON.parse(await file.text());
      if(!['Mi música','davixiniTracker'].includes(backup.app)||backup.formatVersion!==1||!Array.isArray(backup.albums)||!Array.isArray(backup.tracks)||!Array.isArray(backup.playlists)) throw new Error('el archivo no parece una copia válida de davixiniTracker.');
      if(!confirm(`se reemplazará la biblioteca actual por ${backup.albums.length} álbumes, ${backup.tracks.length} canciones y ${backup.playlists.length} playlists. ¿continuar?`)) return;
      const restoredAlbums=backup.albums.map(a=>({...a,cover:a.cover?.data?blobFromBase64(a.cover.data,a.cover.type):null}));
      const restoredTracks=backup.tracks.map(t=>({...t,blob:t.blob?.data?blobFromBase64(t.blob.data,t.blob.type):null,artwork:t.artwork?.data?blobFromBase64(t.artwork.data,t.artwork.type):null}));
      const tx=db.transaction(['albums','tracks','playlists'],'readwrite');
      const a=tx.objectStore('albums'), t=tx.objectStore('tracks'), p=tx.objectStore('playlists');
      a.clear(); t.clear(); p.clear();
      restoredAlbums.forEach(item=>a.put(item)); restoredTracks.forEach(item=>t.put(item)); backup.playlists.forEach(item=>p.put(item));
      await transactionDone(tx); await refreshData(); closeModal(); view='home'; render(); toast('biblioteca restaurada.');
    } catch(error) { toast(`no se pudo restaurar la copia: ${error.message}`,'error'); }
  }

  async function clearLibrary() {
    if(!confirm('esta acción elimina todos los álbumes, canciones y playlists almacenados en este navegador. ¿continuar?')) return;
    stopPlayback();
    try { const tx=db.transaction(['albums','tracks','playlists'],'readwrite'); tx.objectStore('albums').clear(); tx.objectStore('tracks').clear(); tx.objectStore('playlists').clear(); await transactionDone(tx); await refreshData(); closeModal(); view='home'; render(); toast('biblioteca vaciada.'); }
    catch(error) { toast(`no se pudo vaciar la biblioteca: ${error.message}`,'error'); }
  }

  function showTrackActions(trackId) {
    const track=getTrack(trackId); if(!track) return;
    const inPlaylist = view==='playlist' && activePlaylistId && (getPlaylist(activePlaylistId)?.trackIds||[]).includes(trackId);
    const album = albumForTrack(track);
    let extra = '';
    if(inPlaylist) extra += `<button class="button button-danger" data-action="remove-from-playlist" data-id="${escapeHTML(trackId)}" data-playlist="${escapeHTML(activePlaylistId)}">${icon('trash')} quitar de esta playlist</button>`;
    if(view==='album' && album?.id===activeAlbumId) {
      extra += `<button class="button button-secondary" data-action="move-track-up" data-id="${escapeHTML(trackId)}">↑ subir posición</button><button class="button button-secondary" data-action="move-track-down" data-id="${escapeHTML(trackId)}">↓ bajar posición</button>`;
    }
    if(view==='playlist' && activePlaylistId && (getPlaylist(activePlaylistId)?.trackIds||[]).includes(trackId)) {
      extra += `<button class="button button-secondary" data-action="move-track-up" data-id="${escapeHTML(trackId)}">↑ subir posición</button><button class="button button-secondary" data-action="move-track-down" data-id="${escapeHTML(trackId)}">↓ bajar posición</button>`;
    }
    showModal(track.title,'acciones de canción', `<div class="settings-actions" style="display:grid;grid-template-columns:1fr 1fr"><button class="button button-secondary" data-action="replace-audio" data-id="${escapeHTML(track.id)}">${icon('replace')} sustituir archivo</button><button class="button button-secondary" data-action="download-track" data-id="${escapeHTML(track.id)}">${icon('download')} descargar archivo</button><button class="button button-secondary" data-action="duplicate-track" data-id="${escapeHTML(track.id)}">duplicar canción</button><button class="button button-secondary" data-action="edit-track" data-id="${escapeHTML(track.id)}">${icon('edit')} editar datos</button><button class="button button-secondary" data-action="add-to-playlist" data-id="${escapeHTML(track.id)}">${icon('list')} añadir a playlist</button><button class="button button-secondary" data-action="toggle-favorite" data-id="${escapeHTML(track.id)}">${icon(track.favorite?'heartFilled':'heart')} ${track.favorite?'quitar favorito':'añadir favorito'}</button><button class="button button-secondary" data-action="play-next" data-id="${escapeHTML(track.id)}">reproducir a continuación</button>${extra}<button class="button button-danger" data-action="delete-track" data-id="${escapeHTML(track.id)}">${icon('trash')} eliminar canción</button></div><div class="modal-footer"><button class="button button-secondary" data-modal-close>cerrar</button></div>`);
  }

  async function handleAction(button) {
    const {action,id}=button.dataset;
    const visitorActions = new Set(['play-all-shuffle','open-album','open-playlist','open-artist','open-genre','play-artist','play-genre','play-album','play-playlist','play-track','download-track','play-next','queue-play','queue-remove','queue-move-up','queue-move-down','queue-clear']);
    if (cloudConfigured && !cloudAdmin && !visitorActions.has(action)) {
      toast('solo el administrador puede modificar la biblioteca.');
      return;
    }
    if(action==='new-album') albumForm();
    else if(action==='new-artist') artistForm();
    else if(action==='edit-artist') artistForm(artists.find(item => item.id === id));
    else if(action==='play-all-shuffle') { const mix=tracks.filter(track=>track.blob).sort(()=>Math.random()-.5); startQueue(mix); }
    else if(action==='new-playlist') playlistForm();
    else if(action==='open-album') { activeAlbumId=id; view='album'; render(); }
    else if(action==='open-playlist') { activePlaylistId=id; view='playlist'; render(); }
    else if(action==='open-artist') { activeArtist=id; view='artist'; render(); }
    else if(action==='open-genre') { activeGenre=id; view='genre'; render(); }
    else if(action==='play-artist') startQueue(tracks.filter(t=>(t.artist||getAlbum(t.albumId)?.artist||'').trim()===id));
    else if(action==='play-genre') startQueue(tracks.filter(t=>(t.genre||getAlbum(t.albumId)?.genre||'').trim()===id));
    else if(action==='edit-album') albumForm(getAlbum(id));
    else if(action==='edit-playlist') playlistForm(getPlaylist(id));
    else if(action==='delete-album') await removeAlbum(id);
    else if(action==='delete-playlist') await removePlaylist(id);
    else if(action==='play-album') startQueue(tracksForAlbum(getAlbum(id)));
    else if(action==='play-playlist') startQueue(tracksForPlaylist(getPlaylist(id)));
    else if(action==='play-track') {
      let list=tracks;
      if(view==='album') list=tracksForAlbum(getAlbum(activeAlbumId));
      else if(view==='playlist') list=tracksForPlaylist(getPlaylist(activePlaylistId));
      else if(view==='favorites') list=tracks.filter(t=>t.favorite);
      else if(view==='recent') list=tracks.filter(t=>t.lastPlayedAt).sort((a,b)=>b.lastPlayedAt-a.lastPlayedAt);
      else if(view==='artist') list=tracks.filter(t=>(t.artist||getAlbum(t.albumId)?.artist||'').trim()===activeArtist);
      else if(view==='genre') list=tracks.filter(t=>(t.genre||getAlbum(t.albumId)?.genre||'').trim()===activeGenre);
      else if(view==='search') { const q=$('#globalSearch').value.trim().toLocaleLowerCase(); list=tracks.filter(t=>`${t.title} ${t.artist||''} ${t.fileName||''} ${getAlbum(t.albumId)?.title||''}`.toLocaleLowerCase().includes(q)); }
      const index=list.findIndex(t=>t.id===id); startQueue(list,index<0?0:index);
    }
    else if(action==='toggle-favorite') { if(!backdrop.hidden) closeModal(); await toggleFavorite(id); }
    else if(action==='edit-track') { const track=getTrack(id); closeModal(); if(track) trackForm(track); }
    else if(action==='delete-track') { closeModal(); await removeTrack(id); }
    else if(action==='track-more') showTrackActions(id);
    else if(action==='replace-audio') { replacementTrackId=id; closeModal(); const input=$('#replaceAudioFileInput'); input.value=''; input.click(); }
    else if(action==='download-track') { closeModal(); downloadTrack(id); }
    else if(action==='duplicate-track') await duplicateTrack(id);
    else if(action==='remove-from-playlist') { closeModal(); await removeFromPlaylist(id,button.dataset.playlist); }
    else if(action==='move-track-up' || action==='move-track-down') {
      const type=view==='playlist'?'playlist':'album';
      const collectionId=type==='playlist'?activePlaylistId:activeAlbumId;
      closeModal();
      await moveTrackInCollection(type,collectionId,id,action==='move-track-up'?-1:1);
    }
    else if(action==='play-next') { if(!queue.length || queueIndex<0) { closeModal(); startQueue([getTrack(id)]); return; } const rest=queue.filter(tid=>tid!==id); rest.splice(Math.max(0,queueIndex+1),0,id); queue=rest; closeModal(); toast('canción añadida a continuación.'); }
    else if(action==='add-to-playlist') choosePlaylist(id);
    else if(action==='add-track-to-playlist') await appendTrackToPlaylist(button.dataset.track,id);
    else if(action==='append-to-playlist') await appendTrackToPlaylist(id,button.dataset.playlist,true);
    else if(action==='new-playlist-for-track') { const track=button.dataset.track; closeModal(); playlistForm(); const form=$('#playlistForm'); form.dataset.addTrack=track; }
    else if(action==='add-tracks-playlist') addTracksToPlaylistModal(id);
    else if(action==='add-tracks-playlist-current') addTracksToPlaylistModal(activePlaylistId);
    else if(action==='add-to-album') openFilePicker(id);
    else if(action==='add-to-album-current') openFilePicker(activeAlbumId);
    else if(action==='import-audio') chooseAlbumForImport();
    else if(action==='select-import-album') { closeModal(); openFilePicker(id); }
    else if(action==='new-album-for-import') { closeModal(); albumForm(); $('#albumForm').dataset.importAfter=true; }
    else if(action==='queue-play') { queueIndex=Number(button.dataset.index); playCurrent(); closeModal(); }
    else if(action==='queue-remove') { const index=Number(button.dataset.index); if(index===queueIndex) stopPlayback(); else { queue.splice(index,1); if(index<queueIndex) queueIndex--; } showQueue(); updatePlayer(); }
    else if(action==='queue-move-up' || action==='queue-move-down') { const index=Number(button.dataset.index); const target=index+(action==='queue-move-up'?-1:1); if(target>=0&&target<queue.length){[queue[index],queue[target]]=[queue[target],queue[index]];if(queueIndex===index)queueIndex=target;else if(queueIndex===target)queueIndex=index;showQueue();updatePlayer();} }
    else if(action==='queue-clear') { stopPlayback(); closeModal(); }
    else if(action==='export-backup') await exportBackup();
    else if(action==='import-backup') { closeModal(); $('#backupFileInput').click(); }
    else if(action==='clear-library') await clearLibrary();
    else if(action==='reset-player') { shuffle=false; repeatMode='off'; playbackRate=1; audio.playbackRate=1; if(window.DavixiniCrossfade?.setMasterVolume)window.DavixiniCrossfade.setMasterVolume(.8);else audio.volume=.8; $('#volumeBar').value=.8; $('#fullPlayerVolume').value=.8; $('#fullPlayerSpeed').value='1'; localStorage.setItem('mi-musica-volume','0.8'); localStorage.setItem('mi-musica-speed','1'); updatePlayer(); toast('controles restablecidos.'); }
  }

  // Navegación global y acciones delegadas.
  document.addEventListener('click', event => {
    const viewButton=event.target.closest('[data-view]');
    if(viewButton) { view=viewButton.dataset.view; activeAlbumId=null; activePlaylistId=null; render(); return; }
    const actionButton=event.target.closest('[data-action]');
    if(actionButton) { handleAction(actionButton); return; }
    if(event.target.closest('[data-modal-close]') || event.target===backdrop) closeModal();
  });

  $('#adminAccessButton').addEventListener('click', async () => {
    if (!cloudConfigured) return;
    if (!cloudAdmin) { cloudLoginModal(); return; }
    if (!confirm('¿cerrar la sesión de administrador en este dispositivo?')) return;
    try {
      await window.DavixiniCloud.signOut();
      cloudAdmin = false;
      updateCloudControls();
      await refreshPublishedLibrary();
      render();
      toast('sesión de administrador cerrada.');
    } catch (error) { toast('no se pudo cerrar sesión: ' + error.message, 'error'); }
  });
  $('#publishCloudButton').addEventListener('click', publishCloudLibrary);
  $('#createAlbumTop').addEventListener('click',()=>{if(!cloudConfigured||cloudAdmin)albumForm();});
  $('#importTop').addEventListener('click',()=>{if(!cloudConfigured||cloudAdmin)chooseAlbumForImport();});
  $('#settingsButton').addEventListener('click',settingsModal);
  $('#modalClose').addEventListener('click',closeModal);
  $('#globalSearch').addEventListener('input',()=>{ view='search'; renderSearch(); setNavState(); });
  root.addEventListener('change',event=>{ if(event.target.id==='songSortSelect'){songSortMode=event.target.value;renderSongs();} });
  $('#globalSearch').addEventListener('keydown',event=>{if(event.key==='Escape'){event.target.value='';view='home';render();}});
  $('#coverFileInput').addEventListener('change',event=>{
    const file=event.target.files?.[0]; if(!file) return;
    if(!file.type.startsWith('image/')) {toast('elige una imagen válida.','error');return;}
    if(pendingCoverUrl) URL.revokeObjectURL(pendingCoverUrl);
    pendingCover=file; removePendingCover=false; pendingCoverUrl=URL.createObjectURL(file);
    $('#coverPreview').innerHTML=`<img src="${pendingCoverUrl}" alt="vista previa de la portada">`;
  });
  $('#audioFileInput').addEventListener('change',event=>{
    const files=event.target.files; const albumId=event.target.dataset.albumId;
    if(cloudConfigured && !cloudAdmin) { toast('solo el administrador puede subir música.'); event.target.value=''; return; }
    if(files?.length) importFiles(files,albumId);
  });
  $('#replaceAudioFileInput').addEventListener('change',event=>{
    const file=event.target.files?.[0]; const id=replacementTrackId; replacementTrackId=null;
    if(file && id) replaceTrackAudio(id,file);
    event.target.value='';
  });
  $('#backupFileInput').addEventListener('change',event=>{const file=event.target.files?.[0]; if(file)restoreBackup(file); event.target.value='';});

  modalContent.addEventListener('click',event=>{
    if(event.target.closest('#chooseCoverButton')) $('#coverFileInput').click();
    if(event.target.closest('#removeCoverButton')) { pendingCover=null; removePendingCover=true; $('#coverPreview').innerHTML='<span class="cover-placeholder">♪</span>'; }
  });
  modalContent.addEventListener('submit',event=>{
    if(event.target.id==='cloudLoginForm') {
      event.preventDefault();
      const email = $('#cloudEmail').value.trim();
      const password = $('#cloudPassword').value;
      const submit = event.target.querySelector('[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'verificando…';
      window.DavixiniCloud.signIn(email, password).then(async () => {
        cloudAdmin = true;
        updateCloudControls();
        const hasRemote = await refreshPublishedLibrary();
        if (!hasRemote && tracks.length) toast('tu biblioteca local está lista. pulsa “publicar cambios” para compartirla.');
        closeModal(); render();
        toast('sesión de administrador iniciada.');
      }).catch(error => toast(error.message || 'no se pudo iniciar sesión.', 'error'))
        .finally(() => { submit.disabled = false; submit.textContent = 'iniciar sesión'; });
    } else if(event.target.id==='albumForm') {
      const importAfter=event.target.dataset.importAfter==='true';
      const form=event.target;
      saveAlbumForm(event).then(()=>{if(importAfter && activeAlbumId) openFilePicker(activeAlbumId);});
    } else if(event.target.id==='playlistForm') {
      const trackToAdd=event.target.dataset.addTrack;
      savePlaylistForm(event).then(async()=>{if(trackToAdd){const created=playlists[0];if(created)await appendTrackToPlaylist(trackToAdd,created.id);}});
    } else if(event.target.id==='trackForm') saveTrackForm(event);
    else if(event.target.id==='artistForm') saveArtistForm(event);
  });


  let draggedTrackId = null;
  let draggedSortType = null;
  let draggedSortId = null;

  root.addEventListener('dragstart', event => {
    const handle = event.target.closest('[data-drag-track]');
    if (!handle) { event.preventDefault(); return; }
    const row = handle.closest('[data-track-row]');
    if (!row?.dataset.sortType || !row.dataset.sortId) { event.preventDefault(); return; }
    draggedTrackId = row.dataset.trackRow;
    draggedSortType = row.dataset.sortType;
    draggedSortId = row.dataset.sortId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedTrackId);
    row.classList.add('dragging-row');
  });

  root.addEventListener('dragover', event => {
    if (!draggedTrackId) return;
    const row = event.target.closest('[data-track-row][data-sort-type]');
    if (!row || row.dataset.sortType !== draggedSortType || row.dataset.sortId !== draggedSortId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    $('.track-row.drop-target', root).forEach(item => item.classList.remove('drop-target','drop-target-after'));
    if (row.dataset.trackRow !== draggedTrackId) {
      const rect = row.getBoundingClientRect();
      row.classList.add('drop-target');
      row.classList.toggle('drop-target-after', event.clientY >= rect.top + rect.height / 2);
    }
  });

  root.addEventListener('drop', event => {
    if (!draggedTrackId) return;
    const row = event.target.closest('[data-track-row][data-sort-type]');
    event.preventDefault();
    const sourceId = draggedTrackId;
    const type = draggedSortType;
    const collectionId = draggedSortId;
    const targetId = row?.dataset.trackRow;
    clearTrackDragState();
    if (row && row.dataset.sortType === type && row.dataset.sortId === collectionId && targetId) {
      const rect = row.getBoundingClientRect();
      const insertBefore = event.clientY < rect.top + rect.height / 2;
      reorderTrackInCollection(type, collectionId, sourceId, targetId, insertBefore);
    }
  });

  root.addEventListener('dragend', clearTrackDragState);

  function clearTrackDragState() {
    draggedTrackId = null;
    draggedSortType = null;
    draggedSortId = null;
    $$('.track-row.dragging-row, .track-row.drop-target', root).forEach(row => row.classList.remove('dragging-row','drop-target','drop-target-after'));
  }

  root.addEventListener('dragover',event=>{
    if(view==='album' && event.dataTransfer?.types?.includes('Files')) {event.preventDefault();$('#albumDropZone')?.classList.add('dragging');}
  });
  root.addEventListener('dragleave',event=>{if(!root.contains(event.relatedTarget))$('#albumDropZone')?.classList.remove('dragging');});
  root.addEventListener('drop',event=>{
    if(cloudConfigured && !cloudAdmin)return;
    if(view!=='album')return;
    const zone=event.target.closest('[data-album-drop]');
    if(!zone)return;
    event.preventDefault();zone.classList.remove('dragging');importFiles(event.dataTransfer.files,zone.dataset.albumDrop);
  });

  $('#playButton').addEventListener('click',()=>{
    if(!queue.length){ if(tracks.length)startQueue([...tracks].sort((a,b)=>(b.addedAt||0)-(a.addedAt||0))); return; }
    if(audio.paused)audio.play().catch(()=>toast('no se pudo iniciar la reproducción.','error'));else audio.pause();
  });
  $('#previousButton').addEventListener('click',()=>{if(audio.currentTime>3)audio.currentTime=0;else nextTrack(-1);});
  $('#nextButton').addEventListener('click',()=>nextTrack(1));
  $('#shuffleButton').addEventListener('click',()=>{shuffle=!shuffle;updatePlayer();});
  $('#repeatButton').addEventListener('click',()=>{repeatMode=repeatMode==='off'?'all':repeatMode==='all'?'one':'off';updatePlayer();});
  $('#favoriteCurrent').addEventListener('click',toggleCurrentFavorite);
  $('#queueButton').addEventListener('click',showQueue);
  $('#expandPlayerButton').addEventListener('click',()=>setFullPlayerVisible(true));
  $('#fullPlayerClose').addEventListener('click',()=>setFullPlayerVisible(false));
  $('#fullPlayerPlay').addEventListener('click',()=>$('#playButton').click());
  $('#fullPlayerPrevious').addEventListener('click',()=>$('#previousButton').click());
  $('#fullPlayerNext').addEventListener('click',()=>$('#nextButton').click());
  $('#fullPlayerShuffle').addEventListener('click',()=>$('#shuffleButton').click());
  $('#fullPlayerRepeat').addEventListener('click',()=>$('#repeatButton').click());
  $('#fullPlayerFavorite').addEventListener('click',toggleCurrentFavorite);
  $('#fullPlayerQueue').addEventListener('click',()=>{setFullPlayerVisible(false);showQueue();});
  $('#seekBar').addEventListener('input',event=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=audio.duration*Number(event.target.value)/1000;});
  $('#fullPlayerSeekBar').addEventListener('input',event=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=audio.duration*Number(event.target.value)/1000;});
  const syncVolume=value=>{
    const volume=Math.min(1,Math.max(0,Number(value)||0));
    if(window.DavixiniCrossfade?.setMasterVolume) window.DavixiniCrossfade.setMasterVolume(volume);
    else audio.volume=volume;
    $('#volumeBar').value=volume;$('#fullPlayerVolume').value=volume;
    localStorage.setItem('mi-musica-volume',String(volume));
  };
  $('#volumeBar').addEventListener('input',event=>syncVolume(event.target.value));
  $('#fullPlayerVolume').addEventListener('input',event=>syncVolume(event.target.value));
  $('#fullPlayerSpeed').addEventListener('change',event=>{ const next=Number(event.target.value); if(!Number.isFinite(next)||next<0.5||next>2)return; playbackRate=next; audio.playbackRate=next; localStorage.setItem('mi-musica-speed',String(next)); updatePlayer(); });
  audio.addEventListener('ratechange',updatePlayer);
  audio.addEventListener('play',updatePlayer);
  audio.addEventListener('pause',updatePlayer);
  audio.addEventListener('loadedmetadata',async()=>{
    const track=getTrack(currentTrackId());
    $('#totalTime').textContent=formatTime(audio.duration);
    $('#fullPlayerTotal').textContent=formatTime(audio.duration);
    if(track && Number.isFinite(audio.duration) && Math.abs((track.duration||0)-audio.duration)>1) {
      const tx=db.transaction('tracks','readwrite');tx.objectStore('tracks').put({...track,duration:audio.duration});tx.oncomplete=()=>refreshData().catch(()=>{});
    }
  });
  audio.addEventListener('timeupdate',()=>{
    $('#elapsedTime').textContent=formatTime(audio.currentTime);
    $('#fullPlayerElapsed').textContent=formatTime(audio.currentTime);
    if(Number.isFinite(audio.duration)&&audio.duration>0) {
      const progress=audio.currentTime/audio.duration*1000;
      $('#seekBar').value=progress;
      $('#fullPlayerSeekBar').value=progress;
    }
  });
  audio.addEventListener('ended',()=>{
    if(window.__davixiniCrossfadeActive) return;
    if(performance.now() < (window.__davixiniCrossfadeSuppressEndedUntil || 0)) return;
    // Un ended atrasado de la pista previa puede llegar cuando ya se está
    // reproduciendo la nueva; solo avanza si la fuente actual sí llegó al final.
    if(Number.isFinite(audio.duration) && audio.duration>0 && audio.currentTime<audio.duration-0.35) return;
    if(repeatMode==='one'){audio.currentTime=0;audio.play().catch(()=>{});}else nextTrack(1);
  });
  audio.addEventListener('error',()=>{if(audio.src)toast('el navegador no puede reproducir este archivo.','error');});

  $('#themeToggle').addEventListener('click',()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=next;localStorage.setItem('mi-musica-theme',next);
    $('#themeToggle').innerHTML=icon(next==='dark'?'sun':'moon');
  });

  document.addEventListener('keydown',event=>{
    const target=event.target;
    const typing=target instanceof HTMLElement && (target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName));
    if(event.key==='Escape'&&!$('#fullPlayer').hidden){setFullPlayerVisible(false);return;}
    if(event.key==='Escape'&&!backdrop.hidden){closeModal();return;}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('#globalSearch').focus();return;}
    if(typing||!backdrop.hidden)return;
    if(event.code==='Space'){event.preventDefault();$('#playButton').click();}
    else if(event.key==='ArrowRight'&&audio.src){audio.currentTime=Math.min((audio.duration||audio.currentTime)+5,audio.currentTime+5);}
    else if(event.key==='ArrowLeft'&&audio.src){audio.currentTime=Math.max(0,audio.currentTime-5);}
    else if(event.key==='ArrowUp'){event.preventDefault();const base=window.DavixiniCrossfade?.getMasterVolume?.()??audio.volume;syncVolume(Math.min(1,base+.05));}
    else if(event.key==='ArrowDown'){event.preventDefault();const base=window.DavixiniCrossfade?.getMasterVolume?.()??audio.volume;syncVolume(Math.max(0,base-.05));}
  });

  async function init() {
    try {
      db=await openDatabase();
      await refreshData();
      if (window.DavixiniCloud?.configured()) {
        cloudConfigured = true;
        try {
          const state = await window.DavixiniCloud.init();
          cloudAdmin = state.admin;
          const snapshot = await window.DavixiniCloud.loadLibrary();
          const hasRemote = snapshot.albums.length || snapshot.tracks.length || snapshot.playlists.length || snapshot.artists.length;
          if (hasRemote) {
            if (cloudAdmin) {
              if (!tracks.length || confirm('hay una biblioteca publicada en supabase. ¿cargar esa versión en este navegador?')) {
                await replaceLocalLibrary(snapshot);
              }
            } else {
              await mergeLocalLibrary(snapshot);
            }
          }
          updateCloudControls();
        } catch (cloudError) {
          cloudAdmin = false;
          updateCloudControls();
          toast('supabase no respondió: ' + (cloudError.message || 'revisa la configuración.'), 'error');
        }
      }
      await refreshData();
      const savedTheme=localStorage.getItem('mi-musica-theme');
      const theme=savedTheme==='light'?'light':'dark';
      document.documentElement.dataset.theme=theme;
      $('#themeToggle').innerHTML=icon(theme==='dark'?'sun':'moon');
      const savedVolume=localStorage.getItem('mi-musica-volume');
      const volume=savedVolume===null?NaN:Number(savedVolume);
      if(Number.isFinite(volume)){audio.volume=Math.min(1,Math.max(0,volume));$('#volumeBar').value=audio.volume;}else audio.volume=.8;
      const savedSpeed=Number(localStorage.getItem('mi-musica-speed')||1);
      playbackRate=Number.isFinite(savedSpeed)&&savedSpeed>=0.5&&savedSpeed<=2?savedSpeed:1;
      audio.playbackRate=playbackRate;
      render();
      if(navigator.storage?.persist) navigator.storage.persist().catch(()=>{});
      if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('./sw.js').catch(()=>{});
    } catch(error) {
      root.innerHTML=emptyState('no se pudo abrir la biblioteca',error.message||'abre la página en un navegador compatible.');
      toast('no se pudo iniciar el almacenamiento local.','error');
    }
  }

  init();
})();
