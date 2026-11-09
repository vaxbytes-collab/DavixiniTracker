# davixiniTracker

La música del Davixiniverso. Los visitantes escuchan artistas, álbumes y canciones; solo el administrador publica contenido. Sin proceso de compilación: HTML, CSS y JavaScript sin dependencias, publicado con GitHub Pages.

## Qué hay

**Web pública** (`index.html`)

- Inicio personalizable, Explorar, Buscar (agrupado, con búsquedas recientes), Biblioteca, Canciones (orden, filtro, selección múltiple), Álbumes, Artistas, Listas, Favoritos, Historial, Estadísticas y Davixini Wrapped.
- Reproductor persistente con **crossfade real** (dos elementos de audio y curva de potencia constante), cola editable (arrastrar, subir/bajar, quitar, guardar como lista), aleatorio, repetición, temporizador de apagado, reproductor compacto y reproductor ampliado con letra, créditos y álbum.
- La sesión de reproducción (cola, canción, posición, aleatorio, repetición) se restaura al volver a entrar.
- Ajustes: tema, acento, fondo, densidad, forma y tamaño de portadas, escala, estilo del reproductor, crossfade y duración, seis transiciones visuales con vista previa, duración y reducción de movimiento. Todo se guarda en el navegador.
- Móvil: navegación inferior, reproductor compacto y pantalla de reproducción propia.
- PWA: instalable, caché de la aplicación, de portadas (con límite) y de la última respuesta de datos (arranca sin conexión). El audio nunca se guarda en caché.

**Administración** (`admin.html`): inicio de sesión, subida de audio con progreso real y validación, edición de canciones, álbumes y artistas (créditos, letra, notas, imagen, orden de pistas), operaciones múltiples, borrado con confirmación y una pestaña de revisión (duplicados y metadatos incompletos).

## Qué se guarda dónde

| Dato | Dónde |
|---|---|
| Canciones, álbumes, artistas, portadas, audio | Supabase (público lectura, escritura solo administradores) |
| Ajustes, favoritos, listas, historial, estado de reproducción | `localStorage` de cada navegador |

Por eso las estadísticas y Wrapped son **del navegador donde escuchas**. Pueden exportarse e importarse desde Ajustes → Datos. Una lista se comparte con un enlace (contiene los identificadores de sus canciones).

## Configuración

1. Ejecuta `supabase-setup.sql` y después `davixiniverso-artists-migration.sql` en Supabase → SQL Editor. **Esta versión no necesita ningún cambio de esquema**: los campos nuevos (`credits`, `lyrics`, `notes`, `imagePath`) viven dentro de las columnas `jsonb` existentes.
2. Desactiva el registro público, crea tu usuario y añade su UUID a `library_admins` (último paso de `supabase-setup.sql`).
3. Publica con GitHub Pages (rama `main`, carpeta raíz).
4. Entra en `/admin.html` para subir música.

La publishable key de `supabase-config.js` es pública por diseño; la seguridad real está en RLS. Nunca añadas una `service_role` al repositorio.

## Estructura

```
index.html  styles.css  sw.js  manifest.webmanifest
js/core.js            utilidades, iconos, menús, diálogos
js/settings.js        preferencias y transiciones visuales
js/data.js            carga de Supabase, favoritos, listas, historial
js/player.js          motor de audio, crossfade, cola, persistencia
js/stats.js           cálculo de estadísticas
js/ui.js              componentes, reproductor visible, panel contextual
js/views*.js          páginas
js/main.js            enrutado, eventos, atajos, arranque
admin.html admin.css admin.js
```

## Límites conocidos

- **iOS/Safari en iPhone** no permite fijar el volumen de un elemento de audio: ahí las canciones se encadenan sin mezcla (la interfaz lo avisa). No se ha probado en Safari.
- Los archivos de más de 50 MB no pueden subirse (límite del bucket); la administración lo indica.
- Los formatos que reproduce el navegador dependen del navegador (FLAC funciona en los principales).
- El crossfade necesita que la siguiente canción esté precargada; en conexiones muy lentas la canción termina con normalidad y la siguiente empieza sin mezcla.
- Con la pestaña en segundo plano el navegador puede espaciar los temporizadores; la mezcla se mantiene pero con menos pasos de volumen.
