# Tarjetas de DERMATOLOGÍA — 11 hojas A4 = 22 tarjetas A5

Motor: `render.py` (Playwright → PDF), `qc.py` (hueco de cada columna entre 0% y 12%, sin overflow),
`addbox.py`, `renum.py`. Hoja de estilo: `derma.css` (**tarjeta 1 oliva, tarjeta 2 orquídea**; sello **D E R M A**).
PDFs en `salida/`. Las 11 hojas pasan `qc.py` en OK.

## Orden = HORARIO 2

| Hoja | Contenido | Bloque del HORARIO 2 |
|---|---|---|
| D01 | Pitiriasis versicolor, alba y rosada · Tiñas (capitis, corporis, pedis, unguis) | **Mié 21-oct** — "Derma: infecciones y micosis" (Derma 2·5) |
| D02 | Escabiosis y pediculosis · Impétigo, piel escaldada, foliculitis y forúnculo | **Mié 21-oct** — mismo bloque |
| D03 | Erisipela, celulitis y ectima · Viruela del mono (mpox) | **Mié 21-oct** — mismo bloque (mpox = Derma 14, sin día propio) |
| D04 | Cáncer de piel no melanoma (CBC vs CEC, Kaposi) · Melanoma | **Mié 21-oct** — "Derma: Ca de piel y melanoma" (Derma 3·4) |
| D05 | Vitíligo · Urticaria, angioedema y anafilaxia | **Mié 21-oct** — "Dermatosis: vitíligo, urticaria, prurigo" (Derma 15·13·11) |
| D06 | Prúrigo y mapa del prurito · Liquen plano y dermatosis reactivas (eritema nodoso, Raynaud, berloque) | **Mié 21-oct** — mismo bloque |
| D07 | Hipersensibilidad I a IV · Dermatitis de contacto | **Vie 23-oct** — "Inmunología: hipersensibilidad" (Inmuno 8 · Derma 9) |
| D08 | Farmacodermias graves (SSJ/NET, DRESS, AGEP) · Pénfigo y penfigoide | **Lun 26-oct** — "Farmacodermias graves (SSJ/NET)" (Derma 6·9) |
| D09 | Lesiones elementales · Ciencias básicas de la piel | Sin día propio (Derma 7·1) |
| D10 | Dermatitis atópica y seborreica · Acné y rosácea | Sin día propio (Derma 8·10) |
| D11 | Psoriasis I (signos y tipos) · Psoriasis II (PASI y manejo) | Sin día propio (Derma 12) |

**Vuelta 2:** **martes 03-nov**, bloque "Vuelta 2 · uro, oftalmo, ORL, derma" (1:30) → repasar las 22 tarjetas.

## Notas de contenido

- El HORARIO 2 numera los temas con la **numeración del temario TwoMedics** (15 temas), que **no coincide**
  con los nombres de archivo descargados: en disco falta el número 9, así que `8. HIPERSENSIBILIDAD` es el
  tema 9, `9. ACNE VULGAR` es el 10, `10. DERMATOSIS` es el 11, `11. PSORIASIS` es el 12 y `12. PRURIGO` es el 13.
- Temas del temario **sin día asignado** (se les hizo tarjeta igual por ser muy preguntados): ciencias básicas (1),
  lesiones primarias (7), dermatitis (8), acné (10), psoriasis (12) y viruela del mono (14).
- **No hay ficha destilada de Dermatología**: todo sale del OCR crudo en `_SISTEMA_BANCOS/ocr/19. DERMATOLOGIA/`
  (15 archivos, ~56 KB). El bloque de **SSJ/NET no tiene archivo propio** en el curso: se armó con lo que hay en
  `6. PENFIGO` y `8. HIPERSENSIBILIDAD` (DRESS/NET/AGEP como tipo IV) más las preguntas de los bancos
  (`catalogo_fijas.md`, donde ya falló una vez: banco 06, pregunta 95).

## Trampas de fuente marcadas en las tarjetas (caja `.src`)

- **Erisipela "100% cara"** (curso): la cara es la localización clásica, pero hoy la más frecuente es el
  miembro inferior (D03).
- **Habón > 24 h = "dermografismo"** (curso): el dermografismo dura minutos; una roncha que persiste más de
  24 h obliga a descartar vasculitis urticarial (D05).
- **Cemento y cuero atribuidos al cobalto** (curso): clásicamente son del **cromo** (dermatitis del albañil);
  el níquel de la bisutería sí es correcto (D07).
- **Corte de tamaño de las lesiones**: el curso usa 1 cm (pápula < 1 cm) y la tabla anglosajona del mismo
  archivo usa 0,5 cm; en ENAM-EsSalud se responde con **1 cm** (D09).
- **"Queratinocitos anucleados en la granulosa"** (cuestionario del curso): están en la **capa córnea**, como
  dice el propio material unas líneas antes (D09).

## Corrección al LEEME de Urología

El LEEME de `../urologia/` dice que la Vuelta 2 de "uro, oftalmo, ORL, derma" es el **sáb 07-nov**:
en el HORARIO 2 ese bloque está en la columna del **martes 03-nov** (el 07-nov es viaje/sede y el examen es
el 08-nov).
