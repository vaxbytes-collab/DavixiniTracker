# davixiniTracker

La música del Davixiniverso. Los visitantes escuchan artistas, álbumes y canciones; solo el administrador publica contenido.

- **Web pública** (`index.html`): inicio, canciones por género, álbumes, artistas, búsqueda, me gusta (guardado en el navegador), cola, aleatorio, repetición, controles del sistema (Media Session), atajos (espacio, ←/→, `/`) y enlaces compartibles a álbumes, artistas y canciones. La música se reproduce en streaming desde Supabase Storage: no se descarga la biblioteca.
- **Administración** (`admin.html`): inicio de sesión, subida de canciones (varias a la vez), creación de artistas y álbumes con portada, renombrar y borrar. Todo se escribe directamente en Supabase.

## Configuración

1. Ejecuta `supabase-setup.sql` y después `davixiniverso-artists-migration.sql` en Supabase → SQL Editor.
2. Desactiva el registro público, crea tu usuario y añade su UUID a `library_admins` (último paso de `supabase-setup.sql`).
3. Publica con GitHub Pages (rama `main`, carpeta raíz). No hay proceso de compilación.
4. Entra en `/admin.html` para subir música.

La publishable key de `supabase-config.js` es pública por diseño; la seguridad real está en RLS. Nunca añadas una `service_role` al repositorio.
