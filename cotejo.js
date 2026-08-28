/* Cotejo de nombres de salas: decide si dos fichas son la misma sala.
   Lo usan las herramientas (dedupe.js para no duplicar el catálogo, fotos.js y
   pegar-fotos.js para saber qué ficha de la web es cuál sala vuestra) y la
   propia app, en la pestaña de duplicadas. Por eso vive en la raíz y vale para
   node y para el navegador: una sola verdad sobre cuándo dos nombres son la
   misma sala.

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

(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Cotejo = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {

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

/* la clave del nombre entero primero, y detrás las de sus trozos. Los trozos
   cortos no valen: "dinero" u "origen" coinciden por casualidad y dan 1.00 en
   salas que no tienen nada que ver ("Alien: el origen" y "Criogenic 500: El
   origen"). De siete letras en adelante ya son señas de identidad. */
function claves(s) {
  const todo = clave(s);
  const trozos = String(s || '').split(/[:–—,]| - /)
    .map(clave).filter(t => t.length >= 7 && t !== todo);
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
    largos: claves(sala.name).map(k => k.length),
    piezas: piezas(sala.name),
    ciudad: limpia(sala.city),
    casa: casa(sala.company),
    casaPegada: pega(casa(sala.company)),   // se compara 45.000 veces: mejor hecha
    cifras: cifras(sala.name)
  };
}
const fichas = salas => salas.map(ficha);

/** Compara dos fichas ya preparadas y devuelve el veredicto:
 *  · seguro → es la misma sala, se puede actuar sin preguntar
 *  · dudoso → puede serlo; hay que mirarlo a ojo */
function compara(yo, otra) {
  /* la empresa de una puede venir metida en el nombre de la otra:
     "Final Code: Bermudas" es de vuestra "Final Code" */
  const empresaEnNombre = !!((otra.casa && yo.clave.indexOf(otra.casaPegada) !== -1) ||
    (yo.casa && otra.clave.indexOf(yo.casaPegada) !== -1));
  const v = {
    ficha: otra,
    punt: parecido(yo.claves, otra.claves),
    entero: parejo(yo.clave, otra.clave),
    casa: mismaCasa(yo.casa, otra.casa) || empresaEnNombre,
    cabe: cabeDentro(yo.piezas, otra.piezas),
    cifras: yo.cifras === otra.cifras
  };

  /* Las mismas palabras, escritas de otra forma: "11S" ↔ "11 S". Pero el
     nombre solo basta si la empresa acompaña (o si no se sabe de una de las
     dos): "El orfanato" lo tienen tres locales distintos, y son tres salas
     distintas. Si el nombre canta y la empresa no, se avisa y decide un
     humano. */
  const dosEmpresas = !!(yo.casa && otra.casa);
  const mismasPalabras = v.entero === 1 ||
    (yo.piezas.length === otra.piezas.length && v.cabe);
  const mismoNombre = mismasPalabras && (v.casa || !dosEmpresas);

  /* Una sala es un sitio físico: si las dos dicen ciudad y no es la misma, no
     pueden ser la misma sala por mucho que el nombre coincida —"El Búnker" de
     Masnou y "The bunker" de Barcelona son dos—. Cuando una no dice ciudad
     (el histórico casi nunca la traía), no contradice nada. */
  const ciudadesChocan = !!(yo.ciudad && otra.ciudad && yo.ciudad !== otra.ciudad);
  const casiIgual = v.entero >= CASI_IGUAL;
  const trozoClavado = v.punt >= UN_TROZO;

  v.seguro = !ciudadesChocan &&
    (mismoNombre || (v.casa && v.cifras && (casiIgual || trozoClavado)));
  v.motivo = mismoNombre ? 'mismo nombre'
    : casiIgual ? 'casi el mismo nombre'
    : 'un trozo del nombre, y la empresa cuadra';
  v.dudoso = !v.seguro &&
    ((v.casa && (v.cabe || v.punt >= SOSPECHA)) || v.punt >= CLAVADA);
  return v;
}

/** La ficha de `lista` que mejor cuadra con `sala`, con su veredicto.
 *  Devuelve null si la lista está vacía. */
function mejor(sala, lista) {
  const yo = ficha(sala);
  let top = null;
  lista.forEach(otra => {
    const v = compara(yo, otra);
    if (!top || v.punt > top.punt || (v.punt === top.punt && v.casa && !top.casa)) top = v;
  });
  return top;
}

/* ¿La empresa respalda la comparación? Es lo barato de comprobar. */
function casaRespalda(yo, otra) {
  return mismaCasa(yo.casa, otra.casa) ||
    !!(otra.casa && yo.clave.indexOf(otra.casaPegada) !== -1) ||
    !!(yo.casa && otra.clave.indexOf(yo.casaPegada) !== -1);
}

/* Puerta rápida antes de comparar a fondo: en 300 salas hay 48.000 parejas y
   medir el parecido de todas cuesta medio segundo. Si la empresa no respalda,
   la pareja necesita un 0,9 de parecido, y eso es imposible cuando las
   longitudes no se acercan: la cota de Dice y la de la distancia de edición lo
   dicen con las longitudes en la mano. Todo en enteros y sin dividir, que esto
   se ejecuta decenas de miles de veces. */
function puedeLlegar(yo, otra) {
  const A = yo.largos, B = otra.largos;
  for (let i = 0; i < A.length; i++) {
    const a = A[i];
    for (let j = 0; j < B.length; j++) {
      const b = B[j];
      const corta = a < b ? a : b, larga = a < b ? b : a;
      if (corta * 10 >= larga * 9) return true;                            // corta/larga ≥ 0,9
      if (a > 1 && b > 1 && 20 * (corta - 1) >= 9 * (a + b - 2)) return true;  // cota de Dice ≥ 0,9
    }
  }
  return false;
}

/** Todas las parejas de una lista que podrían ser la misma sala apuntada dos
 *  veces. Cada pareja sale una sola vez, las seguras primero. */
function duplicadas(salas) {
  const f = fichas((salas || []).filter(s => s && s.name && !s.deleted));
  const pares = [];
  for (let i = 0; i < f.length; i++) {
    for (let j = i + 1; j < f.length; j++) {
      if (!casaRespalda(f[i], f[j]) && !puedeLlegar(f[i], f[j])) continue;
      const v = compara(f[i], f[j]);
      if (v.seguro || v.dudoso) {
        pares.push({ a: f[i].sala, b: f[j].sala, punt: v.punt, motivo: v.motivo, seguro: v.seguro });
      }
    }
  }
  return pares.sort((x, y) => (y.seguro ? 1 : 0) - (x.seguro ? 1 : 0) || y.punt - x.punt);
}

return {
  limpia, piezas, clave, claves, casa, mismaCasa, cifras,
  parejo, parecido, cabeDentro, ficha, fichas, compara, mejor, duplicadas
};

});
