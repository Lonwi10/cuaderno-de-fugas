/* Bajar una página, con las buenas maneras de siempre: user-agent de navegador,
   sigue redirecciones y se rinde a los 45 s. Lo usan catalogo.js y fotos.js. */
const https = require('https');

function bajar(url) {
  return new Promise((res, rej) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9'
      },
      timeout: 45000
    }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        r.resume();
        return bajar(new URL(r.headers.location, url).href).then(res, rej);
      }
      if (r.statusCode !== 200) { r.resume(); return rej(new Error('HTTP ' + r.statusCode)); }
      let d = '';
      r.setEncoding('utf8');
      r.on('data', c => d += c);
      r.on('end', () => res(d));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', rej);
  });
}

/** Espera de cortesía entre peticiones: es una web ajena. */
const espera = ms => new Promise(r => setTimeout(r, ms));

module.exports = { bajar, espera };
