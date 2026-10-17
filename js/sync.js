// Sincronización con Firebase Firestore por API REST (sin SDK ni build).
// El progreso completo se guarda como un solo campo de texto JSON en progreso/{PIN}.
import { cfg, store } from './store.js';
import { toast } from './util.js';

const estado = { activo: false, ultimo: null, error: null };
export const estadoSync = () => ({ ...estado, configurado: !!urlDoc() });

function urlDoc() {
  const c = cfg.leer();
  if (!c.firebase?.projectId || !c.firebase?.apiKey || !c.pin) return null;
  const { projectId, apiKey } = c.firebase;
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
         `/databases/(default)/documents/progreso/${encodeURIComponent(c.pin)}?key=${encodeURIComponent(apiKey)}`;
}

/** Une dos estados: gana el más reciente por simulacro y se acumulan errores y perlas. */
export function unir(a, b) {
  if (!a) return b; if (!b) return a;
  const nuevo = (new Date(a.actualizado || 0) >= new Date(b.actualizado || 0)) ? a : b;
  const viejo = nuevo === a ? b : a;
  const r = { ...viejo, ...nuevo };

  const porId = new Map();
  for (const it of [...(viejo.intentos || []), ...(nuevo.intentos || [])]) {
    const prev = porId.get(it.simulacro_id);
    if (!prev || new Date(it.fin || 0) >= new Date(prev.fin || 0)) porId.set(it.simulacro_id, it);
  }
  r.intentos = [...porId.values()].sort((x, y) => (x.fecha + x.turno < y.fecha + y.turno ? -1 : 1));

  const unirPorQid = (k) => {
    const m = new Map();
    for (const x of [...(viejo[k] || []), ...(nuevo[k] || [])]) {
      const p = m.get(x.qid);
      if (!p || (x.proximo_repaso || '') >= (p.proximo_repaso || '')) m.set(x.qid, x);
    }
    return [...m.values()];
  };
  r.errores = unirPorQid('errores');
  r.perlas  = unirPorQid('perlas');
  r.gemelas_pendientes = [...new Set([...(viejo.gemelas_pendientes || []), ...(nuevo.gemelas_pendientes || [])])];
  r.checklist = { ...(viejo.checklist || {}), ...(nuevo.checklist || {}) };
  r.borradores = { ...(viejo.borradores || {}), ...(nuevo.borradores || {}) };
  r.actualizado = nuevo.actualizado;
  return r;
}

async function bajarRemoto() {
  const u = urlDoc(); if (!u) return null;
  const res = await fetch(u, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore ${res.status}`);
  const doc = await res.json();
  const txt = doc?.fields?.json?.stringValue;
  return txt ? JSON.parse(txt) : null;
}

async function subirRemoto(d) {
  const u = urlDoc(); if (!u) return false;
  const body = { fields: { json: { stringValue: JSON.stringify(d) }, actualizado: { stringValue: d.actualizado } } };
  const res = await fetch(`${u}&updateMask.fieldPaths=json&updateMask.fieldPaths=actualizado`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${(await res.text()).slice(0, 180)}`);
  return true;
}

/** Baja, une con lo local y vuelve a subir. Se llama al abrir la app y al reconectar. */
export async function sincronizar({ silencioso = true } = {}) {
  if (!urlDoc()) { estado.activo = false; pintar(); return false; }
  try {
    const remoto = await bajarRemoto();
    const unido = unir(store.d, remoto);
    store.reemplazar(unido);
    await subirRemoto(unido);
    estado.activo = true; estado.error = null; estado.ultimo = new Date().toISOString();
    if (!silencioso) toast('Progreso sincronizado');
  } catch (e) {
    estado.activo = false; estado.error = String(e.message || e);
    if (!silencioso) toast('No se pudo sincronizar: ' + estado.error);
  }
  pintar();
  return estado.activo;
}

let t;
/** Sube con un pequeño retardo para no llamar a Firestore en cada toque. */
export function subirPronto() {
  if (!urlDoc()) return;
  clearTimeout(t);
  t = setTimeout(async () => {
    try {
      await subirRemoto(store.d);
      estado.activo = true; estado.error = null; estado.ultimo = new Date().toISOString();
    } catch (e) { estado.activo = false; estado.error = String(e.message || e); }
    pintar();
  }, 1500);
}

function pintar() {
  const n = document.getElementById('estado-sync');
  if (!n) return;
  if (!urlDoc()) { n.textContent = ''; n.className = 'sync'; return; }
  if (!navigator.onLine) { n.textContent = '⦿ sin conexión'; n.className = 'sync off'; return; }
  n.textContent = estado.activo ? '⦿ al día' : '⦿ pendiente';
  n.className = 'sync ' + (estado.activo ? 'on' : 'off');
  n.title = estado.error || (estado.ultimo ? 'Última sincronización: ' + new Date(estado.ultimo).toLocaleString('es-PE') : '');
}

addEventListener('online',  () => sincronizar({ silencioso: true }));
addEventListener('offline', pintar);
export { pintar as pintarEstadoSync };
