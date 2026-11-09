/* davixiniTracker · ajustes (cada control cambia algo real y se guarda en el navegador) */
(() => {
  'use strict';
  const { $, $$, esc, icon, plural, toast, store } = DT;
  const set = DT.settings;
  const ACCENTS = [['#ff6a3d', 'Bermellón'], ['#e8b923', 'Ámbar'], ['#7ac74f', 'Hoja'], ['#2fb5a0', 'Verdeazulado'], ['#4a9eff', 'Cielo'], ['#d96ba0', 'Rosa'], ['#c9c4b6', 'Hueso'], ['#ffffff', 'Blanco']];

  const seg = (key, label, opts) => `<fieldset class="seg" role="radiogroup"><legend class="sr">${label}</legend>${opts.map(([v, l]) => `<label><input type="radio" name="${key}" value="${v}" data-s="${key}"${String(set.get(key)) === String(v) ? ' checked' : ''}><span>${l}</span></label>`).join('')}</fieldset>`;
  const sw = (key, label) => `<input class="sw" type="checkbox" role="switch" id="s-${key}" data-s="${key}" data-bool aria-label="${label}"${set.get(key) ? ' checked' : ''}>`;
  const RL = { scale: 'Tamaño de la interfaz', xfadeSec: 'Duración del crossfade en segundos', dur: 'Duración de las animaciones en milisegundos' };
  const rng = (key, min, max, step, unit, ticks) => `<div class="rngwrap"><input class="rng" type="range" id="s-${key}" aria-label="${RL[key]}" data-s="${key}" data-num min="${min}" max="${max}" step="${step}" value="${set.get(key)}" style="--p:${((set.get(key) - min) / (max - min)) * 100}%" aria-describedby="o-${key}"><output id="o-${key}" for="s-${key}">${set.get(key)}${unit}</output></div>${ticks ? `<div class="ticks" aria-hidden="true">${ticks.map(t => `<span>${t}</span>`).join('')}</div>` : ''}`;
  const row = (title, desc, ctl, id) => `<div class="srow"${id ? ` id="${id}"` : ''}><div><label class="st">${title}</label>${desc ? `<p class="sd">${desc}</p>` : ''}</div><div class="sc">${ctl}</div></div>`;

  DT.views.settings = section => {
    const log = DT.log.all();
    const tiles = DT.trans.STYLES.map(([v, n, d]) => `<label class="tile"><input type="radio" name="transition" value="${v}" data-s="transition"${set.get('transition') === v ? ' checked' : ''}><span class="pv" data-style="${v}" aria-hidden="true"><i class="pv-bar"></i><i class="pv-page"><b></b><b></b><b></b></i></span><strong>${n}</strong><small>${d}</small></label>`).join('');
    DT.show(`<header class="phead"><h1>Ajustes</h1></header>
      <nav class="jump" aria-label="Secciones de ajustes"><a href="#/settings/appearance">Apariencia</a><a href="#/settings/transitions">Transiciones y reproducción</a><a href="#/settings/home">Inicio y panel</a><a href="#/settings/data">Datos</a><a href="#/settings/shortcuts">Atajos</a></nav>
      <div class="settings">
      <section id="appearance"><h2>Apariencia</h2>
        ${row('Tema', 'El tema oscuro es el predeterminado.', seg('theme', 'Tema', [['dark', 'Oscuro'], ['light', 'Claro'], ['system', 'Sistema']]))}
        ${row('Color de acento', 'Se usa en el elemento activo, los controles y las barras.', `<div class="swatches" role="radiogroup" aria-label="Color de acento">${ACCENTS.map(([c, n]) => `<label title="${n}"><input type="radio" name="accent" value="${c}" data-s="accent"${set.get('accent').toLowerCase() === c ? ' checked' : ''}><span style="background:${c}"></span><b class="sr">${n}</b></label>`).join('')}<label class="custom" title="Color personalizado"><input type="color" id="accentCustom" value="${esc(set.get('accent'))}" aria-label="Color de acento personalizado"><span>Otro</span></label></div>`)}
        ${row('Fondo', 'Un velo de color detrás de los títulos. «Portada» toma el tono de la canción que suena.', seg('bg', 'Fondo', [['plain', 'Liso'], ['cover', 'Portada'], ['accent', 'Acento']]))}
        ${row('Densidad', 'Altura de las filas y separación general.', seg('density', 'Densidad', [['comfortable', 'Cómoda'], ['compact', 'Compacta']]))}
        ${row('Forma de las portadas', '', seg('cover', 'Forma de las portadas', [['square', 'Cuadrada'], ['rounded', 'Redondeada'], ['circle', 'Circular']]))}
        ${row('Tamaño de las portadas', 'En las cuadrículas de álbumes y listas.', seg('grid', 'Tamaño de las portadas', [['s', 'Pequeño'], ['m', 'Medio'], ['l', 'Grande']]))}
        ${row('Tamaño de la interfaz', 'Escala el texto y los controles.', rng('scale', 90, 125, 5, ' %'))}
        ${row('Estilo del reproductor', 'Flotante deja un margen alrededor; anclado ocupa todo el borde inferior.', seg('player', 'Estilo del reproductor', [['floating', 'Flotante'], ['docked', 'Anclado']]))}
        ${row('Reproductor compacto', 'Reduce el reproductor a una pastilla con portada, pausa y siguiente.', sw('mini', 'Reproductor compacto'))}
      </section>
      <section id="transitions"><h2>Transiciones y reproducción</h2>
        <h3>Audio: crossfade</h3>
        ${row('Crossfade entre canciones', 'Mezcla el final de una canción con el principio de la siguiente. No se activa al pausar ni al cambiar de canción a mano.', sw('xfade', 'Crossfade'))}
        ${row('Duración del crossfade', `De 0 a 12 segundos. Las canciones muy cortas usan una mezcla proporcionalmente menor.${DT.player.canFade ? '' : ' <b>Este navegador no permite controlar el volumen por canción: las canciones seguirán una tras otra sin mezcla.</b>'}`, rng('xfadeSec', 0, 12, 1, ' s', ['0', '3', '6', '9', '12 s']))}
        <h3>Visual: transiciones entre páginas</h3>
        <p class="sd">Independientes del audio. Pasa el cursor o enfoca una opción para verla.</p>
        <div class="tiles" role="radiogroup" aria-label="Estilo de transición">${tiles}</div>
        ${row('Duración de las animaciones', 'Afecta a las transiciones y a los movimientos de la interfaz.', rng('dur', 100, 500, 20, ' ms'))}
        ${row('Movimiento', '«Sistema» respeta la preferencia del dispositivo. «Reducido» deja solo fundidos breves. «Ninguno» desactiva todas las animaciones.', seg('motion', 'Movimiento', [['system', 'Sistema'], ['on', 'Completo'], ['reduced', 'Reducido'], ['none', 'Ninguno']]))}
        ${row('Animar portadas', 'Acercamiento al pasar el cursor por una portada.', sw('animCovers', 'Animar portadas'))}
        ${row('Animar el reproductor', 'Entrada de la portada al cambiar de canción y del reproductor ampliado.', sw('animPlayer', 'Animar el reproductor'))}
      </section>
      <section id="home"><h2>Inicio y panel</h2>
        ${row('Secciones del inicio', 'Elige cuáles se ven y en qué orden.', '<button class="btn" data-act="home-config">Personalizar</button>')}
        ${row('Panel contextual abierto al entrar', 'Cola, información de la canción y letra a la derecha.', sw('panel', 'Panel abierto al entrar'))}
        ${row('Pestaña del panel', '', seg('panelTab', 'Pestaña del panel', [['queue', 'Cola'], ['now', 'Ahora'], ['lyrics', 'Letra']]))}
      </section>
      <section id="data"><h2>Datos</h2>
        <p class="sd">Todo lo personal (ajustes, favoritos, listas e historial) vive solo en este navegador, no en Supabase. Haz una copia si cambias de dispositivo.</p>
        ${row('Copia de seguridad', `${plural(DT.likes.all().length, 'favorito', 'favoritos')}, ${plural(DT.pl.all().length, 'lista', 'listas')} y ${plural(log.length, 'escucha', 'escuchas')}.`, '<button class="btn" data-act="data-export">' + icon('download') + 'Exportar</button><button class="btn" data-act="data-import">' + icon('share') + 'Importar</button>')}
        ${row('Borrar historial', 'Elimina el registro de escucha y, con él, las estadísticas.', '<button class="btn" data-act="log-clear">Borrar historial</button>')}
        ${row('Restablecer ajustes', 'Vuelve a la apariencia y reproducción por defecto. No toca favoritos ni listas.', '<button class="btn" data-act="settings-reset">Restablecer</button>')}
      </section>
      <section id="shortcuts"><h2>Atajos de teclado</h2>${shortcutTable()}</section>
      <section><h2>Administración</h2>${row('Acceso de administración', 'Solo las cuentas autorizadas en Supabase pueden publicar música.', '<a class="btn" href="admin.html">Abrir administración</a>')}</section>
      </div>`, v => {
      $$('.pv[data-style]', v).forEach(st => { const run = () => DT.trans.preview(st, st.dataset.style); st.closest('label').addEventListener('mouseenter', run); st.closest('input,label').addEventListener('focusin', run); });
      const cur = $(`.pv[data-style="${set.get('transition')}"]`, v); if (cur) setTimeout(() => DT.trans.preview(cur, set.get('transition')), 250);
      if (section) $(`#${section}`, v)?.scrollIntoView({ block: 'start' });
    });
  };
  DT.shortcuts = [['Espacio', 'Reproducir / pausar'], ['← →', 'Retroceder / avanzar 5 s'], ['Mayús + ← →', 'Canción anterior / siguiente'], ['↑ ↓', 'Subir / bajar volumen'], ['M', 'Silenciar'], ['S', 'Aleatorio'], ['R', 'Repetir'], ['L', 'Me gusta'], ['Q', 'Abrir o cerrar el panel'], ['/', 'Buscar'], ['?', 'Ver esta ayuda']];
  function shortcutTable() { return `<dl class="keys">${DT.shortcuts.map(([k, d]) => `<div><dt>${k.split(' + ').map(x => `<kbd>${x}</kbd>`).join(' + ')}</dt><dd>${d}</dd></div>`).join('')}</dl>`; }
  DT.shortcutsDialog = () => { const d = $('#dlg'); d.className = 'sm'; d.innerHTML = `<button class="x ib" data-close aria-label="Cerrar">${icon('close')}</button><h2>Atajos de teclado</h2>${shortcutTable()}`; d.showModal(); };

  /* delegación: un solo manejador para todos los controles del formulario de ajustes */
  const apply = el => {
    const key = el.dataset.s; let v = el.value;
    if ('bool' in el.dataset) v = el.checked; else if ('num' in el.dataset) v = Number(v);
    if (el.type === 'radio' && !el.checked) return;
    set.set(key, v);
    if ('num' in el.dataset) {
      const min = +el.min, max = +el.max; el.style.setProperty('--p', `${((v - min) / (max - min)) * 100}%`);
      const o = $(`#o-${key}`); if (o) o.textContent = `${v}${key === 'scale' ? ' %' : key === 'dur' ? ' ms' : ' s'}`;
    }
    if (key === 'transition') { const st = $(`.pv[data-style="${v}"]`); st && DT.trans.preview(st, v); }
    if (key === 'accent') { const c = $('#accentCustom'); if (c) c.value = v; }
  };
  document.addEventListener('input', e => { if (e.target.id === 'accentCustom') { set.set('accent', e.target.value); $$('input[name=accent]').forEach(r => (r.checked = false)); } else if (e.target.dataset?.num !== undefined && e.target.closest('#view')) apply(e.target); });
  document.addEventListener('change', e => { if (e.target.dataset?.s && e.target.closest('#view')) apply(e.target); });

  /* exportar / importar */
  DT.dataExport = () => {
    const data = { app: 'davixiniTracker', version: 1, exported: new Date().toISOString(), settings: set.all(), likes: DT.likes.all(), playlists: DT.pl.all(), log: DT.log.all(), recentSearches: store.get('dt-recent-q', []) };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = `davixinitracker-copia-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Copia exportada.');
  };
  DT.dataImport = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      let d; try { d = JSON.parse(await f.text()); } catch { return toast('El archivo no es un JSON válido.', 'error'); }
      if (d?.app !== 'davixiniTracker' || !d.settings) return toast('Este archivo no es una copia de davixiniTracker.', 'error');
      const ok = await DT.ask({ title: 'Importar copia', text: `Se reemplazarán tus ajustes, ${plural((d.likes || []).length, 'favorito', 'favoritos')}, ${plural((d.playlists || []).length, 'lista', 'listas')} y ${plural((d.log || []).length, 'escucha', 'escuchas')} actuales.`, ok: 'Importar', danger: true });
      if (!ok) return;
      set.replaceAll(d.settings); DT.likes.replace(Array.isArray(d.likes) ? d.likes : []); DT.pl.replaceAll(d.playlists); DT.log.replace(d.log);
      store.set('dt-recent-q', Array.isArray(d.recentSearches) ? d.recentSearches : []);
      toast('Copia importada.'); DT.views.settings();
    };
    inp.click();
  };
})();
