/* davixiniTracker · estadísticas y Davixini Wrapped (solo datos reales del registro de escucha) */
(() => {
  'use strict';
  const { $, esc, enc, icon, clock, long, plural, toast } = DT;
  const V = DT.views, ST = DT.stats;
  const mins = s => Math.round(s / 60);
  const MON = m => new Date(2000, m, 1).toLocaleDateString('es', { month: 'short' }).replace('.', '');
  const periodSelect = (cur, base) => {
    const ys = ST.years(), ms = ST.monthsWithData();
    const opt = (v, l) => `<option value="${v}"${v === cur ? ' selected' : ''}>${l}</option>`;
    return `<label class="sel-wrap"><span>Periodo</span><select id="period" data-base="${base}">${opt('all', 'Todo el tiempo')}${opt('7d', 'Últimos 7 días')}${opt('30d', 'Últimos 30 días')}${ys.map(y => opt(`y:${y}`, y)).join('')}${ms.slice(0, 24).map(m => opt(`m:${m}`, ST.label(`m:${m}`))).join('')}</select></label>`;
  };
  const pct = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

  const series = (s, p) => {
    if (p.startsWith('y:') || p === 'all') {
      const now = new Date(), out = [];
      const y = p.startsWith('y:') ? +p.slice(2) : null;
      for (let i = 0; i < 12; i++) {
        const d = y !== null ? new Date(y, i, 1) : new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        out.push({ k, label: MON(d.getMonth()), full: d.toLocaleDateString('es', { month: 'long', year: 'numeric' }), v: s.months.get(k) || 0 });
      }
      return out;
    }
    const [from, to] = ST.range(p), out = [];
    for (let t = from; t < Math.min(to, Date.now() + 1); t += ST.DAY) {
      const d = new Date(t), k = ST.dayKey(t);
      out.push({ k, label: String(d.getDate()), full: d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }), v: s.days.get(k) || 0 });
    }
    return out;
  };
  const bars = data => {
    const max = Math.max(...data.map(d => d.v), 1), small = max < 600, unit = small ? 's' : 'min', val = v => (small ? Math.round(v) : mins(v));
    return `<div class="bars" role="img" aria-label="Gráfico de barras en ${small ? 'segundos' : 'minutos'}: ${data.map(d => `${d.full} ${val(d.v)} ${unit}`).join('; ')}">${data.map(d => `<div class="bar-col" title="${esc(d.full)}: ${val(d.v)} ${unit}"><span class="bv">${d.v ? val(d.v) : ''}</span><i style="height:${Math.max(d.v ? 3 : 0, (d.v / max) * 100)}%"></i><span class="bl">${d.label}</span></div>`).join('')}</div><p class="sub note">Valores en ${small ? 'segundos' : 'minutos'} escuchados.</p>`;
  };
  const heat = hours => {
    const all = hours.flat(), max = Math.max(...all, 1), days = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    const lvl = v => (v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)));
    return `<div class="heat" role="img" aria-label="Mapa de actividad por día de la semana y hora"><div class="hx">${[0, 6, 12, 18].map(h => `<span style="grid-column:${h + 2}">${h}h</span>`).join('')}</div>
      ${hours.map((row, d) => `<span class="hy">${days[d][0].toUpperCase()}</span>${row.map((v, h) => `<i class="hc l${lvl(v)}" title="${days[d]} ${h}:00 · ${mins(v)} min"></i>`).join('')}`).join('')}</div>`;
  };
  const rankList = (items, render, max) => `<ol class="rank">${items.map((x, i) => `<li><span class="rn">${i + 1}</span>${render(x)}<span class="rb" style="--w:${(x.n || x.secs) / max * 100}%"></span></li>`).join('')}</ol>`;

  V.stats = (p = 'all') => {
    if (!DT.log.all().length) return DT.show(`<header class="phead"><h1>Estadísticas</h1></header>${DT.empty('Aún no hay datos', 'Las estadísticas se calculan con lo que escuchas aquí. Reproduce algunas canciones y vuelve: no se muestra nada inventado. Los datos se guardan solo en este navegador.', '<p><a class="btn solid" href="#/">Ir al inicio</a></p>')}`);
    const s = ST.summary(p), st = ST.streaks();
    if (!s.list.length) return DT.show(`<header class="phead"><div><h1>Estadísticas</h1><p class="sub">${ST.label(p)}</p></div>${periodSelect(p, 'stats')}</header>${DT.empty('Sin escuchas en este periodo', 'Elige otro periodo para ver datos.')}`);
    const top = (arr, n = 8) => arr.slice(0, n), mx = arr => Math.max(...arr.map(x => x.n || x.secs), 1);
    const tt = top(s.tracks), ta = top(s.albums), tr = top(s.artists), tg = top(s.genres, 8);
    const done = DT.S.albums.filter(a => { const c = ST.completion(a.id); return c.total >= 2 && c.done === c.total; });
    const rec = [
      s.busiestDay && ['Día con más música', `${new Date(`${s.busiestDay[0]}T12:00:00`).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${long(s.busiestDay[1])}`],
      s.repeatRecord && ['Canción más repetida en un día', `${esc(DT.track(s.repeatRecord.id)?.title || '')} · ${s.repeatRecord.n} veces el ${new Date(`${s.repeatRecord.day}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}`],
      ['Racha actual', `${plural(st.current, 'día', 'días')} seguidos`], ['Mejor racha', `${plural(st.best, 'día', 'días')} seguidos`], ['Días con escucha', `${st.days}`]
    ].filter(Boolean);
    DT.show(`<header class="phead"><div><h1>Estadísticas</h1><p class="sub">${ST.label(p)} · datos de este navegador</p></div><p class="acts">${periodSelect(p, 'stats')}<a class="btn solid" href="#/wrapped/${p === 'all' || p === '7d' || p === '30d' ? '' : p}">Davixini Wrapped</a></p></header>
      <dl class="bigstats"><div><dt>Tiempo escuchado</dt><dd>${long(s.secs)}</dd></div><div><dt>Reproducciones</dt><dd>${s.plays.toLocaleString('es')}</dd></div><div><dt>Canciones distintas</dt><dd>${s.distinct.toLocaleString('es')}</dd></div><div><dt>Racha actual</dt><dd>${icon('flame')}${st.current}<small> d</small></dd></div></dl>
      <section>${DT.secHead(p.startsWith('y:') || p === 'all' ? 'Escucha por mes' : 'Escucha por día')}${bars(series(s, p))}</section>
      <div class="cols3">
        <section>${DT.secHead('Canciones')}${tt.length ? rankList(tt, x => { const t = DT.track(x.id); return `<a class="rt" href="#/song/${enc(t.id)}"><b>${esc(t.title)}</b><small>${esc(t.who)}</small></a><span class="rc">${x.n}</span>`; }, mx(tt)) : '<p class="sub">Sin datos.</p>'}</section>
        <section>${DT.secHead('Álbumes')}${ta.length ? rankList(ta, x => { const a = DT.album(x.id); return `<a class="rt" href="#/album/${enc(a.id)}"><b>${esc(a.title)}</b><small>${esc(a.who)}</small></a><span class="rc">${x.n}</span>`; }, mx(ta)) : '<p class="sub">Sin datos.</p>'}</section>
        <section>${DT.secHead('Artistas')}${tr.length ? rankList(tr, x => { const a = DT.artist(x.id); return `<a class="rt" href="#/artist/${enc(a.id)}"><b>${esc(a.name)}</b><small>${long(x.secs)}</small></a><span class="rc">${x.n}</span>`; }, mx(tr)) : '<p class="sub">Sin datos.</p>'}</section>
      </div>
      <p class="sub note">El número a la derecha son reproducciones. Una reproducción cuenta cuando escuchas al menos 30 segundos o la mitad de una canción corta.</p>
      <section>${DT.secHead('Cuándo escuchas')}${heat(s.hours)}</section>
      ${tg.length ? `<section>${DT.secHead('Géneros')}<ul class="hbars">${tg.map(g => `<li><span>${esc(g.id)}</span><i style="--w:${(g.secs / tg[0].secs) * 100}%"></i><b>${long(g.secs)}</b></li>`).join('')}</ul></section>` : ''}
      <section>${DT.secHead('Récords y rachas')}<dl class="records">${rec.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></section>
      ${done.length ? `<section>${DT.secHead('Álbumes completados')}<p class="sub">Los has escuchado entero, canción por canción.</p><div class="strip">${done.slice(0, 12).map(a => DT.card(a)).join('')}</div></section>` : ''}`);
  };

  /* ---------- Davixini Wrapped ---------- */
  const wrappedData = p => {
    const s = ST.summary(p), pv = ST.previous(p), prev = pv ? ST.summary(pv) : null;
    return { p, s, prev, pv, label: ST.label(p), a: s.artists[0] && DT.artist(s.artists[0].id), al: s.albums[0] && DT.album(s.albums[0].id), t: s.tracks[0] && DT.track(s.tracks[0].id) };
  };
  const intro = (p, l) => (p === 'all' ? 'Todo tu tiempo' : p.startsWith('y:') || p.startsWith('m:') ? `Tu ${l}` : `Tus ${l.toLowerCase()}`);
  V.wrapped = p => {
    if (!DT.log.all().length) return DT.show(`<header class="phead"><h1>Davixini Wrapped</h1></header>${DT.empty('Todavía no hay nada que resumir', 'Wrapped se construye con tu historial de escucha real. Escucha música y vuelve cuando haya algo que contar.', '<p><a class="btn solid" href="#/">Ir al inicio</a></p>')}`);
    if (!p) { const y = ST.years(); p = y.includes(new Date().getFullYear()) ? `y:${new Date().getFullYear()}` : y.length ? `y:${y[0]}` : '30d'; }
    const w = wrappedData(p);
    if (!w.s.list.length) return DT.show(`<header class="phead"><div><h1>Davixini Wrapped</h1></div>${periodSelect(p, 'wrapped')}</header>${DT.empty('Sin escuchas en este periodo', 'Elige otro periodo.')}`);
    const { s, prev } = w, m = mins(s.secs), d = prev && prev.secs ? pct(s.secs, prev.secs) : null;
    const sl = (cls, inner) => `<section class="wslide ${cls}">${inner}</section>`;
    DT.show(`<header class="phead"><div><p class="eyebrow">Davixini Wrapped</p></div><p class="acts">${periodSelect(p, 'wrapped')}<a class="btn" href="#/stats/${p}">Ver estadísticas</a></p></header>
      <div class="wrapped">
      ${sl('w-accent w-intro', `<p class="eyebrow">Davixini Wrapped</p><h1>${esc(intro(p, w.label))}<br>en el Davixiniverso</h1><p>${plural(s.plays, 'reproducción', 'reproducciones')} · ${plural(s.distinct, 'canción distinta', 'canciones distintas')}</p>`)}
      ${sl('', `<p class="eyebrow">Tiempo escuchado</p><p class="w-big">${m.toLocaleString('es')}<small> minutos</small></p><p class="w-sub">${long(s.secs)} de música.${d !== null ? ` ${d >= 0 ? `Un ${d}% más` : `Un ${Math.abs(d)}% menos`} que en ${esc(ST.label(w.pv))} (${long(prev.secs)}).` : prev ? '' : ''}</p>`)}
      ${w.a ? sl('w-accent', `<p class="eyebrow">Artista principal</p><div class="w-hero"><span class="av big">${w.a.image ? `<img src="${esc(w.a.image)}" alt="">` : esc([...w.a.name][0])}</span><div><h2><a href="#/artist/${enc(w.a.id)}">${esc(w.a.name)}</a></h2><p class="w-sub">${plural(s.artists[0].n, 'reproducción', 'reproducciones')} · ${long(s.artists[0].secs)}</p></div></div>`) : ''}
      ${w.al ? sl('', `<p class="eyebrow">Álbum principal</p><div class="w-hero">${DT.pic(w.al.cover, 'big')}<div><h2><a href="#/album/${enc(w.al.id)}">${esc(w.al.title)}</a></h2><p class="w-sub">${esc(w.al.who)} · ${plural(s.albums[0].n, 'reproducción', 'reproducciones')}</p></div></div>`) : ''}
      ${w.t ? sl('w-accent', `<p class="eyebrow">Canción principal</p><div class="w-hero">${DT.pic(w.t.cover, 'big')}<div><h2><a href="#/song/${enc(w.t.id)}">${esc(w.t.title)}</a></h2><p class="w-sub">${esc(w.t.who)} · ${plural(s.tracks[0].n, 'reproducción', 'reproducciones')}</p></div></div>`) : ''}
      ${sl('', `<p class="eyebrow">Tus canciones destacadas</p>${DT.rows(s.tracks.slice(0, 5).map(x => DT.track(x.id)), { n: true, compact: true })}`)}
      ${sl('', `<p class="eyebrow">${p.startsWith('y:') || p === 'all' ? 'Evolución mensual' : 'Evolución diaria'}</p>${bars(series(s, p))}`)}
      ${s.genres.length ? sl('w-accent', `<p class="eyebrow">Géneros</p><ol class="w-genres">${s.genres.slice(0, 3).map(g => `<li>${esc(g.id)}<small> ${long(g.secs)}</small></li>`).join('')}</ol>`) : ''}
      ${sl('w-share', `<p class="eyebrow">Tarjeta compartible</p><canvas id="wCard" width="1080" height="1350" aria-label="Vista previa de la tarjeta de Wrapped"></canvas><p class="acts"><button class="btn solid" data-act="wrap-dl">${icon('download')}Descargar imagen</button><button class="btn" data-act="wrap-share">${icon('share')}Compartir</button></p>`)}
      </div>`, () => { drawCard($('#wCard'), w); });
    DT._wrapped = w;
  };

  /* tarjeta compartible dibujada en canvas con datos reales */
  const loadImg = src => new Promise(res => { if (!src) return res(null); const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  const fit = (g, txt, max, wt, px, font) => { let s = px; g.font = font(wt, s); while (g.measureText(txt).width > max && s > 28) { s -= 4; g.font = font(wt, s); } };
  async function drawCard(c, w) {
    if (!c) return;
    const g = c.getContext('2d'), cs = getComputedStyle(document.documentElement), acc = cs.getPropertyValue('--accent').trim() || '#ff6a3d', ink = cs.getPropertyValue('--accent-ink').trim() || '#000';
    const font = (wt, px) => `${wt} ${px}px "Bricolage Grotesque", system-ui, sans-serif`;
    g.fillStyle = '#000'; g.fillRect(0, 0, 1080, 1350);
    g.fillStyle = acc; g.fillRect(0, 0, 1080, 560);
    g.fillStyle = ink; g.font = font(700, 34); g.fillText('DAVIXINI WRAPPED', 72, 110);
    fit(g, w.label, 936, 800, 120, font); g.fillText(w.label, 72, 250);
    g.font = font(800, 200); g.fillText(mins(w.s.secs).toLocaleString('es'), 72, 450);
    g.font = font(600, 40); g.fillText('minutos de música', 72, 510);
    const img = await loadImg(w.t?.cover || w.al?.cover);
    if (img) { g.save(); g.beginPath(); g.rect(700, 330, 308, 308); g.clip(); g.drawImage(img, 700, 330, 308, 308); g.restore(); }
    g.fillStyle = '#f4f4f2'; g.font = font(600, 30); g.fillStyle = '#8d8d89';
    g.fillText('ARTISTA PRINCIPAL', 72, 700); g.fillStyle = '#f4f4f2'; { const n = w.a?.name || '—'; fit(g, n, 936, 800, 64, font); g.fillText(n, 72, 770); }
    g.fillStyle = '#8d8d89'; g.font = font(600, 30); g.fillText('CANCIONES DESTACADAS', 72, 880);
    w.s.tracks.slice(0, 5).forEach((x, i) => {
      const t = DT.track(x.id); g.fillStyle = acc; g.font = font(800, 44); g.fillText(String(i + 1), 72, 960 + i * 78);
      g.fillStyle = '#f4f4f2'; fit(g, t?.title || '', 860, 700, 44, font); g.fillText(t?.title || '', 140, 960 + i * 78);
    });
    g.fillStyle = '#8d8d89'; g.font = font(500, 28); g.fillText(`${w.s.plays.toLocaleString('es')} reproducciones · ${w.s.distinct} canciones`, 72, 1300);
  }
  const cardBlob = () => new Promise(res => $('#wCard').toBlob(res, 'image/png'));
  DT.wrapDownload = async () => { const b = await cardBlob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `davixini-wrapped-${DT._wrapped.p.replace(':', '-')}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  DT.wrapShare = async () => {
    const b = await cardBlob(), f = new File([b], 'davixini-wrapped.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], title: 'Mi Davixini Wrapped' }); } catch { /* cancelado */ } }
    else { toast('Este navegador no permite compartir imágenes: se descarga en su lugar.'); DT.wrapDownload(); }
  };
})();
