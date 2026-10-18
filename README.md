# Simulacros Internado

**Link de la app: https://famaybiz-cpu.github.io/simulacros-internado/**

Plataforma de simulacros diarios para el examen de internado médico del **domingo 8 de noviembre de 2026, 7:00 am (Lima)**. Meta: **16/20**.

La web es HTML, CSS y JavaScript puro: no necesita compilarse ni instalarse nada. Se publica en GitHub Pages y se usa desde el iPad y el celular como si fuera una app.

## Qué hay acá

| Carpeta | Qué contiene |
|---|---|
| `index.html`, `css/`, `js/`, `sw.js`, `icons/` | la web |
| `simulacros/` | un JSON por simulacro (`AAAA-MM-DD-manana.json`, `AAAA-MM-DD-noche.json`) y el `index.json` que los lista |
| `bin/leer_progreso` | script que lee el progreso antes de generar cada simulacro |
| `docs/` | cómo publicar, cómo configurar Firebase y el formato del JSON |
| `analisis/` | análisis de los bancos y el índice del temario (**no se sube al repositorio**) |

La carpeta `Internado` de iCloud **nunca** entra acá: solo se lee para redactar las preguntas.

## Cómo funciona el día a día

1. **5:00 am** — la rutina `/manana` genera el simulacro de 100 preguntas, lo guarda en `simulacros/` y hace push.
2. Abres la web en el iPad o el celular: la tarjeta de la mañana aparece lista.
3. **6:00 pm** — la rutina `/noche` elige 2 temas según lo que fallaste y genera 50 preguntas.
4. Tus respuestas, errores y perlas se guardan en el dispositivo y, si configuraste Firebase, se sincronizan entre iPad y celular.

## Modos

- **Examen**: 40 segundos por pregunta, barra de tiempo que se pone roja en los últimos 10 segundos y vibra, y nada de respuestas hasta el final.
- **Estudio**: sin tiempo, con la explicación completa apenas respondes.

En los dos modos registras tu nivel de seguridad (Seguro / Dudoso / Adivinando) con un toque, puedes marcar preguntas para revisar y se anota si cambias de respuesta y de cuál a cuál.

## Privacidad

Tu progreso vive en el dispositivo (`localStorage`) y, opcionalmente, en tu propio proyecto de Firebase, en un documento identificado por tu PIN. El repositorio de GitHub es público (hace falta para GitHub Pages gratis) y contiene la web y los simulacros, **no** tu progreso ni tu material de estudio.

## Documentación

- [Publicar la web](docs/PUBLICAR.md)
- [Configurar Firebase](docs/FIREBASE.md)
- [Formato del JSON de un simulacro](docs/FORMATO_SIMULACRO.md)
