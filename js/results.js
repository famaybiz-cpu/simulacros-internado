// Resultados, revisión pregunta por pregunta y feedback tipo tutor.
import { el, $, LETRAS, mmss, fmt, pct, semaforo, toast, MOTIVOS, CONFIANZA, TRAMPAS, EXAMEN } from './util.js';
import { store } from './store.js';
import { simulacro } from './data.js';
import { fuenteTxt } from './exam.js';
import { lienzoRevision } from './dibujo.js';

export async function pantallaResultados(vista, id) {
  const it = store.intento(id);
  const S = await simulacro(id);
  if (!it || !S) return vista.append(el('div', { class: 'vacio' }, 'No encuentro ese intento.'));
  const qs = new Map(S.preguntas.map((q) => [q.id, q]));

  const sem = semaforo(it.nota);
  vista.append(
    el('h1', {}, it.titulo),
    el('p', {}, el('small', {}, `${it.fecha} · modo ${it.modo} · ${mmss(it.segundos_total)} en total`)),
    el('div', { class: 'card' },
      el('div', { class: 'nota ' + sem }, el('b', {}, fmt(it.nota, 1)), el('small', {}, `sobre 20 · meta ${EXAMEN.meta}`)),
      el('div', { class: 'barh', style: 'margin:12px 0 6px' }, el('i', { style: `width:${Math.min(100, (it.nota / 20) * 100)}%;background:var(--${sem === 'v' ? 'ok' : sem === 'a' ? 'warn' : 'bad'})` })),
      el('small', {}, it.nota >= EXAMEN.meta
        ? `Pasaste la meta por ${fmt(it.nota - EXAMEN.meta, 1)} puntos.`
        : `Te faltan ${fmt(EXAMEN.meta - it.nota, 1)} puntos para el ${EXAMEN.meta}: ${Math.ceil((EXAMEN.meta / 20) * it.total) - it.aciertos} aciertos más.`),
    ),
    el('div', { class: 'kpis', style: 'margin:0 0 14px' },
      kpi(it.aciertos, 'aciertos', 'ok'), kpi(it.errores, 'errores', 'bad'),
      kpi(it.sin_responder, 'sin responder', 'warn'),
      kpi(fmt(it.segundos_total / it.total, 0) + 's', 'por pregunta'),
    ));

  if (it.corte_por_tiempo) {
    vista.append(el('div', { class: 'card' },
      el('div', { class: 'row' }, el('span', { class: 'chip bad' }, '⏱ Se acabó el tiempo'),
        el('small', {}, `El examen se cerró a ${it.minutos_limite === 1 ? 'el minuto' : 'los ' + it.minutos_limite + ' minutos'}, como el de verdad.`)),
      it.sin_responder
        ? el('p', { style: 'margin-top:8px' }, el('small', {},
            `Te quedó ${it.sin_responder} pregunta${it.sin_responder === 1 ? '' : 's'} sin responder, que vale${it.sin_responder === 1 ? '' : 'n'} ${fmt((it.sin_responder / it.total) * 20, 1)} puntos. ` +
            `Si te vuelve a pasar, a falta de 15 minutos deja de razonar y marca todas las que falten: una respuesta al azar vale 20 % y una en blanco vale 0.`))
        : null));
  } else if (it.minutos_limite) {
    vista.append(el('div', { class: 'card tight' },
      el('div', { class: 'row' }, el('span', { class: 'chip ok' }, '✓ Dentro del tiempo'),
        el('small', {}, `Terminaste en ${mmss(it.segundos_total)} de los ${it.minutos_limite} minutos.`))));
  }

  // --- motivo de cada error ---
  const fallos = it.respuestas.filter((r) => !r.ok);
  if (fallos.length) {
    const card = el('div', { class: 'card' },
      el('h3', {}, 'Motivo de cada error'),
      el('p', {}, el('small', {}, 'Un toque por pregunta. Es lo que mejora el feedback.')));
    for (const r of fallos) {
      const fila = el('div', { style: 'padding:10px 0;border-bottom:1px solid var(--line)' });
      fila.append(el('div', { class: 'row sp' },
        el('small', {}, `Pregunta ${r.orden}`),
        el('span', { class: 'chip ' + (r.elegida === null ? 'warn' : 'bad') }, r.elegida === null ? 'sin responder' : `marcaste ${LETRAS[r.elegida]}, era ${LETRAS[r.correcta]}`)));
      const g = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px' });
      for (const [k, et] of Object.entries(MOTIVOS)) {
        g.append(el('button', {
          class: 'btn sm', 'aria-pressed': r.motivo === k ? 'true' : 'false',
          style: r.motivo === k ? 'border-color:var(--ac);background:var(--ac-soft);color:var(--ac)' : '',
          onclick: (ev) => {
            r.motivo = k; store.guardarIntento(it);
            const e = store.d.errores.find((x) => x.qid === r.qid); if (e) { e.motivo = k; store.commit(); }
            [...g.children].forEach((x) => { x.setAttribute('aria-pressed', x === ev.currentTarget ? 'true' : 'false'); x.style.cssText = x === ev.currentTarget ? 'border-color:var(--ac);background:var(--ac-soft);color:var(--ac)' : ''; });
            pintarFeedback();
          },
        }, et));
      }
      fila.append(g); card.append(fila);
    }
    vista.append(card);
  }

  // --- feedback tutor ---
  const cajaFb = el('div', { class: 'card' });
  vista.append(cajaFb);
  const pintarFeedback = () => { cajaFb.replaceChildren(el('h3', {}, 'Feedback'), ...feedbackTutor(it, qs)); };
  pintarFeedback();

  // --- perlas y feedback del simulacro de la noche ---
  if (S.feedback_noche || S.perlas_noche?.length) {
    const c = el('div', { class: 'card' }, el('h3', {}, 'Para leer antes de dormir'));
    if (S.temas_noche?.length) c.append(el('p', {}, el('small', {}, 'Temas de esta noche: ' + S.temas_noche.join(' · '))));
    if (S.feedback_noche) c.append(el('div', { class: 'bloque' }, S.feedback_noche));
    for (const p of S.perlas_noche || []) c.append(el('div', { class: 'perla', style: 'margin:0 0 8px' }, '💡 ' + p));
    vista.append(c);
  }

  // --- revisión ---
  vista.append(el('h2', { style: 'margin-top:24px' }, 'Revisión'));
  const filtros = el('div', { class: 'row', style: 'margin:0 0 12px' });
  let filtro = 'todas';
  const lista = el('div');
  const FILTROS = { todas: 'Todas', fallos: 'Errores', marcadas: 'Marcadas', seguro: 'Fallé estando seguro' };
  for (const [k, et] of Object.entries(FILTROS)) {
    filtros.append(el('button', {
      class: 'btn sm', 'aria-pressed': filtro === k ? 'true' : 'false',
      style: filtro === k ? 'border-color:var(--ac);background:var(--ac-soft);color:var(--ac)' : '',
      onclick: (ev) => {
        filtro = k;
        [...filtros.children].forEach((x) => { x.style.cssText = x === ev.currentTarget ? 'border-color:var(--ac);background:var(--ac-soft);color:var(--ac)' : ''; });
        render();
      },
    }, et));
  }
  function render() {
    lista.replaceChildren();
    const rs = it.respuestas.filter((r) =>
      filtro === 'todas' ? true :
      filtro === 'fallos' ? !r.ok :
      filtro === 'marcadas' ? r.marcada :
      !r.ok && r.confianza === 'seguro');
    if (!rs.length) lista.append(el('div', { class: 'vacio' }, 'Nada en este filtro.'));
    for (const r of rs) lista.append(bloqueRevision(r, qs.get(r.qid), id));
  }
  render();
  vista.append(filtros, lista);
}

const kpi = (v, et, c) => el('div', { class: 'kpi' }, el('b', { style: c ? `color:var(--${c})` : '' }, String(v)), el('small', {}, et));

/** Revisión: recién aquí se revelan especialidad, tema y diagnóstico. */
export function bloqueRevision(r, q, simulacroId = null) {
  if (!q) return el('div');
  const ok = r.ok;
  const d = el('details', { class: 'rev' });
  d.append(el('summary', {},
    el('span', { class: 'num', style: `background:var(--${ok ? 'ok' : r.elegida === null ? 'warn' : 'bad'}-soft);color:var(--${ok ? 'ok' : r.elegida === null ? 'warn' : 'bad'})` }, String(r.orden ?? '•')),
    el('span', { style: 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500' }, q.enunciado.slice(0, 80)),
    r.marcada ? el('span', {}, '🔖') : null,
    el('span', { class: 'chip ' + (ok ? 'ok' : 'bad'), style: 'flex:none' }, ok ? '✓' : '✗')));

  const b = el('div', { class: 'body' });
  b.append(el('div', { class: 'row', style: 'margin:0 0 10px' },
    q.especialidad ? el('span', { class: 'chip ac' }, q.especialidad) : null,
    q.tema ? el('span', { class: 'chip' }, q.tema) : null,
    q.tipo ? el('span', { class: 'chip' }, q.tipo) : null,
    q.dificultad ? el('span', { class: 'chip' }, 'dificultad ' + q.dificultad) : null,
    r.confianza ? el('span', { class: 'chip' }, CONFIANZA[r.confianza]) : null,
    r.segundos != null ? el('span', { class: 'chip' }, r.segundos + ' s') : null,
    q.gemela_de ? el('span', { class: 'chip warn' }, 'gemela') : null));

  b.append(el('div', { class: 'enun', style: 'font-size:17px;margin:0 0 12px' }, q.enunciado));
  const opts = el('div', { class: 'opts' });
  const desc = r.descartadas || [];
  q.opciones.forEach((t, k) => {
    const o = el('div', { class: 'opt' + (desc.includes(k) ? ' descartada' : ''), style: 'cursor:default' },
      el('span', { class: 'le' }, LETRAS[k]), el('span', { class: 'tx' }, t));
    if (k === q.clave0) o.classList.add('correcta');
    else if (k === r.elegida) o.classList.add('fallada');
    opts.append(o);
  });
  b.append(opts);
  if (desc.length) b.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Alternativas que descartaste'),
    desc.map((k) => LETRAS[k]).sort().join(', ') +
    (r.descarto_la_correcta ? ' — entre ellas estaba la correcta' : '')));

  if (q.diagnostico) b.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Diagnóstico del caso'), q.diagnostico));
  if (q.razonamiento) b.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Razonamiento paso a paso'), q.razonamiento));
  const mal = (q.por_que_no || []).map((t, k) => (k === q.clave0 || !t ? null : `<div style="margin:0 0 7px"><b>${LETRAS[k]}.</b> ${t}${q.trampa?.[k] ? ` <i style="color:var(--fg3)">(${TRAMPAS[q.trampa[k]] || q.trampa[k]})</i>` : ''}</div>`)).filter(Boolean);
  if (mal.length) b.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Por qué no las otras'), el('div', { html: mal.join('') })));
  if (r.cambios?.length) b.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Cambiaste de respuesta'),
    r.cambios.map((c) => `${LETRAS[c.de]} → ${LETRAS[c.a]}`).join(' · ')));
  if (q.perla) b.append(el('div', { class: 'perla' }, '💡 ' + q.perla));
  if (q.fuente) b.append(el('small', { style: 'display:block;margin-top:10px;color:var(--fg3)' }, '📂 ' + fuenteTxt(q.fuente)));
  const dibujo = simulacroId && lienzoRevision(simulacroId, q.id);
  if (dibujo) b.append(el('div', { style: 'margin-top:12px' },
    el('small', { style: 'display:block;margin:0 0 6px;font-weight:700;color:var(--fg2)' }, 'Lo que anotaste'), dibujo));
  d.append(b);
  return d;
}

/* ---------- feedback tipo tutor ---------- */
function feedbackTutor(it, qs) {
  const out = [];
  const rs = it.respuestas;
  const porEsp = {};
  for (const r of rs) {
    if (!r.especialidad) continue;
    (porEsp[r.especialidad] ||= { ok: 0, n: 0 });
    porEsp[r.especialidad].n++; if (r.ok) porEsp[r.especialidad].ok++;
  }
  const esps = Object.entries(porEsp).map(([k, v]) => ({ k, ...v, nota: (v.ok / v.n) * 20 }));
  const buenas = esps.filter((e) => e.nota >= 16 && e.n >= 2).sort((a, b) => b.nota - a.nota);
  const malas  = esps.filter((e) => e.nota < 13 && e.n >= 2).sort((a, b) => a.nota - b.nota);

  // 1. lo que hiciste bien
  const bien = [];
  if (buenas.length) bien.push(`Tienes sólido ${buenas.slice(0, 3).map((e) => `${e.k} (${fmt(e.nota, 1)})`).join(', ')}.`);
  const segOk = rs.filter((r) => r.confianza === 'seguro' && r.ok).length;
  const seg = rs.filter((r) => r.confianza === 'seguro').length;
  if (seg >= 5) bien.push(`Cuando dices "Seguro" aciertas el ${pct(segOk, seg)} % (${segOk}/${seg}): tu criterio está ${pct(segOk, seg) >= 85 ? 'bien calibrado' : 'sobrevalorado, revisa abajo'}.`);
  if (it.sin_responder === 0) bien.push('No dejaste ninguna en blanco.');
  if (bien.length) out.push(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Lo que hiciste bien'), bien.join(' ')));

  // 2. patrón de error
  const patrones = [];
  const motivos = {};
  for (const r of rs) if (!r.ok && r.motivo) motivos[r.motivo] = (motivos[r.motivo] || 0) + 1;
  const trampas = {};
  for (const r of rs) if (!r.ok && r.trampa_caida) trampas[r.trampa_caida] = (trampas[r.trampa_caida] || 0) + 1;
  const topTrampa = Object.entries(trampas).sort((a, b) => b[1] - a[1])[0];
  if (topTrampa && topTrampa[1] >= 2) patrones.push(`Tu trampa recurrente es «${TRAMPAS[topTrampa[0]] || topTrampa[0]}»: ${topTrampa[1]} veces.`);
  const porTipo = {};
  for (const r of rs) if (r.tipo) { (porTipo[r.tipo] ||= [0, 0]); porTipo[r.tipo][1]++; if (r.ok) porTipo[r.tipo][0]++; }
  const tipoMalo = Object.entries(porTipo).filter(([, v]) => v[1] >= 3).map(([k, v]) => ({ k, nota: (v[0] / v[1]) * 20 })).sort((a, b) => a.nota - b.nota)[0];
  if (tipoMalo && tipoMalo.nota < 13) patrones.push(`Flaqueas en las preguntas de tipo «${tipoMalo.k}» (${fmt(tipoMalo.nota, 1)}).`);
  if ((porTipo['conducta']?.[1] >= 3) && (porTipo['tratamiento']?.[1] >= 3)) {
    const nc = (porTipo['conducta'][0] / porTipo['conducta'][1]) * 20;
    const nt = (porTipo['tratamiento'][0] / porTipo['tratamiento'][1]) * 20;
    if (Math.abs(nc - nt) >= 4) patrones.push('Confundes manejo inicial con definitivo: lee qué momento del manejo te piden antes de mirar las alternativas.');
  }
  if (malas.length) patrones.push(`Lo más bajo de hoy: ${malas.slice(0, 3).map((e) => `${e.k} (${fmt(e.nota, 1)})`).join(', ')}.`);
  if (patrones.length) out.push(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Tu patrón de error'), patrones.join(' ')));

  // 3. errores estando "Seguro" → prioridad máxima
  const segMal = rs.filter((r) => !r.ok && r.confianza === 'seguro');
  if (segMal.length) {
    const c = el('div', { class: 'bloque', style: 'background:var(--bad-soft);color:var(--bad)' });
    c.append(el('span', { class: 'et', style: 'color:var(--bad)' }, `Prioridad máxima · ${segMal.length} error${segMal.length > 1 ? 'es' : ''} estando seguro`));
    c.append(el('div', {}, 'Son conceptos mal aprendidos, no descuidos. Estúdialos hoy mismo:'));
    for (const r of segMal.slice(0, 8)) {
      const q = qs.get(r.qid);
      c.append(el('div', { style: 'margin-top:6px' }, `• P${r.orden} — ${q?.tema || r.especialidad || 'tema'}: creías «${r.elegida_txt}», era «${q?.opciones[r.correcta]}». ${q?.fuente ? '📂 ' + fuenteTxt(q.fuente) : ''}`));
    }
    out.push(c);
  }

  // 4. aciertos adivinando
  const adiv = rs.filter((r) => r.ok && r.confianza === 'adivinando');
  if (adiv.length) {
    out.push(el('div', { class: 'bloque', style: 'background:var(--warn-soft);color:var(--warn)' },
      el('span', { class: 'et', style: 'color:var(--warn)' }, `${adiv.length} acierto${adiv.length > 1 ? 's' : ''} adivinando`),
      `No los tienes dominados: ya están en tu cuaderno de errores. Temas: ${[...new Set(adiv.map((r) => r.tema || r.especialidad).filter(Boolean))].join(', ') || '—'}.`));
  }

  // 5. técnica vs contenido
  const tec = (motivos.lei_mal || 0) + (motivos.tiempo || 0);
  const cont = (motivos.no_sabia || 0) + (motivos.confundi || 0);
  if (tec) {
    const tips = [];
    if (motivos.lei_mal) tips.push(`**${motivos.lei_mal} por leer mal el caso.** Técnica: antes de mirar las alternativas, subraya mentalmente edad, tiempo de enfermedad y el dato que cambia la conducta (embarazo, inestabilidad, alergia, edad extrema). Lee la pregunta final primero.`);
    if (motivos.tiempo) tips.push(`**${motivos.tiempo} por tiempo.** Técnica: a los 25 s, si no tienes la respuesta, descarta dos y marca la mejor; déjala marcada y sigue. Nunca gastes 40 s en una sola.`);
    out.push(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Técnica de examen'),
      el('div', { html: tips.map((t) => `<div style="margin:0 0 7px">${t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</div>`).join('') })));
  }
  if (cont) {
    const porEstudiar = rs.filter((r) => !r.ok && (r.motivo === 'no_sabia' || r.motivo === 'confundi'))
      .map((r) => ({ r, q: qs.get(r.qid) }));
    const c = el('div', { class: 'bloque' });
    c.append(el('span', { class: 'et' }, `Qué estudiar (${cont} de contenido)`));
    const vistos = new Set();
    for (const { r, q } of porEstudiar) {
      const k = (q?.tema || r.especialidad || '') + fuenteTxt(q?.fuente);
      if (vistos.has(k)) continue; vistos.add(k);
      c.append(el('div', { style: 'margin-top:6px' },
        `• ${r.especialidad || ''}${q?.tema ? ' · ' + q.tema : ''}${q?.diagnostico ? ` (${q.diagnostico})` : ''} → `,
        el('span', { class: 'mono' }, fuenteTxt(q?.fuente) || 'fuente no indicada')));
    }
    out.push(c);
  }

  // 5b. descarte de alternativas
  const conDesc = rs.filter((r) => (r.descartadas || []).length);
  if (conDesc.length >= 3) {
    const malDesc = conDesc.filter((r) => r.descarto_la_correcta).length;
    out.push(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Tu descarte'),
      malDesc === 0
        ? `Tachaste alternativas en ${conDesc.length} preguntas y nunca descartaste la correcta. Tu criterio de descarte está fino: confía en él cuando dudes.`
        : `Tachaste alternativas en ${conDesc.length} preguntas y en ${malDesc} descartaste la correcta. Revisa esas: el error no fue elegir mal, fue eliminar demasiado pronto.`));
  }

  // 6. cuánto falta para el 16 y qué especialidad sube más la nota
  const faltan = Math.max(0, Math.ceil((EXAMEN.meta / 20) * it.total) - it.aciertos);
  const palanca = esps.filter((e) => e.n >= 3 && e.nota < 16)
    .map((e) => ({ ...e, gana: ((e.n - e.ok) * 20) / it.total }))
    .sort((a, b) => b.gana - a.gana)[0];
  const c6 = el('div', { class: 'bloque', style: 'background:var(--ac-soft);color:var(--ac)' });
  c6.append(el('span', { class: 'et', style: 'color:var(--ac)' }, 'Camino al 16'));
  c6.append(el('div', {}, faltan === 0
    ? `Hoy ya estás en ${fmt(it.nota, 1)}. Sostén el ritmo.`
    : `Con ${faltan} acierto${faltan > 1 ? 's' : ''} más de ${it.total} llegabas al 16.`));
  if (palanca) c6.append(el('div', { style: 'margin-top:6px' },
    `La especialidad que más te sube la nota es **${palanca.k}**: tiene ${palanca.n} preguntas y fallaste ${palanca.n - palanca.ok}; dominarla vale ${fmt(palanca.gana, 1)} puntos de los 20.`
      .replace(/\*\*(.+?)\*\*/g, '$1')));
  out.push(c6);

  return out;
}
