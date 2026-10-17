// Carga de los simulacros publicados, con caché local para funcionar sin internet.
import { hoyLima, mezclar, hash } from './util.js';

const K = 'si.sim.';
const K_IDX = 'si.indice.v1';

async function pedirJSON(ruta) {
  const res = await fetch(ruta + '?v=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${ruta}`);
  return res.json();
}

/** Lista de simulacros publicados. Cae a la caché si no hay internet. */
export async function indice() {
  try {
    const idx = await pedirJSON('simulacros/index.json');
    localStorage.setItem(K_IDX, JSON.stringify(idx));
    return idx;
  } catch {
    try { return JSON.parse(localStorage.getItem(K_IDX)) || { simulacros: [] }; }
    catch { return { simulacros: [] }; }
  }
}

/** Un simulacro por id (AAAA-MM-DD-turno). Guarda copia local la primera vez. */
export async function simulacro(id) {
  const k = K + id;
  try {
    const s = await pedirJSON(`simulacros/${id}.json`);
    normalizar(s);
    try { localStorage.setItem(k, JSON.stringify(s)); } catch {}
    return s;
  } catch {
    const c = localStorage.getItem(k);
    if (!c) return null;
    const s = JSON.parse(c);
    normalizar(s);
    return s;
  }
}

/** Precarga y guarda los simulacros del índice para usarlos sin internet. */
export async function precargar(ids) {
  const r = { ok: 0, falla: 0 };
  for (const id of ids) {
    try { await simulacro(id) ? r.ok++ : r.falla++; } catch { r.falla++; }
  }
  return r;
}

export const guardados = () =>
  Object.keys(localStorage).filter((k) => k.startsWith(K)).map((k) => k.slice(K.length));

/**
 * Acepta clave 1–5 (como la escriben /manana y /noche) o 0–4, y deja todo en
 * `clave0` (índice base 0). También baraja el orden si el JSON no viene mezclado.
 */
function normalizar(s) {
  s.segundos_por_pregunta ||= 40;
  s.turno = s.turno === 'noche' ? 'noche' : 'manana';
  s.titulo ||= s.turno === 'noche' ? 'Simulacro de la noche' : 'Simulacro de la mañana';
  const qs = s.preguntas || [];
  for (const [i, q] of qs.entries()) {
    q.id ||= `${s.id}-${String(i + 1).padStart(3, '0')}`;
    q.opciones = (q.opciones || []).map((o) => String(o));
    const c = q.clave;
    q.clave0 = typeof c === 'number'
      ? (c >= 1 && c <= q.opciones.length ? c - 1 : c)           // 1-5 → 0-4
      : Math.max(0, 'ABCDE'.indexOf(String(c || 'A').trim().toUpperCase()[0]));
    q.por_que_no = q.por_que_no || [];
    q.trampa = Array.isArray(q.trampa) ? q.trampa : (q.trampa ? [q.trampa] : []);
  }
  if (!s.orden_fijo) s.preguntas = mezclar(qs, hash(s.id));
  s.n = s.preguntas.length;
  return s;
}

/** Los dos simulacros del día (pueden no existir todavía), con sus metadatos. */
export async function delDia(fecha = hoyLima()) {
  const idx = await indice();
  const meta = new Map();
  for (const x of idx.simulacros || []) {
    const o = typeof x === 'string' ? { id: x } : x;
    meta.set(o.id, o);
  }
  const locales = new Set(guardados());
  const hay = (id) => meta.has(id) || locales.has(id);
  return {
    fecha,
    manana: hay(`${fecha}-manana`) ? `${fecha}-manana` : null,
    noche:  hay(`${fecha}-noche`)  ? `${fecha}-noche`  : null,
    meta,
    todos: [...new Set([...meta.keys(), ...locales])].sort().reverse(),
  };
}
