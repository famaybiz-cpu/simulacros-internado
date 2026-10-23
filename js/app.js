// Router y pantallas principales.
import { el, $, $$, fmt, semaforo, hoyLima, fechaLarga, diasEntre, fase, ENFASIS, EXAMEN, toast, descargar, mmss } from './util.js';
import { store, cfg } from './store.js';
import { sincronizar, sincronizarAhora, estadoSync, pintarEstadoSync } from './sync.js';
import { indice, delDia, simulacro, precargar, guardados } from './data.js';
import { pantallaPre, pantallaExamen, salirDelExamen } from './exam.js';
import { pantallaResultados } from './results.js';
import { pantallaProgreso } from './progress.js';
import { pantallaErrores, pantallaRepaso, pantallaPerlas, pantallaHistorial } from './tools.js';
import { pantallaTarjetas, pantallaRepasarTarjetas, pantallaAudioTarjetas } from './tarjetas.js';
import { aplicarTema, leerTema, guardarTema, PALETAS, MODOS } from './tema.js';
import { caminoAl16, metaDiaria, panelInsignias } from './motivacion.js';
import { sincronizarTarjetas } from './data.js';
import { pantallaAlto } from './alto.js';

const vista = $('#vista');
let rutaActual = '';

/* ---------------- router ---------------- */
async function router() {
  const h = (location.hash || '#/').slice(1);
  const [, p1, p2] = h.split('/');
  if (rutaActual.startsWith('/examen')) salirDelExamen();
  rutaActual = h;

  vista.replaceChildren();
  vista.classList.remove('ancho');
  scrollTo({ top: 0, behavior: 'instant' });
  $('#btn-atras').hidden = h === '/' ;
  document.body.classList.remove('en-examen');
  marcarTab(h);

  try {
    switch (p1 || '') {
      case '':           titulo('Hoy');                 await pantallaHoy(vista); break;
      case 'pre':        titulo('Antes de empezar');    await pantallaPre(vista, p2); break;
      case 'examen':     titulo('');                    await pantallaExamen(vista, p2); break;
      case 'resultados': titulo('Resultados');          await pantallaResultados(vista, p2); break;
      case 'progreso':   titulo('Progreso');            pantallaProgreso(vista); break;
      case 'errores':    titulo('Errores');             pantallaErrores(vista); break;
      case 'repaso':     titulo('Repaso');              pantallaRepaso(vista, p2); break;
      case 'perlas':     titulo('Perlas');              pantallaPerlas(vista); break;
      case 'tarjetas':   titulo('Mis tarjetas');        await pantallaTarjetas(vista); break;
      case 'repasar-tarjetas': titulo('Repaso');        pantallaRepasarTarjetas(vista); break;
      case 'audio-tarjetas':   titulo('Repaso en audio'); pantallaAudioTarjetas(vista); break;
      case 'mas':        titulo('Más');                 pantallaMas(vista); break;
      case 'alto-rendimiento': titulo('Alto rendimiento'); await pantallaAlto(vista, p2); break;
      case 'historial':  titulo('Historial');           await pantallaHistorial(vista); break;
      case 'ajustes':    titulo('Ajustes');             pantallaAjustes(vista); break;
      default:           location.hash = '#/';
    }
  } catch (e) {
    vista.append(el('div', { class: 'vacio' }, el('span', { class: 'ic' }, '⚠️'), 'Algo falló: ' + (e.message || e)));
    console.error(e);
  }
  pintarEstadoSync();
}

const titulo = (t) => { $('#titulo').textContent = t || 'Simulacros Internado'; };
const marcarTab = (h) => {
  const base = '/' + (h.split('/')[1] || '');
  $$('nav.tabs a').forEach((a) => {
    if (a.dataset.t === base) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
};

/* ---------------- pantalla de hoy ---------------- */
async function pantallaHoy(v) {
  const hoy = hoyLima();
  const f = fase(hoy);

  // contador regresivo
  const cd = el('div', { class: 'countdown' });
  const campos = {};
  for (const [k, et] of [['d', 'días'], ['h', 'horas'], ['m', 'min']]) {
    const b = el('b', {}, '—');
    campos[k] = b;
    cd.append(el('div', {}, b, el('small', {}, et)));
  }
  const tick = () => {
    const ms = new Date(EXAMEN.fechaISO) - new Date();
    if (ms <= 0) { campos.d.textContent = campos.h.textContent = campos.m.textContent = '0'; return; }
    const m = Math.floor(ms / 60000);
    campos.d.textContent = Math.floor(m / 1440);
    campos.h.textContent = Math.floor((m % 1440) / 60);
    campos.m.textContent = m % 60;
  };
  tick(); clearInterval(window.__cd); window.__cd = setInterval(tick, 20000);

  const enf = ENFASIS[hoy];
  v.append(el('div', { class: 'card' },
    el('small', {}, 'Examen de internado · domingo 8 de noviembre, 7:00 am'),
    cd,
    el('div', { class: 'row' },
      el('span', { class: 'chip ac' }, `Fase ${f.n}: ${f.t}`),
      el('span', { class: 'chip' }, fechaLarga(hoy))),
    el('p', { style: 'margin:12px 0 0' }, el('small', {}, metaDelDia(hoy, f, enf)))));

  // tarjetas de los simulacros
  const d = await delDia(hoy);
  const g = el('div', { class: 'grid2', style: 'margin:0 0 14px' });
  g.append(await tarjetaSim(d.manana, '☀️ Simulacro de la mañana', '100 preguntas · mixto', d.meta));
  g.append(await tarjetaSim(d.noche, '🌙 Simulacro de la noche', '50 preguntas · 2 temas', d.meta));
  v.append(g);

  const es = estadoSync();
  if (!es.configurado) {
    v.append(el('div', { class: 'card', style: 'background:var(--bad-soft);border-color:transparent' },
      el('h3', { style: 'color:var(--bad)' }, '⚠ Este dispositivo no sincroniza'),
      el('p', {}, el('small', {}, 'Lo que resuelvas aquí se queda solo en este aparato y no lo verás en el otro. Se arregla una vez y listo.')),
      el('a', { class: 'btn pri full', href: '#/ajustes' }, 'Conectarlo ahora')));
  }

  v.append(caminoAl16());
  v.append(metaDiaria());

  // tarjetas pendientes de hoy
  const pend = store.tarjetasVencidas().length;
  if (pend) v.append(el('a', { class: 'btn pri full', href: '#/repasar-tarjetas', style: 'margin:0 0 14px' },
    `🃏 Repasar ${pend} tarjeta${pend === 1 ? '' : 's'} de hoy`));

  // racha + checklist
  const r = store.racha();
  const ck = store.d.checklist[hoy] || {};
  const lista = el('ul', { class: 'lista' });
  const items = [
    ['manana', 'Simulacro de la mañana'],
    ['noche', 'Simulacro de la noche'],
    ['errores', 'Repasé mis errores'],
    ['perlas', 'Leí las perlas'],
  ];
  for (const [k, et] of items) {
    const auto = k === 'manana' || k === 'noche';
    const chk = el('span', {
      class: 'check', role: 'checkbox', tabindex: 0, 'aria-checked': ck[k] ? 'true' : 'false',
      onclick: () => { if (auto) { toast('Se marca sola al terminar el simulacro'); return; } store.marcarChecklist(hoy, k, !(store.d.checklist[hoy] || {})[k]); router(); },
    }, '✓');
    lista.append(el('li', {}, chk, el('span', { style: 'flex:1' }, et),
      auto ? el('small', {}, 'automático') : null));
  }
  v.append(el('div', { class: 'card' },
    el('div', { class: 'row sp' }, el('h3', { style: 'margin:0' }, 'Hoy'),
      el('span', { class: 'chip ' + (r >= 3 ? 'ok' : '') }, `🔥 racha ${r} día${r === 1 ? '' : 's'}`)),
    el('div', { style: 'height:10px' }), lista));

  // últimas notas
  const ult = store.d.intentos.slice(-4).reverse();
  if (ult.length) {
    const c = el('div', { class: 'card' }, el('div', { class: 'row sp' }, el('h3', { style: 'margin:0' }, 'Últimos resultados'), el('a', { href: '#/progreso' }, 'ver todo')));
    for (const i of ult) {
      c.append(el('a', { href: `#/resultados/${i.simulacro_id}`, class: 'row sp', style: 'padding:11px 0;border-top:1px solid var(--line);text-decoration:none;color:inherit' },
        el('span', {}, (i.turno === 'noche' ? '🌙 ' : '☀️ ') + fechaLarga(i.fecha)),
        el('span', { class: 'row', style: 'gap:7px' },
          el('span', { class: 'sem ' + semaforo(i.nota) }),
          el('b', { style: 'font-variant-numeric:tabular-nums' }, fmt(i.nota, 1)))));
    }
    v.append(c);
  }

  v.append(panelInsignias());

  // accesos rápidos
  const venc = store.erroresVencidos().length;
  v.append(el('div', { class: 'row' },
    el('a', { class: 'btn' + (venc ? ' pri' : ''), href: '#/repaso/errores', style: 'flex:1' }, venc ? `Repasar ${venc} errores` : 'Cuaderno de errores'),
    el('a', { class: 'btn', href: '#/repaso/mini', style: 'flex:1' }, 'Mini-repaso de 5')));
}

function metaDelDia(hoy, f, enf) {
  if (hoy === '2026-11-08') return '¡Hoy es el examen! Nada de simulacros. Desayuna, respira y confía en lo que ya sabes.';
  if (hoy > '2026-11-08') return 'El examen ya pasó. Suerte con los resultados.';
  const falta = diasEntre(hoy, '2026-11-08');
  const base = `Faltan ${falta} día${falta === 1 ? '' : 's'}. Meta del día: 100 + 50 preguntas y nota ≥ 16.`;
  if (f.n === 1) return `${base} Hoy el simulacro de la mañana carga un 20 % extra de una especialidad${enf ? '' : ''} (no te digo cuál).`;
  if (f.n === 2) return `${base} El simulacro de la mañana trae 30 % de tus temas débiles y las preguntas gemelas de tus errores.`;
  if (f.n === 3) return `${base} Repaso final: ya están descargados los simulacros del 6 y 7 para usarlos sin internet.`;
  if (f.n === 0) return `Faltan ${falta} días. El plan arranca el 18 de octubre.`;
  return base;
}

async function tarjetaSim(id, tit, sub, meta) {
  const c = el('div', { class: 'card', style: 'margin:0' });
  const m = id ? meta?.get(id) : null;
  if (m?.n) sub = `${m.n} preguntas${m.titulo && m.titulo !== tit.slice(3) ? ' · ' + m.titulo : sub.includes('·') ? ' · ' + sub.split('· ')[1] : ''}`;
  c.append(el('h3', {}, tit), el('p', {}, el('small', {}, sub)));
  if (!id) {
    c.append(el('span', { class: 'chip warn' }, 'pendiente de generar'));
    c.append(el('p', { style: 'margin:10px 0 0' }, el('small', {}, 'La rutina lo publica a las 5:00 am (mañana) y 6:00 pm (noche).')));
    return c;
  }
  const it = store.intento(id);
  const borr = store.borrador(id);
  if (it) {
    const sem = semaforo(it.nota);
    c.append(el('div', { class: 'row' },
      el('span', { class: 'chip ' + (sem === 'v' ? 'ok' : sem === 'a' ? 'warn' : 'bad') }, `hecho · nota ${fmt(it.nota, 1)}`)),
      el('div', { style: 'height:10px' }));
    c.append(el('a', { class: 'btn full', href: `#/resultados/${id}`, style: 'margin-top:12px' }, 'Ver resultados'));
  } else if (borr) {
    const resp = Object.values(borr.respuestas || {}).filter((r) => r.elegida !== null).length;
    c.append(el('span', { class: 'chip ac' }, `empezado · ${resp} respondidas`));
    c.append(el('a', { class: 'btn pri full', href: `#/examen/${id}`, style: 'margin-top:12px' }, 'Continuar'));
  } else {
    c.append(el('span', { class: 'chip ok' }, 'listo'));
    c.append(el('a', { class: 'btn pri full', href: `#/pre/${id}`, style: 'margin-top:12px' }, 'Empezar'));
  }
  return c;
}

/* ---------------- ajustes ---------------- */
function pantallaAjustes(v) {
  const c = cfg.leer();
  const es = estadoSync();
  v.append(el('h1', {}, 'Ajustes'));

  // --- apariencia ---
  const tema = leerTema();
  const cTema = el('div', { class: 'card' }, el('h3', {}, 'Colores'));
  const pal = el('div', { class: 'paletas' });
  for (const [k, p] of Object.entries(PALETAS)) {
    pal.append(el('button', {
      class: 'paleta', 'aria-pressed': tema.paleta === k ? 'true' : 'false',
      onclick: () => { guardarTema({ paleta: k }); router(); },
    }, el('span', { class: 'muestras' }, ...p.muestra.map((c) => el('i', { style: `background:${c}` }))),
       el('b', {}, p.nombre)));
  }
  cTema.append(pal);
  const modos = el('div', { class: 'row', style: 'margin-top:12px' });
  for (const [k, et] of Object.entries(MODOS)) {
    modos.append(el('button', {
      class: 'btn sm', style: tema.modo === k ? 'border-color:var(--ac);background:var(--ac-soft);color:var(--ac)' : '',
      onclick: () => { guardarTema({ modo: k }); router(); },
    }, et));
  }
  cTema.append(el('small', { style: 'display:block;margin-top:14px;color:var(--fg2);font-weight:700' }, 'Claro u oscuro'), modos);
  v.append(cTema);

  // --- sincronización ---
  const card = el('div', { class: 'card' }, el('h3', {}, 'Sincronizar iPad y celular'));
  card.append(el('p', {}, el('small', {}, es.configurado
    ? (es.activo ? '✓ Conectado a Firebase. Tu progreso viaja entre dispositivos.' : '⚠ Configurado pero sin conectar. ' + (es.error || ''))
    : 'Pega acá la configuración de tu proyecto de Firebase (está en FIREBASE.md) y elige un PIN. Sin esto la app igual funciona, pero el progreso se queda en este dispositivo.')));

  const inPin = el('input', { type: 'text', value: c.pin || '', placeholder: 'por ejemplo maria2026', autocapitalize: 'none', autocomplete: 'off' });
  const inCfg = el('textarea', { placeholder: '{\n  "apiKey": "AIza...",\n  "projectId": "simulacros-internado"\n}' });
  if (c.firebase) inCfg.value = JSON.stringify(c.firebase, null, 2);

  card.append(
    el('label', { class: 'fld' }, el('span', {}, 'Mi PIN personal (mínimo 6 caracteres, el mismo en los dos dispositivos)'), inPin),
    el('label', { class: 'fld' }, el('span', {}, 'Configuración de Firebase (apiKey y projectId)'), inCfg),
    el('div', { class: 'row' },
      el('button', { class: 'btn pri', onclick: async () => {
        const pin = inPin.value.trim();
        if (pin.length < 6) return toast('El PIN debe tener al menos 6 caracteres');
        let fb = null;
        try {
          const t = inCfg.value.trim();
          if (t) {
            fb = JSON.parse(t.replace(/^const\s+\w+\s*=\s*/, '').replace(/;\s*$/, ''));
            if (!fb.apiKey || !fb.projectId) return toast('Falta apiKey o projectId');
          }
        } catch { return toast('Esa configuración no es un JSON válido'); }
        cfg.guardar({ ...c, pin, firebase: fb });
        toast('Guardado, sincronizando…');
        await sincronizar({ silencioso: false });
        router();
      } }, 'Guardar y sincronizar'),
      es.configurado ? el('button', { class: 'btn', onclick: () => sincronizar({ silencioso: false }) }, 'Sincronizar ahora') : null));
  v.append(card);

  // --- offline ---
  const cOff = el('div', { class: 'card' }, el('h3', {}, 'Usar sin internet'),
    el('p', {}, el('small', {}, `Tienes ${guardados().length} simulacro(s) descargados en este dispositivo. Descárgalos antes de viajar a Lima.`)));
  cOff.append(el('button', { class: 'btn full', onclick: async (ev) => {
    ev.target.disabled = true; ev.target.textContent = 'Descargando…';
    const idx = await indice();
    const ids = (idx.simulacros || []).map((x) => (typeof x === 'string' ? x : x.id));
    const r = await precargar(ids);
    toast(`Descargados ${r.ok} simulacros`); router();
  } }, 'Descargar todos los simulacros'));
  v.append(cOff);

  // --- progreso ---
  const cProg = el('div', { class: 'card' }, el('h3', {}, 'Mi progreso'),
    el('p', {}, el('small', {}, `${store.d.intentos.length} simulacros · ${store.d.errores.length} errores · ${store.d.perlas.length} perlas · última actualización ${new Date(store.d.actualizado).toLocaleString('es-PE')}`)));
  const inFile = el('input', { type: 'file', accept: '.json', style: 'display:none', onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { store.importar(await f.text()); toast('Progreso importado'); router(); }
    catch (err) { toast('No se pudo importar: ' + err.message); }
  } });
  cProg.append(el('div', { class: 'row' },
    el('button', { class: 'btn pri', onclick: () => descargar(`progreso-internado-${hoyLima()}.json`, store.exportar()) }, 'Exportar progreso'),
    el('button', { class: 'btn', onclick: () => inFile.click() }, 'Importar'),
    inFile));
  v.append(cProg);

  // --- instalar ---
  v.append(el('div', { class: 'card' }, el('h3', {}, 'Añadir a la pantalla de inicio'),
    el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'iPhone'),
      '1. Abre este link en Safari (no en Chrome).  2. Toca el botón Compartir (el cuadrado con la flecha hacia arriba, abajo en el centro).  3. Desliza y toca «Añadir a pantalla de inicio».  4. Toca «Añadir». Te queda el ícono como una app.'),
    el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'iPad'),
      '1. Abre el link en Safari.  2. Toca Compartir (arriba a la derecha).  3. «Añadir a pantalla de inicio» → «Añadir».'),
    el('p', {}, el('small', {}, 'Abierta así ocupa toda la pantalla, no se ve la barra del navegador y funciona sin internet.'))));

  // --- zona de riesgo ---
  v.append(el('div', { class: 'card' }, el('h3', {}, 'Borrar'),
    el('button', { class: 'btn bad full', onclick: () => {
      if (!confirm('¿Borrar TODO el progreso de este dispositivo? Si tienes Firebase configurado, se volverá a bajar de la nube.')) return;
      localStorage.removeItem('si.progreso.v1'); location.reload();
    } }, 'Borrar el progreso de este dispositivo')));
}

/* ---------------- pantalla «Más» ---------------- */
function pantallaMas(v) {
  v.append(el('h1', {}, 'Más'));
  const enlaces = [
    ['#/perlas', '💡', 'Perlas', 'Tus perlas con repetición espaciada'],
    ['#/audio-tarjetas', '🎧', 'Repaso en audio', 'Escucha las tarjetas, sin mirar la pantalla'],
    ['#/alto-rendimiento', '🎯', 'Alto rendimiento', 'Temas que se repiten, Top 100 perlas y normas técnicas'],
    ['#/historial', '🗂', 'Historial', 'Reabre cualquier simulacro pasado'],
    ['#/repaso/mini', '⚡', 'Mini-repaso', '5 preguntas para un tiempo muerto'],
    ['#/ajustes', '⚙', 'Ajustes', 'Colores, sincronización y copias'],
  ];
  const lista = el('div');
  for (const [href, ic, tit, sub] of enlaces) {
    lista.append(el('a', { class: 'fila-mas', href },
      el('span', { class: 'ic' }, ic),
      el('span', { style: 'flex:1' }, el('b', {}, tit), el('small', { style: 'display:block' }, sub)),
      el('span', { style: 'color:var(--fg3)' }, '›')));
  }
  v.append(el('div', { class: 'card' }, lista));
}

/* ---------------- arranque ---------------- */
$('#btn-atras').addEventListener('click', () => (history.length > 1 ? history.back() : (location.hash = '#/')));
$('#btn-ajustes').addEventListener('click', () => (location.hash = '#/ajustes'));
$('#estado-sync').addEventListener('click', () => {
  const e = estadoSync();
  if (!e.configurado) location.hash = '#/ajustes';
  else sincronizarAhora();
});
vista.addEventListener('recargar', () => router());
addEventListener('hashchange', router);

// aviso al salir de un examen en curso
addEventListener('beforeunload', (e) => {
  if (document.body.classList.contains('en-examen')) { e.preventDefault(); e.returnValue = ''; }
});

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

aplicarTema();
router();
// Al abrir: primero se trae lo más reciente de la nube y se funde; nunca se
// pisa lo remoto con algo viejo del dispositivo.
sincronizar({ silencioso: true }).then(() => {
  sincronizarTarjetas(store).catch(() => {});
  router();                       // repinta con lo que acaba de bajar
});
