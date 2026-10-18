// Capa de lápiz: escribir y subrayar encima del caso clínico.
//
// Idea central: el Apple Pencil escribe SIEMPRE, sin activar ningún modo, y el
// dedo sigue sirviendo para desplazar y para marcar la respuesta. Para lograrlo
// el lienzo no recibe toques (pointer-events:none) y los eventos se escuchan en
// el contenedor, así llegan igual a los botones de abajo.
//
// Los trazos se guardan en el dispositivo: pesan y son propios de este iPad.
import { el } from './util.js';

const K = 'si.dibujos.';

export const TINTAS = [
  { id: 'amarillo', color: 'rgba(250,204,21,.45)', ancho: 18, nombre: 'Subrayar' },
  { id: 'azul',     color: '#2f7cf6',              ancho: 3.5, nombre: 'Escribir' },
  { id: 'rojo',     color: '#e23b2d',              ancho: 3.5, nombre: 'Marcar' },
];

const leer = (sim) => {
  try { return JSON.parse(localStorage.getItem(K + sim)) || {}; } catch { return {}; }
};
const escribir = (sim, d) => {
  try { localStorage.setItem(K + sim, JSON.stringify(d)); } catch {}
};

export const trazosDe = (sim, qid) => leer(sim)[qid] || [];
export const hayTrazos = (sim, qid) => trazosDe(sim, qid).length > 0;
export function borrarSimulacro(sim) { try { localStorage.removeItem(K + sim); } catch {} }

/** ¿Este toque viene del Apple Pencil? */
const esLapiz = (ev) => ev.pointerType === 'pen';

export function montarLienzo(caja, sim, qid, alCambiar) {
  const cv = el('canvas', { class: 'lienzo' });
  caja.append(cv);
  const ctx = cv.getContext('2d');

  let trazos = trazosDe(sim, qid).map((t) => ({ ...t, p: [...t.p] }));
  let tinta = TINTAS[0];
  let dedo = false;        // ¿el modo "dibujar con el dedo" está encendido?
  let actual = null;
  let dibujo = false;      // ¿se dibujó algo en este gesto? (para no marcar la alternativa)

  function medir() {
    const r = caja.getBoundingClientRect();
    const d = Math.min(3, devicePixelRatio || 1);
    if (!r.width || !r.height) return;
    cv.width = Math.round(r.width * d);
    cv.height = Math.round(r.height * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    pintar();
  }

  function trazo(t) {
    ctx.strokeStyle = t.c; ctx.fillStyle = t.c;
    ctx.lineWidth = t.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const W = cv.clientWidth, H = cv.clientHeight;
    if (t.p.length < 2) {
      const [x, y] = t.p[0] || [];
      if (x == null) return;
      ctx.beginPath(); ctx.arc(x * W, y * H, t.w / 2, 0, 7); ctx.fill();
      return;
    }
    ctx.beginPath();
    t.p.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)));
    ctx.stroke();
  }

  function pintar() {
    ctx.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
    for (const t of trazos) trazo(t);
    if (actual) trazo(actual);
  }

  const punto = (ev) => {
    const r = cv.getBoundingClientRect();
    return [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height];
  };

  const puedeDibujar = (ev) => esLapiz(ev) || (dedo && ev.pointerType !== 'mouse') || (dedo && ev.pointerType === 'mouse');

  function abajo(ev) {
    if (!puedeDibujar(ev)) return;
    ev.preventDefault();
    actual = { c: tinta.color, w: tinta.ancho, p: [punto(ev)] };
    dibujo = false;
    pintar();
  }

  function mover(ev) {
    if (!actual) return;
    ev.preventDefault();
    let puntos = [];
    try { puntos = ev.getCoalescedEvents?.() || []; } catch {}
    if (!puntos.length) puntos = [ev];
    for (const p of puntos) actual.p.push(punto(p));
    if (actual.p.length > 2) dibujo = true;
    pintar();
  }

  function arriba(ev) {
    if (!actual) return;
    ev?.preventDefault?.();
    trazos.push(actual);
    actual = null;
    guardar();
    pintar();
    alCambiar?.();
  }

  function guardar() {
    const d = leer(sim);
    if (trazos.length) d[qid] = trazos; else delete d[qid];
    escribir(sim, d);
  }

  // Si se escribió encima de una alternativa, el toque NO debe marcarla.
  function tragarClic(ev) {
    if (!dibujo) return;
    dibujo = false;
    ev.stopPropagation();
    ev.preventDefault();
  }

  // En Safari de iPad el Apple Pencil también manda eventos táctiles, y son esos
  // los que desplazan la página y seleccionan texto. Se cancelan solo para el
  // Pencil (touchType 'stylus'), así el dedo sigue desplazando con normalidad.
  function tocar(ev) {
    const stylus = [...(ev.touches || [])].some((t) => t.touchType === 'stylus');
    if (stylus || dedo) ev.preventDefault();
  }

  caja.addEventListener('pointerdown', abajo);
  caja.addEventListener('pointermove', mover);
  caja.addEventListener('pointerup', arriba);
  caja.addEventListener('pointercancel', arriba);
  caja.addEventListener('click', tragarClic, true);
  caja.addEventListener('touchstart', tocar, { passive: false });
  caja.addEventListener('touchmove', tocar, { passive: false });

  const ro = new ResizeObserver(medir);
  ro.observe(caja);
  requestAnimationFrame(medir);

  return {
    /** Modo "dibujar con el dedo" (para el celular o si prefiere el dedo). */
    conDedo(v) {
      dedo = v;
      caja.classList.toggle('dibujando', v);
      caja.style.touchAction = v ? 'none' : '';
    },
    get dedo() { return dedo; },
    elegirTinta(t) { tinta = t; },
    get tinta() { return tinta; },
    deshacer() { trazos.pop(); guardar(); pintar(); alCambiar?.(); },
    borrar() { trazos = []; guardar(); pintar(); alCambiar?.(); },
    get vacio() { return trazos.length === 0; },
    destruir() {
      ro.disconnect();
      caja.removeEventListener('pointerdown', abajo);
      caja.removeEventListener('pointermove', mover);
      caja.removeEventListener('pointerup', arriba);
      caja.removeEventListener('pointercancel', arriba);
      caja.removeEventListener('click', tragarClic, true);
      caja.removeEventListener('touchstart', tocar);
      caja.removeEventListener('touchmove', tocar);
      caja.style.touchAction = '';
      cv.remove();
    },
  };
}

/** Dibuja los trazos guardados en un lienzo de solo lectura, para la revisión. */
export function lienzoRevision(sim, qid, ancho = 640, alto = 360) {
  const ts = trazosDe(sim, qid);
  if (!ts.length) return null;
  const cv = el('canvas', { class: 'lienzo-rev', width: ancho, height: alto });
  const ctx = cv.getContext('2d');
  for (const t of ts) {
    ctx.strokeStyle = t.c; ctx.fillStyle = t.c;
    ctx.lineWidth = t.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (t.p.length < 2) {
      const [x, y] = t.p[0] || [];
      if (x == null) continue;
      ctx.beginPath(); ctx.arc(x * ancho, y * alto, t.w / 2, 0, 7); ctx.fill();
      continue;
    }
    ctx.beginPath();
    t.p.forEach(([x, y], i) => (i ? ctx.lineTo(x * ancho, y * alto) : ctx.moveTo(x * ancho, y * alto)));
    ctx.stroke();
  }
  return cv;
}
