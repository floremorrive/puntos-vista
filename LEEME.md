# Generador "Puntos de Vista" — La Tribuna

App web (sin instalación, funciona en GitHub Pages) para generar las 2 imágenes
de la serie **Puntos de Vista** (roja y blanca, 1080×1350) a partir de un
autor y una cita.

## Cómo usarlo

1. Abrir la página del generador en el navegador.
2. Elegir el **autor** en la lista, o pulsar **➕ Agregar autor nuevo** si no
   está (ver abajo).
3. Escribir el texto de la imagen **ROJA** y el de la **BLANCA**.
   - Negrilla: encierre las palabras entre `**dobles asteriscos**`.
     Ejemplo: `Gloria Arizabaleta firmó la **suspensión de Petro**, pero...`
   - Ideal: 40 a 50 palabras (el contador lo indica).
4. Revisar la vista previa a la derecha (se actualiza mientras se escribe).
5. Pulsar **GENERAR LAS 2 IMÁGENES**: descarga los 2 archivos PNG
   (`nombre_roja.png` y `nombre_blanca.png`) al navegador.

El tamaño de letra de la cita se ajusta solo para que el texto nunca se
desborde, y la comilla de cierre queda siempre pegada al final del último
renglón.

## Agregar, editar o eliminar autores (sin tocar el código)

- **➕ Agregar autor nuevo**: escriba el nombre y elija la foto.
- **✎ Editar autor**: cambia el nombre, reemplaza la foto o quita el fondo de la
  foto actual. También permite **Eliminar** al autor de la lista. Funciona con
  cualquier autor, incluidos los 7 iniciales.
- **Quitar el fondo automáticamente** (activado por defecto): si la foto trae
  fondo, se lo quita con IA en el navegador y recorta el sobrante para que la
  cabeza quede arriba. La primera vez descarga el modelo (puede tardar hasta un
  minuto); luego es más rápido. Si la foto ya viene sin fondo (PNG transparente)
  se respeta tal cual. Si la IA no puede cargar, usa un recorte básico por color.
- La foto se convierte a blanco y negro automáticamente.

Los cambios se guardan en **este navegador** (localStorage); un autor agregado o
editado en un computador no aparece en otro.

## Estructura del proyecto

```
index.html          interfaz
css/style.css        estilos
js/render.js          motor de dibujo (canvas): plantillas roja/blanca,
                       negrilla, autoajuste de tamaño, comillas
js/authors-store.js    lista de autores, ediciones y guardado en localStorage
js/foto.js             procesado de la foto: quitar fondo, recortar
js/app.js              interfaz: eventos, vista previa, descarga
assets/fonts/           Rajdhani Regular/Bold (SIL OFL)
assets/img/             logo "La Tribuna" y comilla (recortes en blanco,
                         se tiñen del color de cada plantilla)
assets/authors/         fotos de los 7 autores iniciales
```

## Actualizar la página publicada

```bash
git add -A
git commit -m "..."
git push
```

GitHub Pages redespliega solo, en menos de un minuto.
