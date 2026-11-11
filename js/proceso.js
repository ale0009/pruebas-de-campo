// Página /proceso/: tema, rectas de 2 y 3 valores, tabla y gráfica de exhaustivas frente a mínimas.
import { iniciarTema } from './tema.js';
import { generar, interpretar, exhaustivo } from './campos.js';
import { recta } from './diagrama.js';
import { cantidad, duracion } from './formato.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const CAMPOS = [
  'edad entera entre 18 y 65, obligatoria',
  'cédula colombiana de 6 a 10 dígitos, obligatoria',
  'fecha de la cita entre 2026-12-01 y 2026-12-31, obligatoria',
  'nombre de usuario, texto de 3 a 20 caracteres, obligatorio',
  'correo electrónico, obligatorio',
  'tipo de documento: CC, CE, TI, PA',
];

const conSup = (o) => (o.exp == null ? esc(o.texto) : `${esc(o.texto)}<sup>${o.exp}</sup>${esc(o.despues || '')}`);

function rectas() {
  const c = interpretar(CAMPOS[0]);
  const angosto = () => $('g-bva2').clientWidth < 620;
  const pintar = () => {
    $('g-bva2').innerHTML = recta(generar(c, { bva: 2 }), { compacto: angosto() }).replace(/recta-t/g, 'recta-t2').replace(/id="rayado"/, 'id="rayado2"').replace(/url\(#rayado\)/g, 'url(#rayado2)');
    $('g-bva3').innerHTML = recta(generar(c, { bva: 3 }), { compacto: angosto() }).replace(/recta-t/g, 'recta-t3');
  };
  pintar();
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(pintar, 200); });
}

function tablaExhaustivo() {
  const filas = CAMPOS.map((d) => {
    const c = interpretar(d);
    const r = generar(c);
    const e = exhaustivo(c);
    return { nombre: c.nombre, e, min: r.conteo.total };
  });
  $('t-exh').innerHTML = filas.map((f) => `<tr><th scope="row">${esc(f.nombre)}</th><td class="num">${conSup(cantidad(f.e.log10))}</td><td class="num">${conSup(duracion(f.e.log10 - 3))}</td><td class="num"><strong>${f.min}</strong></td><td>${esc(f.e.supuesto)}</td></tr>`).join('');
  return filas;
}

// barras horizontales: número de cifras de las entradas posibles (tope en 45, el correo se corta)
function grafica(filas) {
  const TOPE = 45; const W = 640; const fila = 34; const izq = 150; const der = 100;
  const H = filas.length * fila + 30;
  const ancho = W - izq - der;
  const x = (v) => izq + (Math.min(v, TOPE) / TOPE) * ancho;
  let s = `<svg class="grafica" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="g-exh-t"><title id="g-exh-t">Cifras de la cantidad de entradas posibles por campo: ${filas.map((f) => `${f.nombre}, ${Math.floor(f.e.log10) + 1} cifras frente a ${f.min} pruebas`).join('; ')}.</title>`;
  for (const v of [0, 10, 20, 30, 40]) s += `<line x1="${x(v)}" y1="4" x2="${x(v)}" y2="${H - 22}" class="g-reji"/><text x="${x(v)}" y="${H - 6}" text-anchor="middle" class="g-eje">${v}</text>`;
  filas.forEach((f, i) => {
    const y = 8 + i * fila;
    const cifras = Math.floor(f.e.log10) + 1;
    const corta = cifras > TOPE;
    s += `<text x="${izq - 8}" y="${y + 17}" text-anchor="end" class="g-rotulo">${esc(f.nombre)}</text>`;
    s += `<rect x="${izq}" y="${y + 2}" width="${Math.max(2, x(cifras) - izq)}" height="20" class="g-barra"/>`;
    if (corta) s += `<path d="M${x(TOPE) - 14} ${y} l8 26 M${x(TOPE) - 7} ${y} l8 26" stroke="var(--papel)" stroke-width="4"/>`;
    s += corta
      ? `<text x="${x(TOPE) - 22}" y="${y + 17}" text-anchor="end" class="g-num claro">${cifras} cifras</text>`
      : `<text x="${x(cifras) + 6}" y="${y + 17}" class="g-num tinta">${cifras}</text>`;
    s += `<text x="${W - 4}" y="${y + 17}" text-anchor="end" class="g-num" fill="var(--rojo-texto)">${f.min} pruebas</text>`;
  });
  s += '</svg>';
  $('g-exh').innerHTML = s;
}

iniciarTema($('tema'));
rectas();
grafica(tablaExhaustivo());
