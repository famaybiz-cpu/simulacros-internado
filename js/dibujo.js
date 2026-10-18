// Capa de lápiz: escribir y subrayar encima del caso clínico.
// Los trazos se guardan en el dispositivo (no viajan a la nube: pesan y son de este iPad).
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

/**
 * Monta el lienzo sobre `caja`. Devuelve los controles.
 * Los puntos se guardan como fracciones (0–1) del tamaño de la caja, así que
 * sobreviven a girar el iPad o cambiar de tamaño de letra.
 */
export function montarLienzo(caja, sim, qid) {
  const cv = el('canvas', { class: 'lienzo' });
  caja.append(cv);
  const ctx = cv.getContext('2d');

  let trazos = trazosDe(sim, qid).map((t) => ({ ...t, p: [...t.p] }));
  let tinta = TINTAS[0];
  let activo = false;
  let actual = null;

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
    if (t.p.length < 2) {
      // un punto suelto: dibuja un redondel para que se vea
      const [x, y] = t.p[0] || [];
      if (x == null) return;
      ctx.fillStyle = t.c;
      ctx.beginPath();
      ctx.arc(x * cv.clientWidth, y * cv.clientHeight, t.w / 2, 0, 7);
      ctx.fill();
      return;
    }
    ctx.strokeStyle = t.c;
    ctx.lineWidth = t.w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    t.p.forEach(([x, y], i) => {
      const px = x * cv.clientWidth, py = y * cv.clientHeight;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
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

  const puedeDibujar = (ev) => activo || ev.pointerType === 'pen';

  function abajo(ev) {
    if (!puedeDibujar(ev)) return;
    ev.preventDefault();
    cv.setPointerCapture?.(ev.pointerId);
    actual = { c: tinta.color, w: tinta.ancho, p: [punto(ev)] };
    pintar();
  }
  function mover(ev) {
    if (!actual) return;
    ev.preventDefault();
    // getCoalescedEvents da los puntos intermedios del Apple Pencil (trazo más suave),
    // pero puede venir vacío: en ese caso vale el evento tal cual.
    let puntos = [];
    try { puntos = ev.getCoalescedEvents?.() || []; } catch {}
    if (!puntos.length) puntos = [ev];
    for (const p of puntos) actual.p.push(punto(p));
    pintar();
  }
  function arriba(ev) {
    if (!actual) return;
    ev?.preventDefault?.();
    trazos.push(actual);
    actual = null;
    guardar();
    pintar();
  }

  function guardar() {
    const d = leer(sim);
    if (trazos.length) d[qid] = trazos; else delete d[qid];
    escribir(sim, d);
  }

  cv.addEventListener('pointerdown', abajo);
  cv.addEventListener('pointermove', mover);
  cv.addEventListener('pointerup', arriba);
  cv.addEventListener('pointercancel', arriba);
  cv.addEventListener('pointerleave', arriba);

  const ro = new ResizeObserver(medir);
  ro.observe(caja);
  requestAnimationFrame(medir);

  return {
    activar(v) {
      activo = v;
      cv.classList.toggle('activo', v);
      caja.classList.toggle('dibujando', v);
    },
    get activo() { return activo; },
    elegirTinta(t) { tinta = t; },
    get tinta() { return tinta; },
    deshacer() { trazos.pop(); guardar(); pintar(); },
    borrar() { trazos = []; guardar(); pintar(); },
    get vacio() { return trazos.length === 0; },
    destruir() { ro.disconnect(); cv.remove(); },
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
