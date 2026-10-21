// Paletas, modo claro/oscuro y pequeñas celebraciones.
import { el } from './util.js';

const K = 'si.tema.v1';

export const PALETAS = {
  cielo:   { nombre: 'Cielo y durazno', muestra: ['#4AA8FF', '#FFB38A', '#3DD6A3'] },
  menta:   { nombre: 'Menta y coral',   muestra: ['#2EC4B6', '#FFD166', '#FF6B6B'] },
  lavanda: { nombre: 'Lavanda energía', muestra: ['#8B5CF6', '#F472B6', '#34D399'] },
};

export const MODOS = { auto: 'Automático', claro: 'Siempre claro', oscuro: 'Siempre oscuro' };

export function leerTema() {
  try { return { paleta: 'cielo', modo: 'auto', ...JSON.parse(localStorage.getItem(K) || '{}') }; }
  catch { return { paleta: 'cielo', modo: 'auto' }; }
}

export function aplicarTema(t = leerTema()) {
  const r = document.documentElement;
  r.setAttribute('data-tema', PALETAS[t.paleta] ? t.paleta : 'cielo');
  r.removeAttribute('data-claro'); r.removeAttribute('data-oscuro');
  if (t.modo === 'claro') r.setAttribute('data-claro', '');
  if (t.modo === 'oscuro') r.setAttribute('data-oscuro', '');
  // que la barra del navegador acompañe
  const fondo = getComputedStyle(r).getPropertyValue('--bg').trim();
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) m.setAttribute('content', fondo);
  try { localStorage.setItem(K, JSON.stringify(t)); } catch {}
  return t;
}

export function guardarTema(parcial) { return aplicarTema({ ...leerTema(), ...parcial }); }

/* ---------------- confeti ---------------- */
/** Lluvia breve de confeti. Se usa al terminar un simulacro con 16 o más. */
export function confeti({ ms = 2600 } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = el('canvas', { style: 'position:fixed;inset:0;z-index:120;pointer-events:none' });
  document.body.append(cv);
  const ctx = cv.getContext('2d');
  const d = Math.min(2, devicePixelRatio || 1);
  const medir = () => { cv.width = innerWidth * d; cv.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  medir(); addEventListener('resize', medir);

  const css = getComputedStyle(document.documentElement);
  const tintas = ['--ac', '--ac2', '--ok', '--warn'].map((v) => css.getPropertyValue(v).trim() || '#4AA8FF');
  const piezas = Array.from({ length: 140 }, () => ({
    x: Math.random() * innerWidth,
    y: -20 - Math.random() * innerHeight * 0.6,
    vx: (Math.random() - 0.5) * 1.6,
    vy: 2 + Math.random() * 3.2,
    g: Math.random() * Math.PI,
    vg: (Math.random() - 0.5) * 0.22,
    w: 6 + Math.random() * 7,
    h: 9 + Math.random() * 9,
    c: tintas[(Math.random() * tintas.length) | 0],
  }));

  const fin = performance.now() + ms;
  (function cuadro(ahora) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of piezas) {
      p.x += p.vx; p.y += p.vy; p.g += p.vg;
      if (p.y > innerHeight + 30) { p.y = -20; p.x = Math.random() * innerWidth; }
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.g);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (ahora < fin) requestAnimationFrame(cuadro);
    else { removeEventListener('resize', medir); cv.remove(); }
  })(performance.now());
}

/* ---------------- mensajes de ánimo ---------------- */
const MENSAJES = {
  excelente: [
    '¡Eso es nota de internado! Así se ve el 8 de noviembre.',
    'Dominaste el simulacro. Guarda esta sensación para el día del examen.',
    'Nota de sobra para la meta. Lo que sabes ya se nota.',
  ],
  meta: [
    '¡Llegaste al 16! Esa es exactamente la nota que necesitas.',
    'Meta cumplida. Ahora toca sostenerlo, que es lo difícil.',
    'Pasaste la línea. Repite esto tres días seguidos y es tuyo.',
  ],
  cerca: [
    'Te quedaste cerca. Lo que falta está en el cuaderno de errores, no en los libros.',
    'A un paso. Revisa los errores de hoy y mañana lo cruzas.',
    'Casi. Mira los que fallaste estando segura: ahí está tu punto que falta.',
  ],
  lejos: [
    'Día difícil, no día perdido: cada error de hoy es una tarjeta menos para noviembre.',
    'La nota de hoy no es la del examen. Lo que cuenta es la pendiente.',
    'Respira. Revisa los errores con calma y mañana vuelves con eso corregido.',
  ],
};
export function mensajeAnimo(nota) {
  const g = nota >= 18 ? 'excelente' : nota >= 16 ? 'meta' : nota >= 13 ? 'cerca' : 'lejos';
  const l = MENSAJES[g];
  return l[(Math.random() * l.length) | 0];
}
