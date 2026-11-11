// Recta numérica esquemática de las clases (SVG). Escala por tramos: los límites quedan
// separados aunque estén a 1 de distancia, y el interior de la clase válida se comprime.
import { deDia } from './campos.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function posicion(n, eje, x) {
  const { min, max } = eje;
  const G = x.g;
  if (n < min) return x.vIni - G / 2 - (min - 1 - n) * G;
  if (n > max) return x.vFin + G / 2 + (n - max - 1) * G;
  if (n - min <= max - n) return x.vIni + G / 2 + (n - min) * G;
  return x.vFin - G / 2 - (max - n) * G;
}

export function recta(res, { compacto = false } = {}) {
  const { eje, clases, casos } = res;
  if (!eje) return '';
  const W = compacto ? 440 : 820; const H = 172; const Y = 72;
  const bajo = clases.find((k) => !k.valida && k.rango && k.rango[1] < eje.min);
  const alto = clases.find((k) => !k.valida && k.rango && k.rango[0] > eje.max);
  const valida = clases.find((k) => k.valida && k.rango);
  const x = compacto
    ? { ini: 8, vIni: bajo ? 128 : 22, vFin: 312, fin: 432, g: 34 }
    : { ini: 20, vIni: bajo ? 250 : 40, vFin: 570, fin: 800, g: 44 };
  const fmt = (n) => (eje.tipo === 'fecha' ? deDia(n) : String(n));
  const corto = (n) => (eje.tipo === 'fecha' && compacto ? deDia(n).slice(5) : fmt(n));
  const unidad = eje.tipo === 'longitud' ? ` ${eje.unidad}` : '';
  const partes = [];
  partes.push(`<svg class="g-recta${compacto ? ' compacto' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="recta-t"><title id="recta-t">Recta de ${esc(res.campo.nombre)}: ${clases.filter((k) => k.rango).map((k) => `${k.id} ${k.nombre}`).join('; ')}. Puntos: ${casos.filter((k) => Number.isFinite(k.x)).map((k) => `${fmt(k.x)} ${k.esperado.toLowerCase()}`).join(', ')}.</title>`);
  partes.push('<defs><pattern id="rayado" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" class="r-fondo"/><line x1="0" y1="0" x2="0" y2="8" class="r-raya"/></pattern></defs>');
  // bandas
  const banda = (x1, x2, cls, et) => {
    partes.push(`<rect x="${x1}" y="${Y - 34}" width="${x2 - x1}" height="34" class="${cls}"/>`);
    partes.push(`<text x="${(x1 + x2) / 2}" y="${Y - 42}" text-anchor="middle" class="r-et">${esc(et)}</text>`);
  };
  const et = (k) => (compacto ? k.id : `${k.id} · ${k.nombre}`);
  if (bajo) banda(x.ini, x.vIni, 'r-inv', et(bajo));
  banda(x.vIni, x.vFin, 'r-val', et(valida));
  if (alto) banda(x.vFin, x.fin, 'r-inv', et(alto));
  // línea y flechas
  partes.push(`<line x1="${x.ini}" y1="${Y}" x2="${x.fin}" y2="${Y}" class="r-linea"/>`);
  partes.push(`<path d="M${x.fin} ${Y}l-10 -6v12z" class="r-punta"/>`);
  if (bajo) partes.push(`<path d="M${x.ini} ${Y}l10 -6v12z" class="r-punta"/>`);
  else partes.push(`<line x1="${x.vIni}" y1="${Y - 8}" x2="${x.vIni}" y2="${Y + 8}" class="r-linea"/>`);
  // fronteras
  for (const xf of [x.vIni, x.vFin]) partes.push(`<line x1="${xf}" y1="${Y - 34}" x2="${xf}" y2="${Y + 10}" class="r-frontera"/>`);
  // puntos de prueba
  const pts = casos.filter((k) => Number.isFinite(k.x)).sort((a, b) => a.x - b.x);
  pts.forEach((k, i) => {
    const px = posicion(k.x, eje, x);
    const ok = k.esperado === 'Acepta';
    const fila2 = i % 2 === 1;
    const ty = fila2 ? Y + 64 : Y + 26;
    partes.push(`<g class="r-pt ${ok ? 'ok' : 'no'}"><title>${esc(k.id)}: ${esc(fmt(k.x))}${esc(unidad)} → ${esc(k.esperado)}</title>`);
    partes.push(`<circle cx="${px}" cy="${Y}" r="7"/>`);
    partes.push(`<line x1="${px}" y1="${Y + 8}" x2="${px}" y2="${ty - 12}" class="r-guia"/>`);
    partes.push(`<text x="${px}" y="${ty}" text-anchor="middle" class="r-num">${esc(corto(k.x))}</text>`);
    partes.push(`<text x="${px}" y="${ty + 14}" text-anchor="middle" class="r-id">${esc(k.id)}</text></g>`);
  });
  // compresión del interior
  if (eje.max - eje.min > 3) {
    const cx = (x.vIni + x.vFin) / 2;
    partes.push(`<text x="${cx}" y="${Y - 12}" text-anchor="middle" class="r-nota">··· ${eje.max - eje.min - (res.modo === 3 ? 3 : 1)} valores más dentro ···</text>`);
  }
  partes.push(`<text x="${x.fin}" y="${H - 6}" text-anchor="end" class="r-nota">${eje.tipo === 'fecha' ? 'días' : eje.tipo === 'longitud' ? `longitud en ${esc(eje.unidad)}` : 'valor'} · escala esquemática</text>`);
  partes.push('</svg>');
  return partes.join('');
}
