// Panel de progreso: evolución, semáforos, seguridad, fatiga, tiempo, cambios, trampas y sueño.
import { el, fmt, pct, semaforo, fechaCorta, diasEntre, hoyLima, EXAMEN, TRAMPAS, MOTIVOS } from './util.js';
import { store } from './store.js';
import { lineaNota, barras, columnas } from './charts.js';

const seccion = (t, ...hijos) => el('div', { class: 'card' }, el('h3', {}, t), ...hijos.flat().filter(Boolean));
const nota = (ok, n) => (n ? (ok / n) * 20 : 0);

export function pantallaProgreso(vista) {
  const R = store.resumen();
  const ints = R.intentos;
  vista.classList.add('ancho');

  if (!ints.length) {
    return vista.append(el('div', { class: 'vacio' }, el('span', { class: 'ic' }, '📈'),
      'Cuando resuelvas tu primer simulacro, acá aparece todo tu análisis.'));
  }

  const global = ints.reduce((a, i) => ({ ok: a.ok + i.aciertos, n: a.n + i.total }), { ok: 0, n: 0 });
  const nGlobal = nota(global.ok, global.n);

  vista.append(el('h1', {}, 'Progreso'));
  vista.append(el('div', { class: 'kpis', style: 'margin:0 0 14px' },
    el('div', { class: 'kpi' }, el('b', { style: `color:var(--${semaforo(nGlobal) === 'v' ? 'ok' : semaforo(nGlobal) === 'a' ? 'warn' : 'bad'})` }, fmt(nGlobal, 1)), el('small', {}, 'nota global')),
    el('div', { class: 'kpi' }, el('b', {}, String(ints.length)), el('small', {}, 'simulacros')),
    el('div', { class: 'kpi' }, el('b', {}, String(global.n)), el('small', {}, 'preguntas')),
    el('div', { class: 'kpi' }, el('b', {}, String(store.d.errores.filter((e) => !e.dominada).length)), el('small', {}, 'en el cuaderno'))));

  // 15 · evolución y proyección
  const am = ints.filter((i) => i.turno === 'manana'), pm = ints.filter((i) => i.turno === 'noche');
  const serie = (xs) => xs.map((i) => ({ v: i.nota, et: fechaCorta(i.fecha) }));
  const proy = proyeccion(ints);
  vista.append(seccion('Evolución de la nota',
    lineaNota([
      { nombre: 'Mañana', color: 'var(--ac)', puntos: serie(am) },
      { nombre: 'Noche', color: 'var(--warn)', puntos: serie(pm) },
    ], { meta: EXAMEN.meta }),
    el('div', { class: 'row', style: 'margin-top:8px' },
      el('span', { class: 'chip ac' }, 'Mañana ' + (am.length ? fmt(nota(am.reduce((a, i) => a + i.aciertos, 0), am.reduce((a, i) => a + i.total, 0)), 1) : '—')),
      el('span', { class: 'chip warn' }, 'Noche ' + (pm.length ? fmt(nota(pm.reduce((a, i) => a + i.aciertos, 0), pm.reduce((a, i) => a + i.total, 0)), 1) : '—'))),
    el('p', { style: 'margin-top:10px' }, el('small', {}, proy))));

  // 16 · por especialidad / tema / tipo con semáforo
  vista.append(seccion('Nota por especialidad', tablaSem(R.especialidades)));
  vista.append(seccion('Nota por tipo de pregunta', tablaSem(R.tipos)));

  // 17 · 10 temas más débiles
  vista.append(seccion('Mis 10 temas más débiles',
    R.debiles.length
      ? barras(R.debiles.map((t) => ({ k: t.k, valor: t.nota, etiqueta: `${fmt(t.nota, 1)} (${t.ok}/${t.n})` })))
      : el('small', {}, 'Hacen falta al menos 2 preguntas del mismo tema.')));

  if (R.temas.length) vista.append(seccion('Nota por tema', tablaSem(R.temas)));

  // 18 · seguridad
  const cs = R.confianza;
  vista.append(seccion('Análisis de seguridad',
    columnas([
      { k: 'Seguro', valor: nota(cs.seguro[0], cs.seguro[1]), n: cs.seguro[1], etiqueta: pct(cs.seguro[0], cs.seguro[1]) + '%' },
      { k: 'Dudoso', valor: nota(cs.dudoso[0], cs.dudoso[1]), n: cs.dudoso[1], etiqueta: pct(cs.dudoso[0], cs.dudoso[1]) + '%' },
      { k: 'Adivinando', valor: nota(cs.adivinando[0], cs.adivinando[1]), n: cs.adivinando[1], etiqueta: pct(cs.adivinando[0], cs.adivinando[1]) + '%' },
    ]),
    el('small', {}, consejoSeguridad(cs))));

  // 19 · fatiga por bloques
  const bl = R.bloques.filter((b) => b[1] > 0);
  if (bl.length > 1) {
    vista.append(seccion('Análisis de fatiga',
      columnas(R.bloques.map((b, i) => ({
        k: ['1–25', '26–50', '51–75', '76–100'][i], valor: nota(b[0], b[1]), n: b[1], etiqueta: fmt(nota(b[0], b[1]), 1),
      }))),
      el('small', {}, consejoFatiga(R.bloques))));
  }

  // 20 · tiempo
  const t = R.tiempos;
  vista.append(seccion('Análisis de tiempo',
    columnas([
      { k: 'Rápidas (≤14 s)', valor: nota(t.rapidas[0], t.rapidas[1]), n: t.rapidas[1], etiqueta: fmt(nota(t.rapidas[0], t.rapidas[1]), 1) },
      { k: 'Normales', valor: nota(t.normales[0], t.normales[1]), n: t.normales[1], etiqueta: fmt(nota(t.normales[0], t.normales[1]), 1) },
      { k: 'Se acabó el tiempo', valor: nota(t.agotadas[0], t.agotadas[1]), n: t.agotadas[1], etiqueta: fmt(nota(t.agotadas[0], t.agotadas[1]), 1) },
    ]),
    el('small', {}, consejoTiempo(t))));

  // 21 · cambio de respuesta
  const c = R.cambios;
  vista.append(seccion('Cambio de respuesta',
    c.total
      ? el('div', {},
          el('div', { class: 'kpis', style: 'margin:0 0 10px' },
            el('div', { class: 'kpi' }, el('b', {}, String(c.total)), el('small', {}, 'cambios')),
            el('div', { class: 'kpi' }, el('b', { style: 'color:var(--ok)' }, String(c.mal_a_bien)), el('small', {}, 'mal → bien')),
            el('div', { class: 'kpi' }, el('b', { style: 'color:var(--bad)' }, String(c.bien_a_mal)), el('small', {}, 'bien → mal')),
            el('div', { class: 'kpi' }, el('b', {}, String(c.mal_a_mal)), el('small', {}, 'mal → mal'))),
          el('small', {}, c.bien_a_mal > c.mal_a_bien
            ? `Cambiar te está costando: ${c.bien_a_mal} veces te fuiste de la correcta a una incorrecta, contra ${c.mal_a_bien} al revés. Quédate con tu primera impresión salvo que encuentres un dato del caso que la contradiga.`
            : `Te conviene cambiar: ganaste ${c.mal_a_bien} y perdiste ${c.bien_a_mal}. Cuando releas el caso y veas un dato nuevo, confía y cambia.`))
      : el('small', {}, 'Todavía no cambiaste ninguna respuesta.')));

  // 21b · descarte de alternativas
  const ds = R.descarte;
  if (ds.preguntas >= 3) {
    const bien = ds.preguntas - ds.perdio_la_correcta;
    vista.append(seccion('Descarte de alternativas',
      el('div', { class: 'kpis', style: 'margin:0 0 10px' },
        el('div', { class: 'kpi' }, el('b', {}, String(ds.preguntas)), el('small', {}, 'preguntas con tachones')),
        el('div', { class: 'kpi' }, el('b', {}, (ds.tachadas / ds.preguntas).toFixed(1)), el('small', {}, 'tachadas por pregunta')),
        el('div', { class: 'kpi' }, el('b', { style: 'color:var(--ok)' }, String(bien)), el('small', {}, 'descartes limpios')),
        el('div', { class: 'kpi' }, el('b', { style: 'color:var(--bad)' }, String(ds.perdio_la_correcta)), el('small', {}, 'tachaste la correcta'))),
      el('small', {}, ds.perdio_la_correcta === 0
        ? `Tachaste en ${ds.preguntas} preguntas y nunca eliminaste la respuesta correcta. Tu descarte es confiable: úsalo sin miedo cuando se te acabe el tiempo.`
        : `En ${ds.perdio_la_correcta} de ${ds.preguntas} preguntas tachaste la correcta (${pct(ds.perdio_la_correcta, ds.preguntas)} %). ` +
          (pct(ds.perdio_la_correcta, ds.preguntas) > 25
            ? 'Estás descartando demasiado rápido: tacha solo lo que puedas justificar con un dato del caso.'
            : 'Es un margen normal, pero vale la pena releer esas preguntas en la revisión.'))));
  }

  // 22 · distractores y confusiones
  const tr = Object.entries(R.trampas).sort((a, b) => b[1] - a[1]);
  vista.append(seccion('Análisis de distractores',
    tr.length
      ? barras(tr.map(([k, n]) => ({ k: TRAMPAS[k] || k, valor: n, etiqueta: String(n), color: 'var(--bad)' })), { max: tr[0][1] })
      : el('small', {}, 'Sin datos: las trampas se registran cuando el simulacro las declara por alternativa.'),
    R.confusiones.length ? el('div', { style: 'margin-top:12px' },
      el('small', { style: 'display:block;margin:0 0 6px;font-weight:700' }, 'Entidades que más confundes'),
      el('div', { class: 'scroll' }, tablaConfusiones(R.confusiones))) : null));

  // 23 · gemelas
  const g = R.gemelas;
  vista.append(seccion('Resultado de las gemelas',
    g.resueltas.n
      ? el('div', {},
          el('div', { class: 'barh', style: 'margin:0 0 8px' }, el('i', { style: `width:${g.resueltas.pct}%;background:var(--ok)` })),
          el('small', {}, `Corregiste el ${g.resueltas.pct} % de los conceptos (${g.resueltas.ok}/${g.resueltas.n} gemelas acertadas). Quedan ${g.pendientes} errores esperando su gemela.`))
      : el('small', {}, `Todavía no respondiste gemelas. Hay ${g.pendientes} errores en cola para generarlas.`)));

  // 24 · sueño y ánimo
  vista.append(seccion('Sueño, ánimo y nota', sueñoAnimo(ints)));

  // motivos acumulados
  const mo = Object.entries(R.motivos).sort((a, b) => b[1] - a[1]);
  if (mo.length) vista.append(seccion('Motivos de error acumulados',
    barras(mo.map(([k, n]) => ({ k: MOTIVOS[k] || k, valor: n, etiqueta: String(n), color: 'var(--warn)' })), { max: mo[0][1] })));
}

function tablaSem(filas) {
  if (!filas.length) return el('small', {}, 'Sin datos todavía.');
  const t = el('table');
  t.append(el('thead', {}, el('tr', {}, el('th', {}, ''), el('th', {}, 'Tema'), el('th', { class: 'n' }, 'Nota'), el('th', { class: 'n' }, 'Aciertos'))));
  const tb = el('tbody');
  for (const f of filas) {
    tb.append(el('tr', {},
      el('td', { style: 'width:20px' }, el('span', { class: 'sem ' + semaforo(f.nota) })),
      el('td', {}, f.k),
      el('td', { class: 'n' }, fmt(f.nota, 1)),
      el('td', { class: 'n' }, `${f.ok}/${f.n}`)));
  }
  t.append(tb);
  return el('div', { class: 'scroll' }, t);
}

function tablaConfusiones(cs) {
  const t = el('table');
  t.append(el('thead', {}, el('tr', {}, el('th', {}, 'Era'), el('th', {}, 'Marcaste'), el('th', { class: 'n' }, 'Veces'))));
  const tb = el('tbody');
  for (const c of cs.slice(0, 14)) {
    const [a, b] = c.k.split(' → ');
    tb.append(el('tr', {}, el('td', { style: 'color:var(--ok)' }, a), el('td', { style: 'color:var(--bad)' }, b), el('td', { class: 'n' }, String(c.n))));
  }
  t.append(tb);
  return t;
}

function proyeccion(ints) {
  const faltan = diasEntre(hoyLima(), '2026-11-08');
  const ult = ints.slice(-6);
  if (ult.length < 3) return `Con 3 simulacros ya te puedo proyectar la nota del 8 de noviembre. Faltan ${faltan} días.`;
  const n = ult.length;
  const sx = ult.reduce((a, _, i) => a + i, 0), sy = ult.reduce((a, i) => a + i.nota, 0);
  const sxy = ult.reduce((a, it, i) => a + i * it.nota, 0), sxx = ult.reduce((a, _, i) => a + i * i, 0);
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1), b = (sy - m * sx) / n;
  const pasos = Math.max(0, faltan * 2); // dos simulacros por día
  const est = Math.max(0, Math.min(20, m * (n - 1 + pasos) + b));
  const tend = m > 0.08 ? 'subiendo' : m < -0.08 ? 'bajando' : 'plana';
  return `Tendencia ${tend} (${m >= 0 ? '+' : ''}${fmt(m, 2)} puntos por simulacro). Si sigue así, llegas al 8 de noviembre cerca de ${fmt(est, 1)}. ` +
         (est >= EXAMEN.meta ? 'Vas por encima de la meta.' : `Te faltarían ${fmt(EXAMEN.meta - est, 1)} puntos: ahí entran los temas rojos de arriba.`);
}

function consejoSeguridad(cs) {
  const p = (x) => pct(x[0], x[1]);
  const partes = [];
  if (cs.seguro[1] >= 5) partes.push(`Seguro: ${p(cs.seguro)} % de acierto${p(cs.seguro) < 85 ? ' — estás sobreconfiada, esos errores son conceptos mal aprendidos y van primero' : ' — bien calibrada'}.`);
  if (cs.dudoso[1] >= 5) partes.push(`Dudoso: ${p(cs.dudoso)} %.`);
  if (cs.adivinando[1] >= 3) partes.push(`Adivinando: ${p(cs.adivinando)} %${p(cs.adivinando) > 40 ? ' — tu descarte funciona, sigue descartando dos antes de marcar' : ''}.`);
  return partes.join(' ') || 'Marca tu nivel de seguridad en cada pregunta para activar este análisis.';
}

function consejoFatiga(bl) {
  const ns = bl.map((b) => (b[1] ? nota(b[0], b[1]) : null));
  const val = ns.filter((x) => x !== null);
  if (val.length < 2) return 'Con un simulacro completo de 100 ya se ve tu curva de fatiga.';
  const caida = val[0] - val.at(-1);
  if (caida >= 2) return `Caes ${fmt(caida, 1)} puntos del primer al último bloque: es fatiga. Respira 20 segundos en la pregunta 50 y come algo ligero antes del simulacro.`;
  if (caida <= -2) return `Arrancas lenta y mejoras ${fmt(-caida, 1)} puntos: calienta con 5 preguntas del mini-repaso antes de empezar.`;
  return 'Tu rendimiento es parejo en los cuatro bloques. No tienes problema de fatiga.';
}

function consejoTiempo(t) {
  const nr = nota(t.rapidas[0], t.rapidas[1]), na = nota(t.agotadas[0], t.agotadas[1]);
  if (t.agotadas[1] >= 5 && na < nr - 2) return `Cuando se te acaba el tiempo tu nota cae a ${fmt(na, 1)} contra ${fmt(nr, 1)} en las rápidas: el problema es que te trabas. A los 25 s descarta dos y marca.`;
  if (t.rapidas[1] >= 5 && nr < na - 2) return `Fallas más respondiendo rápido (${fmt(nr, 1)}) que tomándote el tiempo (${fmt(na, 1)}): estás contestando por impulso. Lee la pregunta final antes de las alternativas.`;
  return 'Tu nota es parecida respondas rápido o lento: el tiempo no es tu problema principal.';
}

function sueñoAnimo(ints) {
  const con = ints.filter((i) => i.sueno_horas != null);
  if (con.length < 3) return el('small', {}, 'Con 3 simulacros registrando sueño y ánimo aparece la relación.');
  const grupos = { '≤5 h': [], '6–7 h': [], '≥8 h': [] };
  for (const i of con) grupos[i.sueno_horas <= 5 ? '≤5 h' : i.sueno_horas <= 7 ? '6–7 h' : '≥8 h'].push(i.nota);
  const datos = Object.entries(grupos).map(([k, v]) => ({ k, valor: v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0, n: v.length, etiqueta: v.length ? fmt(v.reduce((a, b) => a + b, 0) / v.length, 1) : '—' }));
  const ga = { '😫😕': [], '😐': [], '🙂😄': [] };
  for (const i of con) if (i.animo) ga[i.animo <= 2 ? '😫😕' : i.animo === 3 ? '😐' : '🙂😄'].push(i.nota);
  const datosA = Object.entries(ga).map(([k, v]) => ({ k, valor: v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0, n: v.length, etiqueta: v.length ? fmt(v.reduce((a, b) => a + b, 0) / v.length, 1) : '—' }));
  const mejor = datos.filter((d) => d.n).sort((a, b) => b.valor - a.valor)[0];
  return el('div', {},
    el('small', { style: 'display:block;margin:0 0 4px;font-weight:700' }, 'Según las horas de sueño'), columnas(datos, { alto: 130 }),
    el('small', { style: 'display:block;margin:12px 0 4px;font-weight:700' }, 'Según el ánimo'), columnas(datosA, { alto: 130 }),
    el('small', { style: 'display:block;margin-top:8px' }, mejor ? `Tu mejor rendimiento es durmiendo ${mejor.k} (${mejor.etiqueta}). Antes del 8 de noviembre respeta esa cantidad.` : ''));
}
