// "Mis tarjetas": tarjetas tipo Anki hechas con mis errores, con nemotecnias.
import { el, $, fmt, pct, hoyLima, diasEntre, toast, descargar, vibrar } from './util.js';
import { store } from './store.js';
import { sincronizarTarjetas } from './data.js';
import { botonEscuchar, repasoEnAudio, callar, hayVoz } from './audio.js';
import { confeti } from './tema.js';

const NIVELES = [
  { k: 'otra',    t: 'Otra vez', sub: 'hoy',      clase: 'bad' },
  { k: 'dificil', t: 'Difícil',  sub: '',          clase: 'warn' },
  { k: 'bien',    t: 'Bien',     sub: '',          clase: 'ac' },
  { k: 'facil',   t: 'Fácil',    sub: '',          clase: 'ok' },
];

const TIPOS = { concepto: 'Concepto', contraste: 'Contraste', huecos: 'Completar' };

export const ESTILOS = {
  ficha:     { nombre: 'Ficha',     sub: 'Limpia y directa, todo a la vista' },
  volteo:    { nombre: 'Volteo',    sub: 'Se da vuelta como una carta' },
  cartulina: { nombre: 'Cartulina', sub: 'Como una ficha de estudio en papel' },
};
export const leerEstilo = () => localStorage.getItem('si.estilo.tarjeta') || 'ficha';
export const guardarEstilo = (e) => { try { localStorage.setItem('si.estilo.tarjeta', e); } catch {} };

export const FRENTES = {
  teoria:   { nombre: 'Teoría',   sub: 'La pregunta directa del concepto' },
  caso:     { nombre: 'Caso',     sub: 'El caso clínico, como en el examen' },
  mezclado: { nombre: 'Mezclado', sub: 'Unas de teoría y otras de caso' },
};
export const leerFrente = () => localStorage.getItem('si.frente.tarjeta') || 'teoria';
export const guardarFrente = (f) => { try { localStorage.setItem('si.frente.tarjeta', f); } catch {} };

/** Decide qué va al frente de ESTA tarjeta y qué queda para el dorso. */
function dosCaras(t) {
  const hayCaso = !!t.caso;
  let modo = leerFrente();
  if (!hayCaso) modo = 'teoria';
  else if (modo === 'mezclado') {
    // estable por tarjeta: la misma siempre sale igual
    let h = 0; for (const c of String(t.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    modo = h % 2 ? 'caso' : 'teoria';
  }
  return modo === 'caso'
    ? { frente: t.caso, otro: t.frente, etiquetaOtro: 'La teoría' }
    : { frente: t.frente, otro: hayCaso ? t.caso : null, etiquetaOtro: 'El caso del examen' };
}

/** Dibuja las dos caras de una tarjeta. Las tres formas usan el mismo armazón. */
function caras(t, { conMotivo = false } = {}) {
  const { frente: txtFrente, otro, etiquetaOtro } = dosCaras(t);
  const frente = el('div', { class: 'cara frente' },
    el('div', { class: 'etiquetas' },
      el('span', { class: 'chip ac' }, TIPOS[t.tipo] || 'Tarjeta'),
      t.tema ? el('span', { class: 'chip' }, t.tema) : null,
      conMotivo && t.motivo ? el('span', { class: 'chip warn' }, t.motivo) : null),
    el('div', { class: 'texto-frente' }, txtFrente));

  const dorso = el('div', { class: 'cara dorso' },
    el('div', { class: 'respuesta' }, t.reverso));
  if (t.elegiste) dorso.append(el('div', { class: 'elegiste' }, 'Marcaste: ' + t.elegiste));
  if (t.porque) dorso.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Por qué'), t.porque));
  if (t.nemotecnia) dorso.append(el('div', { class: 'nemo' }, '🧠 ' + t.nemotecnia));
  if (t.diagnostico) dorso.append(el('small', { class: 'dx' }, 'Era: ' + t.diagnostico));
  if (otro) {
    const d = el('details', { class: 'otracara' });
    d.append(el('summary', {}, etiquetaOtro), el('div', { class: 'texto-otro' }, otro));
    dorso.append(d);
  }
  if (t.fuente) dorso.append(el('small', { class: 'fte' },
    '📂 ' + [t.fuente.carpeta, t.fuente.archivo, t.fuente.seccion].filter(Boolean).join(' › ')));
  return { frente, dorso };
}

export async function pantallaTarjetas(vista) {
  vista.append(el('h1', {}, 'Mis tarjetas'));
  const aviso = el('p', {}, el('small', {}, 'Buscando tarjetas nuevas…'));
  vista.append(aviso);
  try {
    const n = await sincronizarTarjetas(store);
    aviso.replaceChildren(el('small', {}, n ? `Se añadieron ${n} tarjetas nuevas.` : 'Todo al día.'));
  } catch { aviso.replaceChildren(el('small', {}, 'Sin conexión: trabajo con las que ya tienes.')); }

  const todas = store.d.tarjetas || [];
  const vencidas = store.tarjetasVencidas();
  const dominadas = todas.filter((t) => t.dominada);

  vista.append(el('div', { class: 'kpis', style: 'margin:0 0 14px' },
    el('div', { class: 'kpi' }, el('b', { style: 'color:var(--ac)' }, String(vencidas.length)), el('small', {}, 'para hoy')),
    el('div', { class: 'kpi' }, el('b', {}, String(todas.length)), el('small', {}, 'en total')),
    el('div', { class: 'kpi' }, el('b', { style: 'color:var(--ok)' }, String(dominadas.length)), el('small', {}, 'dominadas')),
    el('div', { class: 'kpi' }, el('b', {}, pct(dominadas.length, todas.length) + '%'), el('small', {}, 'avance'))));

  if (!todas.length) {
    vista.append(el('div', { class: 'vacio' }, el('span', { class: 'ic' }, '🃏'),
      'Las tarjetas se crean solas cada mañana con lo que fallaste el día anterior y con los aciertos marcados «Adivinando».'));
    return;
  }

  vista.append(barraAjustesTarjeta(() => vista.dispatchEvent(new Event('recargar', { bubbles: true }))));

  vista.append(el('div', { class: 'row', style: 'margin:0 0 16px' },
    el('a', { class: 'btn pri', href: '#/repasar-tarjetas', style: vencidas.length ? 'flex:1' : 'flex:1;opacity:.45;pointer-events:none' },
      vencidas.length ? `Repasar ${vencidas.length}` : 'Nada para hoy'),
    hayVoz() ? el('a', { class: 'btn', href: '#/audio-tarjetas' }, '🎧 En audio') : null,
    el('button', { class: 'btn', onclick: () => { descargar(`tarjetas-anki-${hoyLima()}.csv`, store.tarjetasCSV(), 'text/csv'); toast('CSV listo para importar en Anki'); } }, '⬇ Anki')));

  // --- listado por especialidad ---
  const porEsp = {};
  for (const t of todas) (porEsp[t.especialidad || 'Sin especialidad'] ||= []).push(t);
  for (const [esp, lista] of Object.entries(porEsp).sort((a, b) => b[1].length - a[1].length)) {
    const dom = lista.filter((t) => t.dominada).length;
    const d = el('details', { class: 'rev' });
    d.append(el('summary', {},
      el('span', { class: 'num' }, String(lista.length)),
      el('span', { style: 'flex:1' }, esp),
      el('span', { class: 'chip ' + (dom === lista.length ? 'ok' : '') }, `${dom}/${lista.length}`)));
    const b = el('div', { class: 'body' });
    for (const t of lista) b.append(vistaTarjeta(t));
    d.append(b);
    vista.append(d);
  }
}

/** Los dos ajustes de la tarjeta, a la mano y no escondidos en Ajustes. */
export function barraAjustesTarjeta(alCambiar) {
  const caja = el('div', { class: 'card tight ajustes-tarjeta' });

  const fila = (titulo, opciones, leer, guardar) => {
    const f = el('div', { style: 'margin:0 0 10px' });
    f.append(el('small', { class: 'tit' }, titulo));
    const g = el('div', { class: 'segmentos' });
    for (const [k, o] of Object.entries(opciones)) {
      g.append(el('button', {
        'aria-pressed': leer() === k ? 'true' : 'false',
        title: o.sub,
        onclick: () => {
          guardar(k);
          [...g.children].forEach((x, i) => x.setAttribute('aria-pressed', Object.keys(opciones)[i] === k ? 'true' : 'false'));
          alCambiar?.();
        },
      }, o.nombre));
    }
    f.append(g);
    return f;
  };

  caja.append(
    fila('Forma de la tarjeta', ESTILOS, leerEstilo, guardarEstilo),
    fila('Qué va al frente', FRENTES, leerFrente, guardarFrente),
  );
  return caja;
}

/** Una tarjeta en modo lectura (para el listado). */
function vistaTarjeta(t) {
  const { frente, dorso } = caras(t, { conMotivo: true });
  const c = el('div', { class: 'tarjeta mini', 'data-estilo': leerEstilo(), 'data-volteada': '' });
  frente.prepend(el('div', { class: 'row', style: 'justify-content:flex-end' },
    t.dominada ? el('span', { class: 'chip ok' }, 'dominada') : null,
    botonEscuchar(() => [t.frente, t.reverso, t.porque, t.nemotecnia].filter(Boolean).join('. '))));
  c.append(frente, dorso);
  return c;
}

/* ---------------- sesión de repaso ---------------- */
export function pantallaRepasarTarjetas(vista) {
  let cola = store.tarjetasVencidas();
  if (!cola.length) {
    return vista.append(el('div', { class: 'vacio' }, el('span', { class: 'ic' }, '🎉'),
      'No tienes tarjetas pendientes. Vuelve mañana.'));
  }
  const total = cola.length;
  let hechas = 0;
  const cont = el('div');
  vista.append(el('h1', {}, 'Repaso de tarjetas'),
    barraAjustesTarjeta(() => pintar()), cont);

  function pintar() {
    const t = cola[0];
    if (!t) {
      confeti({ ms: 1800 });
      cont.replaceChildren(el('div', { class: 'card' },
        el('div', { class: 'nota v' }, el('b', {}, '✓'), el('small', {}, `${hechas} tarjetas repasadas`)),
        el('p', { style: 'text-align:center;margin-top:10px' }, el('small', {}, 'Las que marcaste «Otra vez» vuelven hoy mismo.')),
        el('div', { class: 'row', style: 'justify-content:center' },
          el('a', { class: 'btn pri', href: '#/tarjetas' }, 'Volver a mis tarjetas'))));
      return;
    }
    let revelada = false;
    const c = el('div');
    c.append(el('div', { class: 'row sp', style: 'margin:0 0 10px' },
      el('small', {}, `${hechas + 1} de ${total}`),
      el('span', { class: 'chip ac' }, TIPOS[t.tipo] || 'Tarjeta')));

    const { frente, dorso } = caras(t, { conMotivo: true });
    frente.prepend(el('div', { class: 'row', style: 'justify-content:flex-end' },
      botonEscuchar(() => (revelada ? [t.frente, t.reverso, t.porque, t.nemotecnia].filter(Boolean).join('. ') : t.frente))));
    const giro = el('div', { class: 'giro' }, frente, dorso);
    const tarjeta = el('div', { class: 'tarjeta grande', 'data-estilo': leerEstilo() }, giro);
    c.append(tarjeta);
    // En el volteo las dos caras se superponen, así que el alto lo manda la más larga.
    if (leerEstilo() === 'volteo') {
      const medir = () => {
        giro.style.height = 'auto';
        const h = Math.max(frente.scrollHeight, dorso.scrollHeight) + 2;
        giro.style.height = h + 'px';
      };
      requestAnimationFrame(medir);
      addEventListener('resize', medir, { once: true });
    }

    const revelar = () => {
      if (revelada) return;
      revelada = true;
      tarjeta.setAttribute('data-volteada', '');
      ver.remove();
      c.append(botones());
      vibrar(15);
    };
    tarjeta.style.cursor = 'pointer';
    tarjeta.title = 'Toca la tarjeta para ver la respuesta';
    tarjeta.addEventListener('click', (ev) => {
      if (ev.target.closest('button, a, summary, details')) return;   // no robar los controles
      revelar();
    });
    const ver = el('button', { class: 'btn pri full', style: 'margin-top:14px', onclick: revelar },
      leerEstilo() === 'volteo' ? '↻ Voltear la tarjeta' : 'Ver respuesta');
    c.append(ver);

    function botones() {
      const g = el('div', { class: 'niveles' });
      for (const n of NIVELES) {
        g.append(el('button', { class: 'btn nivel ' + n.clase, onclick: () => {
          store.calificarTarjeta(t.id, n.k);
          const actual = store.d.tarjetas.find((x) => x.id === t.id);
          vibrar(20);
          cola.shift();
          if (n.k === 'otra') cola.push(actual);   // vuelve al final de la cola de hoy
          else hechas++;
          pintar();
        } }, el('b', {}, n.t), el('small', {}, proximo(t, n.k))));
      }
      return g;
    }
    cont.replaceChildren(c);
    scrollTo({ top: 0, behavior: 'instant' });
  }

  const proximo = (t, nivel) => {
    if (nivel === 'otra') return 'hoy';
    const base = t.intervalo || 1;
    const d = nivel === 'dificil' ? Math.max(1, Math.round(base * 1.2))
      : nivel === 'bien' ? (t.repeticiones ? Math.max(1, Math.round(base * (t.facilidad || 2.5))) : 1)
      : Math.max(4, Math.round(base * (t.facilidad || 2.5) * 1.4));
    const tope = Math.max(1, diasEntre(hoyLima(), '2026-11-07'));
    const dd = Math.min(d, tope);
    return dd === 1 ? 'mañana' : `en ${dd} d`;
  };

  pintar();
}

/* ---------------- repaso en audio ---------------- */
export function pantallaAudioTarjetas(vista) {
  const cola = store.tarjetasVencidas().length ? store.tarjetasVencidas() : (store.d.tarjetas || []).slice(0, 30);
  vista.append(el('h1', {}, 'Repaso en audio'));
  if (!cola.length) return vista.append(el('div', { class: 'vacio' }, 'No hay tarjetas que leer.'));

  let activo = false;
  const estado = el('div', { class: 'card', style: 'min-height:160px' },
    el('p', {}, el('small', {}, `${cola.length} tarjetas. Lee el frente, espera 3 segundos y luego la respuesta. Puedes bloquear la pantalla.`)));
  const txt = el('div', { class: 'frente', style: 'margin-top:10px' }, '');
  estado.append(txt);

  const btn = el('button', { class: 'btn pri full', style: 'margin-top:14px', onclick: async () => {
    if (activo) { activo = false; callar(); btn.textContent = '▶ Empezar'; txt.textContent = ''; return; }
    activo = true; btn.textContent = '⏹ Detener';
    await repasoEnAudio(cola, {
      seguir: () => activo,
      alCambiar: (t, cara) => { txt.textContent = cara === 'frente' ? t.frente : t.reverso; },
    });
    activo = false; btn.textContent = '▶ Empezar'; txt.textContent = '';
  } }, '▶ Empezar');

  vista.append(estado, btn,
    el('p', { style: 'margin-top:12px' }, el('small', {}, 'Ideal para el viaje a Lima del 6 de noviembre: funciona sin internet.')));
  addEventListener('hashchange', () => { activo = false; callar(); }, { once: true });
}
