/**
 * Cuaderno de Fugas — puente entre la web y la hoja de cálculo.
 *
 * Pega este fichero en el editor de Apps Script de tu hoja
 * (Extensiones ▸ Apps Script) y publícalo como aplicación web:
 *   Implementar ▸ Nueva implementación ▸ Aplicación web
 *   Ejecutar como: Yo
 *   Quién tiene acceso: Cualquier persona
 * Copia la URL que acaba en /exec y pégala en Ajustes de la web.
 *
 * La hoja es la fuente de la verdad y se puede editar a mano: cada sala es
 * una fila y "Quién fue" son nombres separados por comas. Si escribes un
 * nombre nuevo, se añade solo a la pestaña Colegas.
 */

var HOJA_SALAS = 'Salas';
var HOJA_COLEGAS = 'Colegas';

var COLS_SALAS = ['id', 'Sala', 'Empresa', 'Ciudad', 'Web', 'Precio', 'Precio es', 'Estado',
                  'Fecha', 'Quién fue', 'Resultado', 'Tiempo restante', 'Nota', 'Notas',
                  'Actualizado', 'Borrada'];
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
  });
  return { players: players, rooms: rooms };
}

/* ---------------------------------------------------------------- hojas ---- */

function libro() { return SpreadsheetApp.getActiveSpreadsheet(); }

function hoja(nombre, cols) {
  var ss = libro();
  var sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(1, 1, sh.getMaxRows(), 1).setNumberFormat('@');          // id como texto
    if (nombre === HOJA_SALAS) {
      sh.getRange(1, 9, sh.getMaxRows(), 1).setNumberFormat('@');        // Fecha
      sh.getRange(1, 15, sh.getMaxRows(), 1).setNumberFormat('@');       // Actualizado
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

/** Lee las dos pestañas y devuelve el cuaderno en el formato de la web. */
function leer() {
  var shC = hoja(HOJA_COLEGAS, COLS_COLEGAS);
  var shS = hoja(HOJA_SALAS, COLS_SALAS);

  var players = [];
  var porNombre = {};
  filas(shC).forEach(function (f, i) {
    var nombre = String(f[1] || '').trim();
    if (!nombre && !f[0]) return;
    var p = {
      id: String(f[0] || '').trim() || uid(),
      name: nombre,
      color: String(f[2] || '').trim() || PAL[players.length % PAL.length],
      updatedAt: aMs(f[3]) || Date.now(),
      deleted: verdad(f[4]) || undefined
    };
    players.push(p);
    if (nombre) porNombre[nombre.toLowerCase()] = p;
  });

  var rooms = [];
  filas(shS).forEach(function (f) {
    var nombre = String(f[1] || '').trim();
    if (!nombre && !f[0]) return;
    var quien = String(f[9] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var ids = quien.map(function (n) {
      var p = porNombre[n.toLowerCase()];
      if (!p) {                                    // nombre escrito a mano en la hoja
        p = { id: uid(), name: n, color: PAL[players.length % PAL.length], updatedAt: Date.now() };
        players.push(p);
        porNombre[n.toLowerCase()] = p;
      }
      return p.id;
    });
    var res = String(f[10] || '').trim().toLowerCase();
    rooms.push({
      id: String(f[0] || '').trim() || uid(),
      name: nombre,
      company: String(f[2] || '').trim(),
      city: String(f[3] || '').trim(),
      web: String(f[4] || '').trim(),
      price: f[5] === '' || f[5] == null ? '' : String(f[5]).replace('.', ','),
      priceMode: String(f[6] || '').toLowerCase().indexOf('persona') !== -1 ? 'pp' : 'total',
      status: String(f[7] || '').toLowerCase().indexOf('pend') !== -1 ? 'wish' : 'done',
      date: aFecha(f[8]),
      who: ids,
      escaped: res.indexOf('escap') === 0 ? true : (res ? false : null),
      timeLeft: String(f[11] || '').trim(),
      rating: +f[12] || 0,
      notes: String(f[13] || '').trim(),
      updatedAt: aMs(f[14]) || Date.now(),
      deleted: verdad(f[15]) || undefined
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
      r.status === 'wish' ? 'Pendiente' : 'Jugada',
      r.date || '',
      (r.who || []).map(function (id) { return nombrePorId[id] || ''; }).filter(Boolean).join(', '),
      r.escaped === true ? 'Escapamos' : (r.escaped === false ? 'No salimos' : ''),
      r.timeLeft || '',
      r.rating || '',
      r.notes || '',
      new Date(r.updatedAt || Date.now()).toISOString(),
      r.deleted ? 'sí' : ''
    ];
  });

  volcar(shC, COLS_COLEGAS, filasC);
  volcar(shS, COLS_SALAS, filasS);
}

function volcar(sh, cols, filasNuevas) {
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
