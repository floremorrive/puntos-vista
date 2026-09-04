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

## Agregar un autor nuevo (sin tocar el código)

Pulse **➕ Agregar autor nuevo**, escriba el nombre y elija la foto (recorte
de pecho hacia arriba, centrado, ojalá sin fondo ni texto encima). El programa
la convierte a blanco y negro automáticamente. El autor queda guardado en
**este navegador** (localStorage) y aparece disponible de inmediato en la
lista, marcado con "✎". No hace falta editar ningún archivo ni volver a
publicar la página.

Nota: como es una página estática (GitHub Pages), un autor agregado en un
computador o navegador no aparece automáticamente en otro. Los 7 autores
iniciales (Cesar Correa, Elías Fonseca, Jorge Enrique Robledo, Arlex Arías,
Saulo Lizarazo, Manuel Naranjo, William López) sí vienen incluidos para todos,
porque son parte del sitio publicado.

## Estructura del proyecto

```
index.html          interfaz
css/style.css        estilos
js/render.js          motor de dibujo (canvas): plantillas roja/blanca,
                       negrilla, autoajuste de tamaño, comillas
js/authors-store.js    lista de autores + guardado en localStorage
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
