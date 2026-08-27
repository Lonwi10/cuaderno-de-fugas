# Cuaderno de Fugas

Registro de los escape rooms del grupo: salas jugadas, **precio** (total del grupo o por
persona), **web**, quién fue, si escapamos, nota y lista de pendientes. Además saca las
cuentas: gasto de cada uno, porcentaje de fugas y nota media.

Es una web estática (sin servidor, sin npm, sin build) pensada para **GitHub Pages**, y los
datos viven en **una hoja de cálculo de Google Drive**, así que los cuatro veis y editáis la
misma lista. Sin la hoja también funciona: guarda en el propio dispositivo.

---

## 1. Publicarla en GitHub Pages

Con el repositorio ya subido:

1. Repositorio → **Settings** → **Pages**.
2. *Source*: **Deploy from a branch**; *Branch*: `main`, carpeta `/ (root)` → **Save**.
3. En un minuto queda en `https://<tu-usuario>.github.io/<repositorio>/`.

Ese enlace es el que pasas a los colegas.

## 2. Crear la hoja compartida (una vez, tú)

1. Crea una hoja nueva en tu Drive: [sheets.new](https://sheets.new). Llámala *Cuaderno de Fugas*.
2. **Extensiones → Apps Script**. Borra lo que haya y pega el contenido de
   [`apps-script/Codigo.gs`](apps-script/Codigo.gs). Guarda (💾).
3. Arriba, selecciona la función `preparar` y pulsa **Ejecutar**. Google pedirá permisos:
   acéptalos (*Revisar permisos → tu cuenta → Configuración avanzada → Ir a … (no seguro) →
   Permitir*). Se crearán las pestañas **Salas** y **Colegas**.
4. **Implementar → Nueva implementación → Tipo: Aplicación web**:
   - *Descripción*: cuaderno
   - *Ejecutar como*: **Yo**
   - *Quién tiene acceso*: **Cualquier persona**
   - **Implementar** y copia la **URL de la aplicación web** (acaba en `/exec`).
5. Abre la web, pestaña **Ajustes**, pega la URL y pulsa **Conectar**.
6. Pasa esa misma URL a los otros tres (por WhatsApp) para que la peguen en sus Ajustes.

> La URL es la llave del cuaderno: cualquiera que la tenga puede leer y escribir. No la
> publiques en sitios abiertos. Si el repositorio es privado, puedes dejarla puesta en
> [`config.js`](config.js) y así nadie tiene que pegar nada.

### Cambios en el script después de publicar

Si tocas el `Codigo.gs`, haz **Implementar → Gestionar implementaciones → ✏️ → Versión:
Nueva versión → Implementar**. La URL no cambia.

## 3. Instalarla en el móvil (sin APK)

Abre el enlace en Chrome (Android) o Safari (iPhone) y usa **Añadir a pantalla de inicio**.
Queda con icono propio, a pantalla completa, y funciona sin cobertura: los cambios se
guardan en el móvil y se suben a la hoja en cuanto vuelve la conexión.

---

## Cómo se usa

- **Jugadas**: cada sala con su ordinal por fecha, insignia de resultado, nota, precio por
  persona, fecha, quién fue y enlace a la web. Se puede buscar, filtrar por colega y ordenar.
- **Queremos ir**: la lista de deseos. El botón ✓ pasa una sala a jugadas.
- **La cuadrilla**: nombres editables y, por cada uno, salas, % de fugas y gasto acumulado.
- **Ajustes**: conexión con la hoja, sincronizar ahora, copia de seguridad (exportar/importar
  JSON) e instalación.

### Editar directamente en la hoja

La pestaña **Salas** es una fila por sala, y **Quién fue** son nombres separados por comas.
Puedes añadir o corregir filas a mano: la web lo recoge en la siguiente sincronización. Si
escribes un nombre que no existe, se añade solo a la pestaña *Colegas*. No borres las
columnas `id` ni `Actualizado`: son las que permiten fusionar los cambios de todos.

Para dar de baja una sala, pon `sí` en **Borrada** (o bórrala desde la web); la fila se
queda como marca para que la baja llegue a los demás dispositivos.

### Cómo se resuelven los conflictos

Cada sala y cada colega llevan una marca de tiempo. Al sincronizar gana la versión más
reciente **de cada sala**, no del cuaderno entero: si dos apuntáis salas distintas a la vez,
se conservan las dos.

---

## Ficheros

| Fichero | Qué hace |
|---|---|
| `index.html` | La página. |
| `styles.css` | Estilos (tema claro y oscuro automáticos). |
| `store.js` | Estado, guardado local y sincronización con la hoja. |
| `app.js` | Interfaz: pintado y eventos. |
| `config.js` | URL de la hoja, opcional, para todo el repositorio. |
| `sw.js`, `manifest.webmanifest`, `icons/` | Lo que la convierte en app instalable y sin conexión. |
| `apps-script/Codigo.gs` | El puente con la hoja de cálculo (va pegado en Apps Script). |

## Probarla en local

Hace falta servirla por HTTP (el `file://` no permite service workers ni algunos permisos):

```bash
npx serve .          # o: python -m http.server 8000
```

Sin conexión a la hoja, todo se guarda en `localStorage` de ese navegador.
