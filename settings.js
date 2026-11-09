/* davixiniTracker · preferencias persistentes y su aplicación real a la interfaz */
(() => {
  'use strict';
  const { store, emit, clamp } = DT;
  const KEY = 'dt-settings';
  const HOME = ['continue', 'recent', 'latest', 'albums', 'albumDay', 'recs', 'weekly', 'artists', 'playlists', 'random', 'forgotten'];
  const DEF = {
    theme: 'dark', accent: '#ff6a3d', bg: 'plain', density: 'comfortable', cover: 'rounded', grid: 'm', scale: 100,
    player: 'floating', mini: false, panel: false, panelTab: 'queue',
    xfade: true, xfadeSec: 5,
    transition: 'fade', motion: 'system', dur: 220, animCovers: true, animPlayer: true,
    home: HOME.map(id => ({ id, on: true }))
  };
  const merge = saved => {
    const s = { ...DEF, ...(saved || {}) };
    const have = Array.isArray(s.home) ? s.home.filter(h => HOME.includes(h.id)) : [];
    s.home = [...have, ...HOME.filter(id => !have.some(h => h.id === id)).map(id => ({ id, on: true }))];
    s.xfadeSec = clamp(Number(s.xfadeSec) || 0, 0, 12);
    s.dur = clamp(Number(s.dur) || 220, 0, 600);
    return s;
  };
  let cfg = merge(store.get(KEY, {}));
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mqLight = matchMedia('(prefers-color-scheme: light)');

  /* movimiento efectivo: 'full' | 'reduced' | 'none' */
  const motion = () => (cfg.motion === 'system' ? (mqReduce.matches ? 'reduced' : 'full') : cfg.motion === 'on' ? 'full' : cfg.motion);
  const dur = () => { const m = motion(); return m === 'none' ? 0 : m === 'reduced' ? Math.min(cfg.dur, 120) : cfg.dur; };

  const inkFor = hex => {
    const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2] > .36 ? '#000' : '#fff';
  };
  function apply() {
    const r = document.documentElement, d = r.dataset, theme = cfg.theme === 'system' ? (mqLight.matches ? 'light' : 'dark') : cfg.theme;
    d.theme = theme; d.density = cfg.density; d.cover = cfg.cover; d.grid = cfg.grid; d.player = cfg.player;
    d.motion = motion(); d.bg = cfg.bg; d.covers = cfg.animCovers ? 'on' : 'off'; d.pplayer = cfg.animPlayer ? 'on' : 'off';
    r.style.setProperty('--accent', cfg.accent);
    r.style.setProperty('--accent-ink', inkFor(cfg.accent));
    r.style.setProperty('--dur', `${dur()}ms`);
    r.style.fontSize = `${(cfg.scale / 100) * 16}px`;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#000000' : '#f3f0e8');
  }
  const get = k => cfg[k];
  const set = (k, v) => {
    cfg = { ...cfg, [k]: v }; store.set(KEY, cfg); apply(); emit('settings', k);
  };
  const all = () => cfg;
  const replaceAll = obj => { cfg = merge(obj); store.set(KEY, cfg); apply(); emit('settings', '*'); };
  mqReduce.addEventListener?.('change', () => { apply(); emit('settings', 'motion'); });
  mqLight.addEventListener?.('change', () => { if (cfg.theme === 'system') apply(); });
  DT.settings = { get, set, all, replaceAll, DEF, HOME };
  DT.motion = motion; DT.dur = dur;

  /* ---------- transiciones visuales (independientes del crossfade de audio) ---------- */
  const STYLES = [
    ['fade', 'Fundido', 'La página nueva aparece con un fundido.'],
    ['slide', 'Deslizamiento', 'La página entra deslizándose en horizontal.'],
    ['dissolve', 'Desvanecimiento', 'La página actual se apaga antes de mostrar la nueva.'],
    ['zoom', 'Zoom suave', 'La página entra con un ligero acercamiento.'],
    ['minimal', 'Minimalista', 'Sin movimiento: solo un trazo de color arriba.'],
    ['none', 'Sin transición', 'Cambio inmediato.']
  ];
  const frames = style => {
    const m = motion();
    if (m === 'none' || style === 'none') return null;
    if (m === 'reduced') return { in: [{ opacity: 0 }, { opacity: 1 }] };
    return ({
      fade: { in: [{ opacity: 0 }, { opacity: 1 }] },
      slide: { in: [{ opacity: 0, transform: 'translateX(28px)' }, { opacity: 1, transform: 'none' }] },
      dissolve: { out: [{ opacity: 1 }, { opacity: 0 }], in: [{ opacity: 0 }, { opacity: 1 }] },
      zoom: { in: [{ opacity: 0, transform: 'scale(.975)' }, { opacity: 1, transform: 'none' }] },
      minimal: { bar: true }
    })[style];
  };
  const ease = 'cubic-bezier(.2,.7,.2,1)';
  const run = (el, kf, ms, fill = 'backwards') => (el.animate && ms > 0 ? el.animate(kf, { duration: ms, easing: ease, fill }).finished.catch(() => {}) : Promise.resolve());
  const sweep = (bar, ms) => bar && run(bar, [{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1, offset: .7 }, { transform: 'scaleX(1)', opacity: 0 }], Math.max(ms * 2, 1));
  DT.trans = {
    STYLES,
    async out(el) {
      const f = frames(cfg.transition); if (!f?.out) return;
      await run(el, f.out, dur() / 2, 'forwards');
    },
    async into(el, bar) {
      const f = frames(cfg.transition); el.getAnimations?.().forEach(a => a.cancel());
      if (!f) return;
      if (f.bar) { sweep(bar, dur()); return; }
      await run(el, f.in, f.out ? dur() / 2 : dur());
    },
    /* vista previa en los ajustes: usa los mismos fotogramas que la navegación real */
    preview(stage, style) {
      const page = stage.querySelector('.pv-page'), bar = stage.querySelector('.pv-bar');
      const f = frames(style); page.getAnimations().forEach(a => a.cancel());
      if (!f) return;
      const ms = Math.max(dur(), 160);
      if (f.bar) { sweep(bar, ms); return; }
      if (f.out) run(page, f.out, ms / 2, 'forwards').then(() => { page.getAnimations().forEach(a => a.cancel()); return run(page, f.in, ms / 2); }); else run(page, f.in, ms);
    }
  };
  apply();
})();
