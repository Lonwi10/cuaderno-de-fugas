# Cuaderno de Fugas

Registro de los escape rooms del grupo: las **jugadas** (con día, precio, quién fue, si
escapamos y nota) y las **no jugadas**, que se pueden cargar de golpe con el catálogo de
una provincia entera. Además saca las cuentas: gasto de cada uno, porcentaje de fugas y nota media.

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

## 2. Cargar el histórico que ya teníamos

El histórico convertido está en `datos-iniciales.json`, **en tu carpeta local del proyecto y
a propósito fuera del repositorio** (está en `.gitignore`): son datos del grupo y no tienen
por qué estar publicados.

Para cargarlo: abre la web en el ordenador donde tienes el fichero, pulsa **Importar copia**
(en la pantalla de alta, o en *Ajustes*) y elige `datos-iniciales.json`. Entran los cuatro
nombres del grupo y todo el histórico. Hazlo **una
vez y desde un solo sitio**: al conectar con la hoja, todo sube y los otros tres lo reciben
sin tocar ningún fichero.

Cómo se tradujo cada columna de esa hoja:

| En la hoja vieja | En el cuaderno |
|---|---|
| `Precio/Persona` | precio, en modo **por persona** (así el total del grupo sale de los asistentes marcados, y cuadra aunque fuera alguien de fuera) |
| `Precio Total` / `Nº Personas` | no se importan: eran el origen del precio por persona |
| Precio 0 o `N/A` | *sin precio* (no se apuntó), para que no falsee el gasto |
| `Fecha` (dd/mm/aaaa) | fecha; 3 salas no tenían y salen como *sin fecha* |
| Una columna por persona con `TRUE`/`FALSE` | quién fue |
| Fila con fecha, o con 3+ asistentes | **jugada** |
| Fila sin fecha y sin asistentes | **sin jugar** |
| `Comentarios` | notas |
| `Puntuacion` | nota de 1 a 5 |

La **empresa** y la **ciudad** no estaban en la hoja: se han deducido del dominio de la web
(maximumescape.com → Maximum Escape, etc.) y de lo que delata la URL (Gavà, L'Hospitalet,
Cornellà, Berga…). Repásalas, que ahí puede haber algún error.

Lo que no traía la hoja y ahora se puede apuntar: **si escapamos o no** y el **tiempo
restante**.

## 3. Crear la hoja compartida (una vez, tú)

Se usa **la hoja que ya tenéis**: el script crea dos pestañas nuevas (*Salas* y *Colegas*) y
no toca la que ya está, que queda como histórico.

**Script suelto (recomendado).** Va en tu propio Drive y abre la hoja por su id. Es la vía
buena si la hoja es de otra persona (basta con tener permiso de edición) o si tu cuenta de
empresa no te deja crear el proyecto de Cloud que Apps Script necesita — el error
*«No se ha podido crear el proyecto de Cloud Platform. Código de error INTERNAL»*.

1. Entra en [script.google.com](https://script.google.com) con **tu cuenta personal** (mejor
   en ventana de incógnito: tener varias cuentas de Google abiertas rompe Apps Script) y pulsa
   **Proyecto nuevo**.
2. Borra lo que haya y pega el contenido de [`apps-script/Codigo.gs`](apps-script/Codigo.gs).
3. En la línea `var ID_HOJA = '';` pon el id de la hoja: el trozo largo de su URL, entre
   `/d/` y `/edit`. Guarda (💾) y ponle nombre al proyecto.
4. Arriba, selecciona la función `preparar` y pulsa **Ejecutar**. Google pedirá permisos:
   acéptalos (*Revisar permisos → tu cuenta → Configuración avanzada → Ir a … (no seguro) →
   Permitir*). Se crearán las pestañas **Salas** y **Colegas** en la hoja.

*(Alternativa: si la hoja es tuya y tu cuenta no tiene restricciones, puedes pegar el código
dentro de la propia hoja — Extensiones → Apps Script — y dejar `ID_HOJA` vacío.)*

Y ahora, publicarlo:

5. **Implementar → Nueva implementación → Tipo: Aplicación web**:
   - *Descripción*: cuaderno
   - *Ejecutar como*: **Yo**
   - *Quién tiene acceso*: **Cualquier persona**
   - **Implementar** y copia la **URL de la aplicación web** (acaba en `/exec`).
6. Abre la web, pestaña **Ajustes**, pega la URL y pulsa **Conectar**.
7. Pasa esa misma URL a los otros tres (por WhatsApp) para que la peguen en sus Ajustes.

> La URL es la llave del cuaderno: cualquiera que la tenga puede leer y escribir. No la
> publiques en sitios abiertos. Si el repositorio es privado, puedes dejarla puesta en
> [`config.js`](config.js) y así nadie tiene que pegar nada.

### Cambios en el script después de publicar

Si tocas el `Codigo.gs`, haz **Implementar → Gestionar implementaciones → ✏️ → Versión:
Nueva versión → Implementar**. La URL no cambia.

## 4. Instalarla en el móvil (sin APK)

Abre el enlace en Chrome (Android) o Safari (iPhone) y usa **Añadir a pantalla de inicio**.
Queda con icono propio, a pantalla completa, y funciona sin cobertura: los cambios se
guardan en el móvil y se suben a la hoja en cuanto vuelve la conexión.

---

## Cómo se usa

- **Jugadas**: cada sala con su ordinal por fecha, insignia de resultado, nota, precio por
  persona, fecha, quién fue y enlace a la web. Se puede buscar, filtrar por colega y ordenar.
- **No jugadas**: todo lo que queda por jugar (el catálogo de la provincia y las vuestras).
  Con buscador, filtro por ciudad y orden por nombre/ciudad/empresa. El botón ✓ abre la
  ficha para apuntar día, precio y quién fue.
- **La cuadrilla**: nombres editables y, por cada uno, salas, % de fugas y gasto acumulado.

Cualquier sala jugada se edita con el lápiz de su tarjeta. Si se marcó por error, dentro de la
ficha hay **Devolver a no jugadas**: la saca de jugadas y limpia día, precio, personas,
asistentes y resultado (el nombre y las notas se quedan). Pide dos toques para confirmar.
- **Ajustes**: conexión con la hoja, sincronizar ahora, copia de seguridad (exportar/importar
  JSON) e instalación.

### Cómo se calcula el precio

Al jugar una sala se apuntan dos cosas: el **precio total** pagado y el **nº de personas**
entre las que se repartió, que puede incluir gente de fuera de la cuadrilla. De ahí sale:

- **por persona** = precio total ÷ nº de personas
- **lo que puso la cuadrilla** = por persona × cuántos de vosotros fuisteis

Ejemplo: cuatro de la cuadrilla más un amigo pagan 120 € entre cinco. Se apunta 120 y 5
personas: salen 24 € por persona y 96 € de la cuadrilla, que es lo que cuenta en el gasto de
cada uno. El formulario lo va calculando mientras escribes.

El nº de personas se rellena solo con los de la cuadrilla que marcas, y se puede cambiar a
mano cuando venga alguien más.

### El catálogo de salas por jugar

El catálogo de salas por jugar se baja de [escaperoomlover.com](https://www.escaperoomlover.com)
—una provincia entera: nombre, empresa, ciudad, enlace a su ficha y, en las notas, la
referencia de jugadores y precio de la web—. **Sin precio propio**: ese se apunta el día que
se juega, que es el que de verdad se pagó.

Las ya jugadas no se duplican: se cruzan por nombre, y las que estuvieran apuntadas con otro
nombre se listan en un `excluir.json` local (ver más abajo).

Para rehacerlo o ampliarlo a otra provincia, en `herramientas/`:

```bash
node herramientas/catalogo.js barcelona catalogo.json 15
node herramientas/dedupe.js catalogo.json datos-iniciales.json catalogo-barcelona.json excluir.json
```

Luego se importa el resultado desde *Ajustes → Importar copia*. Va a 1 segundo por página
a propósito: es una web ajena.

### Editar directamente en la hoja

La pestaña **Salas** es una fila por sala; **Quién fue** son nombres separados por comas, y
**Nº personas** es entre cuántas se repartió el precio. La columna **Estado** dice *Jugada* o
*Sin jugar*.
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

## Privacidad: qué es público y qué no

La web tiene que ser pública para que GitHub Pages la sirva gratis (las páginas privadas son
de pago y, aun así, accesibles con el enlace). Lo que se ha hecho es que **en GitHub solo
esté el programa, no los datos**:

| Dónde | Qué hay | Quién lo ve |
|---|---|---|
| Repositorio y web | el código de la app, sin una sola sala | cualquiera, si da con el enlace |
| Hoja de Google | todas las salas, precios, fechas y nombres | tú y quien tú compartas la hoja |
| Móvil/PC de cada uno | copia local del cuaderno | el dueño del dispositivo |
| URL `/exec` de la hoja | la llave para leer y escribir | los cuatro, por WhatsApp |

Quien abra la web sin esa URL ve una app vacía. Además lleva `noindex` y `robots.txt`, así
que no sale en Google: hay que conocer el enlace.

Si algún día quieres que ni el enlace baste, la vía es meter el sitio detrás de un control de
acceso (por ejemplo Cloudflare Access, gratis hasta 50 personas, pero necesitas un dominio
propio). Para una lista de escape rooms probablemente no merezca la pena.

## Ficheros

| Fichero | Qué hace |
|---|---|
| `index.html` | La página. |
| `styles.css` | Estilos (tema claro y oscuro automáticos). |
| `store.js` | Estado, guardado local y sincronización con la hoja. |
| `app.js` | Interfaz: pintado y eventos. |
| `config.js` | URL de la hoja, opcional, para todo el repositorio. |
| `sw.js`, `manifest.webmanifest`, `icons/` | Lo que la convierte en app instalable y sin conexión. |
| `robots.txt` | Mantiene la web fuera de los buscadores. |
| `apps-script/Codigo.gs` | El puente con la hoja de cálculo (va pegado en Apps Script). |
| `herramientas/catalogo.js`, `herramientas/dedupe.js` | Bajan el catálogo de escaperoomlover y le quitan las salas que ya teníais. |
| `catalogo-*.json`, `excluir.json` | El catálogo y sus excepciones. **Fuera del repo**, como el histórico. |
| `datos-iniciales.json` | El histórico convertido de vuestra hoja. **No se sube al repo**: se importa a mano una vez. |

## Probarla en local

Hace falta servirla por HTTP (el `file://` no permite service workers ni algunos permisos):

```bash
npx serve .          # o: python -m http.server 8000
```

Sin conexión a la hoja, todo se guarda en `localStorage` de ese navegador.
