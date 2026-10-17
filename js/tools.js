// Cuaderno de errores, repaso rápido, mini-repaso, perlas e historial.
import { el, $, LETRAS, fmt, semaforo, hoyLima, fechaLarga, diasEntre, mezclar, hash, toast, vibrar, CONFIANZA, TRAMPAS } from './util.js';
import { store } from './store.js';
import { indice, guardados } from './data.js';
import { fuenteTxt } from './exam.js';

/* ---------------- cuaderno de errores ---------------- */
export function pantallaErrores(vista) {
  const todos = store.d.errores;
  const vencidos = store.erroresVencidos();
  const activos = todos.filter((e) => !e.dominada);
  const dominadas = todos.filter((e) => e.dominada);

  vista.append(el('h1', {}, 'Cuaderno de errores'));
  vista.append(el('div', { class: 'kpis', style: 'margin:0 0 14px' },
    el('div', { class: 'kpi' }, el('b', { style: 'color:var(--bad)' }, String(activos.length)), el('small', {}, 'por dominar')),
    el('div', { class: 'kpi' }, el('b', { style: 'color:var(--warn)' }, String(vencidos.length)), el('small', {}, 'para hoy')),
    el('div', { class: 'kpi' }, el('b', { style: 'color:var(--ok)' }, String(dominadas.length)), el('small', {}, 'dominadas')),
    el('div', { class: 'kpi' }, el('b', {}, String(store.d.gemelas_pendientes.length)), el('small', {}, 'gemelas en cola'))));

  if (!todos.length) {
    return vista.append(el('div', { class: 'vacio' }, el('span', { class: 'ic' }, '📓'),
      'Acá van las preguntas que falles y las que aciertes adivinando. Vuelven a los 1, 3 y 7 días; dos aciertos seguidos y quedan dominadas.'));
  }

  vista.append(el('div', { class: 'row', style: 'margin:0 0 16px' },
    el('a', { class: 'btn pri', href: '#/repaso/errores', style: vencidos.length ? '' : 'opacity:.45;pointer-events:none' }, `Repaso rápido · 10 preguntas`),
    el('a', { class: 'btn', href: '#/repaso/mini' }, 'Mini-repaso · 5')));

  const seguros = activos.filter((e) => e.confianza === 'seguro');
  if (seguros.length) vista.append(el('div', { class: 'card' },
    el('h3', { style: 'color:var(--bad)' }, 'Prioridad máxima: fallaste estando segura'),
    el('p', {}, el('small', {}, 'Conceptos mal aprendidos. Son los primeros que hay que cerrar.')),
    ...seguros.map((e) => tarjetaError(e, vista))));

  const resto = activos.filter((e) => e.confianza !== 'seguro');
  if (resto.length) vista.append(el('div', { class: 'card' },
    el('h3', {}, 'Pendientes'), ...resto.map((e) => tarjetaError(e, vista))));

  if (dominadas.length) vista.append(el('div', { class: 'card' },
    el('h3', { style: 'color:var(--ok)' }, `Dominadas (${dominadas.length})`),
    ...dominadas.map((e) => tarjetaError(e, vista))));
}

function tarjetaError(e, vista) {
  const q = e.pregunta || {};
  const d = el('details', { class: 'rev' });
  const dias = diasEntre(hoyLima(), e.proximo_repaso);
  d.append(el('summary', {},
    el('span', { class: 'num', style: `background:var(--${e.dominada ? 'ok' : 'bad'}-soft)` }, e.dominada ? '✓' : String(e.aciertos_seguidos || 0)),
    el('span', { style: 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500' },
      `${q.especialidad || ''}${q.tema ? ' · ' + q.tema : ''}`),
    el('span', { class: 'chip ' + (e.dominada ? 'ok' : dias <= 0 ? 'warn' : '') },
      e.dominada ? 'dominada' : dias <= 0 ? 'hoy' : `en ${dias} d`)));
  const b = el('div', { class: 'body' });
  b.append(el('div', { class: 'enun', style: 'font-size:16px;margin:0 0 10px' }, q.enunciado || ''));
  if (q.opciones) b.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Respuesta'),
    `${LETRAS[q.clave0]}. ${q.opciones[q.clave0]}`));
  if (q.diagnostico) b.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Diagnóstico'), q.diagnostico));
  if (q.razonamiento) b.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Razonamiento'), q.razonamiento));
  if (q.perla) b.append(el('div', { class: 'perla' }, '💡 ' + q.perla));
  if (q.fuente) b.append(el('small', { style: 'display:block;margin-top:8px;color:var(--fg3)' }, '📂 ' + fuenteTxt(q.fuente)));
  b.append(el('div', { class: 'row', style: 'margin-top:12px' },
    el('button', { class: 'btn sm ok', onclick: () => { store.repasarError(e.qid, true); toast('Marcada como acertada'); vista.dispatchEvent(new Event('recargar', { bubbles: true })); } }, 'La sé'),
    el('button', { class: 'btn sm bad', onclick: () => { store.repasarError(e.qid, false); toast('Vuelve mañana'); vista.dispatchEvent(new Event('recargar', { bubbles: true })); } }, 'Todavía no'),
  ));
  d.append(b);
  return d;
}

/* ---------------- repaso (10) y mini-repaso (5) ---------------- */
export function pantallaRepaso(vista, cual) {
  const n = cual === 'mini' ? 5 : 10;
  let pool = store.erroresVencidos();
  if (pool.length < n) {
    const extra = store.d.errores.filter((e) => !e.dominada && !pool.includes(e));
    pool = [...pool, ...extra];
  }
  if (cual === 'mini') pool = mezclar(pool, hash(hoyLima() + 'mini'));
  const set = pool.filter((e) => e.pregunta?.opciones?.length).slice(0, n);

  if (!set.length) {
    return vista.append(el('div', { class: 'vacio' }, el('span', { class: 'ic' }, '🎉'),
      'No tienes nada pendiente de repaso. Vuelve después del próximo simulacro.'));
  }

  let i = 0, aciertos = 0;
  const cont = el('div');
  vista.append(el('h1', {}, cual === 'mini' ? 'Mini-repaso' : 'Repaso rápido de errores'), cont);

  function pintar() {
    if (i >= set.length) {
      cont.replaceChildren(
        el('div', { class: 'card' },
          el('div', { class: 'nota ' + semaforo((aciertos / set.length) * 20) }, el('b', {}, `${aciertos}/${set.length}`), el('small', {}, 'en este repaso')),
          el('p', { style: 'text-align:center;margin-top:10px' }, el('small', {}, 'Las que acertaste dos veces seguidas quedaron dominadas.')),
          el('div', { class: 'row', style: 'justify-content:center' },
            el('a', { class: 'btn pri', href: '#/errores' }, 'Volver al cuaderno'))));
      return;
    }
    const e = set[i], q = e.pregunta;
    let elegida = null;
    const c = el('div');
    c.append(el('div', { class: 'row sp', style: 'margin:0 0 10px' },
      el('small', {}, `${i + 1} de ${set.length}`),
      el('span', { class: 'chip' }, `${e.aciertos_seguidos || 0}/2 para dominarla`)));
    c.append(el('div', { class: 'enun' }, q.enunciado));
    const opts = el('div', { class: 'opts' });
    q.opciones.forEach((t, k) => {
      opts.append(el('button', {
        class: 'opt', onclick: (ev) => {
          if (elegida !== null) return;
          elegida = k;
          const ok = k === q.clave0;
          if (ok) aciertos++;
          vibrar(ok ? 40 : [40, 60, 40]);
          store.repasarError(e.qid, ok);
          [...opts.children].forEach((x, j) => {
            x.disabled = true;
            if (j === q.clave0) x.classList.add('correcta');
            else if (j === k) x.classList.add('fallada');
          });
          c.append(explica(q, ok), el('button', { class: 'btn pri full', style: 'margin-top:12px', onclick: () => { i++; pintar(); } }, i + 1 >= set.length ? 'Ver resultado' : 'Siguiente'));
          scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        },
      }, el('span', { class: 'le' }, LETRAS[k]), el('span', {}, t)));
    });
    c.append(opts);
    cont.replaceChildren(c);
    scrollTo({ top: 0, behavior: 'instant' });
  }
  pintar();
}

function explica(q, ok) {
  const c = el('div', { style: 'margin-top:14px' });
  c.append(el('div', { class: 'chip ' + (ok ? 'ok' : 'bad'), style: 'margin:0 0 10px' }, ok ? '✓ Correcto' : '✗ Incorrecto'));
  if (q.especialidad || q.tema) c.append(el('div', { class: 'row', style: 'margin:0 0 10px' },
    q.especialidad ? el('span', { class: 'chip ac' }, q.especialidad) : null,
    q.tema ? el('span', { class: 'chip' }, q.tema) : null));
  if (q.diagnostico) c.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Diagnóstico'), q.diagnostico));
  if (q.razonamiento) c.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Razonamiento'), q.razonamiento));
  const mal = (q.por_que_no || []).map((t, k) => (k === q.clave0 || !t ? null : `<div style="margin:0 0 6px"><b>${LETRAS[k]}.</b> ${t}</div>`)).filter(Boolean);
  if (mal.length) c.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Por qué no las otras'), el('div', { html: mal.join('') })));
  if (q.perla) c.append(el('div', { class: 'perla' }, '💡 ' + q.perla));
  if (q.fuente) c.append(el('small', { style: 'display:block;margin-top:8px;color:var(--fg3)' }, '📂 ' + fuenteTxt(q.fuente)));
  return c;
}

/* ---------------- perlas ---------------- */
export function pantallaPerlas(vista) {
  const todas = store.d.perlas;
  const esps = [...new Set(todas.map((p) => p.especialidad).filter(Boolean))].sort();
  let filtro = '';
  let soloHoy = true;

  vista.append(el('h1', {}, 'Perlas'));
  if (!todas.length) {
    return vista.append(el('div', { class: 'vacio' }, el('span', { class: 'ic' }, '💡'),
      'Cada pregunta que resuelvas deja su perla acá, con repetición espaciada.'));
  }

  const barra = el('div', { class: 'row', style: 'margin:0 0 14px' });
  const sel = el('select', { onchange: (e) => { filtro = e.target.value; render(); }, style: 'flex:1;min-width:160px' },
    el('option', { value: '' }, 'Todas las especialidades'),
    ...esps.map((e) => el('option', { value: e }, e)));
  const btnHoy = el('button', { class: 'btn sm pri', onclick: () => { soloHoy = !soloHoy; btnHoy.classList.toggle('pri', soloHoy); btnHoy.textContent = soloHoy ? 'Solo las de hoy' : 'Todas'; render(); } }, 'Solo las de hoy');
  barra.append(sel, btnHoy);
  const cont = el('div');
  vista.append(barra, cont);

  function render() {
    const hoy = hoyLima();
    let ps = todas.filter((p) => (!filtro || p.especialidad === filtro) && (!soloHoy || p.proximo_repaso <= hoy));
    cont.replaceChildren();
    cont.append(el('p', {}, el('small', {}, `${ps.length} perla${ps.length === 1 ? '' : 's'}`)));
    if (!ps.length) { cont.append(el('div', { class: 'vacio' }, 'Nada acá. Prueba quitando el filtro.')); return; }
    for (const p of ps) {
      cont.append(el('div', { class: 'card tight' },
        el('div', { class: 'row', style: 'margin:0 0 8px' },
          p.especialidad ? el('span', { class: 'chip ac' }, p.especialidad) : null,
          p.tema ? el('span', { class: 'chip' }, p.tema) : null,
          el('span', { class: 'chip ' + (p.aciertos_seguidos >= 3 ? 'ok' : '') }, `${p.aciertos_seguidos || 0}/4`)),
        el('div', { style: 'font-size:17px;line-height:1.5;margin:0 0 10px' }, '💡 ' + p.texto),
        el('div', { class: 'row' },
          el('button', { class: 'btn sm ok', onclick: () => { store.repasarPerla(p.qid, true); render(); } }, 'La recuerdo'),
          el('button', { class: 'btn sm', onclick: () => { store.repasarPerla(p.qid, false); render(); } }, 'Repetir mañana'))));
    }
  }
  render();
}

/* ---------------- historial ---------------- */
export async function pantallaHistorial(vista) {
  vista.append(el('h1', {}, 'Historial'));
  const idx = await indice();
  const meta = new Map((idx.simulacros || []).map((x) => (typeof x === 'string' ? [x, { id: x }] : [x.id, x])));
  const ids = [...new Set([...meta.keys(), ...guardados(), ...store.d.intentos.map((i) => i.simulacro_id)])].sort().reverse();
  if (!ids.length) return vista.append(el('div', { class: 'vacio' }, el('span', { class: 'ic' }, '🗂'), 'Todavía no hay simulacros publicados.'));

  const porFecha = {};
  for (const id of ids) {
    const f = id.slice(0, 10);
    (porFecha[f] ||= []).push(id);
  }
  for (const [f, lista] of Object.entries(porFecha)) {
    const c = el('div', { class: 'card' }, el('h3', {}, fechaLarga(f)));
    for (const id of lista.sort()) {
      const it = store.intento(id);
      const noche = id.endsWith('noche');
      const n = meta.get(id)?.n ?? it?.total ?? (noche ? 50 : 100);
      c.append(el('div', { class: 'row sp', style: 'padding:10px 0;border-top:1px solid var(--line)' },
        el('span', {}, `${noche ? '🌙 Noche' : '☀️ Mañana'} · ${n}`),
        it
          ? el('a', { class: 'btn sm', href: `#/resultados/${id}` },
              el('span', { class: 'sem ' + semaforo(it.nota), style: 'margin-right:6px' }), fmt(it.nota, 1))
          : el('a', { class: 'btn sm pri', href: `#/pre/${id}` }, 'Resolver')));
    }
    vista.append(c);
  }
}
