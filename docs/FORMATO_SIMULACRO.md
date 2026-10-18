# Formato del JSON de un simulacro

Las rutinas `/manana` y `/noche` escriben un archivo en `simulacros/` y lo agregan a `simulacros/index.json`. La web lo lee sola.

## Nombre del archivo

```
simulacros/AAAA-MM-DD-manana.json    (100 preguntas)
simulacros/AAAA-MM-DD-noche.json     (50 preguntas, 2 temas)
```

## Estructura

```jsonc
{
  "id": "2026-10-18-manana",          // igual al nombre del archivo, sin .json
  "fecha": "2026-10-18",
  "turno": "manana",                  // "manana" | "noche"
  "titulo": "Simulacro de la mañana",
  "segundos_por_pregunta": 45,   // solo es un OBJETIVO de ritmo; el reloj que manda es el total
                                 // (2 h por cada 100 preguntas) y ninguna pregunta se cierra sola

  // SOLO en el de la noche:
  "temas_noche": ["Obstetricia · Hemorragia postparto", "Nefrología · Trastornos del potasio"],
  "feedback_noche": "Máximo 5 líneas.",
  "perlas_noche": ["…", "…", "…", "…", "…"],

  "preguntas": [ /* ver abajo */ ]
}
```

## Cada pregunta

```jsonc
{
  "id": "2026-10-18-manana-001",
  "enunciado": "Caso clínico de 4 a 8 líneas. Edad, sexo, tiempo de enfermedad, antecedentes, funciones vitales con valores (PA 130/80 mmHg, FR 25X', FC 110X', T° 39 °C), examen físico y, cuando aplique, laboratorio, AGA, EKG o imágenes DESCRITOS, nunca interpretados.",
  "opciones": ["…", "…", "…", "…", "…"],   // exactamente 5, misma categoría y largo parejo
  "clave": 3,                                // 1 = A, 2 = B, 3 = C, 4 = D, 5 = E

  "especialidad": "Nefrología",              // nunca aparece durante el examen
  "tema": "Trastornos del potasio",
  "diagnostico": "Hiperkalemia grave con cambios electrocardiográficos",
  "tipo": "conducta",                        // conducta | tratamiento | prueba | complicacion |
                                             // mecanismo | severidad | dosis | contraindicacion |
                                             // norma | diagnostico  (este último: máximo 10 %)
  "dificultad": "alta",                      // media | alta | muy alta

  "razonamiento": "Paso 1: qué dato se interpreta. Paso 2: qué se deduce. Paso 3: por qué esa conducta.",
  "por_que_no": ["…", "…", "", "…", "…"],    // 5 entradas; la de la clave va vacía ("").
                                             // Cada una dice por qué NO en ESTE caso y en cuál SÍ.
  "trampa": ["otro-estadio", "otro-momento", "", "otra-poblacion", "diferencial"],
                                             // 5 entradas; la de la clave va vacía
  "perla": "Una línea para memorizar.",
  "fuente": { "carpeta": "14. NEFROLOGIA", "archivo": "14. ACIDOSIS METABOLICA.pdf", "seccion": "p. 2" },
  "gemela_de": null                          // id de la pregunta original si es una gemela
}
```

### Valores admitidos en `trampa`

| Clave | Significado |
|---|---|
| `otro-estadio` | correcto en otro estadio o severidad |
| `otro-momento` | correcto en otro momento del manejo (inicial vs definitivo) |
| `otra-poblacion` | correcto en otra población (gestante, niño, adulto mayor) |
| `diferencial` | el diagnóstico diferencial más cercano |
| `mismo-grupo` | mismo grupo farmacológico, agente equivocado |
| `otro-contexto` | correcto en otro contexto epidemiológico |
| `no-confirmatorio` | examen correcto pero no el que confirma |
| `umbral` | cifra o umbral cercano |
| `otro` | otra trampa |

## El índice

`simulacros/index.json` lista lo publicado:

```json
{
  "actualizado": "2026-10-18",
  "simulacros": [
    { "id": "2026-10-18-manana", "fecha": "2026-10-18", "turno": "manana", "titulo": "Simulacro de la mañana", "n": 100 }
  ]
}
```

## Control de calidad antes de guardar

- Ninguna alternativa se descarta por sentido común ni es de otro tema.
- Al menos 3 distractores "casi correctos".
- La clave repartida entre A y E (20 % cada letra en un simulacro de 100).
- Como máximo 1 de cada 10 preguntas pide el diagnóstico.
- Largo del enunciado: entre 45 y 130 palabras (4–8 líneas).
- Ningún caso repetido de días anteriores ni entre la mañana y la noche.
