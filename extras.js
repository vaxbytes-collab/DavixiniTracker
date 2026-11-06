(() => {
  'use strict';
  const audio = document.getElementById('audioEngine');
  const dbName = 'MiMusicaBiblioteca';
  let db, ctx, source, filters = [], compressor, sleepId = null;
  let loopA = null, loopB = null, loopOn = false;
  const crossfadeSettings = {
    enabled: localStorage.getItem('davixini-crossfade-enabled') !== 'false',
    duration: Math.min(12, Math.max(2, Number(localStorage.getItem('davixini-crossfade-duration')) || 6))
  };
  const nextAudio = new Audio();
  nextAudio.preload = 'auto';
  nextAudio.volume = 0;
  let prepared = null, preparedUrl = null, fading = false, committing = false;
  let fadeTimer = null, fadeStartedAt = 0;
  let masterVolume = Math.min(1, Math.max(0, Number(localStorage.getItem('mi-musica-volume') ?? 0.8)));
  const $ = (s, r=document) => r.querySelector(s);
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = s => { const region=$('#toastRegion'); if(!region)return; const el=document.createElement('div');el.className='toast';el.textContent=s;region.append(el);setTimeout(()=>el.remove(),3000); };
  function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(dbName,3);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  async function allTracks(){if(!db)db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction('tracks').objectStore('tracks').getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);});}
  async function saveTrack(id, patch){const list=await allTracks();const track=list.find(t=>t.id===id);if(!track)return;return new Promise((resolve,reject)=>{const tx=db.transaction('tracks','readwrite');tx.objectStore('tracks').put(Object.assign({},track,patch));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
  function currentId(){const title=$('#playerTrackTitle')?.textContent;return window.__davixiniCurrentTrackId || null;}
  function modal(title, kicker, body){const backdrop=$('#modalBackdrop'), panel=$('#modalPanel'), content=$('#modalContent');if(!backdrop||!panel||!content)return;$('#modalTitle').textContent=title;$('#modalKicker').textContent=kicker;panel.classList.add('modal-wide');content.innerHTML=body;backdrop.hidden=false;document.body.style.overflow='hidden';}
  function close(){const b=$('#modalBackdrop');if(b){b.hidden=true;document.body.style.overflow='';}$('#modalPanel')?.classList.remove('modal-wide');}
  function hub(){modal('centro de extras','10 herramientas para tu música',
    '<div class="feature-grid">'+
    '<button class="feature-tile" data-extra="eq"><strong>♫ ecualizador</strong><small>5 bandas ajustables</small></button>'+
    '<button class="feature-tile" data-extra="lyrics"><strong>▤ letras</strong><small>guarda la letra de cada canción</small></button>'+ '<button class="feature-tile" data-extra="notes"><strong>✎ notas personales</strong><small>apuntes privados por canción</small></button>'+
    '<button class="feature-tile" data-extra="stats"><strong>▥ estadísticas</strong><small>tiempo de escucha de esta sesión</small></button>'+
    '<button class="feature-tile" data-extra="dupes"><strong>◎ duplicados</strong><small>encuentra títulos repetidos</small></button>'+
    '<button class="feature-tile" data-extra="timer"><strong>◷ temporizador</strong><small>detén la música en X minutos</small></button>'+
    '<button class="feature-tile" data-extra="crossfade"><strong>⇄ crossfade real</strong><small>solapa el final y el inicio de dos canciones</small></button>'+
    '<button class="feature-tile" data-extra="normalize"><strong>↗ nivelador</strong><small>compresión dinámica de volumen</small></button>'+
    '<button class="feature-tile" data-extra="ab"><strong>A—B bucle</strong><small>repite una parte de la canción</small></button>'+
    '<button class="feature-tile" data-extra="filters"><strong>⌕ filtros</strong><small>busca por artista, género y año</small></button>'+
    '</div>');
  }
  function graph(){if(ctx)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)throw Error('tu navegador no admite Web Audio');ctx=new C();source=ctx.createMediaElementSource(audio);const hz=[60,250,1000,4000,12000];filters=hz.map((f,i)=>{const n=ctx.createBiquadFilter();n.type=i===0?'lowshelf':i===4?'highshelf':'peaking';n.frequency.value=f;n.Q.value=1;return n;});compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=1;source.connect(filters[0]);filters.forEach((f,i)=>f.connect(filters[i+1]||compressor));compressor.connect(ctx.destination);}
  function eq(){try{graph();ctx.resume();}catch(e){toast(e.message);return;}modal('ecualizador','5 bandas · tiempo real','<div class="eq-controls">'+['graves 60 hz','medios bajos 250 hz','medios 1 khz','medios altos 4 khz','agudos 12 khz'].map((x,i)=>'<label class="eq-band"><span>'+x+'</span><output id="eqout'+i+'">0 db</output><input type="range" min="-12" max="12" value="'+filters[i].gain.value+'" data-eq="'+i+'"></label>').join('')+'</div><div class="modal-footer"><button class="button button-secondary" data-extra="flat">plano</button><button class="button button-primary" data-extra="close">listo</button></div>');}
  async function lyrics(){const id=currentId();if(!id){toast('reproduce una canción primero.');return;}const t=(await allTracks()).find(x=>x.id===id);if(!t)return;modal('letras y notas',t.title,'<form id="extraTrackForm" data-id="'+esc(id)+'"><div class="form-field"><label>letra</label><textarea id="extraLyrics" rows="8">'+esc(t.lyrics)+'</textarea></div><div class="form-field"><label>notas personales</label><textarea id="extraNotes" rows="4">'+esc(t.notes)+'</textarea></div><p class="form-hint">se guardan solo en este navegador; no se publican en la biblioteca compartida.</p><div class="modal-footer"><button type="button" class="button button-secondary" data-extra="close">cancelar</button><button class="button button-primary">guardar</button></div></form>');}
  async function stats(){const n=Number(sessionStorage.getItem('dt-extra-play-seconds')||0),plays=Number(sessionStorage.getItem('dt-extra-plays')||0);const ts=await allTracks();modal('estadísticas','esta sesión de escucha','<div class="stats-row"><div class="stat-card"><strong>'+plays+'</strong><span>pistas iniciadas</span></div><div class="stat-card"><strong>'+Math.floor(n/60)+' min</strong><span>tiempo escuchado</span></div><div class="stat-card"><strong>'+ts.length+'</strong><span>pistas en biblioteca</span></div></div><p class="form-hint">el contador de sesión empieza desde que abres esta pestaña.</p>');}
  async function dupes(){const ts=await allTracks(),m=new Map();ts.forEach(t=>{const k=(t.title||'').trim().toLowerCase()+'|'+(t.artist||'').trim().toLowerCase();if(!m.has(k))m.set(k,[]);m.get(k).push(t);});const groups=[...m.values()].filter(g=>g.length>1);modal('detector de duplicados',groups.length+' grupos','<div class="modal-list">'+(groups.length?groups.map(g=>'<div class="modal-list-item"><span><strong>'+esc(g[0].title)+'</strong><small>'+esc(g[0].artist||'artista desconocido')+'</small></span><b>'+g.length+' copias</b></div>').join(''):'<p class="form-hint">no hay duplicados por título y artista.</p>')+'</div><p class="form-hint">solo detecta coincidencias; nunca borra archivos.</p>');}
  function timer(){const v=prompt('¿en cuántos minutos? (5 a 240)');const n=Number(v);if(v===null)return;if(!Number.isInteger(n)||n<5||n>240){toast('elige entre 5 y 240 minutos.');return;}clearTimeout(sleepId);sleepId=setTimeout(()=>{audio.pause();toast('temporizador terminado.');},n*60000);toast('temporizador activado: '+n+' min.');}
  function showCrossfadeSettings(){
    modal('crossfade real','mezcla dos canciones durante la transición',
      '<div class="form-field"><label><input id="crossfadeEnabled" type="checkbox" '+(crossfadeSettings.enabled?'checked':'')+'> activar crossfade automático</label><p class="form-hint">la canción que termina baja de volumen mientras la siguiente empieza y sube. ambas suenan al mismo tiempo.</p></div>'+
      '<div class="form-field"><label for="crossfadeDuration">duración de la mezcla: <strong id="crossfadeDurationValue">'+crossfadeSettings.duration+' segundos</strong></label><input id="crossfadeDuration" type="range" min="2" max="12" step="1" value="'+crossfadeSettings.duration+'"><p class="form-hint">se prepara la siguiente canción antes de que termine la actual.</p></div>'+
      '<div class="modal-footer"><button class="button button-primary" data-extra="close">listo</button></div>');
  }
  function discardPrepared(revoke = true){
    nextAudio.pause();
    nextAudio.removeAttribute('src');
    nextAudio.load();
    if(revoke && preparedUrl) URL.revokeObjectURL(preparedUrl);
    preparedUrl = null;
    prepared = null;
  }
  function cancelCrossfade(){
    if(committing) return;
    if(fadeTimer){clearInterval(fadeTimer);fadeTimer=null;}
    fading = false;
    window.__davixiniCrossfadeActive = false;
    discardPrepared(true);
    audio.volume = masterVolume;
  }
  function prepareNext(){
    if(committing || !crossfadeSettings.enabled || !audio.src || audio.paused || !window.DavixiniPlayback) return;
    const currentId = window.__davixiniCurrentTrackId || null;
    if(prepared && prepared.currentId === currentId) return;
    discardPrepared(true);
    const next = window.DavixiniPlayback.getNextForCrossfade();
    if(!next) return;
    prepared = {id:next.id,index:next.index,currentId};
    preparedUrl = URL.createObjectURL(next.blob);
    nextAudio.volume = 0;
    nextAudio.src = preparedUrl;
    nextAudio.load();
  }
  async function startCrossfade(){
    if(fading || committing || !prepared || !crossfadeSettings.enabled || audio.paused) return;
    if(nextAudio.readyState < 2) return;
    const plan = prepared;
    nextAudio.currentTime = 0;
    nextAudio.volume = 0;
    try {
      await nextAudio.play();
    } catch(error) {
      toast('el navegador bloqueó la segunda pista; se reproducirá el cambio normal.');
      discardPrepared(true);
      return;
    }
    if(!prepared || prepared.id !== plan.id) { nextAudio.pause(); return; }
    fading = true;
    window.__davixiniCrossfadeActive = true;
    fadeStartedAt = performance.now();
    fadeTimer = setInterval(updateCrossfade, 40);
  }
  function updateCrossfade(){
    if(!fading || committing) return;
    const progress = Math.min(1, (performance.now() - fadeStartedAt) / (crossfadeSettings.duration * 1000));
    audio.volume = masterVolume * (1 - progress);
    nextAudio.volume = masterVolume * progress;
    if(progress >= 1) finishCrossfade();
  }
  async function finishCrossfade(){
    if(!fading || committing || !prepared || !preparedUrl) return;
    committing = true;
    if(fadeTimer){clearInterval(fadeTimer);fadeTimer=null;}
    const plan = prepared;
    const url = preparedUrl;
    const resumeAt = nextAudio.currentTime;
    const targetVolume = masterVolume;
    try {
      await window.DavixiniPlayback.commitCrossfade(plan.index,plan.id,url,resumeAt,targetVolume);
      nextAudio.pause();
      nextAudio.removeAttribute('src');
      nextAudio.load();
      prepared = null;
      preparedUrl = null;
      fading = false;
      window.__davixiniCrossfadeActive = false;
      committing = false;
      prepareNext();
    } catch(error) {
      nextAudio.pause();
      discardPrepared(true);
      fading = false;
      window.__davixiniCrossfadeActive = false;
      committing = false;
      audio.volume = masterVolume;
      toast('no se pudo completar el crossfade: ' + (error.message || 'error'));
    }
  }
  function maybeStartCrossfade(){
    if(!crossfadeSettings.enabled || !prepared || fading || committing || audio.paused || !Number.isFinite(audio.duration)) return;
    const remaining = audio.duration - audio.currentTime;
    if(remaining <= crossfadeSettings.duration && remaining > 0.05 && nextAudio.readyState >= 2) startCrossfade();
  }
  function setMasterVolume(value){
    masterVolume = Math.min(1,Math.max(0,Number(value)||0));
    if(!fading && !committing) audio.volume = masterVolume;
  }
  window.DavixiniCrossfade = {cancel:cancelCrossfade,setMasterVolume};
  function normalize(){try{graph();ctx.resume();const on=compressor.ratio.value===1;compressor.threshold.value=on?-16:0;compressor.ratio.value=on?3:1;toast(on?'nivelador dinámico activado.':'nivelador desactivado.');}catch(e){toast(e.message);}}
  function ab(){if(!audio.src){toast('reproduce una canción primero.');return;}if(loopA===null||loopB!==null){loopA=audio.currentTime;loopB=null;loopOn=false;toast('punto A marcado. vuelve a pulsar para marcar B.');}else{loopB=audio.currentTime;if(loopB<=loopA){loopB=null;toast('B debe ir después de A.');return;}loopOn=true;toast('bucle A—B activado. vuelve a pulsar para reiniciar.');}}
  async function filtersTool(){const ts=await allTracks();modal('filtros avanzados','artista · género · año','<form id="extraFilterForm"><div class="form-grid"><div class="form-field full"><label>artista contiene</label><input id="fa"></div><div class="form-field"><label>género contiene</label><input id="fg"></div><div class="form-field"><label>año</label><input id="fy"></div></div><div class="modal-footer"><button type="button" class="button button-secondary" data-extra="close">cancelar</button><button class="button button-primary">filtrar</button></div></form><div id="extraFilterResults"></div>');}
  document.addEventListener('click',async e=>{const b=e.target.closest('[data-extra]');if(!b)return;const a=b.dataset.extra;
    if(a==='open')hub();else if(a==='eq')eq();else if(a==='lyrics'||a==='notes')await lyrics();else if(a==='stats')await stats();else if(a==='dupes')await dupes();else if(a==='timer')timer();else if(a==='crossfade')showCrossfadeSettings();else if(a==='normalize')normalize();else if(a==='ab')ab();else if(a==='filters')await filtersTool();else if(a==='reset'){loopA=loopB=null;loopOn=false;cancelCrossfade();clearTimeout(sleepId);if(compressor){compressor.ratio.value=1;compressor.threshold.value=0;}filters.forEach(f=>f.gain.value=0);toast('extras restablecidos.');}else if(a==='flat'){filters.forEach((f,i)=>{f.gain.value=0;const el=$('[data-eq="'+i+'"]');if(el)el.value=0;$('#eqout'+i).textContent='0 db';});}else if(a==='close')close();
  });
  document.addEventListener('input',e=>{
    const el=e.target.closest('[data-eq]');
    if(el&&filters[Number(el.dataset.eq)]){filters[Number(el.dataset.eq)].gain.value=Number(el.value);$('#eqout'+el.dataset.eq).textContent=el.value+' db';}
    if(e.target.id==='crossfadeDuration'){crossfadeSettings.duration=Number(e.target.value);$('#crossfadeDurationValue').textContent=crossfadeSettings.duration+' segundos';localStorage.setItem('davixini-crossfade-duration',String(crossfadeSettings.duration));}
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='crossfadeEnabled'){
      crossfadeSettings.enabled=e.target.checked;
      localStorage.setItem('davixini-crossfade-enabled',String(crossfadeSettings.enabled));
      if(crossfadeSettings.enabled) prepareNext(); else cancelCrossfade();
      toast(crossfadeSettings.enabled?'crossfade activado.':'crossfade desactivado.');
    }
  });
  document.addEventListener('submit',async e=>{if(e.target.id==='extraTrackForm'){e.preventDefault();await saveTrack(e.target.dataset.id,{lyrics:$('#extraLyrics').value,notes:$('#extraNotes').value});close();toast('letras y notas guardadas.');}if(e.target.id==='extraFilterForm'){e.preventDefault();const ts=await allTracks(),a=$('#fa').value.toLowerCase(),g=$('#fg').value.toLowerCase(),y=$('#fy').value;const found=ts.filter(t=>(!a||(t.artist||'').toLowerCase().includes(a))&&(!g||(t.genre||'').toLowerCase().includes(g))&&(!y||String(t.year||'')===y));$('#extraFilterResults').innerHTML='<p class="form-hint">'+found.length+' resultados</p>'+found.map(t=>'<p>'+esc(t.title)+' — '+esc(t.artist)+'</p>').join('');}});
  audio.addEventListener('play',()=>{sessionStorage.setItem('dt-extra-plays',String(Number(sessionStorage.getItem('dt-extra-plays')||0)+1));});
  audio.addEventListener('timeupdate',()=>{
    if(!audio.paused){
      const sec=Math.floor(audio.currentTime);
      const prev=Number(sessionStorage.getItem('dt-extra-last-second')||-1);
      if(sec>prev){
        sessionStorage.setItem('dt-extra-play-seconds',String(Number(sessionStorage.getItem('dt-extra-play-seconds')||0)+(sec-prev)));
        sessionStorage.setItem('dt-extra-last-second',String(sec));
      }
    }
    if(loopOn&&loopB!==null&&audio.currentTime>=loopB)audio.currentTime=loopA;
    maybeStartCrossfade();
  });
  audio.addEventListener('play',prepareNext);
  audio.addEventListener('loadedmetadata',prepareNext);
  nextAudio.addEventListener('canplay',maybeStartCrossfade);
  audio.addEventListener('ended',()=>{if(fading)finishCrossfade();});
  audio.addEventListener('pause',()=>{if(fading&&!committing)cancelCrossfade();});
  document.addEventListener('DOMContentLoaded',()=>{const button=document.createElement('button');button.className='nav-item settings-link';button.id='extraToolsButton';button.innerHTML='<span class="nav-icon">✦</span><span>centro de extras</span>';button.addEventListener('click',hub);const settings=$('#settingsButton');if(settings)settings.parentNode.insertBefore(button,settings);});
})();