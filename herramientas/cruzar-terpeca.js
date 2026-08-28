/* Cruza el ranking de TERPECA con el cuaderno y saca UN fichero para importar
   que hace dos cosas a la vez:

     1. le pone el puesto de TERPECA a las salas que ya tenéis —jugadas y sin
        jugar—, sin tocarles nada más;
     2. añade como "sin jugar" las salas de TERPECA que no tenéis.

   Uso: node cruzar-terpeca.js <cuaderno.json> <terpeca.json> <salida.json>
                               [excluir-terpeca.json] [opciones]

     --pais=España        de qué países se importan las que no tenéis
                          (por defecto España; vale "España,Andorra,Francia",
                          o "--pais=todos" para el mundo entero)
     --ciudad=barcelona,badalona   además, solo estas ciudades
     --min=2              nominaciones mínimas para importar una que no llegó a
                          finalista (las que tienen puesto entran siempre)
     --desde=2023         solo salas que aparezcan en esa edición o después
                          (sirve para no traerse salas de 2018 que ya cerraron)
     --sin-nuevas         no añade ninguna sala: solo pone los puestos

   Los puestos se les ponen a TODAS vuestras salas: --pais, --ciudad, --min y
   --desde solo deciden qué salas nuevas entran.

   Ejemplo, la vuelta completa:
     1. en la web, Ajustes ▸ Descargar copia          → cuaderno.json
     2. node herramientas/terpeca.js todos terpeca.json
     3. node herramientas/cruzar-terpeca.js cuaderno.json terpeca.json terpeca-para-importar.json excluir-terpeca.json
     4. en la web, Ajustes ▸ Importar copia           → terpeca-para-importar.json

   Quién decide si dos nombres son la misma sala es cotejo.js, el mismo que usan
   el catálogo y la pestaña de duplicadas. Y como TERPECA escribe los nombres en
   inglés con el original entre corchetes, cada sala se coteja con SUS DOS
   nombres: "The Krugger's Secret" y "El Secreto de los Krugger".

   Lo que no se toca de vuestras salas: nombre, empresa, ciudad, web, foto,
   notas, precio, fecha, quién fue, resultado, nota y la marca de tiempo. Solo
   se rellenan las tres columnas de TERPECA. Así el fichero que sale no puede
   pisar nada de lo que hayáis apuntado mientras. */
const fs = require('fs');
const cotejo = require('../cotejo');

const args = process.argv.slice(2);
const ficheros = args.filter(a => a.charAt(0) !== '-');
const opciones = args.filter(a => a.charAt(0) === '-');

const CUAD = ficheros[0];
const TERP = ficheros[1];
const OUT = ficheros[2];
const EXCL = ficheros[3];

if (!CUAD || !TERP || !OUT) {
  console.error('Uso: node cruzar-terpeca.js <cuaderno.json> <terpeca.json> <salida.json> [excluir-terpeca.json]');
  console.error('     [--pais=España] [--ciudad=barcelona,badalona] [--min=2] [--desde=2023] [--sin-nuevas]');
  process.exit(1);
}

function opcion(nombre, porDefecto) {
  const o = opciones.filter(a => a.indexOf('--' + nombre + '=') === 0)[0];
  return o === undefined ? porDefecto : o.slice(nombre.length + 3);
}
const SIN_NUEVAS = opciones.indexOf('--sin-nuevas') !== -1;
const MIN_NOMS = +opcion('min', 2) || 0;
const DESDE = +opcion('desde', 0) || 0;
const PAISES = String(opcion('pais', 'España'));
const CIUDADES = String(opcion('ciudad', ''));

/* TERPECA escribe los países en inglés. Solo hacen falta los alias de los que
   alguien va a escribir en español; el resto se pone tal cual ("Greece"). */
const ALIAS = {                          // las claves, ya sin acentos
  'espana': 'spain', 'francia': 'france', 'italia': 'italy', 'alemania': 'germany',
  'grecia': 'greece', 'paises bajos': 'netherlands', 'holanda': 'netherlands',
  'belgica': 'belgium', 'reino unido': 'united kingdom', 'inglaterra': 'united kingdom',
  'polonia': 'poland', 'estados unidos': 'usa', 'eeuu': 'usa', 'suiza': 'switzerland',
  'hungria': 'hungary', 'republica checa': 'czechia', 'chequia': 'czechia',
  'dinamarca': 'denmark', 'suecia': 'sweden', 'noruega': 'norway', 'finlandia': 'finland',
  'irlanda': 'ireland', 'rumania': 'romania', 'rusia': 'russia', 'turquia': 'turkey',
  'japon': 'japan', 'brasil': 'brazil', 'mejico': 'mexico', 'mexico': 'mexico'
};
const limpiaPais = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const TODOS_LOS_PAISES = /^(todos|todo|mundo|world)$/.test(limpiaPais(PAISES));
const PAIS_OK = new Set(PAISES.split(',')
  .map(p => limpiaPais(p)).map(p => limpiaPais(ALIAS[p] || p)).filter(Boolean));
const CIUDAD_OK = CIUDADES.split(',').map(c => limpiaPais(c)).filter(Boolean);

const BASE = Date.parse('2026-08-28T09:00:00Z');   // marca de las salas nuevas, fija a propósito

/* ---------- lo que ya tenéis ---------- */
const cuaderno = JSON.parse(fs.readFileSync(CUAD, 'utf8'));
const mias = (cuaderno.rooms || (cuaderno.data && cuaderno.data.rooms) || [])
  .filter(r => r && r.id && r.name && !r.deleted);
const fichasMias = cotejo.fichas(mias);

/* ---------- TERPECA ---------- */
const terpeca = JSON.parse(fs.readFileSync(TERP, 'utf8'));
const entradas = (terpeca.entradas || []).filter(e => e && e.name);
if (!entradas.length) {
  console.error('Ese ' + TERP + ' no trae entradas. ¿Lo has sacado con terpeca.js?');
  process.exit(1);
}

const slug = s => String(s == null ? '' : s).toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* Los nombres con los que una casa aparece en TERPECA. El importante es el que
   va entre paréntesis detrás de "formerly": a las empresas les cambian el
   nombre —"Malum Escape Room (formerly Krematorium Escape Rooms Experience)"— y
   con él, a veces, el de la sala. Sin esto, la misma sala saldría dos veces, una
   por cada nombre de la casa; y tampoco cruzaría con la vuestra si la apuntaste
   cuando la empresa se llamaba de la otra manera. */
function empresasDe(company) {
  const out = [String(company || '')];
  const re = /\(\s*(?:formerly|antes|ex)\s+([^)]+)\)/gi;
  let m;
  while ((m = re.exec(out[0]))) out.push(m[1].trim());
  return out;
}

/* Una sala de TERPECA se coteja por sus dos nombres y por los nombres de su
   casa, y SIN ciudad: TERPECA da la ciudad grande ("Barcelona") donde el
   catálogo da el municipio ("Cornellá de Llobregat", "Santa Coloma"), y si se
   comparasen, cotejo.js daría por distintas salas que son la misma. El aval es
   la empresa. */
function fichasDe(sala) {
  const nombres = [sala.name, sala.alt].filter(Boolean);
  const casas = empresasDe(sala.company);
  const out = [];
  nombres.forEach(n => casas.forEach(c => out.push(cotejo.ficha({ name: n, company: c, city: '' }))));
  return out;
}

/* ---------- una sala, todas sus ediciones ---------- */
/* Las entradas vienen por año descendente y, dentro del año, por puesto. Se van
   juntando en salas: la primera entrada de cada sala es la más reciente y la
   mejor colocada, así que es la que manda. Para saber si dos entradas de años
   distintos son la misma sala se pregunta a cotejo.js, porque a las salas les
   cambian el nombre entre ediciones ("Magnifico" era "Magnifico's Circus") y la
   empresa también ("Saga Escape Rooms (formerly Londium Escape Room)"). */
const salas = [];
/* Cotejar 6.000 entradas contra todas las demás sería medio minuto de cuentas,
   así que se guardan en cajones por la primera palabra de la empresa (una sala
   va en tantos cajones como nombres tenga su casa) y solo se compara con las
   vecinas de cajón. Cambiarle el nombre a la empresa no la esconde. */
const cajones = new Map();
const cajonesDe = e => [...new Set(empresasDe(e.company)
  .map(c => (cotejo.casa(c) || '·').split(' ')[0]))];

entradas.forEach(e => {
  const cajs = cajonesDe(e);
  const vecinas = [];
  cajs.forEach(c => (cajones.get(c) || []).forEach(s => {
    if (vecinas.indexOf(s) === -1) vecinas.push(s);
  }));
  const mias2 = fichasDe(e);
  let sala = null;
  vecinas.forEach(s => {
    if (sala) return;
    if (s.years.indexOf(e.year) !== -1) return;        // dos entradas del mismo año no se juntan
    const juntan = mias2.some(f => s.fichas.some(g => cotejo.compara(f, g).seguro));
    if (juntan) sala = s;
  });
  if (!sala) {
    sala = {
      name: e.name, alt: e.alt, company: e.company, city: e.city, cities: e.cities || [],
      region: e.region, country: e.country,
      web: '', photo: '', players: '', minutes: '', terror: '', idiomas: '',
      fichas: [], years: [], ediciones: [], ciudades: []
    };
    salas.push(sala);
  }
  (e.cities || []).forEach(c => { if (c && sala.ciudades.indexOf(c) === -1) sala.ciudades.push(c); });
  /* Se le guardan los nombres de TODAS sus ediciones, y se mete en los cajones
     de todas sus empresas: así una sala a la que le han cambiado el nombre dos
     veces sigue siendo una sola, y cruza con la vuestra aunque la apuntaseis
     con el nombre de hace cinco años. */
  mias2.forEach(f => {
    if (!sala.fichas.some(g => g.clave === f.clave && g.casa === f.casa)) sala.fichas.push(f);
  });
  cajs.forEach(c => {
    const arr = cajones.get(c) || [];
    if (arr.indexOf(sala) === -1) arr.push(sala);
    cajones.set(c, arr);
  });
  sala.years.push(e.year);
  sala.ediciones.push(e);
  ['web', 'photo', 'players', 'minutes', 'terror', 'idiomas'].forEach(c => {
    if (!sala[c] && e[c]) sala[c] = e[c];
  });
});

/* Lo que se le pone al cuaderno: el puesto más reciente que consiguió, y el año
   de ese puesto. Si nunca fue finalista, no hay puesto y el año es el de la
   última vez que la nominaron. Las nominaciones son siempre las de ESE año, así
   el par (puesto, año) se lee sin trampa. */
salas.forEach(s => {
  const conPuesto = s.ediciones.filter(e => e.rank);
  const manda = conPuesto[0] || s.ediciones[0];      // ya vienen ordenadas
  const mismoAño = s.ediciones.filter(e => e.year === manda.year);
  s.rank = manda.rank || '';
  s.year = manda.year;
  s.noms = mismoAño.reduce((n, e) => Math.max(n, e.noms || 0), 0);
  s.premiada = mismoAño.some(e => e.premiada);
  s.finalista = mismoAño.some(e => e.finalista);
  s.mejor = s.ediciones.reduce((m, e) => e.rank && (!m || e.rank < m) ? e.rank : m, 0);
  s.historia = s.ediciones.slice()
    .sort((a, b) => b.year - a.year)
    .map(e => e.year + (e.rank ? ' #' + e.rank : (e.premiada ? ' premiada' : ' nom.')) +
      (e.noms ? ' (' + e.noms + ')' : ''))
    .join(' · ');
  s.clave = (slug(s.name) + '-' + slug(s.company)).slice(0, 70);
});

/* ---------- dicho a mano ---------- */
/* excluir-terpeca.json: una línea por sala de TERPECA, con su clave y el motivo.
     "londium-saga-escape-rooms": "la apuntasteis como \"Londium Escape\""
   Si el motivo trae un nombre entre comillas, se empareja con esa sala vuestra.
   Si no lo trae, la sala simplemente no se importa. */
const AMANO = {};
if (EXCL) {
  if (fs.existsSync(EXCL)) {
    const j = JSON.parse(fs.readFileSync(EXCL, 'utf8'));
    Object.keys(j).forEach(k => {
      const entre = String(j[k]).match(/"([^"]+)"/);
      AMANO[k] = { texto: String(j[k]), nombre: entre ? entre[1] : '' };
    });
    console.log('dicho a mano en ' + EXCL + ': ' + Object.keys(AMANO).length + ' salas');
  } else {
    console.log('(no hay ' + EXCL + ' todavía: se cruza solo por nombre)');
  }
}

/* ---------- cuando la empresa no dice nada ---------- */
/* cotejo.js da por la misma sala dos nombres iguales si la empresa acompaña
   —o si de una de las dos no se sabe la empresa—. Eso vale dentro del
   cuaderno, pero aquí enfrente hay una lista mundial, y cuando la empresa de
   TERPECA se llama solo con palabras del gremio ("The Game", "Escape
   Experience") no queda nada con lo que compararla: se quedaría en "el nombre
   es el mismo" y hay una "The Bunker" en Chattanooga, otra en Roma y la
   vuestra en Barcelona, y un "The Metro" en París que no es el de Vilafranca.
   Así que sin aval de empresa se le exige a la CIUDAD que cuadre, y si
   tampoco, la pareja se manda a repasar a mano. */
const pueblo = s => limpiaPais(s).replace(/^(?:l['\s]|el\s|la\s)/, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();

function mismoPueblo(a, b) {
  const x = pueblo(a).split(' ').filter(Boolean);
  const y = pueblo(b).split(' ').filter(Boolean);
  if (!x.length || !y.length) return false;
  const corta = x.length <= y.length ? x : y;
  const larga = x.length <= y.length ? y : x;
  return corta.every(p => larga.indexOf(p) !== -1);   // "Masnou" cabe en "El Masnou"
}
const ciudadCuadra = (mia, sala) =>
  (sala.ciudades || []).some(c => mismoPueblo(mia.city, c));

/* ---------- el cruce ---------- */
const parejas = [];        // sala de TERPECA ↔ sala vuestra
const dudosas = [];
const sinCruzar = [];
const tomadas = new Map(); // id de vuestra sala → pareja, para que no la cojan dos

function apunta(s, mia, motivo, punt) {
  const previa = tomadas.get(mia.id);
  if (previa) {
    /* dos salas de TERPECA quieren la misma vuestra: se queda la que más se
       parece y la otra se canta, que alguna vez es una saga de dos salas */
    if ((punt || 0) <= (previa.punt || 0)) {
      dudosas.push({ s: s, mia: mia, punt: punt || 0, motivo: 'ya cogida por "' + previa.s.name + '"' });
      return false;
    }
    parejas.splice(parejas.indexOf(previa), 1);
    dudosas.push({ s: previa.s, mia: mia, punt: previa.punt, motivo: 'se la queda "' + s.name + '"' });
  }
  const p = { s: s, mia: mia, motivo: motivo, punt: punt || 0 };
  parejas.push(p);
  tomadas.set(mia.id, p);
  return true;
}

salas.forEach(s => {
  const dicho = AMANO[s.clave];
  if (dicho) {
    if (!dicho.nombre) { s.fuera = 'dicho a mano'; return; }
    /* Puede haber dos salas vuestras con el mismo nombre —"The bunker" de
       Enigmik y "El Búnker" del Masnou son el mismo nombre para cotejo.js—, así
       que entre las que se llaman así se coge la que mejor cuadre con esta. */
    const candidatas = fichasMias.filter(f => f.clave === cotejo.clave(dicho.nombre));
    let mia = candidatas[0], top = -1;
    if (candidatas.length > 1) {
      candidatas.forEach(f => {
        const ciudad = ciudadCuadra(f.sala, s) ? 1 : 0;
        const v = s.fichas.reduce(function (m, g) {
          const c = cotejo.compara(g, f);
          return Math.max(m, c.punt + (c.casa ? 1 : 0) + ciudad);
        }, 0);
        if (v > top) { top = v; mia = f; }
      });
    }
    if (mia) { apunta(s, mia.sala, 'a mano', 1); s.fuera = 'a mano'; return; }
    sinCruzar.push(s.clave + ': en ' + EXCL + ' dice "' + dicho.nombre + '", y no hay ninguna sala vuestra con ese nombre');
    return;
  }

  let mejor = null;
  s.fichas.forEach(f => {
    fichasMias.forEach(g => {
      const v = cotejo.compara(f, g);
      if (!v.seguro && !v.dudoso) return;
      if (!mejor || (v.seguro && !mejor.v.seguro) ||
          (v.seguro === mejor.v.seguro && v.punt > mejor.v.punt)) mejor = { v: v, g: g };
    });
  });
  if (!mejor) return;
  const sinAval = mejor.v.seguro && !mejor.v.casa && !ciudadCuadra(mejor.g.sala, s);
  if (mejor.v.seguro && !sinAval) {
    if (apunta(s, mejor.g.sala, mejor.v.motivo, mejor.v.punt)) s.fuera = 'ya la teníais';
  } else {
    dudosas.push({
      s: s, mia: mejor.g.sala, punt: mejor.v.punt,
      motivo: sinAval ? 'el nombre es el mismo, pero la empresa no lo respalda y la ciudad no cuadra'
        : mejor.v.motivo,
      /* si la empresa o la ciudad acompañan, la pareja merece un repaso; si no
         acompaña ninguna, es una coincidencia de nombre y va al montón */
      avalada: !!mejor.v.casa || ciudadCuadra(mejor.g.sala, s)
    });
  }
});

/* ---------- 1) el puesto para las que ya teníais ---------- */
const cifra = v => v === '' || v == null ? '' : (+v || '');
const parche = [];
const sinCambio = [];
parejas.forEach(p => {
  const mia = p.mia, s = p.s;
  const igual = cifra(mia.terpecaRank) === cifra(s.rank) &&
                cifra(mia.terpecaYear) === cifra(s.year) &&
                cifra(mia.terpecaNoms) === cifra(s.noms);
  if (igual) { sinCambio.push(mia.name); return; }
  /* la sala tal cual está, con las tres columnas de TERPECA y con su MISMA marca
     de tiempo: al importar gana por los pelos y no pisa nada más */
  parche.push(Object.assign({}, mia, {
    terpecaRank: s.rank || '',
    terpecaYear: s.year || '',
    terpecaNoms: s.noms || ''
  }));
});

/* ---------- 2) las que no teníais ---------- */
const PISTAS_ES = /[áéíóúñüçàèòï¡¿]|^(el|la|los|las|un|una|del|de|al|don|doña)\s/i;
const HISPANOS = new Set(['spain', 'andorra', 'mexico', 'argentina', 'chile', 'colombia', 'peru', 'uruguay']);

/** El nombre con el que la vais a reconocer: en España, el original antes que la
 *  traducción al inglés que pone TERPECA delante. El otro se guarda en las notas.
 *
 *  TERPECA escribe "traducción [original]", así que para una sala española lo
 *  normal es que el bueno sea el de los corchetes. Pero en la sección de
 *  premiadas lo pone al revés, y hay nombres que no delatan su idioma
 *  ("Ensayo 1: Paranoia Remastered" no lleva ni un acento), así que se mira
 *  cuál de los dos canta a español y solo se cae al orden por defecto cuando
 *  ninguno lo hace. */
function nombreBueno(s) {
  if (!s.alt) return s.name;
  if (!HISPANOS.has(limpiaPais(s.country))) return s.name;
  if (PISTAS_ES.test(s.alt)) return s.alt;
  if (!PISTAS_ES.test(s.name)) return s.alt;
  return s.name;
}

function entra(s) {
  if (!TODOS_LOS_PAISES && !PAIS_OK.has(limpiaPais(s.country))) return false;
  if (CIUDAD_OK.length && !(s.cities || [s.city]).some(c => CIUDAD_OK.indexOf(limpiaPais(c)) !== -1)) return false;
  if (DESDE && Math.max.apply(null, s.years) < DESDE) return false;
  if (s.rank || s.premiada || s.finalista) return true;      // con puesto, siempre
  return (s.noms || 0) >= MIN_NOMS;
}

const nuevas = [];
const idsUsados = new Set(mias.map(r => r.id));
if (!SIN_NUEVAS) {
  salas.filter(s => !s.fuera && entra(s)).forEach(s => {
    const nombre = nombreBueno(s);
    const otro = nombre === s.name ? s.alt : s.name;
    const notas = [];
    if (s.rank) notas.push('TERPECA nº ' + s.rank + ' en ' + s.year);
    else if (s.premiada) notas.push('premiada en TERPECA ' + s.year + ' (sin puesto propio: es otra versión de una sala ya puntuada)');
    else notas.push('nominada en TERPECA ' + s.year);
    if (s.noms) notas.push(s.noms + (s.noms === 1 ? ' nominación' : ' nominaciones'));
    if (otro) notas.push('también: ' + otro);
    if ((s.cities || []).length > 1) notas.push('también en ' + s.cities.slice(1).join(', '));
    if (s.players) notas.push(s.players + ' jugadores');
    if (s.minutes) notas.push(s.minutes.replace(/Minutes/gi, 'min').replace(/Accommodation/gi, 'con alojamiento'));
    if (s.terror) notas.push(s.terror);
    if (s.idiomas) notas.push(s.idiomas);

    let id = ('terpeca-' + s.clave).slice(0, 70);
    let n = 2;
    while (idsUsados.has(id)) id = ('terpeca-' + s.clave).slice(0, 68) + '-' + (n++);
    idsUsados.add(id);

    nuevas.push({
      id: id,
      name: nombre,
      company: s.company,
      city: s.city + (s.region ? ' (' + s.region + ')' : ''),
      web: s.web || '',
      photo: s.photo || '',
      price: '',                     // el precio real se apunta el día que se juega
      priceMode: 'total',
      people: '',
      status: 'wish',
      date: '',
      who: [],
      escaped: null,
      timeLeft: '',
      rating: 0,
      notes: notas.join(' · '),
      terpecaRank: s.rank || '',
      terpecaYear: s.year || '',
      terpecaNoms: s.noms || '',
      updatedAt: BASE + nuevas.length
    });
  });
}

nuevas.sort((a, b) => (a.terpecaRank || 9999) - (b.terpecaRank || 9999) ||
  String(a.name).localeCompare(String(b.name), 'es'));

fs.writeFileSync(OUT, JSON.stringify({
  app: 'cuaderno-de-fugas', v: 1,
  origen: 'TERPECA (' + (terpeca.origen || 'terpeca.com') + ') sobre ' + CUAD,
  players: [], rooms: parche.concat(nuevas)
}, null, 2) + '\n');

/* ---------- el repaso ---------- */
const pon = (n, s) => String(n).padStart(4) + '  ' + s;
console.log('\nvuestras salas: ' + mias.length + ' · salas en TERPECA: ' + salas.length +
  ' (' + entradas.length + ' entradas de ' + new Set(entradas.map(e => e.year)).size + ' ediciones)');

console.log('\n== 1) el puesto de TERPECA para las que ya teníais ==');
console.log(pon(parejas.length, 'salas vuestras están en TERPECA'));
console.log(pon(parche.length, 'se les pone o se les corrige el puesto → ' + OUT));
if (sinCambio.length) console.log(pon(sinCambio.length, 'ya lo tenían bien puesto'));
parejas.slice().sort((a, b) => (a.s.rank || 9999) - (b.s.rank || 9999)).forEach(p => {
  console.log('   ' + (p.s.rank ? '#' + String(p.s.rank).padStart(3) : ' nom') + '  ' +
    p.mia.name + (p.mia.status === 'wish' ? '  [sin jugar]' : '  [jugada]') +
    '  ↔  ' + p.s.name + (p.s.name === p.mia.name ? '' : ' (' + p.s.company + ')') +
    '  · ' + p.s.historia + (p.motivo === 'a mano' ? '  (a mano)' : ''));
});

const donde = s => [s.company, (s.ciudades || []).slice(0, 4).join(' / '), s.country].filter(Boolean).join(' · ');

const paraMirar = dudosas.filter(d => d.avalada).sort((a, b) => b.punt - a.punt);
const coincidencias = dudosas.filter(d => !d.avalada).sort((a, b) => b.punt - a.punt);

if (paraMirar.length) {
  console.log('\n== ¿son la misma sala? (' + paraMirar.length + ') ==');
  console.log('la empresa o la ciudad acompañan, así que hay que mirarlas: si lo son, copia su');
  console.log('línea a ' + (EXCL || 'excluir-terpeca.json') + ' y vuelve a lanzar esto. Si no lo son, déjalas: entrarán');
  console.log('como sala nueva si pasan el filtro.');
  paraMirar.forEach(d => {
    console.log('   ? ' + (d.s.rank ? '#' + d.s.rank + ' ' : '') + d.s.name + '  [' + donde(d.s) + ']');
    console.log('     ↔ vuestra "' + d.mia.name + '"  [' + (d.mia.company || 'sin empresa') +
      ' · ' + (d.mia.city || 'sin ciudad') + ']  (' + d.punt.toFixed(2) + ', ' + d.motivo + ')');
    console.log('     "' + d.s.clave + '": "la apuntasteis como \\"' + d.mia.name + '\\""');
  });
}

if (coincidencias.length) {
  console.log('\n== se llaman igual y nada más (' + coincidencias.length + ') ==');
  console.log('ni la empresa ni la ciudad acompañan: son salas distintas con el mismo nombre en otro');
  console.log('sitio, que de eso está lleno el mundo. Se listan por si acaso, con su clave al final.');
  coincidencias.forEach(d => {
    console.log('   · ' + d.s.name + '  [' + donde(d.s) + ']  ↔  vuestra "' + d.mia.name +
      '" [' + (d.mia.city || 'sin ciudad') + ']');
    console.log('        "' + d.s.clave + '": "la apuntasteis como \\"' + d.mia.name + '\\""');
  });
}
if (sinCruzar.length) {
  console.log('\n== líneas de ' + EXCL + ' que no cuadran (' + sinCruzar.length + ') ==');
  sinCruzar.forEach(l => console.log('   ⚠ ' + l));
}

console.log('\n== 2) las de TERPECA que no teníais ==');
if (SIN_NUEVAS) {
  console.log('   (--sin-nuevas: no se añade ninguna)');
} else {
  const filtro = (TODOS_LOS_PAISES ? 'todo el mundo' : PAISES) +
    (CIUDAD_OK.length ? ' · ciudades: ' + CIUDADES : '') +
    (DESDE ? ' · ediciones desde ' + DESDE : '') +
    ' · con puesto siempre, nominadas desde ' + MIN_NOMS +
    (MIN_NOMS === 1 ? ' nominación' : ' nominaciones');
  console.log('   filtro: ' + filtro);
  console.log(pon(nuevas.length, 'entran como "sin jugar" → ' + OUT));
  console.log(pon(nuevas.filter(r => r.terpecaRank).length, 'de ellas con puesto'));
  console.log(pon(nuevas.filter(r => r.photo).length, 'de ellas con foto (las premiadas la traen)'));
  const porCiudad = {};
  nuevas.forEach(r => { porCiudad[r.city || '(sin ciudad)'] = (porCiudad[r.city || '(sin ciudad)'] || 0) + 1; });
  Object.keys(porCiudad).sort((a, b) => porCiudad[b] - porCiudad[a]).slice(0, 15)
    .forEach(c => console.log('      ' + String(porCiudad[c]).padStart(3) + '  ' + c));
  console.log('   las mejor colocadas que os faltan:');
  nuevas.filter(r => r.terpecaRank).slice(0, 15).forEach(r => console.log('      #' +
    String(r.terpecaRank).padStart(3) + '  ' + r.name + '  [' + r.company + ', ' + r.city + ']'));
}

console.log('\nAhora: en la web, Ajustes ▸ Importar copia → ' + OUT);
console.log('(y antes, si el Apps Script publicado es anterior a las columnas TERPECA, republícalo:');
console.log(' la hoja es la fuente de la verdad y al sincronizar se comería los puestos)');
