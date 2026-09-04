// ===== Almacen de autores =====
// Los autores "de fabrica" viven como archivos en assets/authors/ (livianos,
// parte del repo). Los autores que el usuario agregue desde el navegador se
// guardan en localStorage como imagen en base64 (foto ya redimensionada),
// porque GitHub Pages es estatico y no puede escribir archivos nuevos en el
// repo. Ambos tipos conviven en la misma lista.

const AUTHORS_KEY = "pv_autores_v1";
const MAX_FOTO_LADO = 1000; // redimensiona fotos nuevas para no llenar el localStorage

const AUTORES_SEMILLA = [
  { id: "cesar-correa", nombre: "Cesar Correa", src: "assets/authors/Ccorrea.png", seed: true },
  { id: "elias-fonseca", nombre: "Elías Fonseca", src: "assets/authors/EFonseca.png", seed: true },
  { id: "jorge-enrique-robledo", nombre: "Jorge Enrique Robledo", src: "assets/authors/JRobledo.png", seed: true },
  { id: "arlex-arias", nombre: "Arlex Arías", src: "assets/authors/AArias.png", seed: true },
  { id: "saulo-lizarazo", nombre: "Saulo Lizarazo", src: "assets/authors/Llizarazo.png", seed: true },
  { id: "manuel-naranjo", nombre: "Manuel Naranjo", src: "assets/authors/MNaranjo.png", seed: true },
  { id: "william-lopez", nombre: "William López", src: "assets/authors/WLopez.png", seed: true },
];

function _slug(nombre) {
  return nombre
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "autor";
}

function cargarAutores() {
  let extra = [];
  try {
    extra = JSON.parse(localStorage.getItem(AUTHORS_KEY) || "[]");
  } catch (e) {
    extra = [];
  }
  return AUTORES_SEMILLA.concat(extra);
}

function guardarExtra(lista) {
  localStorage.setItem(AUTHORS_KEY, JSON.stringify(lista));
}

function agregarAutor(nombre, dataURL) {
  const lista = cargarAutores();
  const extra = lista.filter((a) => !a.seed);
  let id = _slug(nombre);
  const usados = new Set(lista.map((a) => a.id));
  let base = id, n = 2;
  while (usados.has(id)) { id = base + "-" + n; n++; }
  const nuevo = { id, nombre, src: dataURL, seed: false };
  extra.push(nuevo);
  guardarExtra(extra);
  return nuevo;
}

function borrarAutor(id) {
  const lista = cargarAutores();
  const extra = lista.filter((a) => !a.seed && a.id !== id);
  guardarExtra(extra);
}

// Redimensiona una imagen (File) a un dataURL PNG, lado maximo MAX_FOTO_LADO.
function fotoARecortada(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width: w, height: h } = img;
      const escala = Math.min(1, MAX_FOTO_LADO / Math.max(w, h));
      w = Math.round(w * escala);
      h = Math.round(h * escala);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}
