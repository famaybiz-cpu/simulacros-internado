// Camino al 16, anillos de la meta diaria e insignias.
import { el, fmt, semaforo, hoyLima, EXAMEN, cuenta } from './util.js';
import { store } from './store.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (t, a = {}) => { const n = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) n.setAttribute(k, v); return n; };

/* ---------------- Camino al 16 ---------------- */
export function caminoAl16() {
  const ints = store.d.intentos.filter(cuenta);
  const c = el('div', { class: 'card camino' });
  c.append(el('div', { class: 'row sp' }, el('h3', { style: 'margin:0' }, 'Camino al 16'),
    el('span', { class: 'chip ac' }, `faltan ${Math.max(0, Math.round((new Date(EXAMEN.fechaISO) - Date.now()) / 86400000))} días`)));

  if (!ints.length) {
    c.append(el('p', { style: 'margin:10px 0 0' }, el('small', {}, 'Cuando resuelvas tu primer simulacro, acá verás tu avance hacia la meta.')));
    return c;
  }
  const ultima = ints.at(-1).nota;
  const prom = ints.reduce((a, i) => a + i.aciertos, 0) / ints.reduce((a, i) => a + i.total, 0) * 20;
  const pos = (v) => Math.max(0, Math.min(100, (v / 20) * 100));

  const pista = el('div', { class: 'pista16' });
  pista.append(
    el('i', { class: 'relleno', style: `width:${pos(prom)}%` }),
    el('span', { class: 'marca16', style: `left:${pos(EXAMEN.meta)}%` }),
    el('span', { class: 'punto ultima', style: `left:${pos(ultima)}%`, title: 'Tu última nota' }),
  );
  c.append(el('div', { style: 'margin:14px 0 8px' }, pista));
  c.append(el('div', { class: 'row sp' },
    el('span', {}, el('small', {}, 'Última '), el('b', { class: 'n' + semaforo(ultima) }, fmt(ultima, 1))),
    el('span', {}, el('small', {}, 'Promedio '), el('b', { class: 'n' + semaforo(prom) }, fmt(prom, 1))),
    el('span', {}, el('small', {}, 'Meta '), el('b', { class: 'nv' }, String(EXAMEN.meta)))));

  const falta = EXAMEN.meta - prom;
  c.append(el('p', { style: 'margin:10px 0 0' }, el('small', {}, falta <= 0
    ? '¡Estás por encima de la meta! Ahora el objetivo es no bajar.'
    : `Te faltan ${fmt(falta, 1)} puntos de promedio. Son ${Math.ceil(falta * 5)} aciertos más por cada 100 preguntas.`)));
  return c;
}

/* ---------------- anillos de la meta diaria ---------------- */
function anillo(pct, color, etiqueta, valor) {
  const R = 26, C = 2 * Math.PI * R;
  const svg = s('svg', { viewBox: '0 0 64 64', class: 'anillo' });
  svg.append(s('circle', { cx: 32, cy: 32, r: R, fill: 'none', stroke: 'var(--bg3)', 'stroke-width': 8 }));
  svg.append(s('circle', {
    cx: 32, cy: 32, r: R, fill: 'none', stroke: color, 'stroke-width': 8, 'stroke-linecap': 'round',
    'stroke-dasharray': C, 'stroke-dashoffset': C * (1 - Math.max(0, Math.min(1, pct))),
    transform: 'rotate(-90 32 32)',
  }));
  const tx = s('text', { x: 32, y: 32, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 17, 'font-weight': 800, fill: 'var(--fg)' });
  tx.textContent = valor;
  svg.append(tx);
  return el('div', { class: 'anillo-caja' }, svg, el('small', {}, etiqueta));
}

export function metaDiaria(idx) {
  const hoy = hoyLima();
  const ck = store.d.checklist[hoy] || {};
  const pend = store.tarjetasVencidas?.().length ?? 0;
  const tot = store.d.tarjetas?.length ?? 0;
  const c = el('div', { class: 'card' },
    el('h3', {}, 'Tu meta de hoy'),
    el('div', { class: 'anillos' },
      anillo(ck.manana ? 1 : 0, 'var(--ac)', 'Mañana', ck.manana ? '✓' : '100'),
      anillo(ck.noche ? 1 : 0, 'var(--ac2)', 'Noche', ck.noche ? '✓' : '50'),
      anillo(tot ? (tot - pend) / tot : 0, 'var(--ok)', 'Tarjetas', pend ? String(pend) : '✓')));
  return c;
}

/* ---------------- insignias ---------------- */
export function insignias() {
  const ints = store.d.intentos.filter(cuenta);
  const racha = store.racha();
  const dominadas = (store.d.tarjetas || []).filter((t) => t.dominada).length;
  const esp = store.resumen().especialidades.filter((e) => e.nota >= 16 && e.n >= 5);
  const completo = ints.some((i) => i.total >= 100 && i.sin_responder === 0);

  return [
    { id: 'primer16', ic: '🎯', t: 'Primer 16', d: 'Sacar 16 o más en un simulacro', ok: ints.some((i) => i.nota >= 16) },
    { id: 'racha3', ic: '🔥', t: 'Racha de 3', d: '3 días seguidos cumpliendo', ok: racha >= 3 },
    { id: 'racha7', ic: '🔥', t: 'Racha de 7', d: 'Una semana seguida', ok: racha >= 7 },
    { id: 'racha14', ic: '🏆', t: 'Racha de 14', d: 'Dos semanas sin fallar un día', ok: racha >= 14 },
    { id: 't50', ic: '🃏', t: '50 tarjetas', d: '50 tarjetas dominadas', ok: dominadas >= 50 },
    { id: 't100', ic: '🧠', t: '100 tarjetas', d: '100 tarjetas dominadas', ok: dominadas >= 100 },
    { id: 'verde', ic: '🟢', t: 'Especialidad en verde', d: 'Una especialidad con 16 o más', ok: esp.length > 0, extra: esp[0]?.k },
    { id: 'completo', ic: '💯', t: 'Sin dejar ninguna', d: 'Un simulacro de 100 sin preguntas en blanco', ok: completo },
  ];
}

export function panelInsignias() {
  const lista = insignias();
  const ganadas = lista.filter((i) => i.ok).length;
  const c = el('div', { class: 'card' },
    el('div', { class: 'row sp' }, el('h3', { style: 'margin:0' }, 'Insignias'),
      el('span', { class: 'chip' }, `${ganadas} de ${lista.length}`)));
  const g = el('div', { class: 'insignias' });
  for (const i of lista) {
    g.append(el('div', { class: 'insignia' + (i.ok ? ' ganada' : ''), title: i.d },
      el('span', { class: 'ic' }, i.ic),
      el('b', {}, i.t),
      el('small', {}, i.ok && i.extra ? i.extra : i.d)));
  }
  c.append(g);
  return c;
}

/** Insignias recién ganadas respecto a la última vez que se miró. */
export function nuevasInsignias() {
  let antes = [];
  try { antes = JSON.parse(localStorage.getItem('si.insignias') || '[]'); } catch {}
  const ahora = insignias().filter((i) => i.ok).map((i) => i.id);
  const nuevas = ahora.filter((x) => !antes.includes(x));
  try { localStorage.setItem('si.insignias', JSON.stringify(ahora)); } catch {}
  return nuevas.map((id) => insignias().find((i) => i.id === id)).filter(Boolean);
}
