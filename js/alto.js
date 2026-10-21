// Alto rendimiento: temas que más se repiten, perlas top y normas técnicas.
// Los tres archivos se generan una sola vez desde los bancos y la carpeta 28. NT.
import { el, $, pct, toast } from './util.js';
import { store } from './store.js';
import { botonEscuchar } from './audio.js';

const cache = {};
async function cargar(nombre) {
  if (cache[nombre]) return cache[nombre];
  const k = 'si.alto.' + nombre;
  try {
    const r = await fetch(`alto_rendimiento/${nombre}.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    try { localStorage.setItem(k, JSON.stringify(d)); } catch {}
    return (cache[nombre] = d);
  } catch {
    const c = localStorage.getItem(k);
    if (!c) return null;
    return (cache[nombre] = JSON.parse(c));
  }
}

export async function pantallaAlto(vista, cual) {
  vista.classList.add('ancho');
  const pestanas = [
    ['temas', '📊', 'Temas que se repiten'],
    ['perlas', '💎', 'Top perlas'],
    ['normas', '📋', 'Normas técnicas'],
  ];
  const activa = pestanas.some(([k]) => k === cual) ? cual : 'temas';

  vista.append(el('h1', {}, 'Alto rendimiento'));
  const barra = el('div', { class: 'row', style: 'margin:0 0 16px' });
  for (const [k, ic, t] of pestanas) {
    barra.append(el('a', {
      class: 'btn sm', href: `#/alto-rendimiento/${k}`,
      style: k === activa ? 'border-color:var(--ac);background:var(--ac-soft);color:var(--ac)' : '',
    }, `${ic} ${t}`));
  }
  vista.append(barra);

  const cont = el('div', {}, el('p', {}, el('small', {}, 'Cargando…')));
  vista.append(cont);

  if (activa === 'temas') return pintarTemas(cont, await cargar('temas_repetidos'));
  if (activa === 'perlas') return pintarPerlas(cont, await cargar('top_perlas'));
  return pintarNormas(cont, await cargar('normas_tecnicas'));
}

const vacio = (c) => c.replaceChildren(el('div', { class: 'vacio' }, el('span', { class: 'ic' }, '📭'),
  'Esta sección todavía no se ha generado.'));

/* ---------------- temas que se repiten ---------------- */
function pintarTemas(cont, d) {
  if (!d) return vacio(cont);
  // ¿ya lo domino? según mi nota en ese tema
  const mios = {};
  for (const t of store.resumen().temas) mios[t.k] = t.nota;

  cont.replaceChildren();
  cont.append(el('p', {}, el('small', {}, `${d.temas.length} temas con 3 o más apariciones, sobre ${d.base}.`)));
  const max = d.temas[0]?.apariciones || 1;
  let espActual = null;
  for (const t of d.temas) {
    if (t.especialidad !== espActual) {
      espActual = t.especialidad;
      cont.append(el('h3', { style: 'margin:18px 0 8px' }, espActual));
    }
    const clave = `${t.especialidad} · ${t.tema}`;
    const nota = mios[clave];
    const fila = el('div', { class: 'tema-alto' });
    fila.append(el('div', { class: 'row sp', style: 'margin:0 0 4px' },
      el('span', { style: 'font-weight:700' }, t.tema),
      el('span', { class: 'row', style: 'gap:6px' },
        nota != null ? el('span', { class: 'sem ' + (nota >= 16 ? 'v' : nota >= 13 ? 'a' : 'r') }) : null,
        el('b', { style: 'font-variant-numeric:tabular-nums' }, String(t.apariciones)))));
    const b = el('div', { class: 'barh' });
    b.append(el('i', { style: `width:${Math.round((100 * t.apariciones) / max)}%;background:${nota == null ? 'var(--ac)' : nota >= 16 ? 'var(--ok)' : nota >= 13 ? 'var(--warn)' : 'var(--bad)'}` }));
    fila.append(b);
    fila.append(el('small', { style: 'display:block;margin-top:4px;color:var(--fg3)' },
      `📂 ${t.fuente.carpeta}${t.fuente.seccion ? ' › tema ' + t.fuente.seccion : ''}` +
      (nota != null ? ` · tu nota ${nota.toFixed(1)}` : ' · aún sin datos tuyos')));
    cont.append(fila);
  }
}

/* ---------------- top perlas ---------------- */
function pintarPerlas(cont, d) {
  if (!d) return vacio(cont);
  const esps = [...new Set(d.perlas.map((p) => p.especialidad))];
  let filtro = '';
  cont.replaceChildren();
  const sel = el('select', { style: 'margin:0 0 14px', onchange: (e) => { filtro = e.target.value; render(); } },
    el('option', { value: '' }, `Todas (${d.perlas.length})`),
    ...esps.map((e) => el('option', { value: e }, `${e} (${d.perlas.filter((p) => p.especialidad === e).length})`)));
  const lista = el('div');
  cont.append(sel, lista);

  function render() {
    const ps = d.perlas.filter((p) => !filtro || p.especialidad === filtro);
    lista.replaceChildren();
    lista.append(el('div', { class: 'row', style: 'margin:0 0 12px' },
      botonEscuchar(() => ps.map((p) => p.texto).join('. '), 'Escuchar todas') || el('span'),
      el('small', {}, `${ps.length} perlas`)));
    let tema = null;
    for (const p of ps) {
      if (p.tema !== tema) { tema = p.tema; lista.append(el('h3', { style: 'margin:16px 0 6px' }, `${p.especialidad} · ${tema}`)); }
      lista.append(el('div', { class: 'perla', style: 'margin:0 0 8px;display:flex;gap:10px;align-items:flex-start' },
        el('span', { style: 'flex:1' }, '💡 ' + p.texto),
        botonEscuchar(() => p.texto) || el('span')));
    }
  }
  render();
}

/* ---------------- normas técnicas ---------------- */
function pintarNormas(cont, d) {
  if (!d) return vacio(cont);
  cont.replaceChildren();
  cont.append(el('p', {}, el('small', {}, `${d.normas.length} normas · ${d.normas.reduce((a, n) => a + n.puntos.length, 0)} datos que más se preguntan.`)));
  for (const n of d.normas) {
    const det = el('details', { class: 'rev' });
    det.append(el('summary', {},
      el('span', { class: 'num' }, '📋'),
      el('span', { style: 'flex:1' }, el('b', {}, n.titulo), el('small', { style: 'display:block' }, n.norma)),
      el('span', { class: 'chip' }, String(n.puntos.length))));
    const b = el('div', { class: 'body' });
    b.append(el('div', { class: 'row', style: 'margin:0 0 10px' },
      botonEscuchar(() => `${n.titulo}. ` + n.puntos.map((x) => `${x.p}. ${x.r}`).join('. ')) || el('span')));
    for (const x of n.puntos) {
      b.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, x.p), x.r));
    }
    if (n.perla) b.append(el('div', { class: 'perla' }, '💡 ' + n.perla));
    b.append(el('small', { style: 'display:block;margin-top:8px;color:var(--fg3)' },
      `📂 ${n.fuente.carpeta} › ${n.fuente.archivo}`));
    det.append(b);
    cont.append(det);
  }
}
