// Lectura en voz alta con la voz del propio dispositivo (funciona sin internet).
import { el, toast } from './util.js';

export const hayVoz = () => typeof speechSynthesis !== 'undefined';

function vozEspanol() {
  const vs = speechSynthesis.getVoices() || [];
  return vs.find((v) => /^es-(PE|MX|US|419)/i.test(v.lang))
      || vs.find((v) => /^es/i.test(v.lang))
      || null;
}

/** Lee un texto. Devuelve una promesa que termina al acabar (o al cortarse). */
export function leer(txt, { velocidad = 1 } = {}) {
  return new Promise((listo) => {
    if (!hayVoz() || !txt) return listo();
    const u = new SpeechSynthesisUtterance(String(txt).replace(/\s+/g, ' ').trim());
    const v = vozEspanol();
    if (v) u.voice = v;
    u.lang = v?.lang || 'es-ES';
    u.rate = velocidad;
    u.onend = u.onerror = () => listo();
    speechSynthesis.speak(u);
  });
}

export const callar = () => { try { speechSynthesis.cancel(); } catch {} };
export const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

/** Botón de altavoz reutilizable. */
export function botonEscuchar(obtenerTexto, etiqueta = 'Escuchar') {
  if (!hayVoz()) return null;
  let sonando = false;
  const b = el('button', {
    class: 'btn sm', title: etiqueta, 'aria-label': etiqueta,
    onclick: async () => {
      if (sonando) { callar(); sonando = false; b.textContent = '🔊'; return; }
      sonando = true; b.textContent = '⏹';
      await leer(obtenerTexto());
      sonando = false; b.textContent = '🔊';
    },
  }, '🔊');
  return b;
}

/** Repaso en audio: frente, pausa de 3 s, reverso. Ideal para el viaje. */
export async function repasoEnAudio(tarjetas, { alCambiar, seguir = () => true } = {}) {
  for (const t of tarjetas) {
    if (!seguir()) break;
    alCambiar?.(t, 'frente');
    await leer(t.frente);
    await pausa(3000);
    if (!seguir()) break;
    alCambiar?.(t, 'reverso');
    await leer([t.reverso, t.porque, t.nemotecnia].filter(Boolean).join('. '));
    await pausa(700);
  }
  callar();
}

// algunos navegadores cargan las voces tarde
if (hayVoz()) speechSynthesis.getVoices();
