# Cuaderno de Fugas

Registro de los escape rooms del grupo: las **jugadas** (con día, precio, quién fue, si
escapamos y nota) y las **no jugadas**, que se pueden cargar de golpe con el catálogo de
una provincia entera. Además saca las cuentas: gasto de cada uno, porcentaje de fugas y nota media,
y dice en qué puesto del ranking mundial de **TERPECA** está cada sala.

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
la URL de la hoja, se dice qué versión del script hay al otro lado, y si le faltan columnas
(**Foto**, **TERPECA**) sale un aviso con lo que falta por hacer y con lo que se está
perdiendo. Ahí mismo está la URL que usa ese dispositivo: su id tiene que ser el de la
implementación que edites.

(A mano también vale: abre la URL `/exec` en el navegador y la respuesta empieza por
`{"ok":true,"version":3,…`.)

## 4. Instalarla en el móvil (sin APK)

Abre el enlace en Chrome (Android) o Safari (iPhone) y usa **Añadir a pantalla de inicio**.
Queda con icono propio, a pantalla completa, y funciona sin cobertura: los cambios se
guardan en el móvil y se suben a la hoja en cuanto vuelve la conexión.

---

## Cómo se usa

- **Jugadas**: cada sala con su ordinal por fecha, insignia de resultado, nota, precio por
  persona, fecha, quién fue, enlace a la web y, a la derecha, la foto de la sala. Se puede
  buscar, filtrar por colega y ordenar (también **por puesto de TERPECA**).
- **No jugadas**: todo lo que queda por jugar (el catálogo de la provincia y las vuestras).
  Con buscador, filtro por ciudad y orden por TERPECA/nombre/ciudad/empresa. El botón ✓ abre
  la ficha para apuntar día, precio y quién fue.
- Las salas que están en el **ranking mundial de TERPECA** llevan una chapa de latón con su
  puesto —*TERPECA nº 7*— debajo de la empresa y la ciudad, y la chapa enlaza a la edición de
  ese año en terpeca.com. Las que fueron nominadas pero no llegaron a finalistas la llevan sin
  rellenar (*TERPECA nominada*). En las dos pestañas hay una píldora **TERPECA** que deja solo
  esas, con la cuenta al lado. Cómo llegan esos puestos al cuaderno: más abajo.
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
```

Luego se importa el resultado desde *Ajustes → Importar copia*. Va a 1 segundo por página
a propósito: es una web ajena.

El catálogo ya sale **con la foto de cada sala**: en el listado de la provincia, la foto va
dentro del enlace de su propia sala (`<a data-href='/es/juego/SLUG'><img …>`), así que el
emparejado lo da la web y no hay que entrar en 300 fichas ni adivinar nada. Solo hace falta
`fotos.js` para las salas que no están en ese listado.

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

### El puesto de TERPECA

[TERPECA](https://www.terpeca.com) es el ranking mundial de escape rooms: cada año, la gente
con 200 salas o más a sus espaldas nomina sus favoritas (fase 1) y luego vota entre las
finalistas (fase 2), y de ahí sale un top del mundo. En el cuaderno interesa por dos cosas:
saber **en qué puesto están las salas que ya tenéis** y **qué salas buenas os faltan**.

Son dos pasos, como el catálogo: uno baja los datos y el otro decide.

```bash
# 1. bajar las ocho ediciones publicadas (2018–2025). Tarda ~15 s
node herramientas/terpeca.js todos terpeca.json

# 2. en la web, Ajustes ▸ Descargar copia   →  cuaderno.json
#    y cruzarlo:
node herramientas/cruzar-terpeca.js cuaderno.json terpeca.json terpeca-para-importar.json excluir-terpeca.json

# 3. en la web, Ajustes ▸ Importar copia    →  terpeca-para-importar.json
```

El fichero que sale hace dos cosas a la vez:

1. **Les pone el puesto a las salas que ya tenéis**, jugadas y sin jugar, sin tocarles nada
   más: ni el nombre, ni la empresa, ni la web, ni la foto, ni las notas, ni el precio, ni la
   fecha, ni quién fue, ni la nota, ni la marca de tiempo. Solo las tres columnas de TERPECA.
   Como cada sala sale con la misma marca de tiempo que traía, al importar no pisa nada de lo
   que hayáis apuntado mientras (igual que `pegar-fotos.js`).
2. **Añade como *sin jugar* las de TERPECA que no tenéis.** De serie, solo las de **España**:
   las que tienen puesto siempre, y las que solo fueron nominadas desde **2 nominaciones**
   —con una sola, la señal es demasiado floja para meter cientos de salas en el cuaderno—.

Se cambia con opciones, y ninguna afecta al punto 1 (los puestos se ponen siempre a todas):

| Opción | Para qué |
|---|---|
| `--pais=España,Andorra,Francia` | de dónde se importan las que faltan; `--pais=todos` para el mundo entero |
| `--ciudad=barcelona,badalona,terrassa` | además, solo esas ciudades |
| `--min=1` | bajar (o subir) el mínimo de nominaciones |
| `--desde=2023` | solo salas que salgan en esa edición o después, para no traerse salas de 2018 que ya cerraron |
| `--sin-nuevas` | no añadir ninguna sala: solo poner los puestos |

Del cuaderno solo salen tres cifras por sala, y se pueden escribir a mano en la hoja:
**TERPECA** (el puesto), **TERPECA año** (el año en que lo hizo) y **TERPECA nominaciones**.
Si una sala tiene año pero no puesto, fue nominada y no llegó a finalista.

Cuando una sala ha estado en varias ediciones se guarda **el puesto más reciente que
consiguió**, con su año; las nominaciones son las de ese mismo año, así que el par
puesto–año se lee sin trampa. El historial completo (`2025 #7 · 2024 #12 · 2023 nom. (8)`)
sale en el listado de la herramienta, que es donde se repasa.

#### Lo que hay que mirar a ojo

TERPECA escribe los nombres **en inglés, con el original entre corchetes** —`The Krugger's
Secret [El Secreto de los Krugger]`—, así que cada sala se coteja con sus dos nombres, y con
el mismo [`cotejo.js`](cotejo.js) que usan el catálogo y la pestaña de duplicadas. La ciudad
**no** se compara: TERPECA dice la ciudad grande ("Barcelona") donde el catálogo dice el
municipio ("Cornellá de Llobregat"), y compararlas daría por distintas salas que son la misma.
El aval es la empresa, que además se reconoce cuando le han cambiado el nombre (`Malum Escape
Room (formerly Krematorium…)` es la misma casa que vuestro `Krematorium`).

Con una excepción, y es importante: hay empresas que se llaman **solo con palabras del
gremio** —*The Game*, *Escape Experience*, *Escape Barcelona*— y de esas no queda nada con lo
que comparar. Ahí el nombre a solas no basta, porque enfrente hay una lista mundial: existe
una *The Bunker* en Chattanooga, otra en Roma y la vuestra en Barcelona, y un *The Metro* en
París que no es el de Vilafranca. Cuando la empresa no respalda, se le exige a la **ciudad**
que cuadre (`Masnou` vale por `El Masnou`, `Hospitalet` por `L'Hospitalet de Llobregat`), y si
tampoco, la pareja se manda a repasar a mano.

Lo que no se da por seguro se lista en dos montones:

- **¿son la misma sala?** — la empresa o la ciudad acompañan, así que hay que mirarlas una a
  una. Aquí salen los aciertos que ningún cotejo puede dar por seguros: vuestra *La casa* de
  Insomnia contra su `The House`, vuestro *Bajo zero* contra su `Below Zero`, *Kidnapped in
  BCN* contra `Kidnapped in Barcelona`.
- **se llaman igual y nada más** — ni empresa ni ciudad: son salas distintas con el mismo
  nombre en otro sitio, que de eso está lleno el mundo (hay ocho *Atlantis* en el ranking).
  Se listan al final por si acaso y normalmente no hay nada que hacer con ellas.

Las dos traen la línea ya escrita para pegarla en `excluir-terpeca.json`:

```json
{
  "the-krugger-s-secret-insomnia-corporation": "la apuntasteis como \"El secreto de los Krugger\"",
  "una-sala-cualquiera-de-fulanito": "no nos interesa"
}
```

Con nombre entre comillas, se empareja con esa sala vuestra. Sin comillas, simplemente no se
importa. Ese fichero es la última palabra, y va **fuera del repo** como `excluir.json`.

Las salas nuevas entran con el nombre en español cuando TERPECA da los dos, y el otro queda en
las notas junto a las nominaciones, los jugadores, la duración, el nivel de terror y los
idiomas. Las **premiadas (top 100)** traen además el enlace de la empresa y la foto que TERPECA
tiene de la sala; las demás entran sin foto, porque la foto de una sala solo sale de su propia
ficha y nunca de una que se parezca (ver más abajo). Si las queréis con foto, se dicen a mano
en `excluir.json` y se lanza `fotos.js`.

> **Antes de importar, republica el Apps Script.** La hoja es la fuente de la verdad: si el
> script publicado es anterior a las columnas TERPECA, al sincronizar se come los puestos
> aunque los acabes de importar. Se republica en *Implementar ▸ Gestionar implementaciones ▸
> ✏️ ▸ Versión: Nueva versión*; la URL no cambia. En **Ajustes** se ve si hace falta.

Después de importar, **pásate por la pestaña Duplicadas**. Casi todo lo que había que juntar ya
viene junto, pero TERPECA tiene salas que se votan por versiones —*Petra, expedición inicial de
90 min* y *expedición completa de 120 min*— y ahí no hay quien decida por vosotros si son una o
dos: eso se mira a ojo, como siempre.

Y una vez al año, cuando TERPECA publica la edición nueva, se repite la vuelta: los dos
comandos y a importar. `terpeca.js` lee de la propia portada qué ediciones hay, así que no hay
que tocar nada.

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
node herramientas/fotos.js cuaderno.json excluir.json catalogo.json
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

**Foto** es el enlace de la imagen que sale en la tarjeta. Se puede pegar a mano el enlace de
cualquier foto (clic derecho ▸ *Copiar dirección de la imagen*).

Las tres últimas son las de TERPECA: **TERPECA** (el puesto, `7` o `#7`), **TERPECA año** y
**TERPECA nominaciones**. Se pueden escribir a mano; con año y sin puesto, la sala sale como
*nominada*. Las rellena `cruzar-terpeca.js`, y si tu hoja es de antes de estas columnas
aparecen solas en la siguiente sincronización (las columnas se leen por el nombre de su
cabecera, así que da igual en qué orden estén).

Para dar de baja una sala, pon `sí` en **Borrada** (o bórrala desde la web); la fila se
queda como marca para que la baja llegue a los demás dispositivos.

### Cómo se resuelven los conflictos

Cada sala y cada colega llevan una marca de tiempo. Al sincronizar gana la versión más
reciente **de cada sala**, no del cuaderno entero: si dos apuntáis salas distintas a la vez,
se conservan las dos.

Con una excepción: si la versión que llega **no trae un campo** (porque el Apps Script
publicado es de un esquema anterior y no lo conoce), no se toma como "vacío" y se conserva lo
que hubiera. Sin eso, sincronizar con una hoja sin la columna **Foto** borraría todas las
fotos del cuaderno, y una sin las columnas **TERPECA** se comería los puestos. Un campo que
llega vacío sí manda: eso es un borrado de verdad.

La misma cautela va en las dos direcciones: el Apps Script conserva los campos que no le
manda la app, así que un móvil con la web sin actualizar tampoco puede borrarle a la hoja las
fotos ni los puestos de los demás.

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
| `herramientas/catalogo.js`, `herramientas/dedupe.js`, `herramientas/fotos.js` | Bajan el catálogo de escaperoomlover con la foto de cada sala, le quitan las que ya teníais y ponen las fotos que falten. |
| `herramientas/pegar-fotos.js` | Pega en el cuaderno fotos ya bajadas, emparejando **solo por id**, sin pedir nada a internet ni tocar ningún otro dato. |
| `herramientas/terpeca.js` | Baja las ediciones de TERPECA (nominadas, finalistas con su puesto y premiadas con foto) y las deja en un JSON. Solo baja y trocea. |
| `herramientas/cruzar-terpeca.js` | Cruza TERPECA con el cuaderno: pone el puesto a las salas que ya tenéis y añade las que faltan. Es quien decide. |
| `herramientas/bajar.js` | La pieza que comparten todas las que van a internet: bajar una página con buenas maneras. |
| `catalogo-*.json`, `terpeca*.json`, `excluir.json`, `excluir-terpeca.json` | El catálogo, el volcado de TERPECA y sus excepciones. **Fuera del repo**, como el histórico. |
| `datos-iniciales.json` | El histórico convertido de vuestra hoja. **No se sube al repo**: se importa a mano una vez. |

## Probarla en local

Hace falta servirla por HTTP (el `file://` no permite service workers ni algunos permisos):

```bash
npx serve .          # o: python -m http.server 8000
```

Sin conexión a la hoja, todo se guarda en `localStorage` de ese navegador.
