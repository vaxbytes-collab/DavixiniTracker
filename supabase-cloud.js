(() => {
  'use strict';
  const config = window.DAVIXINI_SUPABASE_CONFIG;
  const sdk = window.supabase;
  let client = null;
  let admin = false;

  function configured() {
    return Boolean(config?.url && config?.publishableKey && sdk?.createClient);
  }

  function requireClient() {
    if (!client) throw new Error('la conexión con supabase no está configurada.');
    return client;
  }

  async function checkAdmin() {
    if (!client) return false;
    const { data, error } = await client.rpc('is_library_admin');
    if (error) throw error;
    admin = data === true;
    return admin;
  }

  async function init() {
    if (!configured()) return { configured: false, admin: false };
    client = sdk.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data.session) await checkAdmin();
    return { configured: true, admin };
  }

  async function signIn(email, password) {
    const api = requireClient();
    const { error } = await api.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const allowed = await checkAdmin();
    if (!allowed) {
      await api.auth.signOut();
      throw new Error('esta cuenta no tiene permisos de administrador.');
    }
    return true;
  }

  async function signOut() {
    const api = requireClient();
    const { error } = await api.auth.signOut();
    if (error) throw error;
    admin = false;
  }

  function publicUrl(path) {
    return requireClient().storage.from(config.bucket).getPublicUrl(path).data.publicUrl;
  }

  async function downloadBlob(path, label, warnings) {
    if (!path) return null;
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(publicUrl(path), { cache: 'no-store' });
        if (!response.ok) throw new Error('respuesta HTTP ' + response.status);
        return await response.blob();
      } catch (error) {
        lastError = error;
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 350 * (attempt + 1)));
      }
    }
    warnings.push(label + ': ' + (lastError?.message || 'falló la descarga'));
    return null;
  }

  async function loadLibrary() {
    const api = requireClient();
    const [albumResult, trackResult, playlistResult, artistResult] = await Promise.all([
      api.from('library_albums').select('id,data,cover_path'),
      api.from('library_tracks').select('id,album_id,data,audio_path,artwork_path'),
      api.from('library_playlists').select('id,data'),
      api.from('library_artists').select('id,data')
    ]);
    for (const result of [albumResult, trackResult, playlistResult, artistResult]) if (result.error) throw result.error;

    const warnings = [];
    const albums = await Promise.all((albumResult.data || []).map(async row => ({
      ...row.data, id: row.id,
      cover: row.cover_path ? await downloadBlob(row.cover_path, 'portada de ' + (row.data?.title || row.id), warnings) : null
    })));
    const tracks = await Promise.all((trackResult.data || []).map(async row => {
      const { favorite, lastPlayedAt, playCount, playSeconds, notes, ...data } = row.data || {};
      const title = data.title || data.name || row.id;
      const [blob, artwork] = await Promise.all([
        downloadBlob(row.audio_path, 'audio de ' + title, warnings),
        row.artwork_path ? downloadBlob(row.artwork_path, 'portada de ' + title, warnings) : null
      ]);
      return { ...data, id: row.id, albumId: row.album_id, blob, artwork };
    }));
    const playlists = (playlistResult.data || []).map(row => ({ ...row.data, id: row.id }));
    const artists = (artistResult.data || []).map(row => ({ ...row.data, id: row.id }));
    return { albums, tracks, playlists, artists, warnings };
  }

  function extensionFor(fileName, fallback) {
    const match = String(fileName || '').match(/\.([a-z0-9]{2,6})$/i);
    return (match?.[1] || fallback || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes)) return 'tamaño desconocido';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
  }

  async function uploadBlob(path, blob, label) {
    if (!blob) return null;
    const size = formatFileSize(blob.size);
    const { error } = await requireClient().storage.from(config.bucket).upload(path, blob, {
      upsert: true, contentType: blob.type || 'application/octet-stream', cacheControl: '3600'
    });
    if (error) {
      const message = String(error.message || error);
      if (/maximum size|exceeded the maximum size|payload too large|entity too large|413/i.test(message)) {
        throw new Error(`${label} (${size}) supera el límite de tamaño por archivo configurado en Supabase. reduce ese archivo o aumenta el límite del bucket.`);
      }
      throw new Error(`${label} (${size}): ${message}`);
    }
    return path;
  }

  async function removeMissingRows(table, localIds) {
    const api = requireClient();
    const { data, error } = await api.from(table).select('id');
    if (error) throw error;
    const keep = new Set(localIds);
    const stale = (data || []).filter(row => !keep.has(row.id)).map(row => row.id);
    for (const id of stale) {
      const result = await api.from(table).delete().eq('id', id);
      if (result.error) throw result.error;
    }
  }

  async function publishLibrary(albums, tracks, playlists, artists = []) {
    if (!admin) throw new Error('inicia sesión como administrador para publicar cambios.');
    const api = requireClient();

    const albumRows = [];
    for (const album of albums) {
      const albumName = album.title || album.name || album.id || 'álbum sin nombre';
      const coverPath = album.cover
        ? await uploadBlob(`covers/${album.id}/cover.${extensionFor(album.cover.name, 'jpg')}`, album.cover, `portada del álbum “${albumName}”`)
        : null;
      const { cover, ...data } = album;
      albumRows.push({ id: album.id, data, cover_path: coverPath, updated_at: new Date().toISOString() });
    }

    const trackRows = [];
    for (const track of tracks) {
      const trackName = track.title || track.name || track.id || 'canción sin título';
      const audioPath = track.blob
        ? await uploadBlob(`audio/${track.id}/audio.${extensionFor(track.audioExtension ? 'audio.' + track.audioExtension : track.fileName, 'mp3')}`, track.blob, `audio de “${trackName}”`)
        : track.audioPath || null;
      if (!audioPath) throw new Error(`falta el archivo de audio de “${trackName}”.`);
      const artworkPath = track.artwork
        ? await uploadBlob(`artwork/${track.id}/cover.${extensionFor(track.artwork.name, 'jpg')}`, track.artwork, `portada de la canción “${trackName}”`)
        : track.artworkPath || null;
      const { blob, artwork, notes, favorite, lastPlayedAt, playCount, playSeconds, ...data } = track;
      trackRows.push({
        id: track.id, album_id: track.albumId || null, data,
        audio_path: audioPath, artwork_path: artworkPath, updated_at: new Date().toISOString()
      });
    }

    const artistRows = artists.map(artist => {
      const { id, ...data } = artist;
      return { id, data, updated_at: new Date().toISOString() };
    });

    const playlistRows = playlists.map(playlist => {
      const { id, ...data } = playlist;
      return { id, data, updated_at: new Date().toISOString() };
    });

    for (const [table, rows] of [
      ['library_albums', albumRows],
      ['library_tracks', trackRows],
      ['library_playlists', playlistRows],
      ['library_artists', artistRows]
    ]) {
      if (rows.length) {
        const { error } = await api.from(table).upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }
      await removeMissingRows(table, rows.map(row => row.id));
    }
    return true;
  }

  window.DavixiniCloud = Object.freeze({
    configured, init, signIn, signOut, isAdmin: () => admin, loadLibrary, publishLibrary
  });
})();
