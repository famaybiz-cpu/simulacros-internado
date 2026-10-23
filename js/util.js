// Utilidades compartidas.

export const VERSION = 'v12';

export const EXAMEN = { fechaISO: '2026-11-08T07:00:00-05:00', meta: 16 };

/** El progreso oficial empieza acá: lo anterior no cuenta para nada (CLAUDE.md). */
export const INICIO_OFICIAL = '2026-10-21';
export const cuenta = (intento) => (intento?.fecha || '') >= INICIO_OFICIAL;

export const $  = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function el(tag, attrs = {}, ...hijos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) {
    if (h === null || h === undefined || h === false) continue;
    n.append(h.nodeType ? h : document.createTextNode(String(h)));
  }
  return n;
}

/** Fecha de hoy en Lima, como AAAA-MM-DD. */
export function hoyLima(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

export function sumaDias(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(a, b) {
  return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

export function fechaLarga(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const dow = DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  return `${dow} ${d} de ${MESES[m - 1]}`;
}

export function fechaCorta(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d}/${m}`;
}

export const mmss = (s) => {
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const LETRAS = ['A', 'B', 'C', 'D', 'E'];

/** Nota vigesimal: (aciertos / total) × 20. */
export const nota20 = (aciertos, total) => (total ? (aciertos / total) * 20 : 0);

export const semaforo = (n) => (n >= 16 ? 'v' : n >= 13 ? 'a' : 'r');

export function fmt(n, d = 1) {
  return Number(n).toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export const pct = (x, t) => (t ? Math.round((100 * x) / t) : 0);

/** Mezcla estable a partir de una semilla (mismo simulacro = mismo orden). */
export function mezclar(arr, semilla = 1) {
  const a = [...arr];
  let s = semilla >>> 0 || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function hash(txt) {
  let h = 2166136261;
  for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function vibrar(ms = 60) {
  try { navigator.vibrate?.(ms); } catch {}
}

let toastT;
export function toast(msg, ms = 2200) {
  $('.toast')?.remove();
  const t = el('div', { class: 'toast', text: msg });
  document.body.append(t);
  clearTimeout(toastT);
  toastT = setTimeout(() => t.remove(), ms);
}

export function descargar(nombre, texto, tipo = 'application/json') {
  const u = URL.createObjectURL(new Blob([texto], { type: tipo }));
  const a = el('a', { href: u, download: nombre });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}

/** Fase del plan según CLAUDE.md. */
export function fase(iso = hoyLima()) {
  if (iso < '2026-10-18') return { n: 0, t: 'Preparación' };
  if (iso <= '2026-10-25') return { n: 1, t: 'Énfasis rotativo por especialidad' };
  if (iso <= '2026-11-05') return { n: 2, t: 'Temas débiles y preguntas gemelas' };
  if (iso <= '2026-11-07') return { n: 3, t: 'Repaso final en Lima' };
  if (iso === '2026-11-08') return { n: 4, t: '¡Día del examen!' };
  return { n: 5, t: 'Terminado' };
}

export const ENFASIS = {
  '2026-10-18': 'Medicina Interna', '2026-10-19': 'Cirugía',
  '2026-10-20': 'Pediatría',        '2026-10-21': 'Ginecobstetricia',
  '2026-10-22': 'Salud Pública',    '2026-10-23': 'Medicina Interna',
  '2026-10-24': 'Cirugía',          '2026-10-25': 'Pediatría',
};

export const MOTIVOS = {
  no_sabia:  'No sabía',
  lei_mal:   'Leí mal el caso',
  confundi:  'Confundí con otra entidad',
  tiempo:    'Me ganó el tiempo',
};

export const CONFIANZA = { seguro: 'Seguro', dudoso: 'Dudoso', adivinando: 'Adivinando' };

export const TRAMPAS = {
  'otro-estadio':    'Correcto en otro estadio o severidad',
  'otro-momento':    'Correcto en otro momento del manejo',
  'otra-poblacion':  'Correcto en otra población',
  'diferencial':     'El diagnóstico diferencial más cercano',
  'mismo-grupo':     'Mismo grupo, agente equivocado',
  'otro-contexto':   'Correcto en otro contexto epidemiológico',
  'no-confirmatorio':'Examen correcto pero no el confirmatorio',
  'umbral':          'Cifra o umbral cercano',
  'otro':            'Otra trampa',
};
