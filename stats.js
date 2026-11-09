/* davixiniTracker · estadísticas calculadas únicamente a partir del registro real de escucha */
(() => {
  'use strict';
  const DAY = 86400000;
  const dayKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const monthKey = ts => dayKey(ts).slice(0, 7);
  const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

  let cache = { stamp: -1, counts: null };
  const counts = () => {
    if (cache.stamp === DT.log.stamp() && cache.counts) return cache.counts;
    const plays = new Map(), last = new Map();
    for (const [id, ts, , c] of DT.log.all()) { if (c) plays.set(id, (plays.get(id) || 0) + 1); last.set(id, Math.max(last.get(id) || 0, ts)); }
    cache = { stamp: DT.log.stamp(), counts: { plays, last } };
    return cache.counts;
  };

  /* periodo → [desde, hasta) en milisegundos */
  const range = p => {
    const now = Date.now();
    if (p === 'all') return [0, now + 1];
    if (p === '7d') return [startOfDay(now) - 6 * DAY, now + 1];
    if (p === '30d') return [startOfDay(now) - 29 * DAY, now + 1];
    if (p.startsWith('y:')) { const y = +p.slice(2); return [new Date(y, 0, 1).getTime(), new Date(y + 1, 0, 1).getTime()]; }
    if (p.startsWith('m:')) { const [y, m] = p.slice(2).split('-').map(Number); return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()]; }
    return [0, now + 1];
  };
  const previous = p => {
    if (p.startsWith('y:')) return `y:${+p.slice(2) - 1}`;
    if (p.startsWith('m:')) { const [y, m] = p.slice(2).split('-').map(Number); const d = new Date(y, m - 2, 1); return `m:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
    return null;
  };
  const label = p => {
    if (p === 'all') return 'Todo el tiempo';
    if (p === '7d') return 'Últimos 7 días';
    if (p === '30d') return 'Últimos 30 días';
    if (p.startsWith('y:')) return p.slice(2);
    const [y, m] = p.slice(2).split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
  };
  const entries = (p, from, to) => { [from, to] = from === undefined ? range(p) : [from, to]; return DT.log.all().filter(e => e[1] >= from && e[1] < to); };
  const inc = (m, k, plays, secs) => { const o = m.get(k) || { n: 0, secs: 0 }; o.n += plays; o.secs += secs; m.set(k, o); };
  const rank = m => [...m].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.n - a.n || b.secs - a.secs);

  function summary(p) {
    const list = entries(p);
    const tracks = new Map(), albums = new Map(), artists = new Map(), genres = new Map();
    const hours = Array.from({ length: 7 }, () => Array(24).fill(0)), months = new Map(), days = new Map(), perDayTrack = new Map();
    let secs = 0, plays = 0;
    for (const [id, ts, s, c] of list) {
      secs += s; plays += c;
      const d = new Date(ts);
      hours[(d.getDay() + 6) % 7][d.getHours()] += s;
      months.set(monthKey(ts), (months.get(monthKey(ts)) || 0) + s);
      const k = dayKey(ts); days.set(k, (days.get(k) || 0) + s);
      const t = DT.track(id); if (!t) continue;
      inc(tracks, id, c, s);
      if (c) { const dk = `${k}|${id}`; perDayTrack.set(dk, (perDayTrack.get(dk) || 0) + 1); }
      if (t.albumId && DT.album(t.albumId)) inc(albums, t.albumId, c, s);
      for (const a of t.artistIds) if (DT.artist(a)) inc(artists, a, c, s);
      if (t.genre) inc(genres, t.genre, c, s);
    }
    const bestTrackDay = [...perDayTrack].sort((a, b) => b[1] - a[1])[0];
    return {
      p, list, secs, plays, hours, months, days,
      distinct: tracks.size,
      tracks: rank(tracks), albums: rank(albums), artists: rank(artists), genres: rank(genres),
      busiestDay: [...days].sort((a, b) => b[1] - a[1])[0] || null,
      repeatRecord: bestTrackDay ? { id: bestTrackDay[0].split('|')[1], day: bestTrackDay[0].split('|')[0], n: bestTrackDay[1] } : null
    };
  }

  /* rachas: días consecutivos con escucha (se calculan sobre todo el historial) */
  function streaks() {
    const set = new Set(DT.log.all().map(e => dayKey(e[1])));
    const days = [...set].sort();
    let best = 0, run = 0, prev = null;
    for (const k of days) {
      const t = new Date(k + 'T12:00:00').getTime();
      run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
      best = Math.max(best, run); prev = t;
    }
    let cur = 0, d = startOfDay(Date.now());
    if (!set.has(dayKey(d))) d -= DAY;
    while (set.has(dayKey(d))) { cur++; d -= DAY; }
    return { current: cur, best, days: set.size };
  }

  const completion = albumId => {
    const list = DT.tracksOfAlbum(albumId), pl = counts().plays;
    return { done: list.filter(t => pl.has(t.id)).length, total: list.length };
  };
  const unplayed = () => { const pl = counts().plays; return DT.S.tracks.filter(t => !pl.has(t.id)); };
  const forgotten = (days = 30) => {
    const { last, plays } = counts(), lim = Date.now() - days * DAY;
    return DT.S.tracks.filter(t => plays.has(t.id) && (last.get(t.id) || 0) < lim);
  };
  const recentTracks = (n = 20) => {
    const seen = new Set(), out = [], log = DT.log.all();
    for (let i = log.length - 1; i >= 0 && out.length < n; i--) { const id = log[i][0]; if (!seen.has(id) && DT.track(id)) { seen.add(id); out.push(id); } }
    return out;
  };
  /* años con datos, para el selector */
  const years = () => [...new Set(DT.log.all().map(e => new Date(e[1]).getFullYear()))].sort((a, b) => b - a);
  const monthsWithData = () => [...new Set(DT.log.all().map(e => monthKey(e[1])))].sort().reverse();

  DT.stats = { counts, range, previous, label, summary, streaks, completion, unplayed, forgotten, recentTracks, years, monthsWithData, dayKey, startOfDay, DAY };
})();
