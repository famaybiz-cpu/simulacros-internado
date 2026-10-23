// Sincronización con Firebase Firestore por API REST (sin SDK ni build).
//
// Reglas de la casa, aprendidas a golpes:
//  1. Quien sube SIEMPRE refresca `actualizado`. Si no, el documento parece
//     más viejo de lo que es y la siguiente fusión decide mal.
//  2. La fusión respeta la fecha de inicio oficial: lo anterior se descarta
//     en los dos lados, así un borrado no "revive" desde otro dispositivo.
//  3. Los borradores (exámenes a medias) NO viajan: son del dispositivo y
//     ocupan mucho.
//  4. Antes de subir se mide el documento; la regla de Firestore rechaza
//     más de 900 000 caracteres y hay que avisar ANTES de chocar.
import { cfg, store } from './store.js';
import { toast, INICIO_OFICIAL } from './util.js';

const TOPE = 900000;
const AVISO_TOPE = 760000;

const estado = {
  fase: 'sin-config',   // sin-config | al-dia | pendiente | subiendo | sin-red | error
  ultimo: null,
  error: null,
  tam: 0,
};
export const estadoSync = () => ({ ...estado, configurado: !!urlDoc() });

function urlDoc() {
  const c = cfg.leer();
  if (!c.firebase?.projectId || !c.firebase?.apiKey || !c.pin) return null;
  const { projectId, apiKey } = c.firebase;
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
         `/databases/(default)/documents/progreso/${encodeURIComponent(c.pin)}?key=${encodeURIComponent(apiKey)}`;
}

/** Lo que de verdad se sube. Los borradores se quedan en casa. */
function paraSubir(d) {
  const { borradores, ...resto } = d;
  return resto;
}

const vigente = (fecha) => (fecha || '') >= INICIO_OFICIAL;

/** Une dos estados. Suma lo que falta y descarta lo anterior al inicio oficial. */
export function unir(a, b) {
  if (!a) return b;
  if (!b) return a;
  const aNuevo = new Date(a.actualizado || 0) >= new Date(b.actualizado || 0);
  const nuevo = aNuevo ? a : b;
  const viejo = aNuevo ? b : a;
  const r = { ...viejo, ...nuevo };

  // intentos: por simulacro, gana el que se terminó después; fuera los antiguos
  const porId = new Map();
  for (const it of [...(viejo.intentos || []), ...(nuevo.intentos || [])]) {
    if (!vigente(it.fecha)) continue;
    const prev = porId.get(it.simulacro_id);
    if (!prev || new Date(it.fin || 0) >= new Date(prev.fin || 0)) porId.set(it.simulacro_id, it);
  }
  r.intentos = [...porId.values()].sort((x, y) => (x.fecha + x.turno < y.fecha + y.turno ? -1 : 1));
  const vivos = new Set(r.intentos.map((i) => i.simulacro_id));

  const unirPorQid = (k, filtrar) => {
    const m = new Map();
    for (const x of [...(viejo[k] || []), ...(nuevo[k] || [])]) {
      if (filtrar && x.simulacro_id && !vivos.has(x.simulacro_id)) continue;
      const p = m.get(x.qid);
      if (!p || (x.proximo_repaso || '') >= (p.proximo_repaso || '')) m.set(x.qid, x);
    }
    return [...m.values()];
  };
  r.errores  = unirPorQid('errores', true);     // si su simulacro ya no cuenta, el error tampoco
  r.perlas   = unirPorQid('perlas', false);
  r.tarjetas = unirPorQid('tarjetas', false);

  const qidsVivos = new Set(r.errores.map((e) => e.qid));
  r.gemelas_pendientes = [...new Set([...(viejo.gemelas_pendientes || []), ...(nuevo.gemelas_pendientes || [])])]
    .filter((q) => qidsVivos.has(q));
  r.tarjetas_cargadas = [...new Set([...(viejo.tarjetas_cargadas || []), ...(nuevo.tarjetas_cargadas || [])])];
  r.checklist = { ...(viejo.checklist || {}), ...(nuevo.checklist || {}) };
  r.borradores = { ...(nuevo.borradores || {}) };   // los del dispositivo, no se mezclan
  r.rev = Math.max(viejo.rev || 0, nuevo.rev || 0);
  r.actualizado = nuevo.actualizado;
  return r;
}

async function bajarRemoto() {
  const u = urlDoc();
  if (!u) return null;
  const res = await fetch(u, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore ${res.status}`);
  const doc = await res.json();
  const txt = doc?.fields?.json?.stringValue;
  return txt ? JSON.parse(txt) : null;
}

async function subirRemoto(d) {
  const u = urlDoc();
  if (!u) return false;
  // SIEMPRE con marca de tiempo fresca: ese fue el error que hacía revivir datos borrados.
  d.actualizado = new Date().toISOString();
  d.rev = (d.rev || 0) + 1;
  const txt = JSON.stringify(paraSubir(d));
  estado.tam = txt.length;
  if (txt.length > TOPE) {
    throw new Error(`El progreso pesa ${Math.round(txt.length / 1000)} KB y el límite son 900 KB`);
  }
  const body = { fields: { json: { stringValue: txt }, actualizado: { stringValue: d.actualizado } } };
  const res = await fetch(`${u}&updateMask.fieldPaths=json&updateMask.fieldPaths=actualizado`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return true;
}

/**
 * Baja lo más reciente, lo une con lo de acá y vuelve a subir.
 * Es lo que corre al abrir la web y al terminar un simulacro.
 */
export async function sincronizar({ silencioso = true, motivo = '' } = {}) {
  if (!urlDoc()) { estado.fase = 'sin-config'; pintar(); return false; }
  if (!navigator.onLine) { estado.fase = 'sin-red'; pintar(); return false; }
  estado.fase = 'subiendo'; pintar();
  try {
    const remoto = await bajarRemoto();
    const unido = unir(store.d, remoto);
    store.reemplazar(unido);
    await subirRemoto(store.d);
    store.guardarLocal();
    estado.fase = 'al-dia';
    estado.error = null;
    estado.ultimo = new Date().toISOString();
    if (!silencioso) toast('Progreso sincronizado' + (motivo ? ' · ' + motivo : ''));
    if (estado.tam > AVISO_TOPE) {
      toast(`Ojo: tu progreso pesa ${Math.round(estado.tam / 1000)} KB de 900 KB`, 5000);
    }
  } catch (e) {
    estado.fase = 'pendiente';
    estado.error = String(e.message || e);
    if (!silencioso) toast('No se pudo sincronizar: ' + estado.error, 4500);
  }
  pintar();
  return estado.fase === 'al-dia';
}

/** Sube ya mismo, sin esperar. Se usa al terminar un simulacro. */
export const sincronizarAhora = (opts = {}) => sincronizar({ silencioso: false, ...opts });

let t;
/** Sube con un pequeño retardo, para los toques sueltos (marcar una tarjeta, etc.). */
export function subirPronto() {
  if (!urlDoc()) { estado.fase = 'sin-config'; pintar(); return; }
  estado.fase = 'pendiente'; pintar();
  clearTimeout(t);
  t = setTimeout(() => sincronizar({ silencioso: true }), 1200);
}

/* ---------------- indicador visible ---------------- */
const TEXTOS = {
  'sin-config': ['Sin sincronizar', 'bad', 'Este dispositivo no está conectado a Firebase: tu progreso se queda solo aquí. Toca para configurarlo.'],
  'al-dia':     ['Sincronizado', 'ok', 'Tu progreso está guardado en la nube.'],
  'pendiente':  ['Pendiente de sincronizar', 'warn', 'Hay cambios sin subir. Toca para reintentar.'],
  'subiendo':   ['Sincronizando…', 'ac', ''],
  'sin-red':    ['Sin internet', 'warn', 'Se subirá solo al reconectar.'],
};

export function pintarEstadoSync() {
  const n = document.getElementById('estado-sync');
  if (!n) return;
  const [txt, clase, ayuda] = TEXTOS[estado.fase] || TEXTOS['pendiente'];
  n.textContent = (estado.fase === 'al-dia' ? '✓ ' : estado.fase === 'subiendo' ? '⟳ ' : '⚠ ') + txt;
  n.className = 'sync ' + clase;
  n.title = estado.error || ayuda;
  n.hidden = false;
  // aviso grande cuando de verdad hay un problema
  const aviso = document.getElementById('aviso-sync');
  if (aviso) {
    const malo = estado.fase === 'sin-config' || estado.fase === 'pendiente';
    aviso.hidden = !malo;
    if (malo) aviso.replaceChildren(...avisoContenido(txt, ayuda));
  }
}

function avisoContenido(txt, ayuda) {
  const a = document.createElement('div');
  a.className = 'row sp';
  const izq = document.createElement('span');
  izq.innerHTML = `<b>⚠ ${txt}</b><br><small>${estado.error ? estado.error : ayuda}</small>`;
  const b = document.createElement('button');
  b.className = 'btn sm';
  b.textContent = estado.fase === 'sin-config' ? 'Configurar' : 'Reintentar';
  b.onclick = () => {
    if (estado.fase === 'sin-config') location.hash = '#/ajustes';
    else sincronizarAhora();
  };
  a.append(izq, b);
  return [a];
}

addEventListener('online', () => sincronizar({ silencioso: true }));
addEventListener('offline', () => { estado.fase = 'sin-red'; pintar(); });
// si cierra la app con algo pendiente, un último intento
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && estado.fase === 'pendiente') sincronizar({ silencioso: true });
});

const pintar = pintarEstadoSync;
