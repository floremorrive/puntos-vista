// ===== Almacen de autores =====
// Los autores "de fabrica" viven como archivos en assets/authors/ (parte del
// repo). Los que el usuario agrega, y los cambios que haga a los de fabrica
// (renombrar, cambiar la foto, quitarlos de la lista), se guardan en
// localStorage, porque GitHub Pages es estatico y no puede escribir archivos
// nuevos en el repo.

const AUTHORS_KEY = "pv_autores_v1";      // autores agregados por el usuario
const OVERRIDES_KEY = "pv_overrides_v1";  // cambios a autores de fabrica: {id:{nombre?,src?}}
const HIDDEN_KEY = "pv_ocultos_v1";       // ids de autores de fabrica quitados de la lista

const AUTORES_SEMILLA = [
  { id: "cesar-correa", nombre: "Cesar Correa", src: "assets/authors/Ccorrea.png", seed: true },
  { id: "elias-fonseca", nombre: "Elías Fonseca", src: "assets/authors/EFonseca.png", seed: true },
  { id: "jorge-enrique-robledo", nombre: "Jorge Enrique Robledo", src: "assets/authors/JRobledo.png", seed: true },
  { id: "arlex-arias", nombre: "Arlex Arías", src: "assets/authors/AArias.png", seed: true },
  { id: "saulo-lizarazo", nombre: "Saulo Lizarazo", src: "assets/authors/Llizarazo.png", seed: true },
  { id: "manuel-naranjo", nombre: "Manuel Naranjo", src: "assets/authors/MNaranjo.png", seed: true },
  { id: "william-lopez", nombre: "William López", src: "assets/authors/WLopez.png", seed: true },
];

function _leer(key, vacio) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? vacio : v;
  } catch (e) {
    return vacio;
  }
}
function _guardar(key, valor) {
  localStorage.setItem(key, JSON.stringify(valor));
}

function _slug(nombre) {
  return nombre
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "autor";
}

function cargarAutores() {
  const extra = _leer(AUTHORS_KEY, []);
  const over = _leer(OVERRIDES_KEY, {});
  const ocultos = new Set(_leer(HIDDEN_KEY, []));
  const semilla = AUTORES_SEMILLA
    .filter((a) => !ocultos.has(a.id))
    .map((a) => Object.assign({}, a, over[a.id] || {}));
  return semilla.concat(extra);
}

function agregarAutor(nombre, dataURL) {
  const lista = cargarAutores();
  const extra = _leer(AUTHORS_KEY, []);
  const usados = new Set(lista.map((a) => a.id).concat(AUTORES_SEMILLA.map((a) => a.id)));
  let id = _slug(nombre);
  const base = id;
  let n = 2;
  while (usados.has(id)) { id = base + "-" + n; n++; }
  const nuevo = { id, nombre, src: dataURL, seed: false };
  extra.push(nuevo);
  _guardar(AUTHORS_KEY, extra);
  return nuevo;
}

// cambios: { nombre?, src? }
function actualizarAutor(id, cambios) {
  const extra = _leer(AUTHORS_KEY, []);
  const i = extra.findIndex((a) => a.id === id);
  if (i >= 0) {
    Object.assign(extra[i], cambios);
    _guardar(AUTHORS_KEY, extra);
    return;
  }
  const over = _leer(OVERRIDES_KEY, {});
  over[id] = Object.assign(over[id] || {}, cambios);
  _guardar(OVERRIDES_KEY, over);
}

function borrarAutor(id) {
  const extra = _leer(AUTHORS_KEY, []);
  if (extra.some((a) => a.id === id)) {
    _guardar(AUTHORS_KEY, extra.filter((a) => a.id !== id));
    return;
  }
  const ocultos = _leer(HIDDEN_KEY, []);
  if (!ocultos.includes(id)) ocultos.push(id);
  _guardar(HIDDEN_KEY, ocultos);
}
