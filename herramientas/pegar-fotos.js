/* Coge las fotos que ya están bajadas en otros ficheros y las pega en una copia
   del cuaderno, SIN tocar nada más: ni precios, ni fechas, ni quién fue, ni la
   marca de tiempo. Así el fichero que sale solo puede añadir la foto.

   Uso: node pegar-fotos.js <cuaderno.json> <salida.json> <con-fotos.json...>

   Ejemplo, para ponerle las fotos a lo que ya tenéis en la hoja:
     1. en la web, Ajustes ▸ Descargar copia            → cuaderno.json
     2. node herramientas/pegar-fotos.js cuaderno.json cuaderno-de-fugas-fotos.json \
          catalogo-barcelona.json datos-iniciales.json
     3. en la web, Ajustes ▸ Importar copia             → cuaderno-de-fugas-fotos.json

   No pide nada a internet: reaprovecha lo que bajó fotos.js. Y como cada sala
   sale con la misma marca de tiempo que traía, al importar gana por los pelos
   —el desempate va para lo que entra— sin pisar ningún otro dato. */
const fs = require('fs');

const DEST = process.argv[2];
const OUT = process.argv[3];
const BANCOS = process.argv.slice(4);

if (!DEST || !OUT || !BANCOS.length) {
  console.error('Uso: node pegar-fotos.js <cuaderno.json> <salida.json> <con-fotos.json...>');
  process.exit(1);
}

const cuaderno = JSON.parse(fs.readFileSync(DEST, 'utf8'));
/* las dadas de baja se quedan como están: ponerle una foto a una lápida no
   tiene sentido, y así el parche no las menciona ni de refilón */
const salas = (cuaderno.rooms || cuaderno.data && cuaderno.data.rooms || [])
  .filter(r => r && r.id && !r.deleted);

/* El banco de fotos, SOLO por id. Nada de buscar por nombre: hay salas
   distintas que se llaman igual (Atrincherados es de Elements y también de
   Conecta Escape) y emparejarlas por parecido le pega a una la foto de la
   otra. Si el id no está en el banco, la sala se queda sin foto. */
const porId = new Map();
BANCOS.forEach(f => {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  (j.rooms || []).forEach(r => {
    if (!r || !r.photo) return;
    if (r.id) porId.set(r.id, r.photo);
  });
});
console.log('banco de fotos: ' + porId.size + ' salas de ' + BANCOS.length + ' fichero(s)');

const parche = [], sinFoto = [];

salas.forEach(sala => {
  if (sala.photo) return;                       // ya la tiene: no hay nada que pegar
  const foto = porId.get(sala.id);
  if (!foto) { sinFoto.push(sala.name + (sala.company ? '  [' + sala.company + ']' : '')); return; }
  /* la sala tal cual está, con la foto y con su misma marca de tiempo */
  parche.push(Object.assign({}, sala, { photo: foto }));
});

fs.writeFileSync(OUT, JSON.stringify({
  app: 'cuaderno-de-fugas', v: 1,
  origen: 'solo fotos, para importar sobre ' + DEST,
  players: [], rooms: parche
}, null, 2) + '\n');

console.log('salas en el cuaderno: ' + salas.length);
console.log('ya tenían foto: ' + salas.filter(r => r.photo).length);
console.log('se les pega ahora: ' + parche.length + ' → ' + OUT);
if (sinFoto.length) {
  console.log('\nse quedan sin foto (' + sinFoto.length + '): no hay ninguna bajada para ellas');
  sinFoto.slice(0, 40).forEach(l => console.log('   · ' + l));
}
