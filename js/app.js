// ===== Interfaz "Puntos de Vista" =====
const state = {
  autores: [],
  autorId: null,
  imgCache: new Map(), // id -> HTMLImageElement
};

const $ = (sel) => document.querySelector(sel);

const cbAutor = $("#autor");
const txtRoja = $("#texto-roja");
const txtBlanca = $("#texto-blanca");
const cntRoja = $("#contador-roja");
const cntBlanca = $("#contador-blanca");
const canvasRoja = $("#preview-roja");
const canvasBlanca = $("#preview-blanca");
const btnGenerar = $("#btn-generar");
const btnAgregar = $("#btn-agregar-autor");
const estado = $("#estado");

function contarPalabras(txt) {
  const limpio = txt.replace(/\*\*/g, "");
  return (limpio.trim().match(/\S+/g) || []).length;
}

function actualizarContador(txt, span) {
  const n = contarPalabras(txt.value);
  span.textContent = n + " palabras";
  span.classList.toggle("ok", n >= 40 && n <= 50);
  span.classList.toggle("aviso", n > 50);
}

function getAutorImg(autor) {
  if (state.imgCache.has(autor.id)) return state.imgCache.get(autor.id);
  const p = loadImg(autor.src);
  state.imgCache.set(autor.id, p);
  return p;
}

function refrescarSelectAutores() {
  state.autores = cargarAutores();
  const actual = cbAutor.value;
  cbAutor.innerHTML = "";
  for (const a of state.autores) {
    const op = document.createElement("option");
    op.value = a.id;
    op.textContent = a.nombre;
    cbAutor.appendChild(op);
  }
  if (actual && state.autores.some((a) => a.id === actual)) cbAutor.value = actual;
  else if (state.autores.length) cbAutor.value = state.autores[0].id;
}

async function repintar() {
  const autor = state.autores.find((a) => a.id === cbAutor.value);
  if (!autor) return;
  let img = null;
  try {
    img = await getAutorImg(autor);
  } catch (e) {
    console.error("No se pudo cargar la foto del autor", e);
  }
  renderPuntosVista(canvasRoja.getContext("2d"), {
    template: "roja",
    texto: txtRoja.value,
    autorNombre: autor.nombre,
    autorImg: img,
  });
  renderPuntosVista(canvasBlanca.getContext("2d"), {
    template: "blanca",
    texto: txtBlanca.value,
    autorNombre: autor.nombre,
    autorImg: img,
  });
}

let _debounce = null;
function pedirRepintado() {
  clearTimeout(_debounce);
  _debounce = setTimeout(repintar, 120);
}

function descargarCanvas(canvas, nombreArchivo) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve();
    }, "image/png");
  });
}

function slugArchivo(nombre) {
  return nombre
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

async function generar() {
  const autor = state.autores.find((a) => a.id === cbAutor.value);
  if (!autor) { alert("Seleccione un autor."); return; }
  if (!txtRoja.value.trim() || !txtBlanca.value.trim()) {
    alert("Escriba el texto de las dos imágenes.");
    return;
  }
  btnGenerar.disabled = true;
  btnGenerar.textContent = "Generando…";
  await repintar();
  const base = slugArchivo(autor.nombre);
  await descargarCanvas(canvasRoja, base + "_roja.png");
  await descargarCanvas(canvasBlanca, base + "_blanca.png");
  btnGenerar.disabled = false;
  btnGenerar.textContent = "GENERAR LAS 2 IMÁGENES";
  estado.textContent = "✓ Imágenes descargadas: " + base + "_roja.png / " + base + "_blanca.png";
}

// --------------------------------------------------------- agregar / editar autor
const modal = $("#modal-autor");
const modalTitulo = $("#modal-titulo");
const inpNombre = $("#nuevo-nombre");
const inpFoto = $("#nuevo-foto");
const chkFondo = $("#nuevo-quitar-fondo");
const imgPrevia = $("#nuevo-previa");
const modalEstado = $("#modal-estado");
const btnGuardarAutor = $("#btn-guardar-autor");
const btnCancelarAutor = $("#btn-cancelar-autor");
const btnEliminarAutor = $("#btn-eliminar-autor");
const btnEditar = $("#btn-editar-autor");

let editandoId = null; // null = agregando

function abrirModal(autor) {
  editandoId = autor ? autor.id : null;
  modalTitulo.textContent = autor ? "Editar autor" : "Agregar autor";
  inpNombre.value = autor ? autor.nombre : "";
  inpFoto.value = "";
  chkFondo.checked = true;
  modalEstado.textContent = "";
  btnEliminarAutor.hidden = !autor;
  if (autor) { imgPrevia.src = autor.src; imgPrevia.hidden = false; }
  else { imgPrevia.removeAttribute("src"); imgPrevia.hidden = true; }
  modal.hidden = false;
  inpNombre.focus();
}
function cerrarModal() { modal.hidden = true; }

function autorSeleccionado() {
  return state.autores.find((a) => a.id === cbAutor.value);
}

btnAgregar.addEventListener("click", () => abrirModal(null));
btnEditar.addEventListener("click", () => {
  const a = autorSeleccionado();
  if (a) abrirModal(a);
});
btnCancelarAutor.addEventListener("click", cerrarModal);
modal.addEventListener("click", (e) => { if (e.target === modal) cerrarModal(); });

inpFoto.addEventListener("change", () => {
  const f = inpFoto.files[0];
  if (!f) return;
  imgPrevia.src = URL.createObjectURL(f);
  imgPrevia.hidden = false;
});

btnGuardarAutor.addEventListener("click", async () => {
  const nombre = inpNombre.value.trim();
  const archivo = inpFoto.files[0];
  const actual = editandoId ? state.autores.find((a) => a.id === editandoId) : null;
  if (!nombre) { alert("Escriba el nombre del autor."); return; }
  if (!actual && !archivo) { alert("Seleccione una foto."); return; }

  btnGuardarAutor.disabled = true;
  btnEliminarAutor.disabled = true;
  try {
    // foto nueva (si eligio una) o la actual (si solo quiere quitarle el fondo)
    let dataURL = null;
    if (archivo || (actual && chkFondo.checked)) {
      dataURL = await procesarFotoAutor(archivo || actual.src, {
        quitarFondo: chkFondo.checked,
        onEstado: (t) => { modalEstado.textContent = t; },
      });
    }
    let id;
    if (actual) {
      const cambios = { nombre };
      if (dataURL) cambios.src = dataURL;
      actualizarAutor(actual.id, cambios);
      state.imgCache.delete(actual.id);
      id = actual.id;
    } else {
      id = agregarAutor(nombre, dataURL).id;
    }
    refrescarSelectAutores();
    cbAutor.value = id;
    cerrarModal();
    await repintar();
  } catch (e) {
    alert("No se pudo procesar la foto.");
    console.error(e);
  }
  modalEstado.textContent = "";
  btnGuardarAutor.disabled = false;
  btnEliminarAutor.disabled = false;
});

btnEliminarAutor.addEventListener("click", async () => {
  const a = editandoId && state.autores.find((x) => x.id === editandoId);
  if (!a) return;
  if (!confirm("¿Eliminar a " + a.nombre + " de la lista?")) return;
  borrarAutor(a.id);
  state.imgCache.delete(a.id);
  refrescarSelectAutores();
  cerrarModal();
  await repintar();
});

// --------------------------------------------------------- eventos
txtRoja.addEventListener("input", () => { actualizarContador(txtRoja, cntRoja); pedirRepintado(); });
txtBlanca.addEventListener("input", () => { actualizarContador(txtBlanca, cntBlanca); pedirRepintado(); });
cbAutor.addEventListener("change", pedirRepintado);
btnGenerar.addEventListener("click", generar);

// --------------------------------------------------------- arranque
(async function init() {
  estado.textContent = "Cargando…";
  await initRenderAssets();
  refrescarSelectAutores();

  // modo captura para verificacion visual: ?captura=roja|blanca&autor=ID&roja=...&blanca=...
  const q = new URLSearchParams(location.search);
  if (q.has("captura")) {
    document.body.classList.add("solo-captura");
    if (q.get("autor")) cbAutor.value = q.get("autor");
    if (q.get("roja")) txtRoja.value = q.get("roja");
    if (q.get("blanca")) txtBlanca.value = q.get("blanca");
    const cual = q.get("captura");
    if (cual === "roja") canvasBlanca.closest(".preview-box").classList.add("oculto");
    if (cual === "blanca") canvasRoja.closest(".preview-box").classList.add("oculto");
  }

  actualizarContador(txtRoja, cntRoja);
  actualizarContador(txtBlanca, cntBlanca);
  await repintar();
  estado.textContent = "";
})();
