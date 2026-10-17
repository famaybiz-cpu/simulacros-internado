// Gráficos en SVG, sin librerías.
import { el } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (t, a = {}) => { const n = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) n.setAttribute(k, v); return n; };

/** Línea de evolución de la nota con la meta en 16. */
export function lineaNota(series, { meta = 16, alto = 190 } = {}) {
  const W = 620, H = alto, L = 34, Rr = 10, T = 12, B = 26;
  const svg = s('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img' });
  const todos = series.flatMap((x) => x.puntos);
  if (!todos.length) return el('div', { class: 'vacio', text: 'Todavía no hay notas.' });

  const n = Math.max(...series.map((x) => x.puntos.length), 2);
  const x = (i) => L + (i * (W - L - Rr)) / Math.max(1, n - 1);
  const y = (v) => T + (1 - v / 20) * (H - T - B);

  for (const v of [0, 5, 10, 15, 20]) {
    svg.append(s('line', { x1: L, x2: W - Rr, y1: y(v), y2: y(v), stroke: 'var(--line)', 'stroke-width': 1 }));
    const t = s('text', { x: 4, y: y(v) + 4, fill: 'var(--fg3)', 'font-size': 11 }); t.textContent = v; svg.append(t);
  }
  svg.append(s('line', { x1: L, x2: W - Rr, y1: y(meta), y2: y(meta), stroke: 'var(--ok)', 'stroke-width': 2, 'stroke-dasharray': '6 5' }));
  const tm = s('text', { x: W - Rr, y: y(meta) - 6, fill: 'var(--ok)', 'font-size': 11, 'text-anchor': 'end', 'font-weight': 700 });
  tm.textContent = `meta ${meta}`; svg.append(tm);

  for (const se of series) {
    if (!se.puntos.length) continue;
    const d = se.puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    svg.append(s('path', { d, fill: 'none', stroke: se.color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    se.puntos.forEach((p, i) => svg.append(s('circle', { cx: x(i), cy: y(p.v), r: 3.5, fill: se.color })));
  }
  // proyección lineal del promedio
  const prom = series[0]?.puntos || [];
  if (prom.length >= 3) {
    const k = prom.length, sx = prom.reduce((a, _, i) => a + i, 0), sy = prom.reduce((a, p) => a + p.v, 0);
    const sxy = prom.reduce((a, p, i) => a + i * p.v, 0), sxx = prom.reduce((a, _, i) => a + i * i, 0);
    const m = (k * sxy - sx * sy) / (k * sxx - sx * sx || 1), b = (sy - m * sx) / k;
    const fin = Math.max(0, Math.min(20, m * (n + 3) + b));
    svg.append(s('path', {
      d: `M${x(prom.length - 1)},${y(prom.at(-1).v)} L${W - Rr},${y(fin)}`,
      stroke: 'var(--ac)', 'stroke-width': 2, 'stroke-dasharray': '3 4', fill: 'none', opacity: .75,
    }));
  }
  return svg;
}

/** Barras horizontales con semáforo. */
export function barras(filas, { max = 20 } = {}) {
  if (!filas.length) return el('div', { class: 'vacio', text: 'Sin datos todavía.' });
  const cont = el('div');
  for (const f of filas) {
    const p = Math.max(2, Math.round((100 * f.valor) / max));
    const col = f.color || (f.valor >= 16 ? 'var(--ok)' : f.valor >= 13 ? 'var(--warn)' : 'var(--bad)');
    cont.append(el('div', { class: 'row sp', style: 'gap:10px;margin:0 0 4px' },
      el('span', { style: 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px' }, f.k),
      el('b', { style: 'font-variant-numeric:tabular-nums;font-size:15px' }, f.etiqueta ?? f.valor.toFixed(1)),
    ));
    const barra = el('div', { class: 'barh', style: 'margin:0 0 12px' });
    barra.append(el('i', { style: `width:${p}%;background:${col}` }));
    cont.append(barra);
  }
  return cont;
}

/** Barras verticales (bloques de fatiga, seguridad, tiempo). */
export function columnas(datos, { max = 20, alto = 150 } = {}) {
  const W = 620, H = alto, B = 30, T = 18;
  const svg = s('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}` });
  const w = (W - 10) / datos.length;
  datos.forEach((d, i) => {
    const h = d.n ? Math.max(3, ((H - B - T) * d.valor) / max) : 0;
    const cx = 5 + i * w;
    svg.append(s('rect', {
      x: cx + w * 0.16, y: H - B - h, width: w * 0.68, height: h, rx: 6,
      fill: d.n ? (d.valor >= 16 ? 'var(--ok)' : d.valor >= 13 ? 'var(--warn)' : 'var(--bad)') : 'var(--bg3)',
    }));
    const v = s('text', { x: cx + w / 2, y: H - B - h - 5, fill: 'var(--fg2)', 'font-size': 12, 'text-anchor': 'middle', 'font-weight': 700 });
    v.textContent = d.n ? d.etiqueta ?? d.valor.toFixed(1) : '—'; svg.append(v);
    const l = s('text', { x: cx + w / 2, y: H - 10, fill: 'var(--fg3)', 'font-size': 11, 'text-anchor': 'middle' });
    l.textContent = d.k; svg.append(l);
  });
  return svg;
}
