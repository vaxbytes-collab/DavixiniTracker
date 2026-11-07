# davixiniTracker

Plataforma pública de streaming del Davixiniverso. Cualquier visitante puede descubrir artistas, consultar sus perfiles y discografías y escuchar el catálogo; solo el administrador puede crear o editar artistas, álbumes y canciones.

## Funciones

### Biblioteca
- Perfiles de artista independientes, con nombre y biografía; las canciones y álbumes pueden vincularse mediante un ID de perfil estable y mantienen compatibilidad con bibliotecas antiguas.
- Álbumes con portada, artista, año, género y descripción.
- Importación múltiple de archivos de audio y lectura de etiquetas ID3 habituales.
- Edición de título, artista, género, año y álbum de una pista.
- **Sustitución del audio de una pista existente** sin cambiar su título, nombre original, metadatos, portada, favoritos, álbum ni pertenencia a playlists.
- Las listas muestran el título musical, nunca el nombre técnico del archivo.
- Las canciones muestran primero la portada de su álbum en las listas y en el reproductor.
- Letras y notas por canción desde el centro de extras; las letras se incluyen al publicar el catálogo.
- Reordenación persistente de pistas en álbumes y playlists: arrastra el asa ⠿ para soltarlas antes o después de otra pista; en el menú de acciones también puedes subir o bajar una posición.
- Duplicar pistas, descargar el archivo local y eliminar canciones.
- Ordenación por título, artista, álbum, fecha de importación y duración.
- Exploración agrupada por artista y género.

### Reproductor
- Cola de reproducción editable.
- Aleatorio, repetición de cola o repetición de pista.
- Búsqueda global de artistas, álbumes, canciones y playlists; favoritos e historial.
- Enlaces compartibles para perfiles, álbumes y canciones.
- Resumen musical local con reproducciones, tiempo de escucha y canciones más escuchadas.
- Controles de volumen, progreso, anterior y siguiente.
- Reproductor inmersivo a pantalla completa con portada grande, fondo ambiental, visualizador animado y controles sincronizados con el reproductor compacto.
- Crossfade con preparación anticipada y conservación de la posición de la pista entrante al completar la mezcla.
- Atajos: espacio (reproducir/pausar), flechas izquierda/derecha (saltar 5 segundos), flechas arriba/abajo (volumen) y Ctrl/⌘ + K (buscar).

### Datos
- Almacenamiento en IndexedDB del navegador.
- Copias de seguridad que incluyen canciones, portadas, álbumes y playlists.
- Restauración de copias anteriores de Mi música y de davixiniTracker.
- PWA instalable y caché de interfaz para uso sin conexión cuando se aloja en HTTPS.

## Biblioteca compartida con Supabase

La web usa Supabase para servir una biblioteca compartida. Los visitantes pueden escuchar y consultar la colección, pero no pueden subir, sustituir, editar ni borrar contenido. La autorización real se aplica con Row Level Security (RLS) y políticas de Storage; ocultar botones en la interfaz no es la barrera de seguridad.

### Configuración inicial

1. Abre **Supabase → SQL Editor → New query** y ejecuta el contenido de `supabase-setup.sql`.
2. Ejecuta también `davixiniverso-artists-migration.sql` para crear la tabla segura de perfiles de artista.
3. En **Authentication → Settings** (o la configuración del proveedor Email), desactiva **Allow new users to sign up**. Después, en **Authentication → Users**, crea tu usuario de administrador.
4. Copia el UUID de ese usuario. En `supabase-setup.sql`, descomenta la consulta final, sustituye `PEGA-AQUI-EL-UUID-DE-TU-USUARIO` por el UUID y ejecútala en SQL Editor.
5. Abre davixiniTracker y pulsa **acceso admin**. Inicia sesión con ese usuario.
6. Crea álbumes e importa tus archivos desde tu navegador. Cuando termines, pulsa **publicar cambios**. A partir de ahí, la biblioteca estará disponible para visitantes.
7. Para sustituir audio o modificar la colección, inicia sesión como administrador, realiza los cambios y vuelve a publicar.

La URL del proyecto y la publishable key están en `supabase-config.js`. La publishable key está diseñada para usarse en el navegador; nunca añadas una `service_role` o secret key al repositorio. El bucket de medios es público para permitir la reproducción, así que los archivos que publiques podrán ser escuchados por cualquiera que visite la web.

La biblioteca local antigua de IndexedDB no se borra al activar Supabase. Si ya tenías canciones guardadas, expórtalas desde **Ajustes y copias** antes de migrar; después puedes restaurar esa copia con tu sesión de administrador y publicar la colección.

## Ejecutar

Puedes abrir `index.html` directamente en un navegador moderno. Para probar PWA y servicio offline, ejecuta:

```bash
python -m http.server 8000
```

Abre después http://localhost:8000.

## Publicar con GitHub Pages

1. Abre **Settings → Pages**.
2. En **Build and deployment**, selecciona **Deploy from a branch**.
3. Elige la rama `main` y la carpeta raíz `/`.
4. Guarda. No se requiere proceso de compilación.

## Privacidad y almacenamiento

- Los archivos se guardan en IndexedDB del navegador y no se transmiten a un servidor.
- La biblioteca pertenece al origen desde el que se abrió la aplicación. Los datos de `file://`, `localhost` y GitHub Pages son independientes.
- Usa **Ajustes y copias → Exportar biblioteca** para conservar una copia fuera del navegador.
- El espacio disponible depende de la cuota del navegador. Los archivos grandes pueden hacer que la copia JSON ocupe bastante más que los MP3 originales.
- La compatibilidad de reproducción depende del navegador y de los códecs del sistema. Que un archivo se pueda importar no garantiza que el navegador pueda decodificarlo.

## Formatos

La importación acepta MP3, M4A, AAC, OGG, OPUS, WAV, FLAC, WebM, MP4, AIFF y WMA. La compatibilidad efectiva de reproducción depende del navegador.

## Estructura del proyecto

- `index.html`: interfaz y controles.
- `styles.css`: identidad visual, tema claro/oscuro y diseño responsive.
- `app.js`: catálogo, perfiles de artista, reproductor, metadatos, importación y copias.
- `manifest.webmanifest`: instalación PWA.
- `sw.js`: caché de recursos de la interfaz.
- `icon.svg`: icono de davixiniTracker.

## Migración

El nombre de marca cambió de Mi música a davixiniTracker, pero se conserva el mismo almacén IndexedDB para que las bibliotecas locales existentes sigan disponibles en el mismo navegador y origen. La importación también reconoce copias JSON exportadas con el nombre anterior.


### Estadísticas y privacidad

Las reproducciones, favoritos, notas personales y el tiempo escuchado se guardan por pista en el navegador que los registra; esos datos no se publican en Supabase. El resumen musical no representa las escuchas de todos los visitantes ni transmite hábitos personales a Supabase. Los enlaces compartidos abren el perfil o álbum correspondiente; los enlaces de canción preparan la pista sin forzar la reproducción automática.
