# Ahorrito 🐶💰

App de metas de ahorro con una mascota que da una voltereta cada vez que apartas dinero, y que se pone gris y se acuesta si pierdes la racha. Puedes elegir **chihuahua, pug, dinosaurio, gato** o **una imagen de tu galería** (stickers con fondo transparente se ven geniales). **Cada meta puede tener su propia mascota** (se elige al crearla o en *Editar*); la de ⚙️ Ajustes es la predeterminada para metas nuevas.

Es una **PWA** (app web instalable). En el iPhone se ve y se comporta como una app normal: tiene ícono en la pantalla de inicio, se abre a pantalla completa y funciona sin internet. **Los datos se guardan solo en tu teléfono.**

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | Página principal |
| `styles.css` | Colores, diseño y animaciones |
| `pets.js` | Los dibujos de las mascotas |
| `app.js` | Toda la lógica: metas, cálculos, rachas, ajustes y recordatorios |
| `sw.js` | Hace que funcione sin internet y muestra las notificaciones |
| `manifest.json`, `icons/` | Nombre e ícono de la app |
| `../recordatorios-worker/worker.js` | El servidor de recordatorios (**no** se sube a GitHub, va en Cloudflare) |

## Probarla en la PC

Abre una terminal en esta carpeta y corre:

```
python -m http.server 8080
```

Abre http://localhost:8080 en Chrome o Edge (F12 y luego Ctrl+Shift+M para verla como celular). Para cerrarlo: `Ctrl + C` en la terminal.

## 1. Instalarla en el iPhone

Para instalarla en iOS, la app tiene que estar publicada en internet con **https**. Gratis con GitHub Pages:

1. Crea una cuenta en https://github.com.
2. Crea un repositorio nuevo **público**, por ejemplo `ahorrito`.
3. Toca **“uploading an existing file”** y arrastra todo el contenido de esta carpeta `ahorrito` (incluida `icons`). Luego toca **Commit changes**.
4. Entra a **Settings → Pages**, y en *Branch* elige `main` y `/ (root)`. Guarda.
5. En 1 o 2 minutos tendrás un link como `https://TU-USUARIO.github.io/ahorrito/`.
6. En el iPhone, abre ese link en **Safari**, toca **Compartir ⬆️** y luego **“Agregar a inicio”**.

> Para actualizar la app, sube los archivos modificados al mismo repositorio. El teléfono descarga la versión nueva la próxima vez que abras la app con internet, y tus metas no se borran.

## 2. Recordatorios (notificaciones)

iOS no deja que una app web programe avisos por sí sola: alguien en internet tiene que mandarlos a la hora indicada. Para eso está el mini servidor gratis en **Cloudflare Workers**. Se configura una sola vez y todo se hace desde la página de Cloudflare, sin instalar nada.

**Requisitos:** iPhone con **iOS 16.4 o más nuevo**, y la app **instalada en la pantalla de inicio** (paso 1).

### Crear el servidor (≈10 minutos)

1. Crea una cuenta gratis en https://dash.cloudflare.com.
2. **Crea el almacenamiento:** en el menú, entra a **Storage & Databases → KV → Create** y ponle de nombre `ahorrito`.
3. **Crea el Worker:** entra a **Workers & Pages → Create → Worker**. Ponle de nombre `ahorrito-recordatorios` y toca **Deploy**.
4. Toca **Edit code**. Borra todo el código de ejemplo y pega el contenido de `recordatorios-worker/worker.js`. Toca **Deploy**.
5. **Conecta el almacenamiento:** en el Worker, entra a **Settings → Bindings → Add → KV namespace**.
   - *Variable name:* `KV` (exactamente así, en mayúsculas)
   - *KV namespace:* `ahorrito`
6. **Programa la revisión:** en **Settings → Trigger events → Add → Cron trigger**, escribe `*/15 * * * *` (revisa cada 15 minutos).
7. Copia el link de tu Worker. Se ve así: `https://ahorrito-recordatorios.TU-USUARIO.workers.dev`.

> Opcional: en la primera línea de `worker.js` puedes cambiar `CONTACT` por `mailto:tu-correo@...`. Apple y Google lo usan solo para contactarte si hubiera un problema con los envíos.

### Activarlos en el iPhone

1. Abre Ahorrito **desde el ícono** de tu pantalla de inicio.
2. Toca ⚙️ → **Recordatorios**, pega el link del Worker y elige la hora.
3. Toca **Activar recordatorios** y acepta el permiso.
4. Toca **Enviar notificación de prueba**. En unos segundos debe llegarte “🐶 ¡Funciona!”.

**Atajo:** si no quieres pegar el link en el teléfono, ponlo en `app.js` en la línea `const DEFAULT_SERVER = '';` antes de subir los archivos a GitHub.

### Qué avisos llegan

- **Al empezar cada periodo:** “🗾 Nueva quincena: aparta $2,084”.
- **El último día del periodo**, solo si todavía no apartas: “⏰ Último día de la quincena”.

Cuando apartas, la app le avisa al servidor y se cancela el recordatorio de ese periodo. Para que eso pase necesitas internet en ese momento; si no lo tienes, se actualiza la próxima vez que abras la app.

## Respaldo

Los datos viven en el teléfono. Si borras la app de la pantalla de inicio, **se borran tus metas**. En ⚙️ → **Exportar** guardas un archivo en iCloud/Archivos; con **Importar** las recuperas.

## Cómo calcula

- **Quincenas:** del 1 al 15 y del 16 a fin de mes. **Meses:** de calendario. **Semanas:** bloques de 7 días a partir del día en que creaste la meta.
- **Meta de ahorro:** lo que falta se divide entre los periodos que quedan. Si un periodo apartas de menos o de más, la cantidad sugerida se ajusta sola.
- **Lo que puedo ahorrar:** cantidad × número de periodos hasta la fecha, más lo que ya tenías.
- **Racha:** periodos seguidos en los que apartaste algo. Si se termina un periodo completo sin apartar, la mascota se pone triste. Se recupera en cuanto vuelves a apartar.
