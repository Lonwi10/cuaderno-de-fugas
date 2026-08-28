/* Baja los resultados de TERPECA (terpeca.com) —el ranking mundial de escape
   rooms que votan los jugadores veteranos— y los deja en un JSON manejable.

   Uso: node terpeca.js <años> <salida.json>
        node terpeca.js todos terpeca.json
        node terpeca.js 2025 terpeca-2025.json
        node terpeca.js 2023-2025 terpeca.json

   Esto solo BAJA Y TROCEA. Quién decide qué sala de TERPECA es cuál del
   cuaderno es cruzar-terpeca.js, igual que catalogo.js baja y dedupe.js decide.

   De cada edición salen tres cosas, y las tres hacen falta:
     · fase 1: todas las nominadas, con cuántos las nominaron (~1.200 en 2025)
     · fase 2: las finalistas, con su PUESTO (378 en 2025)
     · las premiadas (top 100): además, enlace de la empresa, foto, jugadores,
       duración, nivel de terror e idiomas
   Cada sala sale una vez por edición, con lo que se sepa de ella en las tres.

   Las páginas son gordas (la del año en curso, 14 MB) y hay una por edición,
   así que va a 1,5 s entre páginas: es una web ajena y esto se hace una vez al
   año, cuando salen los resultados nuevos. */
const fs = require('fs');
const { bajar, espera } = require('./bajar');
const cotejo = require('../cotejo');

const SITIO = 'https://www.terpeca.com';

const args = process.argv.slice(2).filter(a => a.charAt(0) !== '-');
const PEDIDO = args[0];
const OUT = args[1];

if (!PEDIDO || !OUT) {
  console.error('Uso: node terpeca.js <años|todos> <salida.json>');
  console.error('     node terpeca.js todos terpeca.json');
  process.exit(1);
}

/* ---------- texto ---------- */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…',
  mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ',
  agrave: 'à', egrave: 'è', ccedil: 'ç', ouml: 'ö', auml: 'ä', szlig: 'ß', deg: '°', ordm: 'º' };

/* Quita etiquetas y descodifica entidades, pero CONSERVA los emojis: son datos
   (🆕 estreno, ☀️👻🔦😱 nivel de terror, banderas de idiomas). */
function texto(html) {
  return String(html == null ? '' : html)
    .replace(/<sup>[\s\S]*?<\/sup>/g, '')                 // llamadas a notas al pie
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n))
    .replace(/&([a-zA-Z]+);/g, (m, e) => ENT[e] !== undefined ? ENT[e] : ' ')
    .replace(/﻿/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const TERROR = { '☀️': '☀️ sin terror', '👻': '👻 inquietante', '🔦': '🔦 miedo pasivo', '😱': '😱 terror activo' };
const EMOJIS_TERROR = Object.keys(TERROR).join('');

/* ---------- una línea de sala ---------- */
/* "🆕 Nombre [Otro nombre] - Empresa (Ciudad, País) (7) ☀️🇬🇧🇪🇸"

   Se lee de derecha a izquierda, que es lo único que aguanta los datos reales:
   el nombre de la empresa lleva paréntesis suyos muy a menudo —"Final Code
   (Plastic Robot)", "Terror Stories (Experiencity) (formerly Codexcape)"— así
   que buscar "el paréntesis" por la izquierda desparejaría empresa y ciudad.
   Primero la cola de emojis (todo lo que va tras el último paréntesis), luego
   las nominaciones si las hay, luego la localidad, y lo que queda se parte en
   el ÚLTIMO " - ": los nombres de sala llevan guiones sueltos, los de empresa
   casi nunca. */
function pela(s) {
  const m = s.match(/\(([^()]*)\)\s*$/);
  return m ? [s.slice(0, m.index).trim(), m[1].trim()] : [s, null];
}

function parseSala(linea) {
  let s = texto(linea);
  if (!s) return null;

  let nuevo = false;
  s = s.replace(/^🆕\s*/u, function () { nuevo = true; return ''; }).trim();

  /* la cola: lo que va después del último paréntesis (emojis de terror e
     idiomas). Si no hay paréntesis, la línea no tiene forma de sala. */
  const fin = s.lastIndexOf(')');
  if (fin === -1) return null;
  let cola = s.slice(fin + 1).trim();
  s = s.slice(0, fin + 1);
  /* el 🆕 de estreno va delante en la tabla de fase 2 y detrás en la lista de
     fase 1; si no se quita de la cola, se cuela entre las banderas de idiomas */
  if (cola.indexOf('🆕') !== -1) { nuevo = true; cola = cola.replace(/🆕/gu, '').trim(); }

  let noms = null, automatica = false;
  let [resto, ultimo] = pela(s);
  let sitio;
  if (ultimo !== null && /^(\d+|automatic)$/i.test(ultimo)) {
    if (/^\d+$/.test(ultimo)) noms = +ultimo; else automatica = true;
    [resto, sitio] = pela(resto);
  } else {
    sitio = ultimo;
  }
  if (sitio == null) return null;

  const corte = resto.lastIndexOf(' - ');
  let nombre = corte === -1 ? resto.trim() : resto.slice(0, corte).trim();
  const empresa = corte === -1 ? '' : resto.slice(corte + 3).trim();

  /* el otro nombre va entre corchetes al final: TERPECA pone la traducción al
     inglés y el original entre corchetes, y en la sección de premiadas lo pone
     al revés. Se guardan los dos y ya decidirá cruzar-terpeca.js cuál luce. */
  let alt = '';
  const cor = nombre.match(/\[([^\]]+)\]$/);
  if (cor) {
    alt = cor[1].trim();
    nombre = nombre.slice(0, cor.index).trim();
  }

  const trozos = sitio.split(',').map(t => t.trim()).filter(Boolean);
  const pais = trozos.pop() || '';
  const region = trozos.length > 1 ? trozos.pop() : '';       // "QC" de "Laval, QC, Canada"
  const ciudades = trozos.join(', ').split('/').map(t => t.trim()).filter(Boolean);

  const terror = Object.keys(TERROR).filter(e => cola.indexOf(e) !== -1)[0] || '';
  const idiomas = cola.replace(new RegExp('[' + EMOJIS_TERROR + '️]', 'gu'), '').trim();

  return {
    name: nombre, alt: alt, company: empresa,
    city: ciudades[0] || '', cities: ciudades, region: region, country: pais,
    noms: noms, automatica: automatica, nuevo: nuevo,
    terror: terror ? TERROR[terror] : '', idiomas: idiomas
  };
}

/* Identidad de una sala dentro de una edición: sus dos nombres (en el orden que
   sea, que TERPECA los da vuelto en la sección de premiadas), la empresa y la
   ciudad. La ciudad hace falta: las cadenas repiten el mismo nombre de sala en
   varios locales ("The Hotel" de Riddle Room está en Canberra y en Sídney) y
   son salas distintas.

   Ojo: aquí NO vale cotejo.clave, que se come los paréntesis a propósito —para
   la app "(2 salas)" o "[prox]" son ruido—. Aquí el paréntesis es el dato: sin
   él, "Monster Mashers (Light Mode)" y "(Dark Mode)" serían la misma sala, y
   son dos, cada una con su premio. */
const slug = s => String(s == null ? '' : s).toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function llave(e) {
  return [slug(e.name), slug(e.alt)].filter(Boolean).sort().join('|') +
    '@' + slug(e.company) + '@' + slug(e.cities.join(' '));
}

/* ---------- una edición ---------- */
function entre(html, a, b) {
  const i = html.indexOf(a), j = html.indexOf(b);
  return i === -1 || j === -1 || j < i ? '' : html.slice(i + a.length, j);
}

function fase1(html) {
  const bloque = entre(html, 'START PHASE 1 ROOM RESULTS -->', '<!-- END PHASE 1 ROOM RESULTS');
  return bloque.split(/<br\s*\/?>/i).map(linea => {
    const e = parseSala(linea);
    if (!e) return null;
    e.finalista = /<strong>/i.test(linea);        // las que pasaron a fase 2 van en negrita
    return e;
  }).filter(Boolean);
}

/* Las celdas se buscan por su `data-title`, no por el orden ni por el <strong>:
   en la tabla de fase 2 las cien primeras filas van en negrita (son las
   premiadas) y el resto no, y las columnas han cambiado de un año a otro. */
function celda(fila, titulo) {
  const m = fila.match(new RegExp('data-title=[\'"]' + titulo + '[\'"][^>]*>([\\s\\S]*?)<\\/div>', 'i'));
  return m ? texto(m[1]) : '';
}

function fase2(html, ilegibles) {
  const bloque = entre(html, 'START PHASE 2 ROOM RESULTS -->', '<!-- END PHASE 2 ROOM RESULTS');
  /* la fila de cabecera es "tablerow header", así que no entra */
  return bloque.split(/<div class=['"]tablerow['"]>/).slice(1).map(fila => {
    const cruda = celda(fila, 'Rank');
    const puesto = +cruda.replace(/\D+/g, '');       // hay años con "T12" en los empates
    const sala = celda(fila, 'Room');
    const e = parseSala(sala);
    if (!e) {
      /* una fila que no se sabe leer es un puesto que se pierde: se canta */
      if (ilegibles) ilegibles.push('puesto [' + cruda + '] sala [' + sala + ']');
      return null;
    }
    /* "NR" (no ranked) no es un fallo: es la segunda versión de una sala ya
       puntuada —Monster Mashers en modo claro y oscuro, los dos Gricers— a la
       que TERPECA reconoce el premio pero no le da puesto propio. */
    e.rank = puesto || null;
    e.finalista = true;
    if (!puesto && !/^NR/i.test(cruda) && ilegibles) {
      ilegibles.push('puesto [' + cruda + '] sala [' + sala + ']');
    }
    return e;
  }).filter(Boolean);
}

/* Las premiadas (el top 100): además del puesto traen enlace de la empresa,
   foto, jugadores, duración, terror e idiomas. Son 104 bloques y no 100: cuatro
   son segundas versiones de salas ya premiadas y su titular dice "NR" en vez de
   un número. */
function premiadas(html) {
  return html.split('<!-- ROOM START -->').slice(1).map(bloque => {
    bloque = bloque.split('<!-- ROOM END -->')[0];
    const titular = texto((bloque.match(/aria-controls="collapseR(?:NR)?\d+">([\s\S]*?)<\/a>/) || [])[1] || '');
    const m = titular.match(/^(\d+|NR)\s*-\s*([\s\S]+)$/i);
    if (!m) return null;
    const e = parseSala(m[2]);
    if (!e) return null;
    e.rank = /^\d+$/.test(m[1]) ? +m[1] : null;
    e.finalista = true;
    e.premiada = true;

    const web = (bloque.match(/<strong>Company:<\/strong>\s*<a href="([^"]+)"/) || [])[1] || '';
    const foto = (bloque.match(/<img src="(\/images\/rooms\/[^"]+)"/) || [])[1] || '';
    e.web = web;
    e.photo = foto ? SITIO + foto : '';

    /* los datos del panel: "2-9 Players", "360 Minutes…", el terror y las banderas */
    const datos = [...bloque.matchAll(/<strong>([\s\S]*?)<\/strong>/g)].map(x => texto(x[1]));
    datos.forEach(d => {
      if (/Players$/i.test(d)) e.players = d.replace(/\s*Players$/i, '').trim();
      else if (/Minutes/i.test(d) && !e.minutes) e.minutes = d.replace(/\s+/g, ' ').trim();
      else if (/(No horror|scary|Spooky)/i.test(d)) {
        const em = Object.keys(TERROR).filter(k => d.indexOf(k) !== -1)[0];
        if (em) e.terror = TERROR[em];
      }
    });
    return e;
  }).filter(Boolean);
}

/** Junta las tres secciones de una edición en una entrada por sala.
 *
 *  La tabla de fase 2 manda: es la lista de finalistas y la que trae el puesto.
 *  Encima se pega lo que dice fase 1 (nominaciones) y lo que dicen las
 *  premiadas (enlace, foto, jugadores…). El problema es que la misma sala está
 *  escrita de tres maneras distintas en la misma página:
 *
 *    fase 2      "Londium - Saga Escape Rooms (formerly Londium Escape Room)"
 *    premiadas   "Londium - Saga Escape Rooms"
 *    fase 1      "The Movies Experience (full 90+ minute version, available…)"
 *
 *  Así que primero se prueba la identidad literal y, para lo que quede, se
 *  pregunta a cotejo.js —el mismo que decide si dos salas del cuaderno son la
 *  misma— exigiendo que la empresa respalde. Y entre varias candidatas se coge
 *  la que más se parezca con el nombre ENTERO, paréntesis incluidos: es lo único
 *  que distingue "Gricers (100 minutos)" de "Gricers (200 minutos)", que son dos
 *  salas y están las dos en la tabla. */
function edicion(year, html) {
  const por = new Map();
  const mete = (e, campos) => {
    const ya = por.get(llave(e));
    if (!ya) return null;
    campos.forEach(c => {
      const v = ya[c];
      if (v == null || v === '' || v === false) ya[c] = e[c];
    });
    return ya;
  };
  const nueva = e => { const c = Object.assign({ year: year }, e); por.set(llave(e), c); return c; };

  const ilegibles = [];
  const f2 = fase2(html, ilegibles), f1 = fase1(html), top = premiadas(html);
  f2.forEach(e => { if (!mete(e, ['rank', 'nuevo', 'terror', 'idiomas'])) nueva(e); });

  /* Las fichas de cotejo de una entrada: una por cada nombre que tenga. Hacen
     falta las dos porque TERPECA da el nombre traducido y el original, y en la
     sección de premiadas los da al revés: la fila de fase 2 dice "Petra - The
     Lost Kingdom (Full Expedition)" y la premiada "Petra - El reino perdido".
     Comparando solo el primero, la misma sala sale dos veces. */
  const fichasDe = e => [e.name, e.alt].filter(Boolean)
    .map(n => cotejo.ficha({ name: n, company: e.company }));

  /* las finalistas, ya con sus fichas, para lo que no cuadre literal */
  const finalistas = [...por.values()].map(e => ({ e: e, fs: fichasDe(e) }));

  /** La finalista que es esta misma sala escrita de otra forma. `hueco` es el
   *  dato que viene a rellenar: si la candidata ya lo tiene, no es esa. */
  function laMisma(e, hueco) {
    const mios = fichasDe(e);
    const nombres = [e.name, e.alt].filter(Boolean).map(slug);
    let elegida = null, punt = -1;
    finalistas.forEach(c => {
      if (hueco && c.e[hueco] != null && c.e[hueco] !== '') return;
      if (!mios.some(f => c.fs.some(g => cotejo.compara(f, g).seguro))) return;
      /* entre varias candidatas, la que más se parezca con el nombre ENTERO */
      const suyos = [c.e.name, c.e.alt].filter(Boolean).map(slug);
      const p = nombres.reduce((max, a) => suyos.reduce((m, b) => Math.max(m, cotejo.parejo(a, b)), max), 0);
      if (p > punt) { punt = p; elegida = c.e; }
    });
    return elegida;
  }

  const pegadas = [], sueltas = [];
  f1.forEach(e => {
    if (mete(e, ['noms', 'automatica', 'nuevo', 'terror', 'idiomas'])) return;
    if (!e.finalista || !f2.length) { nueva(e); return; }        // nominada y nada más
    const otra = laMisma(e, 'noms');
    if (!otra) { nueva(e); pegadas.push('⚠ sin cruzar: ' + e.name + ' — ' + e.company); return; }
    if (otra.noms == null) otra.noms = e.noms;
    if (e.automatica) otra.automatica = true;
    if (!otra.terror) otra.terror = e.terror;
    if (!otra.idiomas) otra.idiomas = e.idiomas;
    pegadas.push(e.name + '  →  #' + (otra.rank || 'NR') + ' ' + otra.name);
  });

  const DE_PREMIADA = ['web', 'photo', 'players', 'minutes', 'terror', 'idiomas', 'alt', 'premiada'];
  top.forEach(e => {
    if (mete(e, DE_PREMIADA)) return;
    const otra = laMisma(e, 'web');
    if (!otra) { nueva(e); sueltas.push('⚠ sin cruzar: #' + (e.rank || 'NR') + ' ' + e.name + ' — ' + e.company); return; }
    DE_PREMIADA.forEach(c => {
      const v = otra[c];
      if (v == null || v === '' || v === false) otra[c] = e[c];
    });
    sueltas.push('#' + (e.rank || 'NR') + ' ' + e.name + ' — ' + e.company + '  →  ' + otra.company);
  });

  return { entradas: [...por.values()], f1: f1.length, f2: f2.length, top: top.length,
    pegadas: pegadas, ilegibles: ilegibles, sueltas: sueltas };
}

/* ---------- años ---------- */
function añosPedidos(disponibles) {
  const p = String(PEDIDO).trim().toLowerCase();
  if (p === 'todos' || p === 'todas') return disponibles.slice();
  const rango = p.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (rango) {
    const a = Math.min(+rango[1], +rango[2]), b = Math.max(+rango[1], +rango[2]);
    return disponibles.filter(y => y >= a && y <= b);
  }
  const sueltos = p.split(/[,\s]+/).map(Number).filter(y => y > 2000);
  return disponibles.filter(y => sueltos.indexOf(y) !== -1);
}

(async () => {
  /* La edición en curso vive en la portada; las anteriores en /AAAA/. Los años
     que hay se leen de la propia portada, así que el año que viene esto sigue
     funcionando sin tocar nada. */
  console.log('portada de terpeca.com…');
  const portada = await bajar(SITIO + '/');
  const enCurso = +((portada.match(/<title>[^<]*?(\d{4})[^<]*<\/title>/) || [])[1] || new Date().getFullYear());
  const viejos = [...new Set([...portada.matchAll(/href=["']\/(\d{4})\/["']/g)].map(m => +m[1]))];
  const disponibles = [...new Set([enCurso].concat(viejos))].sort((a, b) => b - a);
  console.log('ediciones publicadas: ' + disponibles.join(', '));

  const quiero = añosPedidos(disponibles);
  if (!quiero.length) {
    console.error('No hay nada que bajar: pide "todos", un año (2025) o un rango (2023-2025).');
    process.exit(1);
  }

  const entradas = [];
  const resumen = [];
  for (const year of quiero) {
    let html;
    if (year === enCurso) html = portada;
    else {
      await espera(1500);
      console.log('bajando ' + year + '…');
      try { html = await bajar(SITIO + '/' + year + '/'); }
      catch (e) {
        console.log('   ⚠ ' + year + ': ' + e.message + ' (se reintenta)');
        await espera(4000);
        try { html = await bajar(SITIO + '/' + year + '/'); }
        catch (e2) { console.log('   ⚠ ' + year + ': falla otra vez, se salta'); continue; }
      }
    }
    const ed = edicion(year, html);
    entradas.push(...ed.entradas);
    resumen.push({ year: year, salas: ed.entradas.length, nominadas: ed.f1, finalistas: ed.f2, premiadas: ed.top });
    console.log('   ' + year + ': ' + ed.entradas.length + ' salas (' + ed.f1 + ' nominadas, ' +
      ed.f2 + ' con puesto, ' + ed.top + ' premiadas)');
    /* Lo normal —que la misma sala esté escrita de tres formas y haya que
       cruzarla por parecido— solo se cuenta. Se cantan una a una las que NO se
       han podido cruzar, que son las que dejan una sala partida en dos. */
    const cruces = ed.pegadas.length + ed.sueltas.length;
    const rotas = ed.pegadas.concat(ed.sueltas).filter(p => p.charAt(0) === '⚠');
    if (cruces) console.log('      · cruzadas por parecido (nombre o empresa distintos entre secciones): ' + (cruces - rotas.length));
    rotas.forEach(p => console.log('      ' + p));
    ed.ilegibles.forEach(p => console.log('      ⚠ fila de fase 2 que no se sabe leer: ' + p));
  }

  entradas.sort((a, b) => b.year - a.year || (a.rank || 9999) - (b.rank || 9999) ||
    (b.noms || 0) - (a.noms || 0) || a.name.localeCompare(b.name, 'es'));

  fs.writeFileSync(OUT, JSON.stringify({
    app: 'cuaderno-de-fugas', v: 1,
    origen: 'terpeca.com · ediciones ' + quiero.slice().sort().join(', '),
    bajado: new Date().toISOString(),
    ediciones: resumen,
    entradas: entradas
  }, null, 2) + '\n');

  /* ---------- repaso ---------- */
  console.log('\nTOTAL: ' + entradas.length + ' entradas → ' + OUT);
  const paises = {};
  entradas.forEach(e => { paises[e.country || '(sin país)'] = (paises[e.country || '(sin país)'] || 0) + 1; });
  const orden = Object.keys(paises).sort((a, b) => paises[b] - paises[a]);
  console.log('países: ' + orden.length + ' · ' + orden.slice(0, 8).map(p => p + ' ' + paises[p]).join(' · '));

  const malas = entradas.filter(e => !e.name || !e.company || !e.country);
  console.log('entradas incompletas: ' + malas.length + (malas.length ? ' ⚠' : ' ✓'));
  malas.slice(0, 5).forEach(e => console.log('   ⚠ ' + JSON.stringify(e).slice(0, 160)));
  /* un nombre de empresa larguísimo delata un corte mal hecho en el " - " */
  const raras = entradas.filter(e => e.company.length > 70);
  if (raras.length) {
    console.log('cortes dudosos entre nombre y empresa: ' + raras.length);
    raras.slice(0, 5).forEach(e => console.log('   ? ' + e.name + '  ||  ' + e.company));
  }
  const ult = quiero[0];
  console.log('\nmuestra de ' + ult + ':');
  entradas.filter(e => e.year === ult).slice(0, 5).forEach(e => console.log('  ' +
    (e.rank ? '#' + String(e.rank).padStart(3) : '  nom') + '  ' + e.name +
    (e.alt ? ' [' + e.alt + ']' : '') + ' — ' + e.company + ' (' + e.city + ', ' + e.country + ')' +
    (e.noms ? ' · ' + e.noms + ' nom.' : '') + (e.photo ? ' · con foto' : '')));
})().catch(e => { console.error('ERROR: ' + e.stack); process.exitCode = 1; });
