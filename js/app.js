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
    op.textContent = a.nombre + (a.seed ? "" : "  ✎");
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

// --------------------------------------------------------- agregar autor
const modal = $("#modal-autor");
const inpNombre = $("#nuevo-nombre");
const inpFoto = $("#nuevo-foto");
const btnGuardarAutor = $("#btn-guardar-autor");
const btnCancelarAutor = $("#btn-cancelar-autor");

function abrirModal() {
  inpNombre.value = "";
  inpFoto.value = "";
  modal.hidden = false;
  inpNombre.focus();
}
function cerrarModal() { modal.hidden = true; }

btnAgregar.addEventListener("click", abrirModal);
btnCancelarAutor.addEventListener("click", cerrarModal);
modal.addEventListener("click", (e) => { if (e.target === modal) cerrarModal(); });

btnGuardarAutor.addEventListener("click", async () => {
  const nombre = inpNombre.value.trim();
  const archivo = inpFoto.files[0];
  if (!nombre) { alert("Escriba el nombre del autor."); return; }
  if (!archivo) { alert("Seleccione una foto."); return; }
  btnGuardarAutor.disabled = true;
  try {
    const dataURL = await fotoARecortada(archivo);
    const nuevo = agregarAutor(nombre, dataURL);
    refrescarSelectAutores();
    cbAutor.value = nuevo.id;
    cerrarModal();
    await repintar();
  } catch (e) {
    alert("No se pudo procesar la foto.");
    console.error(e);
  }
  btnGuardarAutor.disabled = false;
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
