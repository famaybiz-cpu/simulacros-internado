# Tarjetas de GESTIÓN EN SALUD

Serie generada el **22-oct-2026** con el motor propio (HTML + `gestion.css` → `render.py` con Playwright → PDF A4 = 2 tarjetas A5). QC con `qc.py` (overflow 0 y hueco de cada columna entre 0 % y 12 %): **las 4 hojas pasan en OK**.

- Paleta: **oliva #4d7c0f** en la tarjeta 1, **burdeos #7f1d1d** en la tarjeta 2. Sello **G E S T I Ó N**.
- PDFs en `salida/`.
- Fuente: `_SISTEMA_BANCOS/ocr/15. GESTION EN SALUD/` (los 14 PDFs del curso ya están OCR; **no hay ficha destilada** de Gestión).

## Qué cubre esta serie

| Hoja | Tarjeta 1 | Tarjeta 2 | Tema del curso |
|---|---|---|---|
| **G01** | Residuos sólidos: clases (A/B/C, colores, subtipos) | Residuos: las 10 etapas del manejo | Gestión 5 |
| **G02** | Salud ocupacional (Ley 29783) | AVISA y carga de enfermedad | Gestión 10 · Gestión 6 |
| **G03** | Evaluación económica (ACM/ACE/ACU/ACB) | Modelos y normas de calidad (ISO, JCI, EFQM, Six Sigma, Lean) | Gestión 9 · Gestión 14 |
| **G04** | Marketing en salud (4P, Maslow) | Indicadores: las fórmulas | Gestión 7 · Gestión 12 |

## El HORARIO 2 y por qué la serie tiene solo 4 hojas

Toda la **Gestión en Salud del HORARIO 2 cae el jueves 29-oct-2026** (columna propia, 7 bloques), más un bloque el viernes 30-oct. Vuelta 2 el **lunes 2-nov** ("sistema de salud, categorización y bioética", Gestión 2·4).

| Día | Bloque del horario | Código | Dónde está la tarjeta |
|---|---|---|---|
| jue 29-oct | Sistema de salud peruano y AUS | Gestión 2 · 3 | `saludpublica/SP_S08` |
| jue 29-oct | Bioética II: obstinación, confidencialidad | Gestión 11 | `saludpublica/SP_S12` (tarjeta 2) |
| jue 29-oct | Categorización de EESS (I-1 a III-2) | Gestión 4 | `saludpublica/SP_S09` (tarjeta 1) |
| jue 29-oct | Proceso administrativo | Gestión 1 | `saludpublica/SP_S09` (t2) + `SP_S10` (t1) |
| jue 29-oct | Indicadores en salud | Gestión 12 · SP 1.3 | `saludpublica/SP_S10` (t2) **+ `Ges_G04` t2 (fórmulas)** |
| jue 29-oct | Calidad y acreditación | Gestión 8 · 13 · 14 | `saludpublica/SP_S11` (t1) **+ `Ges_G03` t2 (modelos y normas)** |
| jue 29-oct | Bioética y consentimiento informado | Gestión 11 | `saludpublica/SP_S12` (tarjeta 1) |
| vie 30-oct | Auditoría médica y HEARTS | Gestión 8 · 13 | `saludpublica/SP_S11` (tarjeta 2) |

**Los 8 bloques calendarizados ya tenían tarjeta** en la serie de Salud Pública (SP_S08 a SP_S13), así que esta serie **no los repite**: cubre los **temas del curso de Gestión que el HORARIO 2 dejó sin día** y que igual caen en el examen.

**Temas de Gestión sin día asignado en el HORARIO 2** (los que resuelve esta serie): Gestión 5 (residuos), 6 (AVISA), 7 (marketing), 9 (evaluación económica), 10 (salud ocupacional) y 14 (modelos y normas de calidad). Con esto el **curso de Gestión queda cubierto al 100 %**.

Las dos excepciones donde sí se profundiza sobre lo ya cubierto:
- `Ges_G03` t2 — **modelos y normas de calidad**: en `SP_S11` eran una sola caja; aquí van ISO, JCI, EFQM, Canadá, Six Sigma, Lean, TQM y CMMI con tipo, origen y ámbito.
- `Ges_G04` t2 — **indicadores**: aporta la **adecuación** (recurso que tengo / recurso que necesito) y la densidad de RRHH, que no están en `SP_S10`.

## Trampas de fuente marcadas en estas tarjetas

- **Residuos:** el curso escribe *"residuos tipo C: los comunes · radiactivos · bolsa plomo"*. Mezcla dos clases: **C = común y bolsa NEGRA**; los **radiactivos son B.3** (clase B, especial, envase plomado).
- **Residuos:** el curso lista "eliminación final" y "disposiciones finales" como dos etapas; la NTS 144 agrupa el destino final e intercala la **valorización**.
- **Salud ocupacional:** el cuadro del curso numera la jerarquía de control **al revés** ("de menos a más efectivo") y deja el **EPP como n.º 1**. El EPP es el **menos** efectivo.
- **AVISA:** el curso lo rotula **"indicador de MORTALIDAD"**; es mixto (AVP mortalidad + AVD morbilidad). Y pone **"infecciones respiratorias" entre las no transmisibles**, cuando son transmisibles.
- **Indicadores:** varios textos **invierten productividad y rendimiento**. En este curso: **programado = productividad**, **real = rendimiento**.

## Contenido añadido que NO está en el PDF del curso (marcado con caja `.src` en la tarjeta)

- Ley 29783: comité de SST con ≥ 20 trabajadores y exámenes médicos ocupacionales de ingreso/periódico/retiro.
- Accidente de trabajo vs enfermedad ocupacional.
- NTS 144: rótulo en recipientes rígidos y en el almacenamiento.
