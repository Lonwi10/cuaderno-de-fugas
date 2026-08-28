/* ==========================================================================
   store.js — estado del cuaderno, guardado local y sincronización con la
   hoja de cálculo de Google (a través de un Apps Script publicado como
   aplicación web).

   Reglas de fusión: cada sala y cada colega llevan `updatedAt` (ms) y las
   bajas son lápidas (`deleted:true`). Al fusionar dos versiones gana la
   entrada con `updatedAt` mayor. Así dos personas pueden apuntar salas a la
   vez sin que se pierda ninguna.
   ========================================================================== */
(function (global) {
  'use strict';

  var LS_STATE = 'cdf:estado';
  var LS_CFG = 'cdf:config';
  var PURGE_DAYS = 90;

  var PAL = ['#C08B2C', '#5E8C6A', '#B0674F', '#5F82A0', '#8E6E9E', '#8A8B4A', '#4E8F8B', '#A85C79'];

  /* ---------- utilidades ---------- */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function now() { return Date.now(); }
  function lsGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
  }
  function blank() { return { players: [], rooms: [] }; }

  function normalize(st) {
    if (!st || typeof st !== 'object') st = {};
    if (!Array.isArray(st.players)) st.players = [];
    if (!Array.isArray(st.rooms)) st.rooms = [];
    st.players = st.players.filter(function (p) { return p && p.id; });
    st.rooms = st.rooms.filter(function (r) { return r && r.id; });
    st.players.forEach(function (p) {
      if (!p.updatedAt) p.updatedAt = 1;
      if (!p.color) p.color = PAL[0];
      p.name = String(p.name == null ? '' : p.name);
    });
    st.rooms.forEach(function (r) {
      if (!r.updatedAt) r.updatedAt = 1;
      if (!Array.isArray(r.who)) r.who = [];
      if (r.status !== 'wish') r.status = 'done';
      if (r.priceMode !== 'pp') r.priceMode = 'total';
      if (r.escaped !== true && r.escaped !== false) r.escaped = null;
      r.rating = +r.rating || 0;
      // personas que pagaron, incluidas las de fuera de la cuadrilla
      r.people = r.people == null || r.people === '' ? '' : (+r.people || '');
    });
    return st;
  }

  /* Campos que una versión antigua de la hoja no conoce y por tanto no manda.
     Que no los mande NO significa que estén vacíos: significa que su esquema es
     más viejo. Si se tomara como "vacío", una sincronización con un Apps Script
     sin la columna Foto borraría todas las fotos del cuaderno. */
  var NUEVOS = ['photo'];

  /** Une dos versiones quedándose con la entrada más reciente de cada id. */
  function merge(a, b) {
    var out = { players: [], rooms: [] };
    ['players', 'rooms'].forEach(function (key) {
      var by = {};
      (a[key] || []).concat(b[key] || []).forEach(function (it) {
        if (!it || !it.id) return;
        var prev = by[it.id];
        if (!prev || (+it.updatedAt || 0) >= (+prev.updatedAt || 0)) {
          if (prev) NUEVOS.forEach(function (campo) {
            // la que gana no trae el campo pero la otra sí: se conserva
            if (!(campo in it) && prev[campo]) it[campo] = prev[campo];
          });
          by[it.id] = it;
        } else {
          NUEVOS.forEach(function (campo) {
            if (!(campo in prev) && it[campo]) prev[campo] = it[campo];
          });
        }
      });
      Object.keys(by).forEach(function (id) { out[key].push(by[id]); });
    });
    return normalize(out);
  }

  /** Quita lápidas antiguas para que el cuaderno no engorde sin fin. */
  function purge(st) {
    var limit = now() - PURGE_DAYS * 864e5;
    st.players = st.players.filter(function (p) { return !(p.deleted && p.updatedAt < limit); });
    st.rooms = st.rooms.filter(function (r) { return !(r.deleted && r.updatedAt < limit); });
    return st;
  }

  /* ---------- estado ---------- */
  var state = normalize(JSON.parse(lsGet(LS_STATE) || 'null') || blank());
  purge(state);

  var cfg = {};
  try { cfg = JSON.parse(lsGet(LS_CFG) || '{}') || {}; } catch (e) { cfg = {}; }
  if (typeof cfg.url !== 'string') cfg.url = '';
  // config.js (opcional, en el repo) puede traer la URL ya puesta
  if (!cfg.url && global.CDF_CONFIG && global.CDF_CONFIG.url) cfg.url = String(global.CDF_CONFIG.url);

  var listeners = [];
  /* scriptVersion / esquemaViejo: qué Apps Script hay publicado al otro lado.
     Sin esto, publicar una versión antigua es invisible desde la app y solo se
     nota en que algo (las fotos) no llega a los demás. */
  var status = {
    state: cfg.url ? 'idle' : 'local', dirty: false, lastSync: cfg.lastSync || 0, msg: '',
    scriptVersion: null, esquemaViejo: false
  };
  var pushTimer = null, pulling = false, pushing = false;

  function emit() {
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  function persist() {
    var okSaved = lsSet(LS_STATE, JSON.stringify(state));
    if (!okSaved) setStatus('error', 'Este navegador no deja guardar datos.');
  }
  function setStatus(s, msg) {
    status.state = s;
    status.msg = msg || '';
    emit();
  }

  /* ---------- red ---------- */
  /* Apps Script no responde a las peticiones "preflight" de CORS, así que los
     envíos van como text/plain: son peticiones simples y no la disparan. */
  function request(payload) {
    var url = cfg.url;
    if (!url) return Promise.reject({ code: 'sin-config' });
    var opts = payload
      ? { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' }
      : { method: 'GET', redirect: 'follow' };
    return fetch(url + (payload ? '' : (url.indexOf('?') === -1 ? '?' : '&') + 't=' + now()), opts)
      .then(function (res) {
        if (!res.ok) throw { code: 'http-' + res.status };
        return res.text();
      })
      .then(function (txt) {
        var json;
        try { json = JSON.parse(txt); } catch (e) { throw { code: 'respuesta-no-json', body: txt.slice(0, 200) }; }
        if (!json || json.ok !== true) throw { code: 'error-script', msg: (json && json.error) || 'respuesta inesperada' };
        status.scriptVersion = json.version === undefined ? 0 : +json.version;
        var salas = (json.data && json.data.rooms) || [];
        /* si trae salas y ninguna menciona photo, el script publicado es de
           antes de la columna Foto: las fotos no se comparten con los demás */
        status.esquemaViejo = salas.length > 0 && !salas.some(function (r) { return r && 'photo' in r; });
        return normalize(json.data || blank());
      });
  }

  function adopt(remote) {
    var before = JSON.stringify(state);
    state = purge(merge(state, remote));
    persist();
    cfg.lastSync = status.lastSync = now();
    lsSet(LS_CFG, JSON.stringify(cfg));
    return before !== JSON.stringify(state);
  }

  /** Baja los cambios de la hoja y los fusiona con lo que hay aquí. */
  function pull() {
    if (!cfg.url || pulling) return Promise.resolve(false);
    pulling = true;
    setStatus('syncing');
    return request(null).then(function (remote) {
      pulling = false;
      var changed = adopt(remote);
      setStatus(status.dirty ? 'pending' : 'idle');
      return changed;
    }, function (err) {
      pulling = false;
      setStatus('offline', describe(err));
      throw err;
    });
  }

  /** Sube todo el cuaderno; la hoja devuelve la versión ya fusionada. */
  function push() {
    if (!cfg.url) { status.dirty = false; return Promise.resolve(false); }
    if (pushing) { schedulePush(600); return Promise.resolve(false); }
    pushing = true;
    setStatus('syncing');
    var sent = JSON.stringify(state);
    return request({ data: JSON.parse(sent) }).then(function (remote) {
      pushing = false;
      status.dirty = false;
      adopt(remote);
      setStatus('idle');
      return true;
    }, function (err) {
      pushing = false;
      setStatus('offline', describe(err));
      return false;
    });
  }

  function describe(err) {
    var c = err && err.code;
    if (c === 'sin-config') return 'Sin conectar a la hoja.';
    if (c === 'respuesta-no-json') return 'La URL responde algo raro: revisa que sea la URL /exec de la aplicación web.';
    if (c === 'error-script') return 'La hoja devolvió un error: ' + (err.msg || '');
    if (typeof c === 'string' && c.indexOf('http-') === 0) return 'La hoja respondió ' + c.slice(5) + '. Revisa que el acceso sea "Cualquier persona".';
    return 'Sin conexión con la hoja; se reintentará.';
  }

  function schedulePush(delay) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { push(); }, delay == null ? 1200 : delay);
  }

  /* ---------- API pública ---------- */
  var Store = {
    PAL: PAL,
    uid: uid,
    merge: merge,
    normalize: normalize,

    get state() { return state; },
    get status() { return status; },
    get config() { return cfg; },
    get connected() { return !!cfg.url; },

    onChange: function (fn) { listeners.push(fn); },

    /** Guarda un cambio local: sella la hora, persiste y programa la subida. */
    commit: function (entities) {
      (entities || []).forEach(function (e) { if (e) e.updatedAt = now(); });
      persist();
      if (cfg.url) {
        status.dirty = true;
        setStatus('pending');
        schedulePush();
      } else {
        setStatus('local');
      }
      emit();
    },

    players: function () { return state.players.filter(function (p) { return !p.deleted; }); },
    rooms: function () { return state.rooms.filter(function (r) { return !r.deleted; }); },

    player: function (id) {
      for (var i = 0; i < state.players.length; i++) if (state.players[i].id === id) return state.players[i];
      return null;
    },
    room: function (id) {
      for (var i = 0; i < state.rooms.length; i++) if (state.rooms[i].id === id) return state.rooms[i];
      return null;
    },

    addPlayers: function (names) {
      var added = [];
      names.forEach(function (n, i) {
        var p = { id: uid(), name: n, color: PAL[(state.players.length + i) % PAL.length], updatedAt: now() };
        state.players.push(p);
        added.push(p);
      });
      Store.commit(added);
      return added;
    },
    removePlayer: function (id) {
      var p = Store.player(id);
      if (!p) return;
      p.deleted = true;
      var touched = [p];
      state.rooms.forEach(function (r) {
        if (r.who && r.who.indexOf(id) !== -1) {
          r.who = r.who.filter(function (x) { return x !== id; });
          touched.push(r);
        }
      });
      Store.commit(touched);
    },
    saveRoom: function (room) {
      var existing = room.id ? Store.room(room.id) : null;
      if (existing) {
        Object.keys(room).forEach(function (k) { existing[k] = room[k]; });
        Store.commit([existing]);
        return existing;
      }
      room.id = room.id || uid();
      state.rooms.push(room);
      Store.commit([room]);
      return room;
    },
    removeRoom: function (id) {
      var r = Store.room(id);
      if (!r) return;
      r.deleted = true;
      Store.commit([r]);
    },

    /** Reemplaza el cuaderno con un fichero importado, fusionando por ids. */
    importJson: function (obj) {
      var incoming = normalize(obj && obj.rooms ? obj : (obj && obj.data) || blank());
      incoming.players.forEach(function (p) { if (!p.updatedAt) p.updatedAt = now(); });
      incoming.rooms.forEach(function (r) { if (!r.updatedAt) r.updatedAt = now(); });
      state = purge(merge(state, incoming));
      persist();
      if (cfg.url) { status.dirty = true; schedulePush(300); }
      emit();
      return { players: incoming.players.length, rooms: incoming.rooms.length };
    },
    exportJson: function () {
      return JSON.stringify({ app: 'cuaderno-de-fugas', v: 1, exportado: new Date().toISOString(), players: state.players, rooms: state.rooms }, null, 2);
    },

    /* --- conexión con la hoja --- */
    connect: function (url) {
      var u = String(url || '').trim();
      if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(u)) {
        return Promise.reject({ code: 'url-mala' });
      }
      var prev = cfg.url;
      cfg.url = u;
      return request(null).then(function (remote) {
        lsSet(LS_CFG, JSON.stringify(cfg));
        adopt(remote);
        status.dirty = true;          // sube lo que ya hubiera aquí
        setStatus('pending');
        schedulePush(200);
        return true;
      }, function (err) {
        cfg.url = prev;
        throw err;
      });
    },
    disconnect: function () {
      cfg.url = '';
      lsSet(LS_CFG, JSON.stringify(cfg));
      status.dirty = false;
      setStatus('local');
    },
    syncNow: function () {
      if (!cfg.url) return Promise.resolve(false);
      return pull().then(function () { return status.dirty ? push() : false; }, function () { return false; });
    },
    describe: describe
  };

  /* ---------- arranque y sincronización periódica ---------- */
  Store.start = function () {
    if (!cfg.url) { setStatus('local'); return; }
    Store.syncNow();
    setInterval(function () {
      if (document.visibilityState !== 'hidden') Store.syncNow();
    }, 60000);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') Store.syncNow();
    });
    global.addEventListener('online', function () { Store.syncNow(); });
  };

  global.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);
