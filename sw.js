/* davixiniTracker · service worker
 * - Aplicación (HTML, CSS, JS, iconos): se sirve desde caché y se actualiza en segundo plano.
 * - Datos de Supabase (REST): red primero; sin conexión se usa la última respuesta guardada.
 * - Portadas e imágenes: caché con límite de entradas.
 * - Audio: nunca se guarda (son archivos grandes con peticiones por rango); va siempre a la red.
 */
const V = 'dt-v4';
const IMG = 'dt-img-v4', DATA = 'dt-data-v4', IMG_MAX = 150;
const SHELL = ['./', 'index.html', 'styles.css', 'supabase-config.js', 'manifest.webmanifest', 'icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/core.js', 'js/settings.js', 'js/data.js', 'js/player.js', 'js/stats.js', 'js/ui.js', 'js/views.js', 'js/views-stats.js', 'js/views-settings.js', 'js/main.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => ![V, IMG, DATA].includes(x)).map(x => caches.delete(x)))).then(() => self.clients.claim())));

async function trim(name, max) {
  const c = await caches.open(name), keys = await c.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await c.delete(k);
}
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin === location.origin) {
    if (u.pathname.includes('admin')) return;
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(r, { ignoreSearch: true });
      const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit || c.match('index.html'));
      return hit || net;
    }));
    return;
  }
  if (u.pathname.includes('/rest/v1/')) {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(DATA).then(c => c.put(r, copy)); } return res; }).catch(() => caches.open(DATA).then(c => c.match(r)).then(h => h || Response.error())));
    return;
  }
  if (u.pathname.includes('/storage/v1/object/public/') && r.destination === 'image') {
    e.respondWith(caches.open(IMG).then(async c => {
      const hit = await c.match(r); if (hit) return hit;
      try { const res = await fetch(r); if (res.ok || res.type === 'opaque') { c.put(r, res.clone()); trim(IMG, IMG_MAX); } return res; } catch (err) { return Response.error(); }
    }));
  }
});
