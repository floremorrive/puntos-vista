// ===== Motor de render "Puntos de Vista" (canvas 1080 x 1350) =====
const W = 1080, H = 1350;
const LINE_FACTOR = 1.20;

const FOTO_ANCHO = 800;
const FOTO_TOP = 643;
const GAP_FOTO = 24;   // separacion entre el nombre y la foto
const GAP_CITA = 16;   // separacion entre la cita y el nombre

const CITA_MAX_PT = 48;
const CITA_MIN_PT = 44;
const CITA_FLOOR_PT = 30; // piso de seguridad si el texto es demasiado largo
const NAME_PT = 44;

const QUOTE_OPEN_H = 96;
const QUOTE_CLOSE_H = 54;

const TEMPLATES = {
  roja: {
    boxX: 147.6, boxY: 241.1, boxW: 824.4,
    nameX: 719.6, nameW: 323.4,
    quoteColor: "#FFFFFF", nameColor: "#FFFFFF",
    pillFill: "#F2F2F2", pillText: "#99564D",
    logoTint: "#FFFFFF", logoX: 725.4, logoY: 57.8, logoW: 245.3, logoH: 87.1,
    pillX: 84.0, pillY: 87.1, pillW: 342.0, pillH: 57.3,
    quoteMarkTint: "#FFFFFF",
    urlX: 286.8, urlY: 1230.9, urlW: 501.6, urlColor: "#99564D",
    border: false,
  },
  blanca: {
    boxX: 113.1, boxY: 230.0, boxW: 864.9,
    nameX: 658.7, nameW: 327.5,
    quoteColor: "#272624", nameColor: "#99564D",
    pillFill: "#99564D", pillText: "#FFFFFF",
    logoTint: "#8A3D33", logoX: 36.0, logoY: 57.1, logoW: 277.1, logoH: 102.5,
    pillX: 660.0, pillY: 87.1, pillW: 343.4, pillH: 57.3,
    quoteMarkTint: "#8A3D33",
    urlX: 293.9, urlY: 1173.1, urlW: 501.6, urlColor: "#99564D",
    border: true,
  },
};

const FONT_REG = "Rajdhani";
const FONT_BOLD_WEIGHT = "700";

// --------------------------------------------------------------- assets
const ASSETS = {};
function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}
async function initRenderAssets() {
  const [logo, quote] = await Promise.all([
    loadImg("assets/img/logo-latribuna.png"),
    loadImg("assets/img/quote-mark.png"),
  ]);
  ASSETS.logo = logo;
  ASSETS.quote = quote;
  if (document.fonts && document.fonts.ready) {
    await document.fonts.load("400 40px Rajdhani");
    await document.fonts.load("700 40px Rajdhani");
    await document.fonts.ready;
  }
}

// --------------------------------------------------------- texto en negrilla
// "hola **mundo**" -> [{text:'hola ',bold:false},{text:'mundo',bold:true}]
function parseNegritas(texto) {
  const partes = texto.split("**");
  const out = [];
  partes.forEach((trozo, i) => {
    if (trozo === "") return;
    out.push({ text: trozo, bold: i % 2 === 1 });
  });
  return out.length ? out : [{ text: texto, bold: false }];
}

// Convierte una linea con marcas **negrilla** en tokens (palabras), donde
// cada token puede tener varios "trozos" con distinto grosor si la marca de
// negrilla empieza o termina a mitad de una palabra (p. ej. "Petro**,").
// Asi el ancho y el dibujo respetan exactamente los espacios del texto
// original, sin insertar ni perder espacios en los bordes de la negrilla.
function tokenizarLinea(lineaTexto) {
  const runs = parseNegritas(lineaTexto);
  let plano = "";
  const boldAt = [];
  for (const r of runs) {
    for (const ch of r.text) { plano += ch; boldAt.push(r.bold); }
  }
  const tokens = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(plano))) {
    const start = m.index, end = start + m[0].length;
    const trozos = [];
    let i = start;
    while (i < end) {
      const bold = boldAt[i];
      let j = i;
      while (j < end && boldAt[j] === bold) j++;
      trozos.push({ text: plano.slice(i, j), bold });
      i = j;
    }
    tokens.push({ trozos, word: m[0] });
  }
  return tokens;
}

function fontFor(pt, bold) {
  return (bold ? "700 " : "400 ") + pt + "px " + FONT_REG;
}

// Ajusta el interlineado igual que PowerPoint: separa por lineas explicitas
// (saltos de linea = parrafos forzados) y dentro de cada una ajusta por palabra.
function construirParrafos(texto) {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length)
    .map((l) => tokenizarLinea(l));
}

function anchoToken(ctx, tok, pt) {
  let w = 0;
  for (const tr of tok.trozos) {
    ctx.font = fontFor(pt, tr.bold);
    w += ctx.measureText(tr.text).width;
  }
  return w;
}

// Reparte los tokens de un parrafo en lineas que quepan en maxW (px).
function envolverParrafo(ctx, tokens, maxW, pt) {
  if (!tokens.length) return [{ tokens: [], width: 0 }];
  ctx.font = fontFor(pt, false);
  const space = ctx.measureText(" ").width || pt * 0.28;
  const lineas = [];
  let actual = [];
  let x = 0;
  for (const tok of tokens) {
    const w = anchoToken(ctx, tok, pt);
    if (actual.length === 0) {
      actual.push(tok); x = w;
    } else if (x + space + w <= maxW) {
      actual.push(tok); x += space + w;
    } else {
      lineas.push({ tokens: actual, width: x });
      actual = [tok]; x = w;
    }
  }
  lineas.push({ tokens: actual, width: x });
  return lineas;
}

function medirParrafos(ctx, paragraphs, maxW, pt) {
  let totalLineas = 0;
  let lineas = [];
  for (const tokens of paragraphs) {
    const l = envolverParrafo(ctx, tokens, maxW, pt);
    lineas = lineas.concat(l);
    totalLineas += l.length;
  }
  return { totalLineas, lineas };
}

// Mayor tamano (pt) que cabe en el alto disponible.
function autoajustarCita(ctx, paragraphs, boxW, boxH, maxPt, minPt) {
  for (let pt = maxPt; pt >= minPt; pt--) {
    const m = medirParrafos(ctx, paragraphs, boxW, pt);
    if (m.totalLineas * pt * LINE_FACTOR <= boxH) return { pt, ...m };
  }
  // ultimo recurso: sigue reduciendo hasta un piso de seguridad
  for (let pt = minPt - 1; pt >= CITA_FLOOR_PT; pt--) {
    const m = medirParrafos(ctx, paragraphs, boxW, pt);
    if (m.totalLineas * pt * LINE_FACTOR <= boxH) return { pt, ...m };
  }
  const m = medirParrafos(ctx, paragraphs, boxW, CITA_FLOOR_PT);
  return { pt: CITA_FLOOR_PT, ...m };
}

// --------------------------------------------------------------- texturas
let _microNoise = null;
function getMicroNoise() {
  if (_microNoise) return _microNoise;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const im = g.createImageData(W, H);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = Math.random();
    if (r < 0.28) { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = Math.random() * 255; }
    else if (r > 0.72) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.random() * 255; }
    else d[i + 3] = 0;
  }
  g.putImageData(im, 0, 0);
  _microNoise = c;
  return c;
}

function diagonalWeave(ctx, alpha, spacing, dark) {
  ctx.save();
  ctx.strokeStyle = "rgba(" + (dark ? "0,0,0" : "255,255,255") + "," + alpha + ")";
  ctx.lineWidth = 1;
  for (let i = -H; i < W; i += spacing || 5) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
  ctx.restore();
}

// --------------------------------------------------------- imagenes teñidas
const _tintCache = new Map();
function imagenTeñida(img, color) {
  const key = color;
  let byImg = _tintCache.get(img);
  if (!byImg) { byImg = new Map(); _tintCache.set(img, byImg); }
  if (byImg.has(key)) return byImg.get(key);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  byImg.set(key, c);
  return c;
}

function dibujarContenido(ctx, img, x, y, w, h) {
  // ajusta manteniendo proporcion dentro de la caja (contain, centrado)
  const escala = Math.min(w / img.width, h / img.height);
  const dw = img.width * escala, dh = img.height * escala;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// --------------------------------------------------------------- fondo
function dibujarFondo(ctx, t) {
  if (t === "roja") {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#99564D");
    grad.addColorStop(1, "#78352C");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    diagonalWeave(ctx, 0.16, 5, true);
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.drawImage(getMicroNoise(), 0, 0);
    ctx.restore();
  } else {
    ctx.fillStyle = "#FDFBF8";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.drawImage(getMicroNoise(), 0, 0);
    ctx.restore();
  }
}

function dibujarBordes(ctx) {
  // franja superior: marron + linea negra
  ctx.fillStyle = "#8A3D33";
  ctx.fillRect(0, 0, W, 32);
  ctx.fillStyle = "#272624";
  ctx.fillRect(0, 32, W, 7);
  // franja inferior: linea negra + marron
  ctx.fillStyle = "#272624";
  ctx.fillRect(0, H - 55, W, 6);
  ctx.fillStyle = "#8A3D33";
  ctx.fillRect(0, H - 49, W, 49);
}

// --------------------------------------------------------------- foto autor
function dibujarFoto(ctx, img, dx, dy, scale) {
  scale = scale || 1; dx = dx || 0; dy = dy || 0;
  const w = FOTO_ANCHO * scale;
  const h = w * img.naturalHeight / img.naturalWidth;
  const x = (W - w) / 2 + dx;
  const y = FOTO_TOP + dy;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, H - y);
  ctx.clip();
  ctx.filter = "grayscale(1)";
  ctx.drawImage(img, x, y, w, h);
  ctx.filter = "none";
  ctx.globalAlpha = 0.22;
  ctx.drawImage(getMicroNoise(), x, y, w, Math.min(h, H - y), x, y, w, Math.min(h, H - y));
  ctx.globalAlpha = 1;
  ctx.restore();
}

// --------------------------------------------------------------- pastilla
function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dibujarPastilla(ctx, cfg) {
  drawRoundRect(ctx, cfg.pillX, cfg.pillY, cfg.pillW, cfg.pillH, cfg.pillH / 2);
  ctx.fillStyle = cfg.pillFill;
  ctx.fill();
  ctx.font = "700 27px " + FONT_REG;
  ctx.fillStyle = cfg.pillText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Puntos de Vista", cfg.pillX + cfg.pillW / 2, cfg.pillY + cfg.pillH / 2 + 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// --------------------------------------------------------------- url
function dibujarUrl(ctx, cfg) {
  const partes = [
    { t: "www.", bold: false },
    { t: "latribunacolombia", bold: true },
    { t: ".co", bold: false },
  ];
  const pt = 27;
  ctx.textBaseline = "alphabetic";
  let total = 0;
  for (const p of partes) { ctx.font = fontFor(pt, p.bold); total += ctx.measureText(p.t).width; }
  let x = cfg.urlX + (cfg.urlW - total) / 2;
  const y = cfg.urlY + pt * 0.85;
  ctx.fillStyle = cfg.urlColor;
  for (const p of partes) {
    ctx.font = fontFor(pt, p.bold);
    ctx.fillText(p.t, x, y);
    x += ctx.measureText(p.t).width;
  }
}

// --------------------------------------------------------------- render principal
function renderPuntosVista(ctx, opts) {
  const cfg = TEMPLATES[opts.template];
  ctx.clearRect(0, 0, W, H);
  dibujarFondo(ctx, opts.template);

  // 1) nombre: cuantas lineas ocupa (para reservar el espacio antes de la foto)
  // el nombre siempre va en negrilla, sin importar asteriscos
  const nombreTokens = tokenizarLinea(opts.autorNombre).map((t) => ({
    word: t.word,
    trozos: t.trozos.map((tr) => ({ text: tr.text, bold: true })),
  }));
  const nombreLineas = envolverParrafo(ctx, nombreTokens, cfg.nameW, NAME_PT);
  const nombreAlto = nombreLineas.length * NAME_PT * LINE_FACTOR;

  // 2) foto (debajo del texto, encima del fondo)
  if (opts.autorImg) {
    dibujarFoto(ctx, opts.autorImg, opts.dx, opts.dy, opts.scale);
  }

  // 3) cita: se autoajusta para terminar antes de donde empieza el nombre
  const limiteY = FOTO_TOP - GAP_FOTO - nombreAlto - GAP_CITA;
  const altoDisponible = limiteY - cfg.boxY;
  const paragraphs = construirParrafos(opts.texto || "");
  const paras = paragraphs.length ? paragraphs : [[]];
  const { pt, lineas } = autoajustarCita(ctx, paras, cfg.boxW, altoDisponible, CITA_MAX_PT, CITA_MIN_PT);
  const lineHeight = pt * LINE_FACTOR;

  // comilla de apertura (decorativa, fija, apoyada en el margen izquierdo)
  const openImg = imagenTeñida(ASSETS.quote, cfg.quoteMarkTint);
  const openW = openImg.width * (QUOTE_OPEN_H / openImg.height);
  ctx.drawImage(openImg, cfg.boxX - openW + 8, cfg.boxY - QUOTE_OPEN_H * 0.42, openW, QUOTE_OPEN_H);

  // dibuja cada linea de la cita
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = cfg.quoteColor;
  let y = cfg.boxY + pt * 0.86; // aproxima la linea base de la 1a linea
  let lastLineWidth = 0;
  for (const linea of lineas) {
    let x = cfg.boxX;
    ctx.font = fontFor(pt, false);
    const space = ctx.measureText(" ").width || pt * 0.28;
    for (const tok of linea.tokens) {
      for (const tr of tok.trozos) {
        ctx.font = fontFor(pt, tr.bold);
        ctx.fillStyle = cfg.quoteColor;
        ctx.fillText(tr.text, x, y);
        x += ctx.measureText(tr.text).width;
      }
      x += space;
    }
    lastLineWidth = linea.width;
    y += lineHeight;
  }
  const citaBottom = cfg.boxY + lineas.length * lineHeight;
  const lastLineTop = cfg.boxY + (lineas.length - 1) * lineHeight;

  // comilla de cierre: pegada al final del ultimo renglon
  const closeImg = imagenTeñida(ASSETS.quote, cfg.quoteMarkTint);
  const closeW = closeImg.width * (QUOTE_CLOSE_H / closeImg.height);
  const cx = cfg.boxX + lastLineWidth + closeW / 2 + 10;
  const cy = lastLineTop + lineHeight / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI);
  ctx.drawImage(closeImg, -closeW / 2, -QUOTE_CLOSE_H / 2, closeW, QUOTE_CLOSE_H);
  ctx.restore();

  // 4) nombre, justo debajo de la cita real
  const nameTop = citaBottom + GAP_CITA;
  ctx.fillStyle = cfg.nameColor;
  let ny = nameTop + NAME_PT * 0.86;
  for (const linea of nombreLineas) {
    let x = cfg.nameX;
    ctx.font = fontFor(NAME_PT, true);
    const space = ctx.measureText(" ").width;
    for (const tok of linea.tokens) {
      for (const tr of tok.trozos) {
        ctx.font = fontFor(NAME_PT, tr.bold);
        ctx.fillText(tr.text, x, ny);
        x += ctx.measureText(tr.text).width;
      }
      x += space;
    }
    ny += NAME_PT * LINE_FACTOR;
  }

  // 5) marco decorativo (solo blanca)
  if (cfg.border) dibujarBordes(ctx);

  // 6) pastilla + logo + url (encima de todo)
  dibujarPastilla(ctx, cfg);
  dibujarContenido(ctx, imagenTeñida(ASSETS.logo, cfg.logoTint), cfg.logoX, cfg.logoY, cfg.logoW, cfg.logoH);
  dibujarUrl(ctx, cfg);
}
