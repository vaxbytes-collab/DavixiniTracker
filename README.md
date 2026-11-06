# Mi música

Biblioteca musical personal hecha con HTML, CSS y JavaScript nativos. No usa frameworks, cuentas, publicidad, analítica ni servicios de música externos.

## Funciones

- Álbumes con título, artista, año, género, descripción y portada.
- Importación múltiple de MP3 y otros archivos de audio desde el dispositivo.
- Lectura de etiquetas ID3 (incluidas portadas incrustadas) cuando están disponibles.
- Edición de metadatos y organización de canciones entre álbumes.
- Favoritos, playlists personalizadas, cola de reproducción e historial.
- Reproductor con aleatorio, repetición, volumen y búsqueda global.
- Copias de seguridad que incluyen audio, portadas, álbumes y playlists; restauración desde JSON.
- Tema claro/oscuro, interfaz adaptable y atajos de teclado.
- PWA instalable y caché de la interfaz para uso sin conexión cuando se aloja en HTTPS.

## Ejecutar en local

Puedes abrir `index.html` directamente en un navegador moderno. Para probar la instalación PWA y el funcionamiento sin conexión, ejecuta:

```bash
python -m http.server 8000
```

Abre después http://localhost:8000.

## GitHub Pages

1. Abre **Settings → Pages** en este repositorio.
2. En **Build and deployment**, selecciona **Deploy from a branch**.
3. Elige la rama `main` y la carpeta raíz `/`.
4. Guarda los cambios. No hay proceso de compilación ni dependencias.

## Almacenamiento y privacidad

Los archivos de audio y las portadas se guardan en IndexedDB del navegador. No se envían a ningún servidor. Los datos pertenecen al navegador y al origen del sitio: una biblioteca abierta desde `file://`, `localhost` y GitHub Pages no se comparte automáticamente entre esos orígenes.

Usa **Ajustes y copias → Exportar biblioteca** para guardar una copia externa. La restauración reemplaza la biblioteca del origen actual por los datos de la copia seleccionada. Los archivos grandes pueden generar copias JSON voluminosas.

El espacio disponible depende de las cuotas del navegador. La reproducción de FLAC, AAC, OGG, WAV, M4A y otros formatos depende del navegador y del sistema. La importación de un archivo no garantiza que todos los códecs puedan reproducirse.

## Formatos admitidos

La importación admite MP3, M4A, AAC, OGG, OPUS, WAV, FLAC, WebM, MP4, AIFF y WMA. La compatibilidad real de reproducción depende del navegador y de los códecs instalados.

## Estructura

- `index.html`: estructura de la aplicación.
- `styles.css`: interfaz y diseño adaptable.
- `app.js`: biblioteca, almacenamiento local y reproductor.
- `manifest.webmanifest`: configuración de instalación PWA.
- `sw.js`: caché offline de los archivos de la interfaz.
- `icon.svg`: icono de la aplicación.
