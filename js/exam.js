// Motor del examen: cronómetro por pregunta, modo examen / estudio, seguridad y marcas.
import { el, $, LETRAS, mmss, vibrar, toast, hoyLima, CONFIANZA } from './util.js';
import { store, cfg } from './store.js';
import { simulacro } from './data.js';
import { montarLienzo, TINTAS } from './dibujo.js';

let S = null;   // simulacro
let E = null;   // estado del intento en curso
let reloj = null;

/** Ritmos disponibles. El total manda; el objetivo por pregunta solo orienta. */
export const RITMOS = {
  real:     { nombre: 'Examen real', total: 120, objetivo: 30, detalle: '2 horas para 100 · objetivo 30 s por pregunta' },
  exigente: { nombre: 'Exigente',    total: 100, objetivo: 25, detalle: '1 h 40 para 100 · objetivo 25 s por pregunta' },
  holgado:  { nombre: 'Holgado',     total: 150, objetivo: 45, detalle: '2 h 30 para 100 · objetivo 45 s por pregunta' },
};
/** Minutos totales para este simulacro, en proporción a sus preguntas. */
const minutosTotales = (ritmo, n) => Math.round((RITMOS[ritmo].total * n) / 100);

/* ---------- pantalla previa: sueño, ánimo y modo ---------- */
export async function pantallaPre(vista, id) {
  const s = await simulacro(id);
  if (!s) return vista.append(el('div', { class: 'vacio' }, el('span', { class: 'ic' }, '🕐'), 'Ese simulacro todavía no está publicado.'));

  const previo = store.intento(id);
  const borr = store.borrador(id);
  let sueno = borr?.sueno_horas ?? 7;
  let animo = borr?.animo ?? 3;
  let modo = borr?.modo ?? cfg.leer().modo ?? 'examen';
  let ritmo = borr?.ritmo ?? cfg.leer().ritmo ?? 'real';

  const c = el('div');
  c.append(el('h1', {}, s.titulo), el('p', {}, el('small', {}, `${s.n} preguntas · ${s.turno === 'noche' ? '2 temas' : 'mixto'}`)));

  if (previo) {
    c.append(el('div', { class: 'card' },
      el('h3', {}, 'Ya lo resolviste'),
      el('p', {}, el('small', {}, `Nota ${previo.nota.toFixed(1)} · ${previo.aciertos}/${previo.total} aciertos`)),
      el('div', { class: 'row' },
        el('a', { class: 'btn pri', href: `#/resultados/${id}` }, 'Ver resultados'),
        el('button', { class: 'btn ghost', onclick: () => { if (confirm('¿Rehacer el simulacro desde cero? Se borra el intento anterior.')) { store.limpiarBorrador(id); arrancar(id, { sueno, animo, modo, ritmo }); } } }, 'Rehacer'),
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
    mk('examen', 'Examen', 'Con reloj total, sin respuestas hasta el final'),
    mk('estudio', 'Estudio', 'Sin reloj, con la explicación al instante')));

  // --- ritmo: el reloj nunca corta, solo orienta ---
  const fRitmo = el('div', { class: 'card' }, el('h3', {}, 'Ritmo'),
    el('p', {}, el('small', {}, 'El reloj es para todo el simulacro. Ninguna pregunta se cierra sola: si una te pide más tiempo, dáselo.')));
  const opsR = el('div', { class: 'opts' });
  for (const [k, r] of Object.entries(RITMOS)) {
    opsR.append(el('button', {
      class: 'opt', 'aria-pressed': ritmo === k ? 'true' : 'false',
      onclick: (ev) => {
        ritmo = k;
        [...opsR.querySelectorAll('.opt')].forEach((x) => x.setAttribute('aria-pressed', 'false'));
        ev.currentTarget.setAttribute('aria-pressed', 'true');
      },
    }, el('span', { class: 'le' }, k === 'real' ? '🎯' : k === 'exigente' ? '⚡' : '🫶'),
       el('span', {}, el('b', {}, r.nombre),
          el('small', { style: 'display:block' }, `${minutosTotales(k, s.n)} min en total · objetivo ${r.objetivo} s por pregunta`))));
  }
  fRitmo.append(opsR);

  c.append(fSueno, fAnimo, fModo, fRitmo,
    el('button', { class: 'btn pri full', style: 'margin-top:4px', onclick: () => { cfg.guardar({ ...cfg.leer(), modo, ritmo }); arrancar(id, { sueno, animo, modo, ritmo }); } }, 'Empezar'));
  vista.append(c);
}

function arrancar(id, { sueno, animo, modo, ritmo }) {
  // Ojo: el borrador guarda `sueno_horas`, que es el nombre que lee pantallaExamen.
  store.guardarBorrador(id, {
    sueno_horas: sueno, animo, modo, ritmo,
    i: 0, respuestas: {}, transcurrido: 0, inicio: new Date().toISOString(),
  });
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
    resp: {},            // qid -> {elegida, confianza, marcada, segundos, cambios[], descartadas[]}
    ritmo: b.ritmo || 'real',
    totalInicial: 0, totalRestante: 0, objetivo: 0,
    pausado: false, corteTiempo: false,
    lienzo: null,        // capa de lápiz de la pregunta en pantalla
    dedo: false,         // ¿dibujar con el dedo? (el Apple Pencil no lo necesita)
    tinta: 0,
  };
  for (const q of S.preguntas) E.resp[q.id] = { elegida: null, confianza: null, marcada: false, segundos: 0, cambios: [], descartadas: [] };
  Object.assign(E.resp, b.respuestas || {});
  for (const r of Object.values(E.resp)) r.descartadas ||= [];   // intentos empezados antes de esta mejora
  const R = RITMOS[E.ritmo] || RITMOS.real;
  E.totalInicial = minutosTotales(E.ritmo, S.n) * 60;
  E.totalRestante = b.totalRestante ?? E.totalInicial;
  E.objetivo = R.objetivo;


  document.body.classList.add('en-examen');
  vista.replaceChildren();
  vista.append(barraTiempo(), el('div', { id: 'q' }));
  pintarPregunta();
  if (E.modo === 'examen') iniciarReloj();
  else pintarTiempo();
}

export function salirDelExamen() {
  clearInterval(reloj); reloj = null;
  E?.lienzo?.destruir(); if (E) E.lienzo = null;
  document.body.classList.remove('en-examen');
  if (E) guardar();
}

/**
 * Barra de tiempo. El reloj que manda es el TOTAL del examen; el contador de la
 * pregunta es solo un objetivo de ritmo y nunca corta ni bloquea nada.
 */
function barraTiempo() {
  const conReloj = E.modo === 'examen';
  return el('div', { class: 'timerbar', id: 'tb' },
    el('div', { class: 'bar' }, el('i', { id: 'tb-i' })),
    el('div', { class: 'meta' },
      el('span', {}, 'Pregunta ', el('b', { id: 'tb-n' }, '1'), ` de ${S.n}`),
      el('span', { class: 'chip', id: 'tb-sin', style: 'display:none' }, ''),
      el('span', { class: 'spacer' }),
      conReloj ? el('span', { id: 'tb-ritmo', class: 'ritmo' }, '') : null,
      conReloj
        ? el('span', {}, 'quedan ', el('b', { class: 'seg', id: 'tb-total' }, mmss(E.totalRestante)))
        : el('span', {}, 'modo estudio · ', el('b', { id: 'tb-total' }, '0:00')),
      conReloj ? el('button', {
        class: 'btn-pausa', id: 'tb-pausa', title: 'Pausar el reloj',
        onclick: () => alternarPausa(),
      }, '⏸') : null,
    ));
}

/** Pausa y reanuda el reloj, para cuando algo la interrumpe. */
function alternarPausa() {
  E.pausado = !E.pausado;
  const b = $('#tb-pausa');
  if (b) { b.textContent = E.pausado ? '▶' : '⏸'; b.setAttribute('aria-pressed', E.pausado ? 'true' : 'false'); }
  $('#tb')?.classList.toggle('pausado', E.pausado);
  let aviso = $('#aviso-pausa');
  if (E.pausado && !aviso) {
    aviso = el('div', { class: 'pausa-capa', id: 'aviso-pausa' },
      el('div', { class: 'card', style: 'text-align:center;max-width:320px' },
        el('h3', {}, '⏸ En pausa'),
        el('p', {}, el('small', {}, 'El reloj está detenido. Tómate el tiempo que necesites.')),
        el('button', { class: 'btn pri full', onclick: () => alternarPausa() }, 'Seguir')));
    document.body.append(aviso);
  } else if (!E.pausado) {
    aviso?.remove();
  }
  guardar();
}

function iniciarReloj() {
  clearInterval(reloj);
  reloj = setInterval(() => {
    if (E.pausado) return;
    E.transcurrido++;
    const q = S.preguntas[E.i];
    E.resp[q.id].segundos = (E.resp[q.id].segundos || 0) + 1;

    E.totalRestante = Math.max(0, E.totalRestante - 1);

    // Avisos antes del corte, como en el examen real.
    if (E.totalRestante === 900) { vibrar(70); toast('Quedan 15 minutos'); }
    if (E.totalRestante === 300) { vibrar([70, 60, 70]); toast('Quedan 5 minutos'); }
    if (E.totalRestante === 60) { vibrar([70, 60, 70]); toast('Queda 1 minuto'); }

    if (E.totalRestante === 0) {        // el examen se cierra, igual que el de verdad
      E.corteTiempo = true;
      vibrar([120, 80, 120, 80, 200]);
      terminar();
      return;
    }

    pintarTiempo();
    if (E.transcurrido % 5 === 0) guardar();
  }, 1000);
}

function pintarTiempo() {
  const i = E.i, tb = $('#tb');
  if (!tb) return;
  const q = S.preguntas[i];
  const usados = E.resp[q.id].segundos || 0;
  const obj = E.objetivo || 0;

  // la barra muestra el objetivo de ESTA pregunta; al pasarse, se queda llena y ámbar
  const p = obj ? Math.min(100, (100 * usados) / obj) : 100;
  $('#tb-i').style.width = p + '%';
  tb.classList.toggle('pasada', !!obj && usados > obj);
  tb.classList.toggle('rojo', E.modo === 'examen' && E.totalRestante > 0 && E.totalRestante <= 60);

  $('#tb-n').textContent = String(i + 1);
  const tot = $('#tb-total');
  if (tot) tot.textContent = E.modo === 'examen' ? mmss(E.totalRestante) : mmss(E.transcurrido);

  const sin = S.preguntas.filter((x) => E.resp[x.id].elegida === null).length;
  const chip = $('#tb-sin');
  if (chip) {
    chip.style.display = sin ? '' : 'none';
    chip.textContent = `${sin} sin responder`;
    chip.className = 'chip ' + (sin > 5 ? 'bad' : 'warn');
  }

  const r = $('#tb-ritmo');
  if (r) r.replaceChildren(...textoRitmo(usados, obj));
}

/** Dice cómo va de ritmo, sin asustar. */
function textoRitmo(usados, obj) {

  const hechas = S.preguntas.filter((x) => E.resp[x.id].elegida !== null).length;
  const gastado = E.totalInicial - E.totalRestante;
  const deberia = (gastado / E.totalInicial) * S.n;       // dónde debería ir según el reloj
  const dif = Math.round(hechas - deberia);
  const enEsta = obj && usados > obj ? ` · ${usados} s en esta` : '';
  if (hechas < 3) return [el('span', {}, `objetivo ${obj} s${enEsta}`)];
  if (dif >= 3) return [el('span', { class: 'bien' }, `vas adelantada${enEsta}`)];
  if (dif <= -5) return [el('span', { class: 'atras' }, `vas ${-dif} preguntas atrás${enEsta}`)];
  return [el('span', { class: 'bien' }, `buen ritmo${enEsta}`)];
}

function pintarPregunta() {
  const i = E.i, q = S.preguntas[i], r = E.resp[q.id];
  const cont = $('#q'); if (!cont) return;
  const agotada = false;   // ninguna pregunta se cierra nunca
  const revelar = E.modo === 'estudio' && r.elegida !== null;

  E.lienzo?.destruir(); E.lienzo = null;
  cont.replaceChildren();

  const barra = barraLapiz();
  cont.append(barra);

  // Todo lo que se puede anotar va dentro de #qwrap, que es donde se monta el lápiz.
  const caja = el('div', { id: 'qwrap' });
  // NUNCA se muestra especialidad, tema ni diagnóstico aquí.
  caja.append(el('div', { class: 'enun' }, q.enunciado));

  const opts = el('div', { class: 'opts' });
  q.opciones.forEach((txt, k) => {
    const tachada = r.descartadas.includes(k);
    const b = el('button', {
      class: 'opt' + (tachada ? ' descartada' : ''),
      'aria-pressed': r.elegida === k ? 'true' : 'false',
      disabled: agotada || revelar,
      onclick: () => elegir(q, k),
    }, el('span', { class: 'le' }, LETRAS[k]), el('span', { class: 'tx' }, txt));
    if (revelar) {
      if (k === q.clave0) b.classList.add('correcta');
      else if (k === r.elegida) b.classList.add('fallada');
    }
    const tachar = el('button', {
      class: 'tachar', 'aria-pressed': tachada ? 'true' : 'false',
      disabled: agotada || revelar,
      title: tachada ? 'Devolver esta alternativa' : 'Descartar esta alternativa',
      'aria-label': (tachada ? 'Devolver la alternativa ' : 'Descartar la alternativa ') + LETRAS[k],
      onclick: () => descartar(q, k),
    }, tachada ? '↩' : '✕');
    opts.append(el('div', { class: 'optrow' }, b, tachar));
  });
  caja.append(opts);
  cont.append(caja);

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

  // El lienzo se monta siempre: con el modo lápiz apagado no estorba
  // (no recibe toques) pero el Apple Pencil sí puede escribir.
  E.lienzo = montarLienzo(caja, E.id, q.id, () => barra.actualizar());
  E.lienzo.elegirTinta(TINTAS[E.tinta]);
  E.lienzo.conDedo(E.dedo);
  barra.actualizar();

  scrollTo({ top: 0, behavior: 'instant' });
}

/**
 * Barra del lápiz, siempre visible y sin nada que activar.
 * El Apple Pencil escribe directo; el botón del dedo es solo para el celular
 * o si prefiere subrayar con el dedo.
 */
function barraLapiz() {
  const barra = el('div', { class: 'lapiz' });
  TINTAS.forEach((t, k) => {
    barra.append(el('button', {
      class: 'tinta', 'aria-pressed': E.tinta === k ? 'true' : 'false',
      title: t.nombre, 'aria-label': t.nombre, style: `background:${t.color}`,
      onclick: () => {
        E.tinta = k; E.lienzo?.elegirTinta(t);
        [...barra.querySelectorAll('.tinta')].forEach((x, j) => x.setAttribute('aria-pressed', j === k ? 'true' : 'false'));
      },
    }));
  });
  const pista = el('span', { class: 'pista' }, 'Escribe con el Pencil');
  const deshacer = el('button', { class: 'txt', title: 'Deshacer el último trazo', onclick: () => E.lienzo?.deshacer() }, '↶');
  const borrar = el('button', { class: 'txt', title: 'Borrar todo lo anotado', onclick: () => E.lienzo?.borrar() }, 'Borrar');
  const conDedo = el('button', {
    class: 'txt', 'aria-pressed': E.dedo ? 'true' : 'false',
    title: 'Dibujar con el dedo (en el celular)',
    onclick: () => {
      E.dedo = !E.dedo;
      E.lienzo?.conDedo(E.dedo);
      barra.actualizar();
    },
  }, '☝️ dedo');
  barra.append(pista, deshacer, borrar, conDedo);

  barra.actualizar = () => {
    const vacio = E.lienzo?.vacio !== false;
    deshacer.disabled = vacio;
    borrar.disabled = vacio;
    conDedo.setAttribute('aria-pressed', E.dedo ? 'true' : 'false');
    pista.textContent = E.dedo
      ? 'El dedo dibuja: apágalo para marcar'
      : 'Escribe con el Pencil';
  };
  return barra;
}

/** Tachar o devolver una alternativa. No elige nada, solo ayuda a descartar. */
function descartar(q, k) {
  const r = E.resp[q.id];
  const i = r.descartadas.indexOf(k);
  if (i >= 0) r.descartadas.splice(i, 1);
  else {
    r.descartadas.push(k);
    if (r.elegida === k) r.elegida = null;   // si la tenías marcada, se suelta
  }
  vibrar(25);
  guardar();
  pintarPregunta();
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
    if (r.elegida === null && r.segundos > 0) b.style.opacity = .6;   // visitada y sin responder
    g.append(b);
  });
}

function ir(k) {
  if (k < 0 || k >= S.n) return;

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
  if (E.i < S.n - 1) setTimeout(() => ir(E.i + 1), 160);
}

function guardar() {
  if (!E) return;
  store.guardarBorrador(E.id, {
    modo: E.modo, sueno_horas: E.sueno_horas, animo: E.animo, inicio: E.inicio,
    ritmo: E.ritmo, i: E.i, transcurrido: E.transcurrido, respuestas: E.resp,
    totalRestante: E.totalRestante,
  });
}

/** Antes de terminar: enseña exactamente cuáles faltan y deja ir a cada una. */
function pedirTerminar() {
  const sin = S.preguntas.map((q, k) => ({ q, k })).filter(({ q }) => E.resp[q.id].elegida === null);
  const marc = S.preguntas.map((q, k) => ({ q, k })).filter(({ q }) => E.resp[q.id].marcada && E.resp[q.id].elegida !== null);

  if (!sin.length && !marc.length) {
    if (confirm('¿Terminar el simulacro?')) terminar();
    return;
  }

  const capa = el('div', { class: 'pausa-capa', id: 'capa-terminar' });
  const tarjeta = el('div', { class: 'card', style: 'max-width:420px;width:100%;max-height:80vh;overflow:auto' });
  tarjeta.append(el('h3', {}, sin.length ? `Te faltan ${sin.length} por responder` : 'Tienes preguntas marcadas'));

  if (sin.length) {
    tarjeta.append(el('p', {}, el('small', {}, 'Una pregunta en blanco es un punto regalado. Toca el número para ir a ella.')));
    const g = el('div', { class: 'qgrid', style: 'margin:0 0 14px' });
    for (const { k } of sin) g.append(el('button', { class: 'mal', onclick: () => { capa.remove(); ir(k); } }, String(k + 1)));
    tarjeta.append(g);
  }
  if (marc.length) {
    tarjeta.append(el('p', {}, el('small', {}, `Marcaste ${marc.length} para revisar:`)));
    const g2 = el('div', { class: 'qgrid', style: 'margin:0 0 14px' });
    for (const { k } of marc) g2.append(el('button', { class: 'marc', onclick: () => { capa.remove(); ir(k); } }, String(k + 1)));
    tarjeta.append(g2);
  }
  tarjeta.append(el('div', { class: 'row', style: 'gap:10px' },
    el('button', { class: 'btn pri', style: 'flex:1', onclick: () => capa.remove() }, 'Seguir resolviendo'),
    el('button', { class: 'btn bad', style: 'flex:1', onclick: () => { capa.remove(); terminar(); } }, 'Terminar igual')));
  capa.append(tarjeta);
  document.body.append(capa);
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
      descartadas: [...(r.descartadas || [])],
      descarto_la_correcta: (r.descartadas || []).includes(q.clave0),
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
    ritmo: E.ritmo, minutos_limite: Math.round(E.totalInicial / 60),
    objetivo_por_pregunta: E.objetivo,
    corte_por_tiempo: !!E.corteTiempo,
    segundos_por_pregunta: E.objetivo,
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
