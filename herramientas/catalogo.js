/* Baja el catálogo de escaperoomlover.com (provincia de Barcelona) y lo deja en
   el formato del Cuaderno de Fugas, todas las salas como "sin jugar".

   Uso: node catalogo.js <provincia> <fichero-salida.json> [páginas-max]
   Va despacio a propósito (1 s entre páginas): es una web ajena. */
const fs = require('fs');
const { bajar, espera } = require('./bajar');

const PROV = process.argv[2] || 'barcelona';
const OUT = process.argv[3];
const MAXP = +(process.argv[4] || 30);
const BASE = Date.parse('2026-08-27T09:00:00Z');

/* ---------- utilidades de texto ---------- */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', uuml: 'ü', ordm: 'º', deg: '°', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', laquo: '«', raquo: '»' };
function limpio(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
    .replace(/&([a-zA-Z#0-9]+);/g, (m, e) => ENT[e] !== undefined ? ENT[e] : ' ')
    .replace(/﻿/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function titulo(s) {
  s = limpio(s);
  if (!s) return s;
  // "EL SÓTANO DEL RELOJERO" → "El sótano del relojero"; deja intactos los mixtos
  if (s === s.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(s)) {
    s = s.toLowerCase().replace(/(^|[.:!?¡¿]\s*)([a-záéíóúñ])/g, (m, p, c) => p + c.toUpperCase());
  }
  return s;
}

/* ---------- troceado de la página ---------- */
/* Cada empresa es un <li data-id="…"> con sus salas dentro. No se puede cortar
   por </li>: dentro hay listas anidadas (líneas de metro, ofertas) y el bloque
   se cerraría antes de tiempo, desparejando empresa y salas. */
function bloques(html) {
  return html.split('<li data-id="').slice(1);
}
function trozo(bloque, re) {
  const m = bloque.match(re);
  return m ? m[1] : '';
}
function parseBloque(bloque) {
  const anchor = trozo(bloque, /class='text-bold company-name[^>]*>([\s\S]*?)<\/a>/);
  const empresa = titulo(trozo(anchor, /<u[^>]*>([\s\S]*?)<\/u>/) || anchor);
  const estrellas = parseFloat(trozo(bloque, /class="company-stars">([\d.,]+)/).replace(',', '.')) || 0;
  const segundo = trozo(bloque, /class="second-level">([\s\S]*?)(?:<div class='show-small'|<div class="table-container")/) ||
                  trozo(bloque, /class="second-level">([\s\S]*?)<\/div>/);
  const ciudad = limpio(segundo).split('|')[0].replace(/bono\s+regalo.*/i, '').trim();

  const salas = [];
  const filas = bloque.split(/<div class="table-row">/).slice(1);
  filas.forEach(fila => {
    const slug = trozo(fila, /data-href="\/es\/juego\/([^"]+)"/);
    if (!slug) return;
    const nombre = titulo(trozo(fila, /class="game-name table-cell">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/));
    if (!nombre) return;
    salas.push({
      slug: slug,
      name: nombre,
      company: empresa,
      city: ciudad,
      stars: estrellas,
      players: limpio(trozo(fila, /class="game-players table-cell">([\s\S]*?)<\/div>/)),
      price: limpio(trozo(fila, /class="game-price table-cell">([\s\S]*?)(?:<img|<\/div>)/)),
      theme: limpio(trozo(fila, /class="theme-label'>([\s\S]*?)<\/span>/))
    });
  });
  return salas;
}

/* La empresa a veces repite la ciudad al final: "Aventurico Tetuan Barcelona". */
function empresaLimpia(nombre, ciudad) {
  if (!nombre || !ciudad) return nombre;
  const esc = ciudad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const corto = nombre.replace(new RegExp('\\s+' + esc + '\\s*$', 'i'), '').trim();
  return corto.length >= 3 ? corto : nombre;
}

/* ---------- ficha para el cuaderno ---------- */
function aSala(s, i) {
  const info = [];
  if (s.players) info.push(s.players.replace(/\s+/g, '') + ' jugadores');
  if (s.price) info.push(s.price.replace(/\s+/g, ' '));
  if (s.theme) info.push(s.theme);
  if (s.stars) info.push('⭐ ' + String(s.stars).replace('.', ','));
  return {
    id: 'erl-' + s.slug.slice(0, 60),
    name: s.name,
    company: empresaLimpia(s.company, s.city),
    city: s.city,
    web: 'https://www.escaperoomlover.com/es/juego/' + s.slug,
    price: '',                       // el precio real se apunta el día que se juega
    priceMode: 'total',
    people: '',
    status: 'wish',
    date: '',
    who: [],
    escaped: null,
    timeLeft: '',
    rating: 0,
    notes: info.join(' · '),
    updatedAt: BASE + i
  };
}

(async () => {
  const vistas = new Map();
  for (let p = 1; p <= MAXP; p++) {
    let html;
    try {
      html = await bajar('https://www.escaperoomlover.com/es/provincia/' + PROV + (p > 1 ? '?page=' + p : ''));
    } catch (e) {
      console.log('página ' + p + ': ' + e.message + ' (se reintenta una vez)');
      await espera(4000);
      try { html = await bajar('https://www.escaperoomlover.com/es/provincia/' + PROV + '?page=' + p); }
      catch (e2) { console.log('página ' + p + ': falla otra vez, se salta'); continue; }
    }
    let nuevas = 0, total = 0;
    bloques(html).forEach(b => parseBloque(b).forEach(s => {
      total++;
      if (!vistas.has(s.slug)) { vistas.set(s.slug, s); nuevas++; }
    }));
    console.log('página ' + String(p).padStart(2) + ': ' + String(total).padStart(3) + ' salas leídas, ' + String(nuevas).padStart(3) + ' nuevas (acumulado ' + vistas.size + ')');
    if (total === 0) break;
    await espera(1000);
  }

  const salas = [...vistas.values()]
    .sort((a, b) => (a.city || 'zzz').localeCompare(b.city || 'zzz', 'es') || a.company.localeCompare(b.company, 'es') || a.name.localeCompare(b.name, 'es'))
    .map(aSala);

  fs.writeFileSync(OUT, JSON.stringify({
    app: 'cuaderno-de-fugas', v: 1,
    origen: 'escaperoomlover.com · provincia de ' + PROV,
    players: [], rooms: salas
  }, null, 2) + '\n');

  /* ---------- resumen ---------- */
  console.log('\nTOTAL: ' + salas.length + ' salas → ' + OUT);
  const porCiudad = {};
  salas.forEach(s => { porCiudad[s.city || '(sin ciudad)'] = (porCiudad[s.city || '(sin ciudad)'] || 0) + 1; });
  const orden = Object.keys(porCiudad).sort((a, b) => porCiudad[b] - porCiudad[a]);
  console.log('ciudades: ' + orden.length);
  orden.slice(0, 12).forEach(c => console.log('  ' + String(porCiudad[c]).padStart(3) + '  ' + c));
  console.log('empresas: ' + new Set(salas.map(s => s.company)).size);

  /* Validación: el slug de la sala empieza por el slug de su empresa. Si no
     cuadra, es que el troceado ha desparejado empresa y salas. */
  const slugifica = s => String(s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const descuadres = salas.filter(s => {
    const slug = s.id.replace(/^erl-/, '');
    const emp = slugifica(s.company);
    return emp && slug.indexOf(emp.split('-')[0]) !== 0;
  });
  console.log('salas con enlace de marca antigua (informativo, no es fallo): ' + descuadres.length);
  const malas = salas.filter(s => !s.name || !s.company || !s.city || !/^erl-[a-z0-9-]+$/.test(s.id));
  console.log('fichas incompletas: ' + malas.length + (malas.length ? ' ⚠ ' + JSON.stringify(malas.slice(0, 3)) : ' ✓'));
  console.log('sin ciudad: ' + salas.filter(s => !s.city).length + ' | sin empresa: ' + salas.filter(s => !s.company).length + ' | sin notas: ' + salas.filter(s => !s.notes).length);
  console.log('\nmuestra:');
  salas.slice(0, 3).forEach(s => console.log('  ' + JSON.stringify({ name: s.name, company: s.company, city: s.city, notes: s.notes, web: s.web })));
})().catch(e => { console.error('ERROR: ' + e.stack); process.exitCode = 1; });
