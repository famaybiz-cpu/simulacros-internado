// Motor del examen: cronómetro por pregunta, modo examen / estudio, seguridad y marcas.
import { el, $, LETRAS, mmss, vibrar, toast, hoyLima, CONFIANZA } from './util.js';
import { store, cfg } from './store.js';
import { simulacro } from './data.js';

let S = null;   // simulacro
let E = null;   // estado del intento en curso
let reloj = null;

const AVISO_ROJO = 10;

/* ---------- pantalla previa: sueño, ánimo y modo ---------- */
export async function pantallaPre(vista, id) {
  const s = await simulacro(id);
  if (!s) return vista.append(el('div', { class: 'vacio' }, el('span', { class: 'ic' }, '🕐'), 'Ese simulacro todavía no está publicado.'));

  const previo = store.intento(id);
  const borr = store.borrador(id);
  let sueno = borr?.sueno_horas ?? 7;
  let animo = borr?.animo ?? 3;
  let modo = borr?.modo ?? cfg.leer().modo ?? 'examen';

  const c = el('div');
  c.append(el('h1', {}, s.titulo), el('p', {}, el('small', {}, `${s.n} preguntas · ${s.turno === 'noche' ? '2 temas' : 'mixto'} · ${s.segundos_por_pregunta} s por pregunta`)));

  if (previo) {
    c.append(el('div', { class: 'card' },
      el('h3', {}, 'Ya lo resolviste'),
      el('p', {}, el('small', {}, `Nota ${previo.nota.toFixed(1)} · ${previo.aciertos}/${previo.total} aciertos`)),
      el('div', { class: 'row' },
        el('a', { class: 'btn pri', href: `#/resultados/${id}` }, 'Ver resultados'),
        el('button', { class: 'btn ghost', onclick: () => { if (confirm('¿Rehacer el simulacro desde cero? Se borra el intento anterior.')) { store.limpiarBorrador(id); arrancar(id, { sueno, animo, modo }); } } }, 'Rehacer'),
      )));
    return vista.append(c);
  }

  // --- sueño: dos toques ---
  const chipSueno = el('b', { style: 'font-variant-numeric:tabular-nums;font-size:26px' }, String(sueno));
  const fSueno = el('div', { class: 'card' },
    el('h3', {}, '¿Cuántas horas dormiste?'),
    el('div', { class: 'row', style: 'gap:14px' },
      el('button', { class: 'btn', style: 'flex:none;width:64px', onclick: () => { sueno = Math.max(0, sueno - 1); chipSueno.textContent = sueno; } }, '−'),
      el('div', { style: 'flex:1;text-align:center' }, chipSueno, el('small', { style: 'display:block' }, 'horas')),
      el('button', { class: 'btn', style: 'flex:none;width:64px', onclick: () => { sueno = Math.min(14, sueno + 1); chipSueno.textContent = sueno; } }, '+'),
    ));

  // --- ánimo: un toque ---
  const CARAS = ['😫', '😕', '😐', '🙂', '😄'];
  const fAnimo = el('div', { class: 'card' }, el('h3', {}, '¿Cómo te sientes?'));
  const filaA = el('div', { class: 'row', style: 'gap:8px' });
  CARAS.forEach((car, i) => {
    const b = el('button', {
      class: 'btn', style: 'flex:1;font-size:26px;padding:0',
      'aria-pressed': animo === i + 1 ? 'true' : 'false',
      onclick: () => { animo = i + 1; [...filaA.children].forEach((x, j) => x.setAttribute('aria-pressed', j === i ? 'true' : 'false')); },
    }, car);
    if (animo === i + 1) b.classList.add('pri');
    filaA.append(b);
  });
  filaA.addEventListener('click', () => [...filaA.children].forEach((x) => x.classList.toggle('pri', x.getAttribute('aria-pressed') === 'true')));
  fAnimo.append(filaA);

  // --- modo ---
  const fModo = el('div', { class: 'card' }, el('h3', {}, 'Modo'));
  const mk = (val, tit, sub) => el('button', {
    class: 'opt', 'aria-pressed': modo === val ? 'true' : 'false',
    onclick: (ev) => { modo = val; [...fModo.querySelectorAll('.opt')].forEach((x) => x.setAttribute('aria-pressed', 'false')); ev.currentTarget.setAttribute('aria-pressed', 'true'); },
  }, el('span', { class: 'le' }, val === 'examen' ? '⏱' : '📖'), el('span', {}, el('b', {}, tit), el('small', { style: 'display:block' }, sub)));
  fModo.append(el('div', { class: 'opts' },
    mk('examen', 'Examen', `${s.segundos_por_pregunta} s por pregunta, sin respuestas hasta el final`),
    mk('estudio', 'Estudio', 'Sin tiempo, con la explicación al instante')));

  c.append(fSueno, fAnimo, fModo,
    el('button', { class: 'btn pri full', style: 'margin-top:4px', onclick: () => { cfg.guardar({ ...cfg.leer(), modo }); arrancar(id, { sueno, animo, modo }); } }, 'Empezar'));
  vista.append(c);
}

function arrancar(id, opts) {
  store.guardarBorrador(id, { ...opts, i: 0, respuestas: {}, restante: {}, transcurrido: 0, inicio: new Date().toISOString() });
  location.hash = `#/examen/${id}`;
}

/* ---------- examen ---------- */
export async function pantallaExamen(vista, id) {
  S = await simulacro(id);
  if (!S) { location.hash = '#/'; return; }
  if (store.intento(id)) { location.hash = `#/resultados/${id}`; return; }

  const b = store.borrador(id);
  if (!b) { location.hash = `#/pre/${id}`; return; }

  E = {
    id, modo: b.modo || 'examen', sueno_horas: b.sueno_horas, animo: b.animo,
    i: b.i || 0, inicio: b.inicio || new Date().toISOString(),
    transcurrido: b.transcurrido || 0,
    resp: {},            // qid -> {elegida, confianza, marcada, segundos, cambios[], vista}
    restante: {},        // indice -> segundos que le quedan
  };
  for (const q of S.preguntas) E.resp[q.id] = { elegida: null, confianza: null, marcada: false, segundos: 0, cambios: [] };
  Object.assign(E.resp, b.respuestas || {});
  S.preguntas.forEach((q, i) => { E.restante[i] = b.restante?.[i] ?? S.segundos_por_pregunta; });

  document.body.classList.add('en-examen');
  vista.replaceChildren();
  vista.append(barraTiempo(), el('div', { id: 'q' }));
  pintarPregunta();
  if (E.modo === 'examen') iniciarReloj();
  else pintarTiempo();
}

export function salirDelExamen() {
  clearInterval(reloj); reloj = null;
  document.body.classList.remove('en-examen');
  if (E) guardar();
}

function barraTiempo() {
  return el('div', { class: 'timerbar', id: 'tb' },
    el('div', { class: 'bar' }, el('i', { id: 'tb-i' })),
    el('div', { class: 'meta' },
      el('span', {}, 'Pregunta ', el('b', { id: 'tb-n' }, '1'), ` de ${S.n}`),
      el('span', { class: 'spacer' }),
      E.modo === 'examen' ? el('span', {}, el('b', { class: 'seg', id: 'tb-s' }, String(S.segundos_por_pregunta)), ' s') : el('span', {}, 'modo estudio'),
      el('span', {}, '· total ', el('b', { id: 'tb-t' }, '0:00')),
    ));
}

function iniciarReloj() {
  clearInterval(reloj);
  let aviso = false;
  reloj = setInterval(() => {
    E.transcurrido++;
    const i = E.i;
    E.restante[i] = Math.max(0, (E.restante[i] ?? S.segundos_por_pregunta) - 1);
    const q = S.preguntas[i];
    E.resp[q.id].segundos = S.segundos_por_pregunta - E.restante[i];

    if (E.restante[i] === AVISO_ROJO && !aviso) { aviso = true; vibrar(90); }
    if (E.restante[i] > AVISO_ROJO) aviso = false;

    pintarTiempo();
    if (E.transcurrido % 5 === 0) guardar();

    if (E.restante[i] === 0) {
      vibrar([40, 60, 40]);
      const sig = proximaDisponible(i);
      if (sig === null) { terminar(); } else { E.i = sig; aviso = false; pintarPregunta(); }
    }
  }, 1000);
}

function proximaDisponible(desde) {
  for (let k = desde + 1; k < S.n; k++) if (E.restante[k] > 0) return k;
  for (let k = 0; k <= desde; k++) if (E.restante[k] > 0) return k;
  return null;
}

function pintarTiempo() {
  const i = E.i, tb = $('#tb');
  if (!tb) return;
  const r = E.restante[i] ?? S.segundos_por_pregunta;
  const p = E.modo === 'examen' ? (100 * r) / S.segundos_por_pregunta : 100;
  $('#tb-i').style.width = p + '%';
  tb.classList.toggle('rojo', E.modo === 'examen' && r <= AVISO_ROJO);
  $('#tb-n').textContent = String(i + 1);
  $('#tb-t').textContent = mmss(E.transcurrido);
  if ($('#tb-s')) $('#tb-s').textContent = String(r);
}

function pintarPregunta() {
  const i = E.i, q = S.preguntas[i], r = E.resp[q.id];
  const cont = $('#q'); if (!cont) return;
  const agotada = E.modo === 'examen' && E.restante[i] <= 0;
  const revelar = E.modo === 'estudio' && r.elegida !== null;

  cont.replaceChildren();
  // NUNCA se muestra especialidad, tema ni diagnóstico aquí.
  cont.append(el('div', { class: 'enun' }, q.enunciado));

  const opts = el('div', { class: 'opts' });
  q.opciones.forEach((txt, k) => {
    const b = el('button', {
      class: 'opt', 'aria-pressed': r.elegida === k ? 'true' : 'false',
      disabled: agotada || revelar,
      onclick: () => elegir(q, k),
    }, el('span', { class: 'le' }, LETRAS[k]), el('span', {}, txt));
    if (revelar) {
      if (k === q.clave0) b.classList.add('correcta');
      else if (k === r.elegida) b.classList.add('fallada');
    }
    opts.append(b);
  });
  cont.append(opts);

  // seguridad: un toque, no frena el cronómetro
  const conf = el('div', { class: 'conf' });
  for (const [k, et] of Object.entries(CONFIANZA)) {
    conf.append(el('button', {
      'aria-pressed': r.confianza === k ? 'true' : 'false',
      onclick: (ev) => { r.confianza = k; guardar(); [...conf.children].forEach((x) => x.setAttribute('aria-pressed', x === ev.currentTarget ? 'true' : 'false')); },
    }, et));
  }
  cont.append(el('small', { style: 'display:block;margin:0 0 6px;color:var(--fg3)' }, '¿Qué tan seguro estás?'), conf);

  if (revelar) cont.append(explicacion(q, r));

  cont.append(el('div', { class: 'navq' },
    el('button', { class: 'btn ghost', disabled: i === 0, onclick: () => ir(i - 1) }, '‹ Anterior'),
    el('button', { class: 'btn', 'aria-pressed': r.marcada ? 'true' : 'false', onclick: (ev) => { r.marcada = !r.marcada; guardar(); ev.currentTarget.textContent = r.marcada ? '🔖 Marcada' : '🔖 Marcar'; pintarRejilla(); } }, r.marcada ? '🔖 Marcada' : '🔖 Marcar'),
    el('button', { class: 'btn pri', disabled: i === S.n - 1 && !revelar, onclick: () => ir(i + 1) }, 'Siguiente ›'),
  ));

  cont.append(el('div', { class: 'card tight' },
    el('div', { class: 'row sp', style: 'margin:0 0 10px' }, el('small', {}, 'Ir a una pregunta'), el('button', { class: 'btn sm bad', onclick: () => pedirTerminar() }, 'Terminar')),
    el('div', { class: 'qgrid', id: 'rejilla' })));
  pintarRejilla();
  pintarTiempo();
  scrollTo({ top: 0, behavior: 'instant' });
}

function explicacion(q, r) {
  const ok = r.elegida === q.clave0;
  const c = el('div', { style: 'margin:0 0 16px' });
  c.append(el('div', { class: 'chip ' + (ok ? 'ok' : 'bad'), style: 'margin:0 0 10px' }, ok ? '✓ Correcto' : '✗ Incorrecto'));
  if (q.razonamiento) c.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Razonamiento'), q.razonamiento));
  const mal = (q.por_que_no || []).map((t, k) => (k === q.clave0 || !t ? null : `${LETRAS[k]}. ${t}`)).filter(Boolean);
  if (mal.length) c.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Por qué no las otras'), el('div', { html: mal.map((x) => `<div style="margin:0 0 6px">${x}</div>`).join('') })));
  if (q.perla) c.append(el('div', { class: 'perla' }, '💡 ' + q.perla));
  if (q.fuente) c.append(el('small', { style: 'display:block;margin-top:8px;color:var(--fg3)' }, fuenteTxt(q.fuente)));
  return c;
}

export function fuenteTxt(f) {
  if (!f) return '';
  if (typeof f === 'string') return f;
  return [f.carpeta, f.archivo, f.seccion || f.pagina].filter(Boolean).join(' › ');
}

function pintarRejilla() {
  const g = $('#rejilla'); if (!g) return;
  g.replaceChildren();
  S.preguntas.forEach((q, k) => {
    const r = E.resp[q.id];
    const b = el('button', { onclick: () => ir(k) }, String(k + 1));
    if (r.elegida !== null) b.classList.add('resp');
    if (r.marcada) b.classList.add('marc');
    if (k === E.i) b.classList.add('cur');
    if (E.modo === 'examen' && E.restante[k] <= 0 && r.elegida === null) b.style.opacity = .45;
    g.append(b);
  });
}

function ir(k) {
  if (k < 0 || k >= S.n) return;
  if (E.modo === 'examen' && E.restante[k] <= 0) { toast('A esa pregunta ya se le acabó el tiempo'); return; }
  E.i = k; guardar(); pintarPregunta();
}

function elegir(q, k) {
  const r = E.resp[q.id];
  if (r.elegida !== null && r.elegida !== k) r.cambios.push({ de: r.elegida, a: k, s: r.segundos });
  r.elegida = k;
  if (!r.confianza) r.confianza = 'dudoso';
  guardar();
  if (E.modo === 'estudio') { pintarPregunta(); return; }
  pintarPregunta();
  // en modo examen avanza solo si queda tiempo en la siguiente
  if (E.i < S.n - 1) setTimeout(() => { if (E.restante[E.i + 1] > 0) ir(E.i + 1); }, 160);
}

function guardar() {
  if (!E) return;
  store.guardarBorrador(E.id, {
    modo: E.modo, sueno_horas: E.sueno_horas, animo: E.animo, inicio: E.inicio,
    i: E.i, transcurrido: E.transcurrido, respuestas: E.resp, restante: E.restante,
  });
}

function pedirTerminar() {
  const sin = S.preguntas.filter((q) => E.resp[q.id].elegida === null).length;
  const marc = S.preguntas.filter((q) => E.resp[q.id].marcada).length;
  const msg = [sin ? `${sin} sin responder` : null, marc ? `${marc} marcadas para revisar` : null]
    .filter(Boolean).join(' y ');
  if (confirm(`¿Terminar el simulacro?${msg ? `\n\nTe quedan ${msg}.` : ''}`)) terminar();
}

/* ---------- corrección ---------- */
function terminar() {
  clearInterval(reloj); reloj = null;
  const respuestas = S.preguntas.map((q, k) => {
    const r = E.resp[q.id];
    const ok = r.elegida === q.clave0;
    return {
      qid: q.id, orden: k + 1, bloque: Math.floor(k / 25) + 1,
      elegida: r.elegida, correcta: q.clave0, ok,
      elegida_txt: r.elegida === null ? null : q.opciones[r.elegida],
      segundos: r.segundos, confianza: r.confianza, marcada: !!r.marcada, cambios: r.cambios,
      especialidad: q.especialidad || null, tema: q.tema || null, tipo: q.tipo || null,
      diagnostico: q.diagnostico || null, dificultad: q.dificultad || null,
      trampa_caida: r.elegida !== null && !ok ? (q.trampa?.[r.elegida] || q.trampa?.[0] || null) : null,
      gemela_de: q.gemela_de || null, motivo: null,
    };
  });
  const aciertos = respuestas.filter((r) => r.ok).length;
  const sin = respuestas.filter((r) => r.elegida === null).length;
  const intento = {
    simulacro_id: E.id, fecha: S.fecha || hoyLima(), turno: S.turno, titulo: S.titulo,
    modo: E.modo, sueno_horas: E.sueno_horas, animo: E.animo,
    inicio: E.inicio, fin: new Date().toISOString(),
    segundos_por_pregunta: S.segundos_por_pregunta,
    total: S.n, aciertos, errores: S.n - aciertos - sin, sin_responder: sin,
    nota: (aciertos / S.n) * 20,
    segundos_total: E.transcurrido,
    respuestas,
  };
  // cuaderno de errores, aciertos adivinando y perlas
  for (const [k, r] of respuestas.entries()) {
    const q = S.preguntas[k];
    if (!r.ok) store.registrarError(q, E.id, null, r.confianza);
    else if (r.confianza === 'adivinando') store.registrarDudoso(q, E.id);
    store.registrarPerla(q);
  }
  store.guardarIntento(intento);
  store.limpiarBorrador(E.id);
  document.body.classList.remove('en-examen');
  const id = E.id; E = null;
  location.hash = `#/resultados/${id}`;
}
