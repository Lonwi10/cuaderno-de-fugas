/* Cotejo de nombres de salas: decide si dos fichas son la misma sala.
   Lo usan dedupe.js (para no duplicar el catálogo) y fotos.js (para saber qué
   ficha de escaperoomlover corresponde a una sala vuestra).

   La misma sala se apunta de mil maneras, y ninguna coincide letra a letra:
     "11 S"                            ↔ "11S"                  (los espacios)
     "SWEENEY TODD"                    ↔ "Sweneey Tott"         (erratas)
     "SWAT"                            ↔ "Misión S.W.A.T."      (siglas)
     "Gansters: Dinero, armas..."      ↔ "Gangsters"            (subtítulo)
     "Bermudas, el secreto jamás..."   ↔ "Final Code: Bermudas"  (empresa delante)
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
const pega = s => String(s || '').replace(/ /g, '');

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
   Si no cuadran, no se da nada por seguro; como mucho se avisa.
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

const CASI_IGUAL = 0.78;   // con la misma empresa: se da por la misma sala
const UN_TROZO = 0.85;     // un trozo del nombre, clavado, y la empresa cuadra
const SOSPECHA = 0.55;     // con la misma empresa: se avisa, pero no se da por seguro
const CLAVADA = 0.9;       // sin empresa que lo respalde: solo si es clavada

/** Prepara una lista de salas para cotejarlas muchas veces. */
function ficha(sala) {
  return {
    sala: sala,
    clave: clave(sala.name),
    claves: claves(sala.name),
    piezas: piezas(sala.name),
    casa: casa(sala.company),
    cifras: cifras(sala.name)
  };
}
const fichas = salas => salas.map(ficha);

/** La ficha de `lista` que mejor cuadra con `sala`, ya con el veredicto:
 *  · seguro → es la misma sala, se puede actuar sin preguntar
 *  · dudoso → puede serlo; hay que mirarlo a ojo
 *  Devuelve null si la lista está vacía. */
function mejor(sala, lista) {
  const yo = ficha(sala);
  let top = null;
  lista.forEach(otra => {
    /* la empresa de una puede venir metida en el nombre de la otra:
       "Final Code: Bermudas" es de vuestra "Final Code" */
    const empresaEnNombre = !!((otra.casa && yo.clave.indexOf(pega(otra.casa)) !== -1) ||
      (yo.casa && otra.clave.indexOf(pega(yo.casa)) !== -1));
    const cand = {
      ficha: otra,
      punt: parecido(yo.claves, otra.claves),
      entero: parejo(yo.clave, otra.clave),
      casa: mismaCasa(yo.casa, otra.casa) || empresaEnNombre,
      cabe: cabeDentro(yo.piezas, otra.piezas),
      cifras: yo.cifras === otra.cifras
    };
    if (!top || cand.punt > top.punt || (cand.punt === top.punt && cand.casa && !top.casa)) top = cand;
  });
  if (!top) return null;

  /* las mismas palabras, escritas de otra forma: "11S" ↔ "11 S" */
  const mismoNombre = top.entero === 1 ||
    (yo.piezas.length === top.ficha.piezas.length && top.cabe);
  const casiIgual = top.entero >= CASI_IGUAL;
  const trozoClavado = top.punt >= UN_TROZO;

  top.seguro = mismoNombre || (top.casa && top.cifras && (casiIgual || trozoClavado));
  top.motivo = mismoNombre ? 'mismo nombre'
    : casiIgual ? 'casi el mismo nombre'
    : 'un trozo del nombre, y la empresa cuadra';
  top.dudoso = !top.seguro &&
    ((top.casa && (top.cabe || top.punt >= SOSPECHA)) || top.punt >= CLAVADA);
  return top;
}

module.exports = {
  limpia, piezas, clave, claves, casa, mismaCasa, cifras,
  parejo, parecido, cabeDentro, ficha, fichas, mejor
};
