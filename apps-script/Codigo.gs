/**
 * Cuaderno de Fugas — puente entre la web y la hoja de cálculo.
 *
 * Dos formas de montarlo:
 *
 *  A) SCRIPT SUELTO (recomendado si la hoja es de otra persona, o si tu
 *     cuenta de empresa no te deja crear el proyecto de Cloud que Apps
 *     Script necesita). En script.google.com, con la cuenta que quieras,
 *     crea un proyecto nuevo, pega este fichero y rellena ID_HOJA con el id
 *     de la hoja: es el trozo largo de su URL, entre /d/ y /edit. Necesitas
 *     permiso de edición sobre esa hoja.
 *
 *  B) DENTRO DE LA HOJA: Extensiones ▸ Apps Script, pega este fichero y deja
 *     ID_HOJA vacío.
 *
 * En los dos casos: ejecuta una vez la función `preparar` (crea las pestañas
 * y pide permisos) y luego publica:
 *   Implementar ▸ Nueva implementación ▸ Aplicación web
 *   Ejecutar como: Yo · Quién tiene acceso: Cualquier persona
 * Copia la URL que acaba en /exec y pégala en Ajustes de la web.
 *
 * La hoja es la fuente de la verdad y se puede editar a mano: cada sala es
 * una fila y "Quién fue" son nombres separados por comas. Si escribes un
 * nombre nuevo, se añade solo a la pestaña Colegas.
 */

/* Id de la hoja (script suelto). Vacío = el script vive dentro de la hoja. */
var ID_HOJA = '';

var HOJA_SALAS = 'Salas';
var HOJA_COLEGAS = 'Colegas';

var COLS_SALAS = ['id', 'Sala', 'Empresa', 'Ciudad', 'Web', 'Precio', 'Precio es', 'Nº personas',
                  'Estado', 'Fecha', 'Quién fue', 'Resultado', 'Tiempo restante', 'Nota', 'Notas',
                  'Actualizado', 'Borrada', 'Foto'];
var COLS_COLEGAS = ['id', 'Nombre', 'Color', 'Actualizado', 'Borrado'];
var PAL = ['#C08B2C', '#5E8C6A', '#B0674F', '#5F82A0', '#8E6E9E', '#8A8B4A', '#4E8F8B', '#A85C79'];

/* ------------------------------------------------------------------ web ---- */

function doGet() {
  try {
    return json({ ok: true, data: leer() });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var cuerpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var entrante = normalizar(cuerpo.data || {});
    lock.waitLock(25000);
    var fusion = fusionar(leer(), entrante);
    escribir(fusion);
    return json({ ok: true, data: fusion });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* --------------------------------------------------------------- fusión ---- */

/** Gana, para cada id, la versión con "Actualizado" más reciente. */
function fusionar(a, b) {
  var out = { players: [], rooms: [] };
  ['players', 'rooms'].forEach(function (clave) {
    var por = {};
    (a[clave] || []).concat(b[clave] || []).forEach(function (it) {
      if (!it || !it.id) return;
      var prev = por[it.id];
      if (!prev || (+it.updatedAt || 0) >= (+prev.updatedAt || 0)) por[it.id] = it;
    });
    Object.keys(por).forEach(function (id) { out[clave].push(por[id]); });
  });
  return out;
}

function normalizar(st) {
  st = st || {};
  var players = (st.players || []).filter(function (p) { return p && p.id; });
  var rooms = (st.rooms || []).filter(function (r) { return r && r.id; });
  players.forEach(function (p) {
    p.name = String(p.name == null ? '' : p.name);
    p.updatedAt = +p.updatedAt || 1;
  });
  rooms.forEach(function (r) {
    r.updatedAt = +r.updatedAt || 1;
    if (!r.who || !r.who.length) r.who = [];
    r.status = r.status === 'wish' ? 'wish' : 'done';
    r.priceMode = r.priceMode === 'pp' ? 'pp' : 'total';
    if (r.escaped !== true && r.escaped !== false) r.escaped = null;
    r.rating = +r.rating || 0;
    r.people = r.people === '' || r.people == null ? '' : (+r.people || '');
  });
  return { players: players, rooms: rooms };
}

/* ---------------------------------------------------------------- hojas ---- */

function libro() {
  var id = String(ID_HOJA || '').trim();
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Este script no está dentro de una hoja: rellena ID_HOJA con el id de la hoja.');
  }
  return ss;
}

function hoja(nombre, cols) {
  var ss = libro();
  var sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(1, 1, sh.getMaxRows(), 1).setNumberFormat('@');          // id como texto
    if (nombre === HOJA_SALAS) {
      sh.getRange(1, 10, sh.getMaxRows(), 1).setNumberFormat('@');       // Fecha
      sh.getRange(1, 16, sh.getMaxRows(), 1).setNumberFormat('@');       // Actualizado
      sh.setColumnWidth(2, 220);
      sh.setColumnWidth(14, 280);
    } else {
      sh.getRange(1, 4, sh.getMaxRows(), 1).setNumberFormat('@');        // Actualizado
    }
  }
  return sh;
}

function filas(sh) {
  var ultima = sh.getLastRow();
  if (ultima < 2) return [];
  return sh.getRange(2, 1, ultima - 1, sh.getLastColumn()).getValues();
}

function aMs(v) {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  var t = Date.parse(String(v));
  return isNaN(t) ? 0 : t;
}
function aFecha(v) {
  if (!v) return '';
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);            // 12/03/2026
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return s;
}
function verdad(v) {
  var s = String(v).trim().toLowerCase();
  return v === true || s === 'sí' || s === 'si' || s === 'true' || s === 'x' || s === '1';
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Índice de columnas por su nombre de cabecera: así el orden de la hoja puede
 *  cambiar (o venir de una versión anterior) sin descolocar la lectura. */
function indice(sh, cols) {
  var cab = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), cols.length)).getValues()[0];
  var idx = {};
  cab.forEach(function (nombre, i) {
    var k = String(nombre || '').trim();
    if (k && idx[k] === undefined) idx[k] = i;
  });
  return function (nombre) {
    var i = idx[nombre];
    return i === undefined ? -1 : i;
  };
}
function celda(fila, col) {
  var i = col;
  return i < 0 || fila[i] == null ? '' : fila[i];
}

/** Lee las dos pestañas y devuelve el cuaderno en el formato de la web. */
function leer() {
  var shC = hoja(HOJA_COLEGAS, COLS_COLEGAS);
  var shS = hoja(HOJA_SALAS, COLS_SALAS);

  var c = indice(shC, COLS_COLEGAS);
  var C = { id: c('id'), nombre: c('Nombre'), color: c('Color'), act: c('Actualizado'), baja: c('Borrado') };

  var players = [];
  var porNombre = {};
  filas(shC).forEach(function (f) {
    var nombre = String(celda(f, C.nombre) || '').trim();
    var id = String(celda(f, C.id) || '').trim();
    if (!nombre && !id) return;
    var p = {
      id: id || uid(),
      name: nombre,
      color: String(celda(f, C.color) || '').trim() || PAL[players.length % PAL.length],
      updatedAt: aMs(celda(f, C.act)) || Date.now(),
      deleted: verdad(celda(f, C.baja)) || undefined
    };
    players.push(p);
    if (nombre) porNombre[nombre.toLowerCase()] = p;
  });

  var s = indice(shS, COLS_SALAS);
  var S = {
    id: s('id'), sala: s('Sala'), empresa: s('Empresa'), ciudad: s('Ciudad'), web: s('Web'),
    precio: s('Precio'), modo: s('Precio es'), personas: s('Nº personas'), estado: s('Estado'),
    fecha: s('Fecha'), quien: s('Quién fue'), res: s('Resultado'), tiempo: s('Tiempo restante'),
    nota: s('Nota'), notas: s('Notas'), act: s('Actualizado'), baja: s('Borrada'),
    foto: s('Foto')
  };

  var rooms = [];
  filas(shS).forEach(function (f) {
    var nombre = String(celda(f, S.sala) || '').trim();
    var id = String(celda(f, S.id) || '').trim();
    if (!nombre && !id) return;
    var quien = String(celda(f, S.quien) || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var ids = quien.map(function (n) {
      var p = porNombre[n.toLowerCase()];
      if (!p) {                                    // nombre escrito a mano en la hoja
        p = { id: uid(), name: n, color: PAL[players.length % PAL.length], updatedAt: Date.now() };
        players.push(p);
        porNombre[n.toLowerCase()] = p;
      }
      return p.id;
    });
    var res = String(celda(f, S.res) || '').trim().toLowerCase();
    var precio = celda(f, S.precio);
    var personas = celda(f, S.personas);
    rooms.push({
      id: id || uid(),
      name: nombre,
      company: String(celda(f, S.empresa) || '').trim(),
      city: String(celda(f, S.ciudad) || '').trim(),
      web: String(celda(f, S.web) || '').trim(),
      price: precio === '' ? '' : String(precio).replace('.', ','),
      priceMode: String(celda(f, S.modo) || '').toLowerCase().indexOf('persona') !== -1 ? 'pp' : 'total',
      people: personas === '' ? '' : (+personas || ''),
      status: /pend|sin jugar|no jugad/.test(String(celda(f, S.estado) || '').toLowerCase()) ? 'wish' : 'done',
      date: aFecha(celda(f, S.fecha)),
      who: ids,
      escaped: res.indexOf('escap') === 0 ? true : (res ? false : null),
      timeLeft: String(celda(f, S.tiempo) || '').trim(),
      rating: +celda(f, S.nota) || 0,
      notes: String(celda(f, S.notas) || '').trim(),
      photo: String(celda(f, S.foto) || '').trim(),
      updatedAt: aMs(celda(f, S.act)) || Date.now(),
      deleted: verdad(celda(f, S.baja)) || undefined
    });
  });

  return normalizar({ players: players, rooms: rooms });
}

/** Vuelca el cuaderno completo en las dos pestañas. */
function escribir(st) {
  var shC = hoja(HOJA_COLEGAS, COLS_COLEGAS);
  var shS = hoja(HOJA_SALAS, COLS_SALAS);

  var nombrePorId = {};
  st.players.forEach(function (p) { nombrePorId[p.id] = p.name; });

  var filasC = st.players.map(function (p) {
    return [p.id, p.name, p.color || '', new Date(p.updatedAt || Date.now()).toISOString(), p.deleted ? 'sí' : ''];
  });

  var salas = st.rooms.slice().sort(function (a, b) {
    var da = a.date || '9999', db = b.date || '9999';
    if (da !== db) return da < db ? -1 : 1;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  var filasS = salas.map(function (r) {
    return [
      r.id,
      r.name || '',
      r.company || '',
      r.city || '',
      r.web || '',
      r.price === '' || r.price == null ? '' : r.price,
      r.priceMode === 'pp' ? 'por persona' : 'total',
      r.people === '' || r.people == null ? '' : r.people,
      r.status === 'wish' ? 'Sin jugar' : 'Jugada',
      r.date || '',
      (r.who || []).map(function (id) { return nombrePorId[id] || ''; }).filter(Boolean).join(', '),
      r.escaped === true ? 'Escapamos' : (r.escaped === false ? 'No salimos' : ''),
      r.timeLeft || '',
      r.rating || '',
      r.notes || '',
      new Date(r.updatedAt || Date.now()).toISOString(),
      r.deleted ? 'sí' : '',
      r.photo || ''
    ];
  });

  volcar(shC, COLS_COLEGAS, filasC);
  volcar(shS, COLS_SALAS, filasS);
}

function volcar(sh, cols, filasNuevas) {
  /* una hoja de una versión anterior puede tener menos columnas que COLS */
  if (sh.getMaxColumns() < cols.length) {
    sh.insertColumnsAfter(sh.getMaxColumns(), cols.length - sh.getMaxColumns());
  }
  sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
  var ultima = sh.getLastRow();
  if (ultima > 1) sh.getRange(2, 1, ultima - 1, cols.length).clearContent();
  if (filasNuevas.length) {
    if (sh.getMaxRows() < filasNuevas.length + 1) {
      sh.insertRowsAfter(sh.getMaxRows(), filasNuevas.length + 1 - sh.getMaxRows());
    }
    sh.getRange(2, 1, filasNuevas.length, cols.length).setValues(filasNuevas);
  }
}

/* Ejecuta esto una vez desde el editor para crear las pestañas y dar permisos. */
function preparar() {
  hoja(HOJA_COLEGAS, COLS_COLEGAS);
  hoja(HOJA_SALAS, COLS_SALAS);
  return 'Pestañas listas.';
}
