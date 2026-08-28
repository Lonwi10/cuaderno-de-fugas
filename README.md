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

Si tocas el `Codigo.gs`: guarda (💾) y haz **Implementar → Gestionar implementaciones → ✏️ (el
lápiz de la implementación que ya usáis) → Versión: Nueva versión → Implementar**. La URL no
cambia.

> **Ojo con *Nueva implementación*.** Esa opción crea una implementación distinta **con otra
> URL**, y la que tiene puesta la app sigue sirviendo el código viejo. Es el fallo más fácil de
> cometer y no da ningún error: simplemente parece que el cambio no ha hecho nada.

Para comprobar qué está publicado de verdad no hace falta salir de la app: en **Ajustes**, bajo
la URL de la hoja, se dice qué versión del script hay al otro lado, y si es anterior a la
columna **Foto** sale un aviso con lo que falta por hacer. Ahí mismo está la URL que usa ese
dispositivo: su id tiene que ser el de la implementación que edites.

(A mano también vale: abre la URL `/exec` en el navegador y la respuesta empieza por
`{"ok":true,"version":2,…`.)

## 4. Instalarla en el móvil (sin APK)

Abre el enlace en Chrome (Android) o Safari (iPhone) y usa **Añadir a pantalla de inicio**.
Queda con icono propio, a pantalla completa, y funciona sin cobertura: los cambios se
guardan en el móvil y se suben a la hoja en cuanto vuelve la conexión.

---

## Cómo se usa

- **Jugadas**: cada sala con su ordinal por fecha, insignia de resultado, nota, precio por
  persona, fecha, quién fue, enlace a la web y, a la derecha, la foto de la sala. Se puede
  buscar, filtrar por colega y ordenar.
- **No jugadas**: todo lo que queda por jugar (el catálogo de la provincia y las vuestras).
  Con buscador, filtro por ciudad y orden por nombre/ciudad/empresa. El botón ✓ abre la
  ficha para apuntar día, precio y quién fue.
- **La cuadrilla**: nombres editables y, por cada uno, salas, % de fugas y gasto acumulado.
- **Duplicadas**: cruza todas las salas del cuaderno entre sí y saca las parejas que podrían
  ser la misma sala apuntada dos veces, cara a cara y con sus datos, para decidir a ojo. Las
  que da por seguras van marcadas en rojo; el resto solo se parecen. **Antes de quitar
  ninguna, mira los datos**: a veces son dos partidas distintas de la misma sala (fechas y
  gente diferentes), y entonces lo que interesa es pasar los datos a una y quitar la otra.
  El ✕ pide dos toques. Usa el mismo cotejo que el catálogo ([`cotejo.js`](cotejo.js)), así
  que no se traga los espacios, los acentos ni las erratas, y no junta salas de ciudades
  distintas aunque se llamen igual.

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

Las ya jugadas no se duplican. El cruce por nombre no busca que coincida letra a letra,
porque casi nunca coincide: da igual cómo estén los espacios (`11 S` y `11S`), los acentos,
las mayúsculas, los artículos, las siglas (`SWAT` y `Misión S.W.A.T.`) o las erratas de la web
(`Sweneey Tott` por vuestro `SWEENEY TODD`), y también mira el título por separado cuando el
nombre lleva subtítulo o la empresa delante (`Gangsters` ↔ vuestro `Gansters: Dinero, armas y
alcohol`; `Final Code: Bermudas` ↔ vuestro `Bermudas, el secreto jamás revelado`).

Lo que **nunca** se junta solo son las salas cuyo número no cuadra —`Cronologic 1` y
`Cronologic 2`, `Nave Ulysses` y su `II`— porque son salas distintas. Esas, y las que solo
huelen a repetidas, se listan al final con la línea ya escrita para pegarla en `excluir.json`
si son la misma (ver más abajo).

Para rehacerlo o ampliarlo a otra provincia, en `herramientas/`:

```bash
node herramientas/catalogo.js barcelona catalogo.json 15
node herramientas/dedupe.js catalogo.json datos-iniciales.json catalogo-barcelona.json excluir.json
node herramientas/fotos.js catalogo-barcelona.json
```

Luego se importa el resultado desde *Ajustes → Importar copia*. Va a 1 segundo por página
a propósito: es una web ajena.

El `excluir.json` es la última palabra, para las que no se parecen en nada al nombre con el
que las apuntasteis. Una línea por sala, con el trozo final de su enlace y el motivo:

```json
{
  "cronologic-1-barcelona-la-creacion": "la apuntasteis como \"Cronologic 1\""
}
```

Esas líneas las escribe ya el propio `dedupe.js` en la lista de dudosas: se copian, se pegan
aquí y se vuelve a lanzar. Ojo: si una sala está ya importada en el cuaderno, quitarla del
catálogo no la borra de allí —hay que darla de baja desde la web.

### Las fotos de las tarjetas

Cada tarjeta lleva a la derecha la foto que escaperoomlover tiene en la ficha de la sala, en
el campo `photo`. Esa foto no está en el listado de la provincia: hay que entrar sala por
sala, así que `fotos.js` va a 1 s por ficha (unos 5 minutos para una provincia) y **guarda a
medida que avanza**: si se corta, se relanza y sigue donde iba. Las salas que ya tienen foto
no se vuelven a pedir; con `--rehacer` se piden todas otra vez.

La foto se enlaza, no se copia: son unos 30 KB y solo se bajan las tarjetas que se ven. Sin
cobertura no salen, y la tarjeta se queda sin hueco en lugar de mostrar un roto.

**La foto sale solo de la ficha de su propia sala.** Nunca de una que se parezca. Esto no es
un detalle: hay salas distintas con el mismo nombre —*Atrincherados* es de Elements y también
de Conecta Escape, *El orfanato* lo tienen tres locales—, así que buscar la foto por parecido
le pega a una la foto de la otra, y encima queda creíble. `fotos.js` identifica la ficha por el
id (`erl-<slug>`) o por el enlace de la sala, y si no lo sabe, la deja **sin foto**.

Para ponerles foto a las **ya jugadas** hay más faena: su enlace apunta a la web de la empresa
y no a escaperoomlover, así que su ficha no se puede deducir. Ahí está `excluir.json`, donde
decís a mano qué sala de la web es cuál vuestra; lo que no esté apuntado, sin foto. Como la
hoja es la fuente de la verdad, se hace sobre una copia recién exportada:

```bash
# Ajustes ▸ Descargar copia  →  cuaderno.json
node herramientas/fotos.js cuaderno.json excluir.json
# y se vuelve a importar desde Ajustes ▸ Importar copia
```

`fotos.js` no toca la marca de tiempo de ninguna sala, así que al importar no pisa nada de lo
que hayáis apuntado mientras: solo añade la foto. Y lista al final las que ha resuelto por
`excluir.json` y las que se han quedado sin identificar, para poder repasarlas de un vistazo.

> **Antes de nada, republica el Apps Script.** La hoja es la fuente de la verdad: si el script
> publicado es de antes de la columna **Foto**, devuelve las salas sin foto y, al sincronizar,
> **se las come todas** aunque las acabes de importar. Se republica en *Implementar ▸ Gestionar
> implementaciones ▸ ✏️ ▸ Versión: Nueva versión*; la URL no cambia.

Y si las fotos ya están bajadas en otro fichero, no hace falta volver a pedirlas: `pegar-fotos.js`
las copia a una copia del cuaderno sin tocar nada más —ni precios, ni fechas, ni quién fue, ni
la marca de tiempo—, así que el fichero que sale solo puede añadir la foto.

```bash
# Ajustes ▸ Descargar copia  →  cuaderno.json
node herramientas/pegar-fotos.js cuaderno.json cuaderno-de-fugas-fotos.json \
     catalogo-barcelona.json datos-iniciales.json
# y se importa cuaderno-de-fugas-fotos.json desde Ajustes ▸ Importar copia
```

Se quedan sin foto las salas que apuntasteis con el nombre de la empresa en lugar del de la
sala (*Oniric Escape*, *The resistance*, *Wizarding Escape Rooms*…) y las que ya no están en
escaperoomlover. Para esas, se pega el enlace de la imagen a mano en la columna **Foto** de la
hoja.

### Editar directamente en la hoja

La pestaña **Salas** es una fila por sala; **Quién fue** son nombres separados por comas, y
**Nº personas** es entre cuántas se repartió el precio. La columna **Estado** dice *Jugada* o
*Sin jugar*.
Puedes añadir o corregir filas a mano: la web lo recoge en la siguiente sincronización. Si
escribes un nombre que no existe, se añade solo a la pestaña *Colegas*. No borres las
columnas `id` ni `Actualizado`: son las que permiten fusionar los cambios de todos.

**Foto** es la última columna: el enlace de la imagen que sale en la tarjeta. Se puede pegar
a mano el enlace de cualquier foto (clic derecho ▸ *Copiar dirección de la imagen*). Si tu
hoja es de antes de esta columna, aparece sola en la siguiente sincronización.

Para dar de baja una sala, pon `sí` en **Borrada** (o bórrala desde la web); la fila se
queda como marca para que la baja llegue a los demás dispositivos.

### Cómo se resuelven los conflictos

Cada sala y cada colega llevan una marca de tiempo. Al sincronizar gana la versión más
reciente **de cada sala**, no del cuaderno entero: si dos apuntáis salas distintas a la vez,
se conservan las dos.

Con una excepción: si la versión que llega **no trae un campo** (porque el Apps Script
publicado es de un esquema anterior y no lo conoce), no se toma como "vacío" y se conserva lo
que hubiera. Sin eso, sincronizar con una hoja sin la columna **Foto** borraría todas las
fotos del cuaderno. Un campo que llega vacío sí manda: eso es un borrado de verdad.

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
| `styles.css` | Todo el diseño: identidad de expediente, tema claro (papel) y oscuro (archivo de noche) automáticos. Las reglas de la identidad están escritas en su cabecera. |
| `store.js` | Estado, guardado local y sincronización con la hoja. |
| `cotejo.js` | Cuándo dos nombres son la misma sala. Lo comparten las herramientas y la pestaña de duplicadas: una sola verdad. |
| `app.js` | Interfaz: pintado y eventos. |
| `config.js` | URL de la hoja, opcional, para todo el repositorio. |
| `sw.js`, `manifest.webmanifest`, `icons/` | Lo que la convierte en app instalable y sin conexión. |
| `robots.txt` | Mantiene la web fuera de los buscadores. |
| `apps-script/Codigo.gs` | El puente con la hoja de cálculo (va pegado en Apps Script). |
| `herramientas/catalogo.js`, `herramientas/dedupe.js`, `herramientas/fotos.js` | Bajan el catálogo de escaperoomlover, le quitan las salas que ya teníais y le ponen la foto de cada sala. |
| `herramientas/pegar-fotos.js` | Pega en el cuaderno fotos ya bajadas, emparejando **solo por id**, sin pedir nada a internet ni tocar ningún otro dato. |
| `herramientas/cotejo.js`, `herramientas/bajar.js` | Las dos piezas que comparten esas tres: decidir si dos nombres son la misma sala, y bajar una página con buenas maneras. |
| `catalogo-*.json`, `excluir.json` | El catálogo y sus excepciones. **Fuera del repo**, como el histórico. |
| `datos-iniciales.json` | El histórico convertido de vuestra hoja. **No se sube al repo**: se importa a mano una vez. |

## Probarla en local

Hace falta servirla por HTTP (el `file://` no permite service workers ni algunos permisos):

```bash
npx serve .          # o: python -m http.server 8000
```

Sin conexión a la hoja, todo se guarda en `localStorage` de ese navegador.
