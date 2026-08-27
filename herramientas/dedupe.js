/* Cruza el catálogo con las salas que el grupo ya tiene apuntadas y deja fuera
   las repetidas. Uso: node dedupe.js catalogo.json ya-tengo.json salida.json [excluir.json] */
const fs = require('fs');

const cat = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const mio = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const OUT = process.argv[4];

/* --- cómo se compara un nombre con otro -----------------------------------
   La misma sala se apunta de mil maneras, y ninguna coincide letra a letra:
     "11 S"                            ↔ "11S"                 (los espacios)
     "SWEENEY TODD"                    ↔ "Sweneey Tott"        (erratas)
     "SWAT"                            ↔ "Misión S.W.A.T."     (siglas)
     "Gansters: Dinero, armas..."      ↔ "Gangsters"           (subtítulo)
     "Bermudas, el secreto jamás..."   ↔ "Final Code: Bermudas" (empresa delante)
   Así que de cada nombre se saca:
     · una clave, todo junto y sin artículos ("11 S" y "11S" → "11s")
     · las claves de sus trozos (lo de antes y después de ":" o de la coma)
     · las piezas, para comparar por conjuntos de palabras
   y se mide el parecido, que es lo que salva las erratas.                   */

const ARTICULOS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'y', 'e', 'al', 'a', 'en', 'the', 'of']);

const limpia = s => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')                            // "[prox]", "(2 salas)"
  .replace(/\b(?:[a-z]\.){2,}[a-z]?\b/g, m => m.replace(/\./g, '')) // s.w.a.t. → swat
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ').trim();

const piezas = s => limpia(s).split(' ').filter(p => p && !ARTICULOS.has(p));
const clave = s => piezas(s).join('');
const pega = s => s.replace(/ /g, '');

/* la clave del nombre entero primero, y detrás las de sus trozos; los trozos
   muy cortos no valen: "dinero" solo coincidiría por casualidad */
function claves(s) {
  const todo = clave(s);
  const trozos = String(s || '').split(/[:–—,]| - /)
    .map(clave).filter(t => t.length >= 5 && t !== todo);
  return [todo].concat(trozos);
}

/* La empresa se compara por su nombre "pelado": sin los genéricos del gremio
   ni el número de local, que la web reparte a su manera ("Open Mind 2" y
   "Open Mind Room Escape" son la misma casa). */
const GENERICOS = new Set(['escape', 'escapes', 'escaperoom', 'room', 'rooms',
  'game', 'games', 'experience', 'experiences', 'live', 'real', 'sala', 'salas',
  'the', 'barcelona', 'bcn']);

const casa = s => piezas(s).filter(p => !GENERICOS.has(p) && !/^\d+$/.test(p)).join(' ');
const mismaCasa = (a, b) => !!(a && b && (a === b || a.startsWith(b + ' ') || b.startsWith(a + ' ')));

/* Los números del nombre son sagrados: "Cronologic 1" y "Cronologic 2" se
   parecen un 91 % y son salas distintas, igual que "Nave Ulysses" y su "II".
   Si no cuadran, no se quita nada por parecido; como mucho se avisa.
   ("11 S" y "11S" dan los mismos: 11.) */
const ROMANOS = {
  i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6',
  vii: '7', viii: '8', ix: '9', x: '10', xi: '11', xii: '12'
};
const cifras = s => piezas(s).map(p => ROMANOS[p] || p.replace(/\D/g, '')).join('');

/* Parecido entre dos claves: el mejor de bigramas (Dice) y distancia de
   edición, que fallan en casos distintos. 1 = idénticas. */
function bigramas(s) {
  const m = new Map();
  for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); }
  return m;
}
function dice(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigramas(a), B = bigramas(b);
  let comunes = 0, na = 0, nb = 0;
  A.forEach(v => { na += v; });
  B.forEach(v => { nb += v; });
  A.forEach((v, g) => { comunes += Math.min(v, B.get(g) || 0); });
  return na + nb ? 2 * comunes / (na + nb) : 0;
}
function edicion(a, b) {
  let previa = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const fila = [i];
    for (let j = 1; j <= b.length; j++) {
      fila[j] = Math.min(previa[j] + 1, fila[j - 1] + 1, previa[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previa = fila;
  }
  return previa[b.length];
}
const parejo = (a, b) => Math.max(dice(a, b), 1 - edicion(a, b) / Math.max(a.length, b.length, 1));

/* el mejor parecido entre cualquier forma de un nombre y cualquiera del otro */
const parecido = (as, bs) => as.reduce((max, a) => bs.reduce((m, b) => Math.max(m, parejo(a, b)), max), 0);

/* una de las dos listas de palabras cabe entera dentro de la otra:
   "SWAT" dentro de "Misión S.W.A.T." */
function cabeDentro(a, b) {
  const corta = a.length <= b.length ? a : b;
  const larga = a.length <= b.length ? b : a;
  return corta.length > 0 && corta.every(p => larga.indexOf(p) !== -1);
}

const CASI_IGUAL = 0.78;   // con la misma empresa: se da por repetida
const UN_TROZO = 0.85;     // un trozo del nombre, clavado, y la empresa cuadra
const SOSPECHA = 0.55;     // con la misma empresa: se avisa, pero entra
const CLAVADA = 0.9;       // sin empresa que lo respalde: solo si es clavada

const mios = mio.rooms.filter(r => !r.deleted).map(r => ({
  sala: r, clave: clave(r.name), claves: claves(r.name),
  piezas: piezas(r.name), casa: casa(r.company), cifras: cifras(r.name)
}));

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
    fuera.push({ cat: s.name, mio: YA_JUGADAS[slug], empresa: s.company, estado: 'done', motivo: 'a mano' });
    return;
  }

  const k = clave(s.name), ks = claves(s.name), ps = piezas(s.name), c = casa(s.company);
  const n = cifras(s.name);
  let mejor = null;
  mios.forEach(m => {
    /* la empresa de una puede venir metida en el nombre de la otra:
       "Final Code: Bermudas" es de vuestra "Final Code" */
    const empresaEnNombre = !!((m.casa && k.indexOf(pega(m.casa)) !== -1) ||
      (c && m.clave.indexOf(pega(c)) !== -1));
    const cand = {
      mio: m,
      punt: parecido(ks, m.claves),
      entero: parejo(k, m.clave),
      casa: mismaCasa(c, m.casa) || empresaEnNombre,
      cabe: cabeDentro(ps, m.piezas),
      cifras: n === m.cifras
    };
    if (!mejor || cand.punt > mejor.punt || (cand.punt === mejor.punt && cand.casa && !mejor.casa)) mejor = cand;
  });

  /* las mismas palabras, escritas de otra forma: "11S" ↔ "11 S" */
  if (mejor && (mejor.entero === 1 || (ps.length === mejor.mio.piezas.length && mejor.cabe))) {
    fuera.push({ cat: s.name, mio: mejor.mio.sala.name, empresa: s.company, estado: mejor.mio.sala.status, motivo: 'mismo nombre' });
    return;
  }
  const casiIgual = mejor && mejor.entero >= CASI_IGUAL;
  const trozoClavado = mejor && mejor.punt >= UN_TROZO;
  if (mejor && mejor.casa && mejor.cifras && (casiIgual || trozoClavado)) {
    fuera.push({
      cat: s.name, mio: mejor.mio.sala.name, empresa: s.company, estado: mejor.mio.sala.status,
      motivo: casiIgual ? 'casi el mismo nombre' : 'un trozo del nombre, y la empresa cuadra'
    });
    return;
  }

  dentro.push(s);

  /* Ni una cosa ni la otra: entra como sin jugar, pero se avisa. Si alguna es
     la misma sala, su línea se copia tal cual a excluir.json. */
  if (mejor && ((mejor.casa && (mejor.cabe || mejor.punt >= SOSPECHA)) || mejor.punt >= CLAVADA)) {
    dudas.push({ slug: slug, cat: s.name, empresa: s.company, mio: mejor.mio.sala.name, punt: mejor.punt });
  } else if (mios.some(m => mismaCasa(c, m.casa))) {
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
