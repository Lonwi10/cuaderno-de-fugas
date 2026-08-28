/* Cruza el catálogo con las salas que el grupo ya tiene apuntadas y deja fuera
   las repetidas. Uso: node dedupe.js catalogo.json ya-tengo.json salida.json [excluir.json]

   Quién decide si dos nombres son la misma sala: cotejo.js. */
const fs = require('fs');
const cotejo = require('../cotejo');

const cat = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const mio = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const OUT = process.argv[4];

const mios = cotejo.fichas(mio.rooms.filter(r => !r.deleted));

/* Salas ya jugadas que se apuntaron con otro nombre y que ni por nombre ni por
   parecido se cazan. Van en un fichero aparte (5º argumento, fuera del repo)
   con la forma { "slug-de-la-sala": "por qué se excluye" }. */
const YA_JUGADAS = process.argv[5]
  ? JSON.parse(fs.readFileSync(process.argv[5], 'utf8'))
  : {};

const fuera = [], dentro = [], dudas = [], revisar = [];

cat.rooms.forEach(s => {
  const slug = s.id.replace(/^erl-/, '');
  if (YA_JUGADAS[slug]) {
    fuera.push({ cat: s.name, mio: YA_JUGADAS[slug], empresa: s.company, motivo: 'a mano' });
    return;
  }

  const m = cotejo.mejor(s, mios);
  if (m && m.seguro) {
    fuera.push({
      cat: s.name, mio: m.ficha.sala.name, empresa: s.company,
      estado: m.ficha.sala.status, motivo: m.motivo
    });
    return;
  }

  dentro.push(s);

  /* Ni una cosa ni la otra: entra como sin jugar, pero se avisa. Si alguna es
     la misma sala, su línea se copia tal cual a excluir.json. */
  if (m && m.dudoso) {
    dudas.push({ slug: slug, cat: s.name, empresa: s.company, mio: m.ficha.sala.name, punt: m.punt });
  } else if (mios.some(f => cotejo.mismaCasa(cotejo.casa(s.company), f.casa))) {
    revisar.push(s.company + ' → ' + s.name);
  }
});

const origen = /\(sin las ya apuntadas\)$/.test(cat.origen || '')
  ? cat.origen : (cat.origen || '') + ' (sin las ya apuntadas)';

fs.writeFileSync(OUT, JSON.stringify({
  app: 'cuaderno-de-fugas', v: 1, origen: origen,
  players: [], rooms: dentro
}, null, 2) + '\n');

console.log('catálogo: ' + cat.rooms.length + ' salas');
console.log('ya las teníais (se dejan fuera): ' + fuera.length);
fuera.forEach(f => console.log(f.motivo === 'a mano'
  ? '   - ' + f.cat + '  [' + f.empresa + ']  ↔  ' + f.mio + '  (excluida a mano)'
  : '   - ' + f.cat + '  [' + f.empresa + ']  ↔  vuestra "' + f.mio + '" (' +
    (f.estado === 'wish' ? 'sin jugar' : 'jugada') + ', ' + f.motivo + ')'));
console.log('entran como sin jugar: ' + dentro.length + ' → ' + OUT);

if (dudas.length) {
  console.log('\npueden ser las mismas con otro nombre (' + dudas.length + '): si alguna lo es,');
  console.log('copia su línea a excluir.json y vuelve a lanzar esto');
  dudas.sort((a, b) => b.punt - a.punt).forEach(d => {
    console.log('   ? ' + d.cat + '  [' + d.empresa + ']  ↔  vuestra "' + d.mio + '"  (' + d.punt.toFixed(2) + ')');
    console.log('     "' + d.slug + '": "la apuntasteis como \\"' + d.mio + '\\""');
  });
}

console.log('\nde empresas donde ya habéis jugado, por si alguna es la misma sala con otro nombre: ' + revisar.length);
revisar.slice(0, 40).forEach(r => console.log('   · ' + r));
