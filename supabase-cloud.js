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

  async function downloadBlob(path) {
    if (!path) return null;
    const response = await fetch(publicUrl(path));
    if (!response.ok) throw new Error('no se pudo descargar un archivo de la biblioteca.');
    return response.blob();
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

    const albums = await Promise.all((albumResult.data || []).map(async row => ({
      ...row.data, id: row.id, cover: row.cover_path ? await downloadBlob(row.cover_path) : null
    })));
    const tracks = await Promise.all((trackResult.data || []).map(async row => ({
      ...row.data, id: row.id, albumId: row.album_id,
      blob: await downloadBlob(row.audio_path),
      artwork: row.artwork_path ? await downloadBlob(row.artwork_path) : null
    })));
    const playlists = (playlistResult.data || []).map(row => ({ ...row.data, id: row.id }));
    const artists = (artistResult.data || []).map(row => ({ ...row.data, id: row.id }));
    return { albums, tracks, playlists, artists };
  }

  function extensionFor(fileName, fallback) {
    const match = String(fileName || '').match(/\.([a-z0-9]{2,6})$/i);
    return (match?.[1] || fallback || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  async function uploadBlob(path, blob) {
    if (!blob) return null;
    const { error } = await requireClient().storage.from(config.bucket).upload(path, blob, {
      upsert: true, contentType: blob.type || 'application/octet-stream', cacheControl: '3600'
    });
    if (error) throw error;
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
      const coverPath = album.cover
        ? await uploadBlob(`covers/${album.id}/cover.${extensionFor(album.cover.name, 'jpg')}`, album.cover)
        : null;
      const { cover, ...data } = album;
      albumRows.push({ id: album.id, data, cover_path: coverPath, updated_at: new Date().toISOString() });
    }

    const trackRows = [];
    for (const track of tracks) {
      const audioPath = track.blob
        ? await uploadBlob(`audio/${track.id}/audio.${extensionFor(track.fileName, 'mp3')}`, track.blob)
        : track.audioPath || null;
      if (!audioPath) throw new Error(`falta el archivo de audio de “${track.title || 'una canción'}”.`);
      const artworkPath = track.artwork
        ? await uploadBlob(`artwork/${track.id}/cover.${extensionFor(track.artwork.name, 'jpg')}`, track.artwork)
        : track.artworkPath || null;
      const { blob, artwork, ...data } = track;
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
