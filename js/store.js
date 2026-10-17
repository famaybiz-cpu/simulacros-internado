// Estado del progreso: guardado local inmediato + sincronización opcional con Firestore.
import { hoyLima, sumaDias, diasEntre, nota20 } from './util.js';

const K_PROG = 'si.progreso.v1';
const K_CFG  = 'si.config.v1';
const K_COLA = 'si.cola.v1';       // intentos pendientes de subir

const vacio = () => ({
  version: 1,
  actualizado: new Date().toISOString(),
  intentos: [],          // un registro por simulacro resuelto
  errores: [],           // cuaderno de errores con repetición espaciada
  perlas: [],            // tarjetas de perlas con repetición espaciada
  gemelas_pendientes: [], // qid de errores sin gemela generada
  checklist: {},         // { 'AAAA-MM-DD': {manana,noche,errores,perlas} }
  borradores: {},        // examen en curso, por simulacro
});

function leerLS(k, pordefecto) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : pordefecto; }
  catch { return pordefecto; }
}
function escribirLS(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch { return false; }
}

export const cfg = {
  leer()  { return leerLS(K_CFG, { pin: '', firebase: null, modo: 'examen' }); },
  guardar(c) { escribirLS(K_CFG, c); return c; },
};

export const store = {
  d: leerLS(K_PROG, vacio()),
  oyentes: new Set(),

  escuchar(f) { this.oyentes.add(f); return () => this.oyentes.delete(f); },

  commit({ subir = true } = {}) {
    this.d.actualizado = new Date().toISOString();
    escribirLS(K_PROG, this.d);
    for (const f of this.oyentes) { try { f(this.d); } catch {} }
    if (subir) import('./sync.js').then((m) => m.subirPronto()).catch(() => {});
  },

  /** Reemplaza el estado (al traer de la nube). */
  reemplazar(d) {
    this.d = { ...vacio(), ...d };
    escribirLS(K_PROG, this.d);
    for (const f of this.oyentes) { try { f(this.d); } catch {} }
  },

  // ---------- intentos ----------
  intento(simulacroId) { return this.d.intentos.find((i) => i.simulacro_id === simulacroId); },

  guardarIntento(intento) {
    const i = this.d.intentos.findIndex((x) => x.simulacro_id === intento.simulacro_id);
    if (i >= 0) this.d.intentos[i] = intento; else this.d.intentos.push(intento);
    this.d.intentos.sort((a, b) => (a.fecha + a.turno < b.fecha + b.turno ? -1 : 1));
    this.marcarChecklist(intento.fecha, intento.turno === 'noche' ? 'noche' : 'manana', true);
    this.commit();
  },

  // ---------- borradores (examen en curso) ----------
  borrador(id)            { return this.d.borradores[id] || null; },
  guardarBorrador(id, b)  { this.d.borradores[id] = b; this.commit({ subir: false }); },
  limpiarBorrador(id)     { delete this.d.borradores[id]; this.commit({ subir: false }); },

  // ---------- checklist y racha ----------
  marcarChecklist(fecha, campo, valor) {
    const c = (this.d.checklist[fecha] ||= { manana: false, noche: false, errores: false, perlas: false });
    c[campo] = valor;
    this.commit();
  },

  racha() {
    let n = 0;
    let f = hoyLima();
    // si hoy aún no hay nada hecho, la racha se cuenta desde ayer
    const hecho = (x) => x && (x.manana || x.noche);
    if (!hecho(this.d.checklist[f])) f = sumaDias(f, -1);
    while (hecho(this.d.checklist[f])) { n++; f = sumaDias(f, -1); }
    return n;
  },

  // ---------- cuaderno de errores (repetición espaciada 1-3-7) ----------
  /** Alta o actualización de un error. */
  registrarError(pregunta, simulacroId, motivo, confianza) {
    const hoy = hoyLima();
    let e = this.d.errores.find((x) => x.qid === pregunta.id);
    if (!e) {
      e = {
        qid: pregunta.id, simulacro_id: simulacroId, pregunta,
        aciertos_seguidos: 0, dominada: false, repasos: 0,
        proximo_repaso: sumaDias(hoy, 1), creado: hoy,
      };
      this.d.errores.push(e);
    } else {
      e.aciertos_seguidos = 0; e.dominada = false;
      e.proximo_repaso = sumaDias(hoy, 1);
      e.pregunta = pregunta;
    }
    e.motivo = motivo || e.motivo || null;
    e.confianza = confianza || e.confianza || null;
    if (!this.d.gemelas_pendientes.includes(pregunta.id)) this.d.gemelas_pendientes.push(pregunta.id);
    this.commit();
  },

  /** Error sin fallar pero no dominado (acierto adivinando). */
  registrarDudoso(pregunta, simulacroId) {
    if (this.d.errores.some((x) => x.qid === pregunta.id)) return;
    this.d.errores.push({
      qid: pregunta.id, simulacro_id: simulacroId, pregunta,
      aciertos_seguidos: 1, dominada: false, repasos: 0, motivo: null, confianza: 'adivinando',
      proximo_repaso: sumaDias(hoyLima(), 1), creado: hoyLima(), por_adivinar: true,
    });
    this.commit();
  },

  /** Resultado de un repaso del cuaderno. 2 aciertos seguidos = dominada. */
  repasarError(qid, acerto) {
    const e = this.d.errores.find((x) => x.qid === qid);
    if (!e) return;
    e.repasos = (e.repasos || 0) + 1;
    const hoy = hoyLima();
    if (acerto) {
      e.aciertos_seguidos = (e.aciertos_seguidos || 0) + 1;
      const paso = [1, 3, 7][Math.min(e.aciertos_seguidos, 2)] ?? 7;
      e.proximo_repaso = sumaDias(hoy, paso);
      if (e.aciertos_seguidos >= 2) { e.dominada = true; e.dominada_el = hoy; }
    } else {
      e.aciertos_seguidos = 0; e.dominada = false;
      e.proximo_repaso = sumaDias(hoy, 1);
    }
    this.commit();
  },

  erroresVencidos() {
    const hoy = hoyLima();
    return this.d.errores
      .filter((e) => !e.dominada && e.proximo_repaso <= hoy)
      .sort((a, b) => (a.proximo_repaso < b.proximo_repaso ? -1 : 1));
  },

  // ---------- perlas ----------
  registrarPerla(pregunta) {
    if (!pregunta.perla) return;
    if (this.d.perlas.some((p) => p.qid === pregunta.id)) return;
    this.d.perlas.push({
      qid: pregunta.id, texto: pregunta.perla,
      especialidad: pregunta.especialidad || '', tema: pregunta.tema || '',
      aciertos_seguidos: 0, proximo_repaso: hoyLima(), creado: hoyLima(),
    });
  },

  repasarPerla(qid, recordada) {
    const p = this.d.perlas.find((x) => x.qid === qid);
    if (!p) return;
    const hoy = hoyLima();
    p.aciertos_seguidos = recordada ? (p.aciertos_seguidos || 0) + 1 : 0;
    p.proximo_repaso = sumaDias(hoy, recordada ? [1, 3, 7, 14][Math.min(p.aciertos_seguidos, 3)] : 1);
    this.commit();
  },

  perlasVencidas() {
    const hoy = hoyLima();
    return this.d.perlas.filter((p) => p.proximo_repaso <= hoy);
  },

  // ---------- resumen para el panel y para leer_progreso ----------
  resumen() {
    const ints = this.d.intentos;
    const porEsp = {}, porTema = {}, porTipo = {};
    const conf = { seguro: [0, 0], dudoso: [0, 0], adivinando: [0, 0] };
    const bloques = [[0, 0], [0, 0], [0, 0], [0, 0]];
    const motivos = {}, trampas = {}, confusiones = {};
    let cambios = { total: 0, mal_a_bien: 0, bien_a_mal: 0, mal_a_mal: 0 };
    let tiempos = { rapidas: [0, 0], normales: [0, 0], agotadas: [0, 0] };

    for (const it of ints) {
      for (const r of it.respuestas || []) {
        const acum = (o, k) => { if (!k) return; (o[k] ||= [0, 0]); o[k][1]++; if (r.ok) o[k][0]++; };
        acum(porEsp, r.especialidad); acum(porTema, r.tema ? `${r.especialidad} · ${r.tema}` : null); acum(porTipo, r.tipo);
        if (r.confianza && conf[r.confianza]) { conf[r.confianza][1]++; if (r.ok) conf[r.confianza][0]++; }
        const b = Math.min(3, Math.floor((r.bloque ?? 1) - 1));
        if (b >= 0) { bloques[b][1]++; if (r.ok) bloques[b][0]++; }
        if (!r.ok && r.motivo) motivos[r.motivo] = (motivos[r.motivo] || 0) + 1;
        if (!r.ok && r.trampa_caida) trampas[r.trampa_caida] = (trampas[r.trampa_caida] || 0) + 1;
        if (!r.ok && r.diagnostico && r.elegida_txt) {
          const k = `${r.diagnostico} → ${r.elegida_txt}`;
          confusiones[k] = (confusiones[k] || 0) + 1;
        }
        const cs = r.cambios || [];
        if (cs.length) {
          cambios.total++;
          const antesOk = cs[0].de === r.correcta;
          if (antesOk && !r.ok) cambios.bien_a_mal++;
          else if (!antesOk && r.ok) cambios.mal_a_bien++;
          else if (!r.ok) cambios.mal_a_mal++;
        }
        const lim = it.segundos_por_pregunta || 40;
        const t = r.segundos ?? 0;
        const slot = r.elegida == null || t >= lim - 1 ? 'agotadas' : t <= lim * 0.35 ? 'rapidas' : 'normales';
        tiempos[slot][1]++; if (r.ok) tiempos[slot][0]++;
      }
    }

    const tabla = (o, min = 1) => Object.entries(o)
      .filter(([, v]) => v[1] >= min)
      .map(([k, v]) => ({ k, ok: v[0], n: v[1], nota: nota20(v[0], v[1]) }))
      .sort((a, b) => a.nota - b.nota);

    return {
      intentos: ints,
      especialidades: tabla(porEsp),
      temas: tabla(porTema, 2),
      tipos: tabla(porTipo),
      confianza: conf, bloques, motivos, trampas,
      confusiones: Object.entries(confusiones).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n),
      cambios, tiempos,
      debiles: tabla(porTema, 2).slice(0, 10),
      errores_seguro: this.d.errores.filter((e) => e.confianza === 'seguro' && !e.dominada),
      aciertos_adivinando: this.d.errores.filter((e) => e.por_adivinar && !e.dominada),
      gemelas: { pendientes: this.d.gemelas_pendientes.length, resueltas: this.gemelasResueltas() },
    };
  },

  /** % de conceptos corregidos: gemelas acertadas sobre gemelas respondidas. */
  gemelasResueltas() {
    let ok = 0, n = 0;
    for (const it of this.d.intentos) {
      for (const r of it.respuestas || []) {
        if (r.gemela_de) { n++; if (r.ok) ok++; }
      }
    }
    return { ok, n, pct: n ? Math.round((100 * ok) / n) : null };
  },

  exportar() {
    return JSON.stringify({ ...this.d, exportado: new Date().toISOString(), pin: cfg.leer().pin || null }, null, 2);
  },

  importar(txt) {
    const d = JSON.parse(txt);
    if (!d || !Array.isArray(d.intentos)) throw new Error('El archivo no tiene el formato de progreso.');
    this.reemplazar(d);
    this.commit();
  },
};

export const cola = {
  leer()  { return leerLS(K_COLA, []); },
  push(x) { const c = this.leer(); c.push(x); escribirLS(K_COLA, c); },
  limpiar() { escribirLS(K_COLA, []); },
};
