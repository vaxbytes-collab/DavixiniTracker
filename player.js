/* davixiniTracker · motor de reproducción
 *
 * Dos elementos <audio> alternados. El que suena es el «activo»; el otro precarga la canción siguiente.
 * Crossfade real: cuando faltan N segundos para el final, la siguiente empieza a sonar en el otro elemento
 * y ambos volúmenes siguen una curva de potencia constante (cos / sen) hasta cruzarse.
 * Las transiciones visuales de la interfaz (settings.js) son un sistema aparte.
 */
(() => {
  'use strict';
  const { $, store, toast, emit, clamp, shuffled } = DT;
  const STATE = 'dt-state';
  const TICK = 60;
  const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQAAAAA=';

  const mk = i => {
    const a = document.createElement('audio');
    a.id = `au${i}`; a.preload = 'auto'; a.hidden = true; a.setAttribute('playsinline', '');
    document.body.append(a);
    a._id = null; a._err = false;
    return a;
  };
  const A = [mk(0), mk(1)];
  let cur = 0;
  const act = () => A[cur];
  const idle = () => A[1 - cur];

  /* ¿el navegador permite fijar el volumen por elemento? (iOS lo ignora: sin mezcla posible) */
  let canFade = true;
  { const t = A[0]; t.volume = 0.5; canFade = Math.abs(t.volume - 0.5) < 0.01; t.volume = 1; }

  let queue = [], qi = -1, orig = null, shuffle = false, repeat = 0, seq = 0;
  let vol = clamp(Number(store.get('dt-vol', 0.8)), 0, 1), muted = !!store.get('dt-muted', false);
  let fading = null, sess = null, errStreak = 0, lastSave = 0, lastUi = -1, lastPos = 0, lastTick = performance.now();
  let sleep = null; // { at, fade } | { eot: true }
  let want = false; // el usuario quiere que suene (distingue pausa manual de carga)

  const entry = id => ({ id, u: ++seq });
  const curEntry = () => queue[qi];
  const curId = () => queue[qi]?.id;
  const track = () => DT.track(curId());
  const master = () => (muted ? 0 : vol) * (sleep?.fade ? 1 - clamp((performance.now() - sleep.fade) / 5000, 0, 1) : 1);

  function loadInto(a, id) {
    const t = DT.track(id);
    if (!t) { a._id = null; return; }
    if (a._id === id && !a._err) return;
    a._id = id; a._err = false; a.src = t.src; a.preload = 'auto'; a.load();
  }
  function clearEl(a) { a.pause(); a._id = null; a._err = false; a.removeAttribute('src'); a.load(); }

  function nextIndex(natural = true) {
    if (!queue.length) return -1;
    if (repeat === 2 && natural) return qi;
    if (qi < queue.length - 1) return qi + 1;
    return repeat === 1 ? 0 : -1;
  }
  function preloadNext() {
    if (fading) return;
    const ni = nextIndex();
    if (ni < 0 || queue[ni].id === curId()) { if (idle()._id) clearEl(idle()); return; }
    loadInto(idle(), queue[ni].id);
  }

  /* ---------- registro de escucha ---------- */
  function commit() {
    if (sess && sess.secs >= 5) {
      const counted = sess.secs >= Math.min(30, 0.5 * (sess.dur || 60)) ? 1 : 0;
      DT.log.add([sess.id, Date.now(), Math.round(sess.secs), counted]);
    }
    sess = null;
  }
  const startSess = () => { sess = curId() ? { id: curId(), secs: 0, dur: track()?.duration || 0 } : null; };

  /* ---------- persistencia del estado ---------- */
  function save(force) {
    const now = Date.now(); if (!force && now - lastSave < 2000) return; lastSave = now;
    store.set(STATE, { q: queue.map(e => e.id), i: qi, pos: Math.round(act().currentTime * 10) / 10, shuffle, repeat, origU: orig ? orig.map(e => e.u) : null, qu: queue.map(e => e.u) });
  }
  DT.player = {};

  function afterTrackChange(first) {
    const t = track();
    $('#player').hidden = !t;
    document.title = t ? `${t.title} · davixiniTracker` : 'davixiniTracker';
    if (t && 'mediaSession' in navigator) {
      const art = t.cover ? [{ src: t.cover }] : [];
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.who, album: t.albumTitle, artwork: art });
    }
    lastUi = -1;
    emit('player:track', { first });
    emit('player:queue');
    preloadNext();
    save(true);
  }

  function startTrack(i, { autoplay = true, pos = 0, first = false } = {}) {
    stopFade(); commit();
    if (i < 0 || i >= queue.length) return;
    qi = i;
    const id = queue[i].id;
    if (!DT.track(id)) { queue.splice(i, 1); return startTrack(Math.min(i, queue.length - 1), { autoplay }); }
    let a = act();
    const b = idle();
    if (b._id === id && !b._err) { a.pause(); cur = 1 - cur; a = b; }
    else loadInto(a, id);
    if (pos > 0) { try { a.currentTime = pos; } catch { /* aún sin metadatos: se ignora */ } } else if (a.currentTime > 0) a.currentTime = 0;
    a.volume = master();
    want = autoplay;
    startSess();
    if (autoplay) playEl(a);
    afterTrackChange(first);
    emit('player:state');
  }

  function playEl(a) {
    const p = a.play();
    if (p?.catch) p.catch(err => {
      if (err.name === 'AbortError' || err.name === 'NotSupportedError') return; // el evento «error» del elemento informa del fallo
      want = false; emit('player:state');
      toast(err.name === 'NotAllowedError' ? 'El navegador bloqueó la reproducción automática. Pulsa reproducir.' : 'No se pudo iniciar la reproducción.', 'error');
    });
  }
  /* Safari/iOS solo deja iniciar un elemento si se «desbloquea» dentro de un gesto del usuario */
  function unlock() {
    const b = idle();
    if (b._id || b.getAttribute('src')) return;
    b.src = SILENT; b.muted = true;
    const done = () => { b.muted = false; if (b.src === SILENT || b.getAttribute('src') === SILENT) clearEl(b); };
    const p = b.play(); p?.then(() => { b.pause(); done(); }).catch(done);
  }

  /* ---------- crossfade ---------- */
  function beginFade(ni, secs) {
    const out = act(), inn = idle();
    const nd = inn.duration; if (Number.isFinite(nd) && nd > 0) secs = Math.min(secs, nd * 0.45);
    if (secs < 0.2) return false;
    commit();
    cur = 1 - cur; qi = ni;
    inn.currentTime = 0; inn.volume = 0;
    fading = { out, inn, d: secs * 1000, el: 0 };
    startSess(); want = true;
    playEl(inn);
    afterTrackChange();
    emit('player:state'); emit('player:fade', { on: true });
    return true;
  }
  function endFade() {
    if (!fading) return;
    const { out, inn } = fading; fading = null;
    clearEl(out); inn.volume = master();
    emit('player:fade', { on: false });
    preloadNext();
  }
  function stopFade() {
    if (!fading) return;
    const { out, inn } = fading; fading = null;
    clearEl(out); inn.volume = master();
    emit('player:fade', { on: false });
  }

  /* ---------- bucle principal ---------- */
  function tick() {
    const now = performance.now(), dt = Math.min(now - lastTick, 1500); lastTick = now;
    const a = act();
    if (!a._id) return;
    const playing = !a.paused && !a.ended;
    const settings = DT.settings.all();
    if (playing && sess && !a.seeking) sess.secs += dt / 1000;

    if (sleep?.at && !sleep.fade && Date.now() >= sleep.at) sleep.fade = now;
    if (sleep?.fade && now - sleep.fade >= 5000) { a.pause(); fading?.out.pause(); sleep = null; emit('player:sleep'); emit('player:state'); }

    if (fading) {
      if (!fading.inn.paused) fading.el += dt;
      const p = clamp(fading.el / fading.d, 0, 1), g = (p * Math.PI) / 2, m = master();
      fading.out.volume = clamp(m * Math.cos(g), 0, 1);
      fading.inn.volume = clamp(m * Math.sin(g), 0, 1);
      if (p >= 1) endFade();
    } else {
      a.volume = clamp(master(), 0, 1);
      if (playing && canFade && settings.xfade && settings.xfadeSec > 0 && !sleep?.eot && Number.isFinite(a.duration) && a.duration > 0) {
        const ni = nextIndex();
        if (ni >= 0 && ni !== qi && queue[ni].id !== curId()) {
          const rem = a.duration - a.currentTime, span = Math.min(settings.xfadeSec, a.duration * 0.45);
          const b = idle();
          if (b._id !== queue[ni].id) loadInto(b, queue[ni].id);
          /* solo se mezcla si la siguiente ya tiene datos suficientes; si no, termina con normalidad */
          if (rem <= span + 0.05 && rem > 0.4 && b.readyState >= 3 && !b._err) beginFade(ni, Math.min(span, rem));
        }
      }
    }
    const pos = act().currentTime;
    if (Math.floor(pos * 4) !== lastUi || !playing) { lastUi = Math.floor(pos * 4); emit('player:time', { pos, dur: act().duration }); }
    if (playing && Math.abs(pos - lastPos) >= 1 && 'mediaSession' in navigator && Number.isFinite(act().duration)) {
      lastPos = pos;
      try { navigator.mediaSession.setPositionState({ duration: act().duration, position: Math.min(pos, act().duration), playbackRate: 1 }); } catch { /* no soportado */ }
    }
    save();
  }
  setInterval(tick, TICK);

  /* ---------- eventos de los elementos ---------- */
  function onEnded() {
    commit();
    if (sleep?.eot) { sleep = null; emit('player:sleep'); const ni = nextIndex(false); want = false; if (ni >= 0) startTrack(ni, { autoplay: false }); else emit('player:state'); return; }
    const ni = nextIndex();
    if (ni < 0) { want = false; act().currentTime = 0; startSess(); emit('player:state'); return; }
    if (ni === qi) { act().currentTime = 0; startSess(); playEl(act()); return; }
    startTrack(ni);
  }
  A.forEach(a => {
    a.addEventListener('ended', () => { if (a === act()) onEnded(); });
    a.addEventListener('play', () => { if (a === act()) { emit('player:state'); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; } });
    a.addEventListener('pause', () => { if (a === act() && !a.ended) { emit('player:state'); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; } });
    a.addEventListener('playing', () => { if (a === act()) { errStreak = 0; emit('player:state'); } });
    a.addEventListener('waiting', () => { if (a === act()) emit('player:state'); });
    a.addEventListener('canplay', () => { if (a === act()) emit('player:state'); });
    a.addEventListener('loadedmetadata', () => { if (a === act()) { lastUi = -1; emit('player:time', { pos: a.currentTime, dur: a.duration }); } });
    a.addEventListener('error', () => {
      if (!a.getAttribute('src') || a.getAttribute('src') === SILENT) return;
      a._err = true;
      if (a !== act()) return; // el siguiente falló al precargar: se informa cuando le toque
      const t = DT.track(a._id);
      toast(`No se pudo reproducir «${t?.title || 'esta canción'}». El archivo falta o no es compatible con este navegador.`, 'error');
      errStreak++;
      if (errStreak < queue.length && nextIndex() >= 0 && nextIndex() !== qi) startTrack(nextIndex(), { autoplay: want });
      else { want = false; emit('player:state'); }
    });
  });

  /* ---------- API pública ---------- */
  const api = DT.player;
  api.canFade = canFade;
  api.current = () => track();
  api.index = () => qi;
  api.queue = () => queue.map(e => e.id);
  api.entries = () => queue;
  api.isPlaying = () => !!curId() && !act().paused && !act().ended;
  api.isLoading = () => !!curId() && want && !act().paused && act().readyState < 3;
  api.fading = () => !!fading;
  api.shuffle = () => shuffle;
  api.repeat = () => repeat;
  api.volume = () => vol;
  api.muted = () => muted;
  api.time = () => ({ pos: act().currentTime, dur: act().duration });
  api.sleep = () => sleep;
  api.saved = () => { const s = store.get(STATE, null); return s && s.q?.[s.i] ? { id: s.q[s.i], pos: s.pos || 0 } : null; };

  api.play = (ids, startId, { shuffleOn } = {}) => {
    unlock();
    ids = ids.filter(i => DT.track(i));
    if (!ids.length) return;
    if (shuffleOn !== undefined) shuffle = shuffleOn;
    let start = startId && ids.includes(startId) ? startId : (shuffle ? ids[Math.floor(Math.random() * ids.length)] : ids[0]);
    const es = ids.map(entry);
    orig = es;
    if (shuffle) {
      const s = es.find(e => e.id === start), rest = shuffled(es.filter(e => e !== s));
      queue = [s, ...rest]; qi = 0;
    } else { queue = [...es]; qi = es.findIndex(e => e.id === start); }
    errStreak = 0;
    startTrack(qi);
    emit('player:mode');
  };
  api.playAt = i => { unlock(); errStreak = 0; startTrack(i); };
  api.toggle = () => {
    unlock();
    const a = act(); if (!curId()) return;
    if (a.paused) { want = true; playEl(a); if (fading) playEl(fading.out); }
    else { want = false; a.pause(); fading?.out.pause(); }
  };
  api.next = () => {
    if (!queue.length) return;
    const ni = qi < queue.length - 1 ? qi + 1 : (repeat === 1 ? 0 : -1);
    if (ni < 0) { act().currentTime = 0; want = false; act().pause(); return; }
    errStreak = 0; startTrack(ni, { autoplay: want || !act().paused });
  };
  api.prev = () => {
    if (!queue.length) return;
    if (act().currentTime > 3 || (qi === 0 && repeat !== 1)) { act().currentTime = 0; return; }
    startTrack(qi > 0 ? qi - 1 : queue.length - 1, { autoplay: want || !act().paused });
  };
  api.seek = s => { const a = act(); if (Number.isFinite(a.duration)) { a.currentTime = clamp(s, 0, a.duration); lastUi = -1; } };
  api.seekBy = d => api.seek(act().currentTime + d);
  api.setVolume = v => { vol = clamp(v, 0, 1); if (vol > 0) muted = false; store.set('dt-vol', vol); store.set('dt-muted', muted); emit('player:volume'); };
  api.toggleMute = () => { muted = !muted; store.set('dt-muted', muted); emit('player:volume'); };
  api.toggleShuffle = () => {
    shuffle = !shuffle;
    if (queue.length) {
      const c = curEntry();
      if (shuffle) {
        orig = [...queue];
        queue = [c, ...shuffled(queue.filter(e => e !== c))]; qi = 0;
      } else if (orig) {
        const known = new Set(orig.map(e => e.u)), keep = new Set(queue.map(e => e.u));
        queue = [...orig.filter(e => keep.has(e.u)), ...queue.filter(e => !known.has(e.u))];
        qi = queue.indexOf(c);
      }
      preloadNext(); emit('player:queue');
    }
    save(true); emit('player:mode');
  };
  api.cycleRepeat = () => { repeat = (repeat + 1) % 3; preloadNext(); save(true); emit('player:mode'); };
  api.enqueue = (ids, next) => {
    ids = ids.filter(i => DT.track(i)); if (!ids.length) return 0;
    if (!queue.length) { api.play(ids, ids[0], { shuffleOn: false }); return ids.length; }
    const es = ids.map(entry);
    if (next) queue.splice(qi + 1, 0, ...es); else queue.push(...es);
    if (orig) orig = [...orig, ...es];
    preloadNext(); emit('player:queue'); save(true);
    return ids.length;
  };
  api.removeAt = i => {
    if (i === qi || i < 0 || i >= queue.length) return;
    const [e] = queue.splice(i, 1); if (orig) orig = orig.filter(x => x !== e);
    if (i < qi) qi--;
    preloadNext(); emit('player:queue'); save(true);
  };
  api.move = (from, to) => {
    if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;
    const c = curEntry(), [e] = queue.splice(from, 1); queue.splice(to, 0, e); qi = queue.indexOf(c);
    preloadNext(); emit('player:queue'); save(true);
  };
  api.clear = () => {
    if (!queue.length) return;
    const c = curEntry(); queue = [c]; qi = 0; orig = [c]; preloadNext(); emit('player:queue'); save(true);
  };
  api.setSleep = v => {
    if (v === 'eot') sleep = { eot: true };
    else if (v > 0) sleep = { at: Date.now() + v * 60000 };
    else sleep = null;
    emit('player:sleep');
  };

  /* restaurar la sesión anterior (en pausa: los navegadores no permiten reanudar solos) */
  api.restore = () => {
    const s = store.get(STATE, null);
    if (!s || !Array.isArray(s.q)) return;
    const keep = s.q.map((id, k) => ({ id, u: s.qu?.[k] ?? k + 1 })).filter(e => DT.track(e.id));
    if (!keep.length) return;
    const id = s.q[s.i];
    queue = keep; seq = Math.max(seq, ...keep.map(e => e.u)) + 1;
    qi = Math.max(0, keep.findIndex(e => e.id === id));
    shuffle = !!s.shuffle; repeat = [0, 1, 2].includes(s.repeat) ? s.repeat : 0;
    orig = shuffle && s.origU ? s.origU.map(u => queue.find(e => e.u === u)).filter(Boolean) : null;
    if (shuffle && (!orig || !orig.length)) orig = [...queue];
    startTrack(qi, { autoplay: false, pos: s.pos || 0, first: true });
    emit('player:mode');
  };
  api.hardReset = () => { stopFade(); commit(); A.forEach(clearEl); queue = []; qi = -1; orig = null; want = false; $('#player').hidden = true; emit('player:queue'); emit('player:track', {}); emit('player:state'); };

  /* sistema operativo: teclas multimedia y pantalla de bloqueo */
  if ('mediaSession' in navigator) {
    const m = navigator.mediaSession, h = (n, f) => { try { m.setActionHandler(n, f); } catch { /* acción no soportada */ } };
    h('play', api.toggle); h('pause', api.toggle); h('previoustrack', api.prev); h('nexttrack', api.next);
    h('seekto', d => api.seek(d.seekTime)); h('seekbackward', () => api.seekBy(-10)); h('seekforward', () => api.seekBy(10));
  }
  addEventListener('pagehide', () => { commit(); save(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
  /* si cambian los ajustes de crossfade durante una mezcla, no se corta: se aplican a la siguiente */
})();
