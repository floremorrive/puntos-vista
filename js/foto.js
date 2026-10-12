// ===== Procesado de la foto del autor =====
// 1) redimensiona, 2) quita el fondo si la foto lo trae (IA en el navegador;
// si no se puede cargar, un recorte por color como plan B), 3) recorta los
// margenes transparentes para que la cabeza quede arriba como en el diseño.

const MAX_FOTO_LADO = 1000;
const IMGLY_URL = "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm";
let _imglyPromise = null;

function cargarImagenDesde(origen) {
  // origen: File/Blob o string (url / dataURL)
  return new Promise((resolve, reject) => {
    const img = new Image();
    let url = null;
    img.onload = () => { if (url) URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject;
    if (typeof origen === "string") img.src = origen;
    else { url = URL.createObjectURL(origen); img.src = url; }
  });
}

function imagenACanvas(img, maxLado) {
  let w = img.naturalWidth, h = img.naturalHeight;
  const esc = Math.min(1, maxLado / Math.max(w, h));
  w = Math.max(1, Math.round(w * esc));
  h = Math.max(1, Math.round(h * esc));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(img, 0, 0, w, h);
  return c;
}

// true si la imagen ya trae transparencia real en los bordes (ya sin fondo)
function yaTieneTransparencia(canvas) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  let total = 0, transp = 0;
  const paso = Math.max(1, Math.floor(Math.min(w, h) / 60));
  const mira = (x, y) => { total++; if (d[(y * w + x) * 4 + 3] < 250) transp++; };
  for (let x = 0; x < w; x += paso) { mira(x, 0); mira(x, h - 1); }
  for (let y = 0; y < h; y += paso) { mira(0, y); mira(w - 1, y); }
  return transp / total > 0.5;
}

// Plan B: borra el color de fondo que toca los bordes (inundacion desde fuera)
function quitarFondoPorColor(canvas) {
  const { width: w, height: h } = canvas;
  const ctx = canvas.getContext("2d");
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;
  // color de referencia: promedio de las 4 esquinas
  const esq = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
  let r = 0, g = 0, b = 0;
  for (const [x, y] of esq) { const i = (y * w + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  r /= 4; g /= 4; b /= 4;
  const TOL = 48;
  const cerca = (i) => Math.hypot(d[i] - r, d[i + 1] - g, d[i + 2] - b) < TOL;
  const visto = new Uint8Array(w * h);
  const pila = [];
  const empuja = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (visto[p] || !cerca(p * 4)) return;
    visto[p] = 1; pila.push(p);
  };
  for (let x = 0; x < w; x++) { empuja(x, 0); empuja(x, h - 1); }
  for (let y = 0; y < h; y++) { empuja(0, y); empuja(w - 1, y); }
  while (pila.length) {
    const p = pila.pop();
    const x = p % w, y = (p / w) | 0;
    empuja(x + 1, y); empuja(x - 1, y); empuja(x, y + 1); empuja(x, y - 1);
  }
  for (let p = 0; p < w * h; p++) if (visto[p]) d[p * 4 + 3] = 0;
  // suaviza el borde: pixeles vecinos del fondo borrado quedan semitransparentes
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x;
    if (visto[p]) continue;
    if (visto[p - 1] || visto[p + 1] || visto[p - w] || visto[p + w]) d[p * 4 + 3] = 150;
  }
  ctx.putImageData(im, 0, 0);
  return canvas;
}

async function quitarFondoIA(canvas, onProgreso) {
  if (!_imglyPromise) _imglyPromise = import(IMGLY_URL);
  const mod = await _imglyPromise;
  const removeBackground = mod.removeBackground || mod.default;
  const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
  const salida = await removeBackground(blob, {
    output: { format: "image/png" },
    progress: (key, actual, total) => {
      if (onProgreso && total) onProgreso(key, actual / total);
    },
  });
  const img = await cargarImagenDesde(salida);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext("2d").drawImage(img, 0, 0);
  return c;
}

// Recorta la transparencia sobrante: la parte de arriba y los lados quedan
// pegados a la persona, y se rellena a los lados hasta una proporcion minima
// de 1:1 para que el tamaño de la persona sea parecido al de los demas autores.
function recortarMargenes(canvas) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 20) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return canvas; // todo transparente: no tocar
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const lienzoW = Math.max(cw, ch);
  const out = document.createElement("canvas");
  out.width = lienzoW; out.height = ch;
  out.getContext("2d").drawImage(canvas, x0, y0, cw, ch, (lienzoW - cw) / 2, 0, cw, ch);
  return out;
}

// Punto de entrada. origen: File | dataURL. opts: {quitarFondo, onEstado}
async function procesarFotoAutor(origen, opts) {
  opts = opts || {};
  const say = opts.onEstado || function () {};
  const img = await cargarImagenDesde(origen);
  let canvas = imagenACanvas(img, MAX_FOTO_LADO);
  let sinFondo = false;

  if (opts.quitarFondo) {
    if (yaTieneTransparencia(canvas)) {
      sinFondo = true; // ya viene recortada
    } else {
      try {
        say("Quitando el fondo… la primera vez descarga el modelo (puede tardar un minuto).");
        canvas = await quitarFondoIA(canvas, (k, f) => {
          say("Quitando el fondo… " + Math.round(f * 100) + "%");
        });
        sinFondo = true;
      } catch (e) {
        console.warn("IA de fondo no disponible, uso recorte por color", e);
        say("Quitando el fondo (modo básico)…");
        canvas = quitarFondoPorColor(canvas);
        sinFondo = true;
      }
    }
    if (sinFondo) canvas = recortarMargenes(canvas);
  }
  return canvas.toDataURL("image/png");
}
