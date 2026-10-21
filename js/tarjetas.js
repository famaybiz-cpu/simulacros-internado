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
    for (const t of lista) b.append(vistaTarjeta(t, { compacta: true }));
    d.append(b);
    vista.append(d);
  }
}

/** Una tarjeta en modo lectura (para el listado). */
function vistaTarjeta(t, { compacta = false } = {}) {
  const c = el('div', { class: 'tarjeta' + (compacta ? ' mini' : '') });
  c.append(el('div', { class: 'row', style: 'margin:0 0 6px' },
    el('span', { class: 'chip ac' }, TIPOS[t.tipo] || 'Tarjeta'),
    t.tema ? el('span', { class: 'chip' }, t.tema) : null,
    t.dominada ? el('span', { class: 'chip ok' }, 'dominada') : null,
    el('span', { class: 'spacer' }),
    botonEscuchar(() => [t.frente, t.reverso, t.porque, t.nemotecnia].filter(Boolean).join('. '))));
  c.append(el('div', { class: 'frente' }, t.frente));
  c.append(el('div', { class: 'reverso' }, t.reverso));
  if (t.porque) c.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Por qué'), t.porque));
  if (t.nemotecnia) c.append(el('div', { class: 'nemo' }, '🧠 ' + t.nemotecnia));
  if (t.fuente) c.append(el('small', { style: 'display:block;margin-top:6px;color:var(--fg3)' },
    '📂 ' + [t.fuente.carpeta, t.fuente.archivo, t.fuente.seccion].filter(Boolean).join(' › ')));
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
  vista.append(el('h1', {}, 'Repaso de tarjetas'), cont);

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

    const tarjeta = el('div', { class: 'tarjeta grande' });
    tarjeta.append(el('div', { class: 'row', style: 'margin:0 0 8px' },
      el('span', { class: 'spacer' }),
      botonEscuchar(() => (revelada ? [t.frente, t.reverso, t.porque, t.nemotecnia].filter(Boolean).join('. ') : t.frente))));
    tarjeta.append(el('div', { class: 'frente' }, t.frente));
    const atras = el('div', { style: 'display:none' });
    atras.append(el('hr'), el('div', { class: 'reverso' }, t.reverso));
    if (t.porque) atras.append(el('div', { class: 'bloque' }, el('span', { class: 'et' }, 'Por qué'), t.porque));
    if (t.nemotecnia) atras.append(el('div', { class: 'nemo' }, '🧠 ' + t.nemotecnia));
    if (t.fuente) atras.append(el('small', { style: 'display:block;margin-top:6px;color:var(--fg3)' },
      '📂 ' + [t.fuente.carpeta, t.fuente.archivo, t.fuente.seccion].filter(Boolean).join(' › ')));
    tarjeta.append(atras);
    c.append(tarjeta);

    const ver = el('button', { class: 'btn pri full', style: 'margin-top:14px', onclick: () => {
      revelada = true; atras.style.display = ''; ver.remove(); c.append(botones());
    } }, 'Ver respuesta');
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
