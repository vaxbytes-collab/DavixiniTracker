# davixiniTracker

Biblioteca musical personal que funciona directamente en el navegador. Permite organizar archivos de audio en álbumes y playlists, explorar por artista o género y reproducir la colección sin subir los archivos a ningún servidor.

## Funciones

### Biblioteca
- Álbumes con portada, artista, año, género y descripción.
- Importación múltiple de archivos de audio y lectura de etiquetas ID3 habituales.
- Edición de título, artista, género, año y álbum de una pista.
- **Sustitución del archivo de audio de una pista existente**, conservando su identidad, favoritos y pertenencia a playlists.
- Duplicar pistas, descargar el archivo local y eliminar canciones.
- Ordenación por título, artista, álbum, fecha de importación y duración.
- Exploración agrupada por artista y género.

### Reproductor
- Cola de reproducción editable.
- Aleatorio, repetición de cola o repetición de pista.
- Búsqueda global, favoritos e historial.
- Controles de volumen, progreso, anterior y siguiente.
- Atajos: espacio (reproducir/pausar), flechas izquierda/derecha (saltar 5 segundos), flechas arriba/abajo (volumen) y Ctrl/⌘ + K (buscar).

### Datos
- Almacenamiento en IndexedDB del navegador.
- Copias de seguridad que incluyen canciones, portadas, álbumes y playlists.
- Restauración de copias anteriores de Mi música y de davixiniTracker.
- PWA instalable y caché de interfaz para uso sin conexión cuando se aloja en HTTPS.

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
- `app.js`: biblioteca, reproductor, metadatos, importación y copias.
- `manifest.webmanifest`: instalación PWA.
- `sw.js`: caché de recursos de la interfaz.
- `icon.svg`: icono de davixiniTracker.

## Migración

El nombre de marca cambió de Mi música a davixiniTracker, pero se conserva el mismo almacén IndexedDB para que las bibliotecas locales existentes sigan disponibles en el mismo navegador y origen. La importación también reconoce copias JSON exportadas con el nombre anterior.
