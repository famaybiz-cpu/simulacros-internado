# Publicar la web en GitHub Pages

> ✅ **Ya está hecho.** La web vive en **https://famaybiz-cpu.github.io/simulacros-internado/**
> y el repositorio es `famaybiz-cpu/simulacros-internado`. La Mac quedó autorizada
> con el llavero de macOS (`git credential-osxkeychain`), así que las rutinas pueden
> hacer `git push` solas. Lo de abajo queda como referencia por si hay que rehacerlo.

Se hace **una sola vez**. Después, cada simulacro nuevo se publica solo con un `git push` que hacen las rutinas.

## 1. Crear el repositorio en GitHub

1. Entra a **https://github.com/new**.
2. **Repository name:** `simulacros-internado`
3. **Public** (hace falta para que GitHub Pages sea gratis).
4. **No** marques «Add a README file», «.gitignore» ni «license».
5. Toca **Create repository**.

## 2. Subir la web desde la Mac

Abre la Terminal y pega esto, cambiando `famaybiz-cpu` por tu usuario de GitHub:

```bash
cd ~/simulacros-internado && git init -b main && git add . && git commit -m "Plataforma de simulacros" && git remote add origin https://github.com/famaybiz-cpu/simulacros-internado.git && git push -u origin main
```

La primera vez GitHub te pedirá autorizarte: se abre el navegador y confirmas.

## 3. Encender GitHub Pages

1. En tu repositorio, pestaña **Settings** (arriba).
2. Menú de la izquierda: **Pages**.
3. En **Source** elige **Deploy from a branch**.
4. En **Branch** elige **main** y la carpeta **/ (root)**. Toca **Save**.
5. Espera 1–2 minutos y recarga. Arriba aparece el link:

```
https://famaybiz-cpu.github.io/simulacros-internado/
```

**Ese es tu link fijo. No cambia nunca.**

## 4. Añadirlo a la pantalla de inicio

### iPhone
1. Abre el link en **Safari** (no en Chrome).
2. Toca **Compartir** (el cuadrado con la flecha hacia arriba, abajo en el centro).
3. Desliza y toca **Añadir a pantalla de inicio**.
4. Toca **Añadir**.

### iPad
1. Abre el link en **Safari**.
2. Toca **Compartir** (arriba a la derecha).
3. **Añadir a pantalla de inicio** → **Añadir**.

Abierta desde ese ícono ocupa toda la pantalla, sin barra del navegador, y funciona sin internet.

## 5. Antes de viajar a Lima

En la app: ⚙ **Ajustes › Descargar todos los simulacros**. Así los tienes en el dispositivo aunque te quedes sin datos.

## Qué NO entra al repositorio

El archivo `.gitignore` ya bloquea la carpeta `analisis/`, tu `.config.json` de Firebase, los exportes de progreso y cualquier PDF. Tu material de estudio de iCloud nunca se sube.
