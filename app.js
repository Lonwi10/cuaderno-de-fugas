/* ==========================================================================
   app.js — interfaz del Cuaderno de Fugas. Todo el estado vive en Store
   (store.js); aquí solo se pinta y se recogen los clics.
   ========================================================================== */
(function () {
  'use strict';

  var ui = { tab: 'done', q: '', who: '', sort: 'date', city: '', sortWish: 'name' };
  try {
    var saved = sessionStorage.getItem('cdf:ui');
    if (saved) ui = Object.assign(ui, JSON.parse(saved));
  } catch (e) {}
  function saveUi() { try { sessionStorage.setItem('cdf:ui', JSON.stringify(ui)); } catch (e) {} }

  /* ---------- utilidades ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
  function money(n) { return EUR.format(isFinite(n) ? n : 0); }
  function num(v) { var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function fdate(iso) {
    if (!iso) return '';
    var p = String(iso).split('-');
    if (p.length < 3) return iso;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
  }
  function initials(name) {
    var parts = String(name || '?').trim().split(/\s+/);
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(name || '?').trim().slice(0, 2).toUpperCase();
  }
  /* Precio: lo que se apunta es el total pagado y entre cuántas personas se
     repartió (pueden ser más que los de la cuadrilla). De ahí sale lo que puso
     cada uno, y de ahí lo que puso el grupo. */
  function attendees(r) { return (r.who && r.who.length) || 0; }
  function perPerson(r) {
    var p = num(r.price);
    if (r.priceMode === 'pp') return p;
    var n = num(r.people) || attendees(r);
    return n ? p / n : p;
  }
  function groupTotal(r) {
    var n = attendees(r);
    return n ? perPerson(r) * n : num(r.price);
  }
  function done() { return Store.rooms().filter(function (r) { return r.status !== 'wish'; }); }
  function wish() { return Store.rooms().filter(function (r) { return r.status === 'wish'; }); }
  /* Numera las salas por orden cronológico. Las que no tienen fecha no reciben
     número: se dirá "sin fecha" en su lugar. */
  function ordinals() {
    var map = {};
    done().filter(function (r) { return r.date; })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); })
      .forEach(function (r, i) { map[r.id] = i + 1; });
    return map;
  }
  function safeUrl(u) {
    var v = String(u || '').trim();
    if (!v) return '';
    if (!/^https?:\/\//i.test(v)) {
      if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v)) v = 'https://' + v;
      else return '';
    }
    return v;
  }
  function hoy() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }

  /* ---------- iconos ---------- */
  var ICO = {
    keyhole: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3.5" y="2.5" width="17" height="19" rx="3"/><circle cx="12" cy="10" r="2.6"/><path d="M10.7 12.6 9.9 17.6h4.2l-.8-5"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14.9 2a7.1 7.1 0 0 0-6.6 9.7L2 18v4h4l.9-.9V19h2.1v-2.1h2.1l1.2-1.2A7.1 7.1 0 1 0 14.9 2Zm2.4 6.6a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8Z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4 10.5 13.5"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true" class="i15"><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m14.5 5.5 4 4"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true" class="i15"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true" class="i15"><path d="m4 12.5 5 5L20 6.5"/></svg>',
    sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true" class="i15"><path d="M20 11a8 8 0 0 0-14.3-3.7M4 13a8 8 0 0 0 14.3 3.7"/><path d="M4 4v4h4M20 20v-4h-4"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true" class="i15"><path d="M12 4v11m0 0 4-4m-4 4-4-4"/><path d="M4 19h16"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true" class="i15"><path d="M12 19V8m0 0 4 4m-4-4-4 4"/><path d="M4 4h16"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true" class="i15"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true" class="i15"><path d="M9 14 4 9l5-5"/><path d="M4 9h9a7 7 0 0 1 0 14H7"/></svg>'
  };
  /* Línea viva bajo el precio: cómo queda el reparto con lo que hay escrito. */
  function reparto(r) {
    if (!num(r.price)) return '<p class="reparto hint">Escribe el precio y se reparte solo.</p>';
    var n = attendees(r);
    return '<p class="reparto">' + money(perPerson(r)) + ' por persona' +
      (n ? ' · ' + money(groupTotal(r)) + (n === 1 ? ' de la cuadrilla (1 persona)' : ' entre los ' + n + ' de la cuadrilla') : '') +
      '</p>';
  }

  function keys(n, cls) {
    var out = '';
    for (var i = 1; i <= 5; i++) out += ICO.key.replace('<svg ', '<svg class="' + (i <= n ? 'on' : '') + '" ');
    return '<div class="' + (cls || 'rate') + '">' + out + (n ? '<span class="nn">' + n + '/5</span>' : '') + '</div>';
  }

  /* ---------- avisos ---------- */
  var toastBox = document.createElement('div');
  toastBox.id = 'toast';
  document.body.appendChild(toastBox);
  function toast(msg) {
    var d = document.createElement('div');
    d.textContent = msg;
    toastBox.appendChild(d);
    setTimeout(function () { d.remove(); }, 4600);
  }
  function armed(btn, label) {
    if (btn.getAttribute('data-armed') === '1') return true;
    var prev = btn.innerHTML;
    btn.setAttribute('data-armed', '1');
    btn.innerHTML = esc(label);
    setTimeout(function () {
      if (btn.isConnected && btn.getAttribute('data-armed') === '1') {
        btn.removeAttribute('data-armed');
        btn.innerHTML = prev;
      }
    }, 4000);
    return false;
  }

  /* ---------- instalación en el móvil ---------- */
  var installEvent = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvent = e;
    paintStatus();
  });

  // Safari no dispara beforeinstallprompt: en iPhone hay que explicar el camino a mano.
  function esApple() {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);   // el iPad se hace pasar por Mac
  }
  function yaInstalada() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      navigator.standalone === true;                            // Safari en pantalla de inicio
  }

  /* ---------- indicador de sincronización ---------- */
  function paintStatus() {
    var box = document.getElementById('savechip');
    if (!box) return;
    var s = Store.status;
    var map = {
      local: ['local', 'Solo en este dispositivo'],
      idle: ['ok', 'Al día'],
      pending: ['work', 'Subiendo cambios…'],
      syncing: ['work', 'Sincronizando…'],
      offline: ['bad', 'Sin conexión'],
      error: ['bad', 'Error al guardar']
    };
    var m = map[s.state] || map.idle;
    box.setAttribute('data-s', m[0]);
    box.title = s.msg || (s.lastSync ? 'Última sincronización: ' + new Date(s.lastSync).toLocaleTimeString('es-ES') : '');
    box.innerHTML = '<span class="dot"></span>' + esc(m[1]);
    var inst = document.getElementById('installbtn');
    if (inst) inst.hidden = !puedeInstalarse();
  }

  /* En Chrome/Android hay evento de instalación; en iPhone no, así que ahí el
     botón solo explica el camino. Si ya está instalada, no se ofrece. */
  function puedeInstalarse() {
    if (yaInstalada()) return false;
    return !!installEvent || esApple();
  }

  /* ---------- pintado ---------- */
  function render() {
    var app = document.getElementById('app');
    var players = Store.players();
    var d = done(), w = wish();
    var escaped = d.filter(function (r) { return r.escaped === true; }).length;
    var rated = d.filter(function (r) { return num(r.rating) > 0; });
    var avg = rated.length ? rated.reduce(function (a, r) { return a + num(r.rating); }, 0) / rated.length : 0;
    var spend = d.reduce(function (a, r) { return a + groupTotal(r); }, 0);

    var html = '';
    html += '<header class="top">' +
      '<div class="brand">' + ICO.keyhole +
        '<div><h1>Cuaderno de fugas</h1><p class="sub">' +
        (players.length ? esc(players.map(function (p) { return p.name; }).join(' · ')) : 'Registro del grupo') +
        '</p></div>' +
      '</div>' +
      '<div class="hgroup">' +
        '<button class="btn ghost" id="installbtn" data-act="install" hidden>' + ICO.phone + 'Instalar</button>' +
        '<button class="btn ghost" data-act="sync" title="Sincronizar ahora">' + ICO.sync + '</button>' +
        '<span class="chip" id="savechip" data-s="ok"><span class="dot"></span></span>' +
      '</div>' +
    '</header>';

    html += '<section class="stats">' +
      tile('Salas jugadas', d.length, w.length ? w.length + ' sin jugar' : 'ninguna apuntada', true) +
      tile('Fugas logradas', escaped, d.length ? Math.round(escaped / d.length * 100) + '% de las salas' : '—', false) +
      tile('Gasto del grupo', money(spend), d.length ? money(spend / d.length) + ' por sala' : '—', false) +
      tile('Nota media', avg ? avg.toFixed(1) : '—', rated.length ? rated.length + ' salas valoradas' : 'sin valorar', false) +
    '</section>';

    // Cuaderno recién abierto: o se da de alta el grupo, o se conecta a la hoja
    // donde ya está (es la ruta de los colegas que llegan después).
    if (!players.length) {
      if (ui.tab !== 'cfg') {
        app.innerHTML = html + setupPanel();
        paintStatus();
        return;
      }
      app.innerHTML = html +
        '<nav class="tabs" role="tablist">' +
          '<button class="tab" role="tab" data-act="tab" data-tab="done" aria-selected="false">← Volver</button>' +
          '<button class="tab" role="tab" data-act="tab" data-tab="cfg" aria-selected="true">Ajustes</button>' +
        '</nav>' + cfgView();
      paintStatus();
      return;
    }

    html += '<nav class="tabs" role="tablist">' +
      tab('done', 'Jugadas', d.length) +
      tab('wish', 'No jugadas', w.length) +
      tab('crew', 'La cuadrilla', players.length) +
      tab('cfg', 'Ajustes', '') +
    '</nav>';

    if (ui.tab === 'crew') html += crewView(d, players);
    else if (ui.tab === 'cfg') html += cfgView();
    else html += listView(ui.tab === 'wish' ? w : d, players);

    app.innerHTML = html;
    var sel = document.getElementById('sort');
    if (sel) sel.value = ui.sort;
    var selC = document.getElementById('cityf');
    if (selC) selC.value = ui.city;
    var selW = document.getElementById('sortwish');
    if (selW) selW.value = ui.sortWish;
    paintStatus();
  }

  function tile(label, value, unit, accent) {
    return '<div class="tile' + (accent ? ' accent' : '') + '">' +
      '<span class="lbl">' + esc(label) + '</span>' +
      '<span class="v">' + esc(value) + '</span>' +
      '<span class="u">' + esc(unit) + '</span></div>';
  }
  function tab(id, label, n) {
    return '<button class="tab" role="tab" data-act="tab" data-tab="' + id + '" aria-selected="' + (ui.tab === id) + '">' +
      esc(label) + (n === '' ? '' : '<span class="n">' + n + '</span>') + '</button>';
  }
  function opt(v, label) { return '<option value="' + v + '">' + esc(label) + '</option>'; }

  function listView(list, players) {
    var html = '<div class="toolbar">' +
      '<label class="search">' + ICO.search +
        '<input type="search" id="q" value="' + esc(ui.q) + '" placeholder="Buscar sala, empresa o ciudad…" aria-label="Buscar">' +
      '</label>';
    if (ui.tab === 'done') {
      html += '<div class="who-filter">' + players.map(function (p) {
        return '<button class="pill" data-act="who" data-id="' + p.id + '" aria-pressed="' + (ui.who === p.id) + '">' +
          '<span class="av mini" style="background:' + esc(p.color) + '">' + esc(initials(p.name)) + '</span>' +
          esc(p.name.split(' ')[0]) + '</button>';
      }).join('') + '</div>';
      html += '<select class="sel" id="sort" aria-label="Ordenar">' +
        opt('date', 'Más recientes') + opt('old', 'Más antiguas') + opt('rating', 'Mejor valoradas') +
        opt('price', 'Más caras') + opt('name', 'Por nombre') + '</select>';
    } else {
      // con cientos de salas por jugar, filtrar por ciudad es lo que salva la lista
      html += '<select class="sel" id="cityf" aria-label="Ciudad">' + opt('', 'Todas las ciudades') +
        ciudades(list).map(function (c) { return opt(c.city, c.city + ' (' + c.n + ')'); }).join('') + '</select>';
      html += '<select class="sel" id="sortwish" aria-label="Ordenar">' +
        opt('name', 'Por nombre') + opt('city', 'Por ciudad') + opt('company', 'Por empresa') + '</select>';
    }
    html += '<div class="spacer"></div>' +
      '<button class="btn primary" data-act="new">' + ICO.plus + (ui.tab === 'wish' ? 'Añadir sala' : 'Nueva sala') + '</button>' +
    '</div>';

    var shown = filtered(list);
    html += '<p class="count hint">' + shown.length + (shown.length === 1 ? ' sala' : ' salas') +
      (shown.length !== list.length ? ' de ' + list.length : '') + '</p>';
    if (!shown.length) return html + emptyState(list.length, ui.tab);
    var ord = ordinals();
    return html + '<section class="grid">' + shown.map(function (r) { return card(r, ord[r.id], players); }).join('') + '</section>';
  }

  /* Ciudades presentes en una lista, ordenadas por nº de salas. */
  function ciudades(list) {
    var cuenta = {};
    list.forEach(function (r) {
      var c = String(r.city || '').trim();
      if (c) cuenta[c] = (cuenta[c] || 0) + 1;
    });
    return Object.keys(cuenta).sort(function (a, b) {
      return cuenta[b] - cuenta[a] || a.localeCompare(b, 'es');
    }).map(function (c) { return { city: c, n: cuenta[c] }; });
  }

  function filtered(list) {
    var q = ui.q.trim().toLowerCase();
    var out = list.filter(function (r) {
      if (q && [r.name, r.company, r.city, r.notes].join(' ').toLowerCase().indexOf(q) === -1) return false;
      if (ui.tab === 'done' && ui.who && (!r.who || r.who.indexOf(ui.who) === -1)) return false;
      if (ui.tab === 'wish' && ui.city && String(r.city || '').trim() !== ui.city) return false;
      return true;
    });
    out.sort(sorter(ui.tab === 'wish' ? ui.sortWish : ui.sort));
    return out;
  }
  function sorter(mode) {
    var porNombre = function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'es'); };
    return function (a, b) {
      if (mode === 'name') return porNombre(a, b);
      if (mode === 'city') return String(a.city || 'zzz').localeCompare(String(b.city || 'zzz'), 'es') || porNombre(a, b);
      if (mode === 'company') return String(a.company || 'zzz').localeCompare(String(b.company || 'zzz'), 'es') || porNombre(a, b);
      if (mode === 'rating') return num(b.rating) - num(a.rating) || String(b.date || '').localeCompare(String(a.date || ''));
      if (mode === 'price') return perPerson(b) - perPerson(a);
      if (mode === 'old') return String(a.date || '9999').localeCompare(String(b.date || '9999'));
      return String(b.date || '').localeCompare(String(a.date || ''));
    };
  }

  function card(r, ord, players) {
    var isWish = r.status === 'wish';
    var url = safeUrl(r.web);
    var pp = perPerson(r), gt = groupTotal(r);
    var badge = isWish ? '<span class="badge wish">Sin jugar</span>'
      : r.escaped === true ? '<span class="badge win">Fuga' + (r.timeLeft ? ' · ' + esc(r.timeLeft) : '') + '</span>'
      : r.escaped === false ? '<span class="badge lose">Sin fuga</span>'
      : '<span class="badge unk">Jugada</span>';
    var meta = [r.company, r.city].filter(Boolean).map(esc).join(' · ');
    var who = isWish ? '' : '<div class="who">' + players.map(function (p) {
      var inn = r.who && r.who.indexOf(p.id) !== -1;
      return '<span class="av' + (inn ? '' : ' off') + '" style="' + (inn ? 'background:' + esc(p.color) : '') + '" title="' +
        esc(p.name) + (inn ? '' : ' (no fue)') + '">' + esc(initials(p.name)) + '</span>';
    }).join('') + '</div>';

    /* la foto de escaperoomlover, si la sala la trae, en el hueco de la derecha */
    var foto = safeUrl(r.photo);
    var shot = foto ? '<img class="shot" src="' + esc(foto) + '" alt="" loading="lazy" decoding="async"' +
      ' onerror="this.hidden=true">' : '';           // sin cobertura, mejor sin hueco

    return '<article class="card' + (isWish ? ' wishlist' : '') + '">' +
      '<div class="crown"><span class="ord">' +
        (isWish ? 'Sin jugar' : (ord ? 'Sala nº ' + String(ord).padStart(2, '0') : 'Sin fecha')) +
      '</span>' + badge + '</div>' +
      '<div class="body">' +
        '<div class="text">' +
          '<h3>' + esc(r.name || 'Sin nombre') + '</h3>' +
          (meta ? '<p class="meta">' + meta + '</p>' : '') +
          (isWish ? '' : keys(num(r.rating))) +
          (r.notes ? '<p class="notes">' + esc(r.notes) + '</p>' : '') +
        '</div>' + shot +
      '</div>' +
      '<div class="foot">' +
        (isWish ? '' : (num(r.price)
          ? '<span class="price">' + money(pp) + ' <small>/persona' + (attendees(r) > 1 ? ' · ' + money(gt) + ' la cuadrilla' : '') + '</small></span>'
          : '<span class="price"><small>sin precio</small></span>')) +
        (r.date && !isWish ? '<span class="when">' + esc(fdate(r.date)) + '</span>' : '') +
        '<span class="spacer"></span>' + who +
        (url ? '<a class="iconlink" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(host(url)) + '">' + ICO.link + '</a>' : '') +
        '<div class="acts">' +
          (isWish ? '<button class="btn ghost" data-act="didit" data-id="' + r.id + '" title="La hemos jugado">' + ICO.check + '</button>' : '') +
          '<button class="btn ghost" data-act="edit" data-id="' + r.id + '" title="Editar">' + ICO.edit +
          (isWish ? '' : '<span class="txt-btn">Editar</span>') + '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function emptyState(total, tabId) {
    // si la lista tiene salas y no se ve ninguna, el problema es el filtro
    if (total > 0) {
      return '<div class="empty"><h3>Nada coincide con el filtro</h3>' +
        '<p>Prueba con otro texto, otra ciudad o quita los filtros.</p>' +
        '<button class="btn" data-act="clearf">Quitar filtros</button></div>';
    }
    if (tabId === 'wish') {
      return '<div class="empty"><h3>No hay ninguna sala sin jugar</h3>' +
        '<p>Aquí va el catálogo de salas que os quedan. Cuando juguéis una, el botón ✓ abre la ficha para poner día, precio y quién fue.</p>' +
        '<button class="btn" data-act="new">' + ICO.plus + 'Añadir una sala</button></div>';
    }
    if (total === 0) {
      return '<div class="empty"><h3>Aún no hay ninguna sala apuntada</h3>' +
        '<p>Empieza por la última que hicisteis: nombre, empresa, precio y web. El resto se rellena solo.</p>' +
        '<button class="btn primary" data-act="new">' + ICO.plus + 'Apuntar la primera sala</button></div>';
    }
    return '';
  }

  function setupPanel() {
    var inputs = '';
    for (var i = 0; i < 4; i++) {
      inputs += '<div class="field"><span class="lbl">Colega ' + (i + 1) + '</span>' +
        '<input class="txt" name="p' + i + '" placeholder="Nombre" autocomplete="off"></div>';
    }
    return '<div class="panel"><h2>¿Quiénes sois?</h2>' +
      '<p>Escribe los nombres del grupo. Luego, en cada sala marcas quién fue: así el cuaderno lleva la cuenta de las salas y del gasto de cada uno. Podrás cambiarlos o añadir más cuando quieras.</p>' +
      '<div class="namegrid" id="setupnames">' + inputs + '</div>' +
      '<div class="btnrow"><button class="btn primary" data-act="setup">' + ICO.check + 'Empezar el cuaderno</button>' +
      '<button class="btn" data-act="tab" data-tab="cfg">Ya tengo un cuaderno: conectar</button></div>' +
      '<p class="hint">¿Tienes una copia del cuaderno en un fichero? Cárgala y entra todo de golpe: ' +
      '<button class="btn ghost" data-act="importbtn">' + ICO.up + 'Importar copia</button>' +
      '<input type="file" id="importfile" accept="application/json,.json" hidden></p>' +
    '</div>';
  }

  function crewView(d, players) {
    var maxRooms = 1;
    players.forEach(function (p) {
      var c = d.filter(function (r) { return r.who && r.who.indexOf(p.id) !== -1; }).length;
      if (c > maxRooms) maxRooms = c;
    });
    var rows = players.map(function (p) {
      var mine = d.filter(function (r) { return r.who && r.who.indexOf(p.id) !== -1; });
      var spent = mine.reduce(function (a, r) { return a + perPerson(r); }, 0);
      var wins = mine.filter(function (r) { return r.escaped === true; }).length;
      return '<div class="prow">' +
        '<span class="av big" style="background:' + esc(p.color) + '">' + esc(initials(p.name)) + '</span>' +
        '<div class="nm"><input class="txt" data-act="pname" data-id="' + p.id + '" value="' + esc(p.name) + '" aria-label="Nombre"></div>' +
        '<div class="bar"><i style="width:' + Math.round(mine.length / maxRooms * 100) + '%"></i></div>' +
        '<div class="stat"><span class="lbl">Salas</span><b>' + mine.length + '</b></div>' +
        '<div class="stat"><span class="lbl">Fugas</span><b>' + (mine.length ? Math.round(wins / mine.length * 100) + '%' : '—') + '</b></div>' +
        '<div class="stat"><span class="lbl">Gasto</span><b>' + esc(money(spent)) + '</b></div>' +
        '<button class="btn ghost" data-act="delplayer" data-id="' + p.id + '" title="Quitar del grupo">✕</button>' +
      '</div>';
    }).join('');
    return '<section class="plist">' + rows +
      '<div class="btnrow"><button class="btn" data-act="addplayer">' + ICO.plus + 'Añadir a alguien</button></div>' +
      '<p class="hint">El gasto de cada uno se calcula con el precio de las salas a las que fue, dividido entre los asistentes.</p>' +
    '</section>';
  }

  function cfgView() {
    var cfg = Store.config;
    var s = Store.status;
    var conectado = Store.connected;
    var html = '<section class="panels">';

    html += '<div class="panel"><h2>Hoja de cálculo compartida</h2>';
    if (conectado) {
      html += '<p>Este dispositivo está conectado. Todo lo que apuntéis se guarda en tu hoja de Google y los demás lo ven al abrir la web.</p>' +
        '<p class="urlbox mono">' + esc(cfg.url) + '</p>' +
        '<p class="hint">Estado: ' + esc(s.msg || ({ idle: 'al día', pending: 'subiendo cambios', syncing: 'sincronizando', offline: 'sin conexión', local: 'sin conectar' }[s.state] || s.state)) +
        (s.lastSync ? ' · última sincronización a las ' + new Date(s.lastSync).toLocaleTimeString('es-ES') : '') + '</p>' +
        '<div class="btnrow">' +
          '<button class="btn" data-act="sync">' + ICO.sync + 'Sincronizar ahora</button>' +
          '<button class="btn danger" data-act="disconnect">Desconectar este dispositivo</button>' +
        '</div>';
    } else {
      html += '<p>Sin conectar: el cuaderno se guarda solo en este dispositivo. Para que los cuatro veáis la misma lista, pega aquí la URL de la aplicación web del Apps Script de tu hoja (acaba en <span class="mono">/exec</span>). Los pasos están en el README del repositorio.</p>' +
        '<div class="field"><span class="lbl">URL de la hoja</span>' +
          '<input class="txt" id="cfgurl" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" spellcheck="false"></div>' +
        '<div class="btnrow"><button class="btn primary" data-act="connect">' + ICO.check + 'Conectar</button></div>' +
        '<p class="hint">Guarda la URL solo en este navegador; no se sube al repositorio.</p>';
    }
    html += '</div>';

    html += '<div class="panel"><h2>Copia de seguridad</h2>' +
      '<p>Descarga el cuaderno entero en un fichero, o carga uno que te hayan pasado. Al importar se fusiona con lo que ya tengas: no se pierde nada.</p>' +
      '<div class="btnrow">' +
        '<button class="btn" data-act="export">' + ICO.down + 'Descargar copia</button>' +
        '<button class="btn" data-act="importbtn">' + ICO.up + 'Importar copia</button>' +
        '<input type="file" id="importfile" accept="application/json,.json" hidden>' +
      '</div></div>';

    html += '<div class="panel"><h2>Instalar en el móvil</h2>';
    if (yaInstalada()) {
      html += '<p>Ya está instalada en este dispositivo: lo estás usando como app.</p>';
    } else if (esApple()) {
      html += '<p>No hace falta App Store: abre esta web en <em>Safari</em>, pulsa <em>Compartir</em> (el cuadrado con la flecha hacia arriba) y elige <em>Añadir a pantalla de inicio</em>. Queda como una app, con icono propio, y funciona sin cobertura (los cambios se suben cuando vuelva).</p>' +
        '<p class="hint">En iPhone no hay botón de instalar: Safari solo lo deja hacer desde Compartir, y conviene que sea Safari — desde otros navegadores el icono puede quedarse en un simple acceso directo.</p>';
    } else {
      html += '<p>No hace falta APK: abre esta web en Chrome y usa <em>Añadir a pantalla de inicio</em>. Queda como una app, con icono propio, y funciona sin cobertura (los cambios se suben cuando vuelva).</p>' +
        (installEvent ? '<div class="btnrow"><button class="btn primary" data-act="install">' + ICO.phone + 'Instalar ahora</button></div>' : '');
    }
    html += '<p class="hint">El cuaderno se guarda en el propio móvil: si borras el icono, se va con él. Con la hoja conectada, al reinstalar lo recuperas.</p>' +
    '</div>';

    return html + '</section>';
  }

  /* ---------- formulario ---------- */
  var dlg = document.createElement('dialog');
  document.body.appendChild(dlg);
  var draft = null, tituloForm = '';

  function openForm(room, presetStatus, titulo) {
    tituloForm = titulo || '';
    var players = Store.players();
    draft = room ? JSON.parse(JSON.stringify(room)) : {
      id: '', name: '', company: '', city: '', web: '', price: '', priceMode: 'total',
      status: presetStatus || 'done', date: '', who: players.map(function (p) { return p.id; }),
      escaped: null, timeLeft: '', rating: 0, notes: ''
    };
    renderForm();
    if (!dlg.open) dlg.showModal();
    var first = dlg.querySelector('input[name="name"]');
    if (first) first.focus();
  }
  function syncForm() {
    if (!draft) return;
    dlg.querySelectorAll('[name]').forEach(function (i) { draft[i.name] = i.value; });
  }
  function renderForm() {
    var r = draft, players = Store.players();
    var isWish = r.status === 'wish';
    dlg.innerHTML = '<form id="roomform">' +
      '<div class="dh"><h2>' + (tituloForm || (r.id ? 'Editar sala' : (isWish ? 'Sala sin jugar' : 'Nueva sala'))) + '</h2>' +
        '<button type="button" class="btn ghost" data-act="close">Cerrar</button></div>' +
      '<div class="db">' +
        '<div class="field"><span class="lbl">Nombre de la sala</span>' +
          '<input class="txt" name="name" value="' + esc(r.name) + '" required placeholder="El sótano del relojero" autocomplete="off"></div>' +
        '<div class="row2">' +
          '<div class="field"><span class="lbl">Empresa / local</span><input class="txt" name="company" value="' + esc(r.company) + '" placeholder="Escape Room Valencia" autocomplete="off"></div>' +
          '<div class="field"><span class="lbl">Ciudad</span><input class="txt" name="city" value="' + esc(r.city) + '" placeholder="Valencia" autocomplete="off"></div>' +
        '</div>' +
        '<div class="field"><span class="lbl">Web</span><input class="txt" name="web" value="' + esc(r.web) + '" placeholder="escaperoomvalencia.com" inputmode="url" autocomplete="off"></div>' +
        '<div class="row2">' +
          '<div class="field"><span class="lbl">Estado</span>' +
            '<div class="seg">' +
              '<button type="button" data-act="status" data-v="done" aria-pressed="' + (!isWish) + '">Ya jugada</button>' +
              '<button type="button" data-act="status" data-v="wish" aria-pressed="' + isWish + '">Sin jugar</button>' +
            '</div>' +
            (isWish ? '<p class="hint">Las de sin jugar no llevan fecha, precio ni resultado: eso se rellena el día que la juguéis.</p>'
                    : '<div class="mt6"><span class="lbl">Día <em class="opt">(opcional)</em></span><input class="txt" type="date" name="date" value="' + esc(r.date) + '"></div>') +
          '</div>' +
          (isWish ? '<div></div>' :
            '<div class="field"><span class="lbl">Nº de personas</span>' +
              '<input class="txt" name="people" value="' + esc(r.people) + '" inputmode="numeric" placeholder="' + (attendees(r) || 4) + '">' +
              '<p class="hint">Entre cuántas se repartió el precio, contando a quien no sea de la cuadrilla.</p>' +
            '</div>') +
        '</div>' +
        (isWish ? '' :
          '<div class="field"><span class="lbl">Precio total</span>' +
            '<input class="txt" name="price" value="' + esc(r.price) + '" inputmode="decimal" placeholder="0,00">' +
            '<div class="seg mt6">' +
              '<button type="button" data-act="pmode" data-v="total" aria-pressed="' + (r.priceMode !== 'pp') + '">Es el total</button>' +
              '<button type="button" data-act="pmode" data-v="pp" aria-pressed="' + (r.priceMode === 'pp') + '">Ya es por persona</button>' +
            '</div>' +
            reparto(r) +
          '</div>') +
        (isWish ? '' :
          '<div class="field"><span class="lbl">¿Quién fue?</span><div class="who-filter">' +
            players.map(function (p) {
              var inn = r.who.indexOf(p.id) !== -1;
              return '<button type="button" class="pill" data-act="tw" data-id="' + p.id + '" aria-pressed="' + inn + '">' +
                '<span class="av mini" style="background:' + (inn ? esc(p.color) : 'var(--surface2)') + '">' + esc(initials(p.name)) + '</span>' +
                esc(p.name) + '</button>';
            }).join('') +
          '</div></div>' +
          '<div class="row2">' +
            '<div class="field"><span class="lbl">Resultado</span><div class="seg">' +
              '<button type="button" data-act="res" data-v="1" aria-pressed="' + (r.escaped === true) + '">Escapamos</button>' +
              '<button type="button" data-act="res" data-v="0" aria-pressed="' + (r.escaped === false) + '">No salimos</button>' +
              '<button type="button" data-act="res" data-v="" aria-pressed="' + (r.escaped !== true && r.escaped !== false) + '">Ni idea</button>' +
            '</div>' +
            (r.escaped === true ? '<div class="mt6"><span class="lbl">Tiempo restante</span><input class="txt" name="timeLeft" value="' + esc(r.timeLeft) + '" placeholder="4:12"></div>' : '') +
            '</div>' +
            '<div class="field"><span class="lbl">Nota del grupo</span>' + keys(num(r.rating), 'ratepick') + '</div>' +
          '</div>') +
        '<div class="field"><span class="lbl">Notas</span><textarea class="txt" name="notes" placeholder="Puzles muy físicos, el último candado nos comió 10 minutos…">' + esc(r.notes) + '</textarea></div>' +
      '</div>' +
      '<div class="df">' +
        '<button type="submit" class="btn primary">' + ICO.check + (r.id ? 'Guardar cambios' : 'Añadir al cuaderno') + '</button>' +
        (r.id && !isWish ? '<button type="button" class="btn" data-act="unplay" data-id="' + r.id + '">' + ICO.back + 'Devolver a no jugadas</button>' : '') +
        (r.id ? '<button type="button" class="btn danger" data-act="del" data-id="' + r.id + '">Borrar sala</button>' : '') +
        '<span class="spacer"></span>' +
        '<span class="hint">' + (Store.connected ? 'Se sube a la hoja del grupo.' : 'Se guarda en este dispositivo.') + '</span>' +
      '</div>' +
    '</form>';

    var pick = dlg.querySelector('.ratepick');
    if (pick) {
      var svgs = pick.querySelectorAll('svg');
      for (var i = 0; i < svgs.length; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-act', 'rate');
        b.setAttribute('data-v', i + 1);
        b.title = (i + 1) + ' de 5';
        svgs[i].parentNode.insertBefore(b, svgs[i]);
        b.appendChild(svgs[i]);
      }
    }
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!t) return;
    var act = t.getAttribute('data-act');
    var id = t.getAttribute('data-id');

    if (act === 'tab') { ui.tab = t.getAttribute('data-tab'); ui.q = ''; ui.city = ''; saveUi(); render(); return; }
    if (act === 'who') { ui.who = (ui.who === id) ? '' : id; saveUi(); render(); return; }
    if (act === 'clearf') { ui.q = ''; ui.who = ''; ui.city = ''; saveUi(); render(); return; }
    if (act === 'new') { openForm(null, ui.tab === 'wish' ? 'wish' : 'done'); return; }
    if (act === 'edit') { var room = Store.room(id); if (room) openForm(room); return; }
    if (act === 'close') { dlg.close(); return; }

    if (act === 'sync') {
      if (!Store.connected) { ui.tab = 'cfg'; saveUi(); render(); return; }
      Store.syncNow().then(function () { toast('Sincronizado con la hoja.'); }, function () {});
      return;
    }
    if (act === 'connect') {
      var input = document.getElementById('cfgurl');
      var url = input ? input.value : '';
      t.disabled = true;
      Store.connect(url).then(function () {
        toast('Conectado. El cuaderno ya se comparte.');
        ui.tab = 'done';                       // al conectar, directo al cuaderno
        saveUi();
        render();
      }, function (err) {
        t.disabled = false;
        if (err && err.code === 'url-mala') toast('Esa no parece la URL de la aplicación web: debe empezar por https://script.google.com/ y acabar en /exec.');
        else toast(Store.describe(err));
      });
      return;
    }
    if (act === 'disconnect') {
      if (!armed(t, 'Pulsa otra vez para desconectar')) return;
      Store.disconnect();
      toast('Desconectado. El cuaderno sigue aquí, en este dispositivo.');
      render();
      return;
    }
    if (act === 'export') {
      var blob = new Blob([Store.exportJson()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'cuaderno-de-fugas.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return;
    }
    if (act === 'importbtn') {
      var f = document.getElementById('importfile');
      if (f) f.click();
      return;
    }
    if (act === 'install') {
      if (installEvent) {
        installEvent.prompt();
        installEvent = null;
        paintStatus();
      } else if (esApple()) {
        toast('En iPhone: pulsa Compartir (el cuadrado con la flecha) y elige “Añadir a pantalla de inicio”.');
      } else {
        toast('Tu navegador no ofrece instalarla. Prueba con Chrome, o guarda el enlace en favoritos.');
      }
      return;
    }

    if (act === 'setup') {
      var names = [];
      document.querySelectorAll('#setupnames input').forEach(function (i) {
        var v = i.value.trim();
        if (v) names.push(v);
      });
      if (!names.length) { toast('Escribe al menos un nombre.'); return; }
      Store.addPlayers(names);
      render();
      return;
    }
    if (act === 'addplayer') { Store.addPlayers(['Nuevo']); render(); return; }
    if (act === 'delplayer') {
      if (!armed(t, '✕ ¿Seguro?')) return;
      Store.removePlayer(id);
      if (ui.who === id) ui.who = '';
      render();
      return;
    }
    /* La hemos jugado: abre la ficha con lo típico ya puesto (hoy, la cuadrilla
       entera) para rellenar día, precio, quién fue y resultado. */
    if (act === 'didit') {
      var rr = Store.room(id);
      if (!rr) return;
      var recien = JSON.parse(JSON.stringify(rr));
      recien.status = 'done';
      if (!recien.who || !recien.who.length) recien.who = Store.players().map(function (p) { return p.id; });
      if (!String(recien.people == null ? '' : recien.people).trim()) recien.people = String(recien.who.length);
      if (!recien.date) recien.date = hoy();
      openForm(recien, null, '¡Jugada!');
      return;
    }

    /* --- dentro del formulario --- */
    if (!draft) return;
    if (act === 'pmode') { syncForm(); draft.priceMode = t.getAttribute('data-v'); renderForm(); return; }
    if (act === 'status') { syncForm(); draft.status = t.getAttribute('data-v'); renderForm(); return; }
    if (act === 'tw') {
      syncForm();
      var antes = draft.who.length;
      var i2 = draft.who.indexOf(id);
      if (i2 === -1) draft.who.push(id); else draft.who.splice(i2, 1);
      // el nº de personas sigue a la cuadrilla mientras no se toque a mano
      var auto = !String(draft.people == null ? '' : draft.people).trim() || num(draft.people) === antes;
      if (auto) draft.people = draft.who.length ? String(draft.who.length) : '';
      renderForm();
      return;
    }
    if (act === 'res') {
      syncForm();
      var v = t.getAttribute('data-v');
      draft.escaped = v === '1' ? true : (v === '0' ? false : null);
      renderForm();
      return;
    }
    if (act === 'rate') {
      syncForm();
      var nv = +t.getAttribute('data-v');
      draft.rating = (num(draft.rating) === nv) ? 0 : nv;
      renderForm();
      return;
    }
    /* Nos hemos colado: la sala vuelve a no jugadas y se limpia lo del día
       (fecha, precio, quién fue y resultado). El nombre y las notas se quedan. */
    if (act === 'unplay') {
      if (!armed(t, 'Pulsa otra vez: se quitan día, precio y resultado')) return;
      var vuelve = Store.room(id);
      if (!vuelve) return;
      vuelve.status = 'wish';
      vuelve.date = '';
      vuelve.escaped = null;
      vuelve.timeLeft = '';
      vuelve.price = '';
      vuelve.people = '';
      vuelve.who = [];
      Store.commit([vuelve]);
      dlg.close();
      draft = null;
      ui.tab = 'wish';
      saveUi();
      render();
      toast('“' + (vuelve.name || 'Sala') + '” vuelve a no jugadas.');
      return;
    }
    if (act === 'del') {
      if (!armed(t, 'Pulsa otra vez para borrar')) return;
      Store.removeRoom(id);
      dlg.close();
      draft = null;
      render();
      return;
    }
  });

  dlg.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!draft) return;
    syncForm();
    if (!String(draft.name || '').trim()) { toast('Ponle nombre a la sala.'); return; }
    draft.price = String(draft.price || '').trim();
    if (draft.status === 'wish') { draft.date = ''; draft.escaped = null; draft.timeLeft = ''; }
    if (draft.escaped !== true) draft.timeLeft = '';
    draft.rating = num(draft.rating);
    Store.saveRoom(draft);
    ui.tab = draft.status === 'wish' ? 'wish' : 'done';
    saveUi();
    dlg.close();
    draft = null;
    render();
  });
  dlg.addEventListener('close', function () { draft = null; });

  /* Precio y nº de personas: se recalcula el reparto sin repintar el formulario
     (si no, se perdería el foco a media cifra). */
  dlg.addEventListener('input', function (ev) {
    if (!draft) return;
    var nm = ev.target.getAttribute && ev.target.getAttribute('name');
    if (nm !== 'price' && nm !== 'people') return;
    syncForm();
    var box = dlg.querySelector('.reparto');
    if (!box) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = reparto(draft);
    box.replaceWith(tmp.firstElementChild);
  });

  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'q') { ui.q = t.value; saveUi(); rerenderList(); return; }
    if (t.getAttribute && t.getAttribute('data-act') === 'pname') {
      var p = Store.player(t.getAttribute('data-id'));
      if (p) { p.name = t.value; Store.commit([p]); }
    }
  });
  document.addEventListener('change', function (ev) {
    if (ev.target.id === 'sort') { ui.sort = ev.target.value; saveUi(); render(); return; }
    if (ev.target.id === 'cityf') { ui.city = ev.target.value; saveUi(); render(); return; }
    if (ev.target.id === 'sortwish') { ui.sortWish = ev.target.value; saveUi(); render(); return; }
    if (ev.target.id === 'importfile') {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      var fr = new FileReader();
      fr.onload = function () {
        var obj;
        try { obj = JSON.parse(String(fr.result)); }
        catch (e) { toast('Ese fichero no es un JSON válido.'); return; }
        var res = Store.importJson(obj);
        render();
        toast('Importado: ' + res.rooms + ' salas y ' + res.players + ' colegas.');
      };
      fr.readAsText(file);
      ev.target.value = '';
    }
  });

  function rerenderList() {
    var box = document.querySelector('#app .grid') || document.querySelector('#app .empty');
    if (!box) { render(); return; }
    var list = ui.tab === 'wish' ? wish() : done();
    var shown = filtered(list);
    var ord = ordinals(), players = Store.players();
    var repl;
    if (shown.length) {
      repl = document.createElement('section');
      repl.className = 'grid';
      repl.innerHTML = shown.map(function (r) { return card(r, ord[r.id], players); }).join('');
    } else {
      var tmp = document.createElement('div');
      tmp.innerHTML = emptyState(list.length, ui.tab);
      repl = tmp.firstElementChild;
    }
    box.replaceWith(repl);
  }

  /* ---------- arranque ---------- */
  var lastPaint = '';
  Store.onChange(function () {
    // si la hoja trae cambios de otro, repintamos; si no, solo el indicador
    var sig = JSON.stringify(Store.state);
    if (sig !== lastPaint) { lastPaint = sig; render(); }
    else paintStatus();
  });
  lastPaint = JSON.stringify(Store.state);
  render();
  Store.start();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
