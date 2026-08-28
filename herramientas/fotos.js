/* Le pone a cada sala la foto que escaperoomlover tiene en su ficha, en el
   campo `photo`. La foto no está en el listado de la provincia: hay que entrar
   sala por sala, así que va a 1 s por ficha y guarda a medida que avanza —si se
   corta, se relanza y sigue donde iba.

   Uso: node fotos.js <cuaderno.json> [excluir.json] [--rehacer]

   La foto de una sala SOLO se saca de su propia ficha de escaperoomlover: la
   que dice su id (erl-<slug>) o su enlace. Nunca por parecido de nombre. Dos
   salas distintas se llaman igual muy a menudo —Atrincherados es de Elements y
   también de Conecta Escape— y buscar por parecido les pega la foto de la otra.
   Para las que no traen enlace está excluir.json, donde decís a mano qué ficha
   de la web es cuál vuestra; y la que no esté ahí se queda sin foto. */
const fs = require('fs');
const { bajar, espera } = require('./bajar');
const cotejo = require('../cotejo');

const args = process.argv.slice(2);
const REHACER = args.indexOf('--rehacer') !== -1;
const ficheros = args.filter(a => a.charAt(0) !== '-');
const FICH = ficheros[0];
const EXCL = ficheros[1];

if (!FICH) {
  console.error('Uso: node fotos.js <cuaderno.json> [excluir.json] [--rehacer]');
  process.exit(1);
}

const cuaderno = JSON.parse(fs.readFileSync(FICH, 'utf8'));
const salas = (cuaderno.rooms || []).filter(r => r && !r.deleted);

const ERL = 'https://www.escaperoomlover.com';
/* fotos que no son fotos: el marcador de "sin imagen" y la de compartir en redes */
const NO_VALE = /no-image|web-erl-share|logo_erl/;

/* Lo que ya está dicho a mano en excluir.json: cada línea es un slug de la web
   y el motivo, que trae entre comillas el nombre con el que la apuntasteis
   —"la apuntasteis como \"Cronologic 1\""—. De ahí sale el par sala ↔ slug. */
const AMANO = [];
if (EXCL) {
  const excl = JSON.parse(fs.readFileSync(EXCL, 'utf8'));
  Object.keys(excl).forEach(slug => {
    const entre = String(excl[slug]).match(/"([^"]+)"/);
    if (entre) AMANO.push({ slug: slug, nombre: entre[1] });
  });
}

function slugDe(sala) {
  const porId = String(sala.id || '').match(/^erl-(.+)$/);
  if (porId) return { slug: porId[1], via: 'enlace' };
  const porWeb = String(sala.web || '').match(/escaperoomlover\.com\/[a-z]{2}\/juego\/([^?#/]+)/);
  if (porWeb) return { slug: porWeb[1], via: 'enlace' };
  const dicho = AMANO.filter(a => cotejo.clave(a.nombre) === cotejo.clave(sala.name))[0];
  if (dicho) return { slug: dicho.slug, via: 'lo dice excluir.json' };
  return null;
}

/** La foto de la ficha: primero la del bloque de datos (schema.org), y si no,
 *  la del cabecero. Las dos apuntan al mismo fichero cuando hay foto. */
function fotoDe(html) {
  const ld = html.match(/"image"\s*:\s*"([^"]+)"/);
  if (ld && !NO_VALE.test(ld[1])) return absoluta(ld[1]);
  const cabecero = html.match(/class="game-detail"[\s\S]{0,600}?class="image"[\s\S]{0,300}?<img[^>]*src=["']([^"']+)["']/);
  if (cabecero && !NO_VALE.test(cabecero[1])) return absoluta(cabecero[1]);
  return '';
}
const absoluta = u => /^https?:\/\//.test(u) ? u : ERL + (u.charAt(0) === '/' ? '' : '/') + u;

function guardar() {
  fs.writeFileSync(FICH, JSON.stringify(cuaderno, null, 2) + '\n');
}

(async () => {
  const pendientes = salas.filter(r => REHACER || typeof r.photo !== 'string');
  const sinIdentificar = [], rotas = [], cazadas = [];
  let puestas = 0, vacias = 0, hechas = 0;

  console.log(salas.length + ' salas; ' + pendientes.length + ' por mirar' +
    '');

  for (const sala of pendientes) {
    const quien = slugDe(sala);
    if (!quien) {
      sinIdentificar.push(sala.name + (sala.company ? '  [' + sala.company + ']' : ''));
      sala.photo = '';
      continue;
    }
    const url = ERL + '/es/juego/' + quien.slug;
    let html;
    try {
      html = await bajar(url);
    } catch (e) {
      console.log('   ⚠ ' + sala.name + ': ' + e.message + ' (se reintenta)');
      await espera(4000);
      try { html = await bajar(url); }
      catch (e2) {
        /* Hay fichas que escaperoomlover no sirve (error 500 suyo). Se dan por
           vistas para no pedirlas en cada pasada; con --rehacer se reintentan. */
        rotas.push(sala.name + (sala.company ? '  [' + sala.company + ']' : '') + ' — ' + e2.message);
        sala.photo = '';
        await espera(1000);
        continue;
      }
    }
    const foto = fotoDe(html);
    sala.photo = foto;
    if (foto) puestas++; else vacias++;
    /* las que no traían su propio enlace, para poder comprobar el emparejado */
    if (quien.via !== 'enlace') cazadas.push(sala.name + '  →  ' + quien.via + (foto ? '' : ' [sin foto]'));
    hechas++;
    if (hechas % 10 === 0) { guardar(); console.log('   … ' + hechas + '/' + pendientes.length + ' (' + puestas + ' con foto)'); }
    await espera(1000);
  }

  guardar();

  console.log('\nfotos nuevas: ' + puestas);
  console.log('sin foto en escaperoomlover: ' + vacias);
  if (rotas.length) {
    console.log('fichas que escaperoomlover no sirve (' + rotas.length + '): se quedan sin foto');
    rotas.forEach(r => console.log('   · ' + r));
  }
  if (cazadas.length) {
    console.log('\nemparejadas sin su enlace (' + cazadas.length + '), por si alguna no es la que parece:');
    cazadas.forEach(c => console.log('   · ' + c));
  }
  console.log('\ncon foto en total: ' + salas.filter(r => r.photo).length + ' de ' + salas.length + ' → ' + FICH);
  if (sinIdentificar.length) {
    console.log('\nno se han encontrado en escaperoomlover (' + sinIdentificar.length + ')' +
      '; si sabéis cuál es su ficha, apuntadla en excluir.json');
    sinIdentificar.slice(0, 40).forEach(s => console.log('   · ' + s));
  }
})().catch(e => { guardar(); console.error('ERROR: ' + e.stack); process.exitCode = 1; });
