# Configurar Firebase (gratis, ~10 minutos)

Sirve para que el iPad y el celular compartan el mismo progreso. **Sin esto la app igual funciona**: guarda todo en el dispositivo y funciona sin internet; lo único que pierdes es la sincronización entre los dos.

## 1. Crear el proyecto

1. Entra a **https://console.firebase.google.com** con tu cuenta de Google.
2. Toca **Crear un proyecto**.
3. Nombre: `simulacros-internado`. Toca **Continuar**.
4. En la pantalla de Google Analytics, **desactiva** el interruptor (no hace falta) y toca **Crear proyecto**.
5. Espera y toca **Continuar**.

## 2. Crear la base de datos

1. En el menú de la izquierda: **Compilación › Firestore Database**.
2. Toca **Crear base de datos**.
3. Ubicación: deja la que sugiere (por ejemplo `nam5`) y toca **Siguiente**.
4. Elige **Comenzar en modo de producción** y toca **Crear**.

## 3. Poner las reglas

1. Dentro de Firestore Database, pestaña **Reglas**.
2. Borra lo que haya y pega exactamente esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo la colección "progreso", y solo documentos cuyo nombre (el PIN)
    // tenga al menos 6 caracteres. Nada más del proyecto queda accesible.
    match /progreso/{pin} {
      allow read: if pin.size() >= 6;
      allow write: if pin.size() >= 6
                   && request.resource.data.keys().hasOnly(['json', 'actualizado'])
                   && request.resource.data.json is string
                   && request.resource.data.json.size() < 900000;
    }
  }
}
```

3. Toca **Publicar**.

> **Qué significa esto en claro:** quien conozca tu `projectId`, tu `apiKey` **y** tu PIN puede leer o escribir tus notas de simulacro. No hay datos médicos de pacientes ni datos personales ahí, pero por eso el PIN no debe ser `123456`: usa algo como `maria2026lima`.

## 4. Copiar la configuración

1. Arriba a la izquierda, toca el engranaje ⚙ › **Configuración del proyecto**.
2. Baja hasta **Tus apps** y toca el ícono **`</>`** (Web).
3. Sobrenombre: `web`. **No** marques Firebase Hosting. Toca **Registrar app**.
4. Te muestra un bloque de código. Lo único que necesitas son dos líneas:

```
apiKey: "AIzaSy..............."
projectId: "simulacros-internado"
```

## 5. Pegarlo en la app

1. Abre la web en el iPad o el celular.
2. Toca el engranaje ⚙ arriba a la derecha.
3. En **Mi PIN personal** escribe tu PIN (mínimo 6 caracteres; el **mismo** en los dos dispositivos).
4. En **Configuración de Firebase** pega:

```json
{
  "apiKey": "AIzaSy...............",
  "projectId": "simulacros-internado"
}
```

5. Toca **Guardar y sincronizar**. Arriba debe aparecer **⦿ al día** en verde.
6. Repite los pasos 1–5 en el otro dispositivo, con el **mismo PIN**.

## 6. Dejar que Claude lea tu progreso

Para que las rutinas `/manana` y `/noche` sepan qué fallaste, crea en la Mac el archivo
`~/simulacros-internado/.config.json` con:

```json
{
  "projectId": "simulacros-internado",
  "apiKey": "AIzaSy...............",
  "pin": "tu-pin"
}
```

Ese archivo está en el `.gitignore`: nunca se sube a GitHub.

Para comprobar que funciona:

```bash
~/simulacros-internado/bin/leer_progreso
```

## Si algo falla

| Mensaje | Qué pasa |
|---|---|
| `Firestore 403` | las reglas no están publicadas, o el PIN tiene menos de 6 caracteres |
| `Firestore 404` | todavía no hay nada guardado; resuelve un simulacro y vuelve a probar |
| `⦿ sin conexión` | no hay internet; se sincroniza solo al reconectar |
