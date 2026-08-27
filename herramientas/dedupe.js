/* Cruza el catálogo con las salas que el grupo ya tiene apuntadas y deja fuera
   las repetidas. Uso: node dedupe.js catalogo.json ya-tengo.json salida.json [excluir.json] */
const fs = require('fs');

const cat = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const mio = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const OUT = process.argv[4];

const norm = s => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(el|la|los|las|un|una|de|del|y)\b/g, ' ')
  .replace(/\s+/g, ' ').trim();

const mios = mio.rooms.filter(r => !r.deleted);
const porNombre = new Map();
mios.forEach(r => porNombre.set(norm(r.name), r));

/* empresas que ya conocemos, para revisar a ojo lo que no cuadre por nombre */
const misEmpresas = new Set(mios.map(r => norm(r.company)).filter(Boolean));

/* Salas ya jugadas que se apuntaron con otro nombre y por nombre no se cazan.
   Van en un fichero aparte (4º argumento, fuera del repo) con la forma
   { "slug-de-la-sala": "por qué se excluye" }. */
const YA_JUGADAS = process.argv[5]
  ? JSON.parse(fs.readFileSync(process.argv[5], 'utf8'))
  : {};

const fuera = [], dentro = [], revisar = [];
cat.rooms.forEach(s => {
  const slug = s.id.replace(/^erl-/, '');
  if (YA_JUGADAS[slug]) {
    fuera.push({ cat: s.name, mio: YA_JUGADAS[slug], empresa: s.company, estado: 'done' });
    return;
  }
  const n = norm(s.name);
  const ya = porNombre.get(n);
  if (ya) { fuera.push({ cat: s.name, mio: ya.name, empresa: s.company, estado: ya.status }); return; }
  dentro.push(s);
  if (misEmpresas.has(norm(s.company))) revisar.push(s.company + ' → ' + s.name);
});

fs.writeFileSync(OUT, JSON.stringify({
  app: 'cuaderno-de-fugas', v: 1, origen: cat.origen + ' (sin las ya apuntadas)',
  players: [], rooms: dentro
}, null, 2) + '\n');

console.log('catálogo: ' + cat.rooms.length + ' salas');
console.log('ya las teníais (se dejan fuera): ' + fuera.length);
fuera.forEach(f => console.log('   - ' + f.cat + '  [' + f.empresa + ']  ↔  vuestra "' + f.mio + '" (' + (f.estado === 'wish' ? 'sin jugar' : 'jugada') + ')'));
console.log('entran como sin jugar: ' + dentro.length + ' → ' + OUT);
console.log('\nde empresas donde ya habéis jugado, por si alguna es la misma sala con otro nombre: ' + revisar.length);
revisar.slice(0, 40).forEach(r => console.log('   · ' + r));
