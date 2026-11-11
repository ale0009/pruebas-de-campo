// Lógica pura: describe un campo de formulario y genera sus casos de prueba mínimos
// con partición de equivalencia (EP) y análisis de valores límite (BVA) según ISTQB CTFL v4.0.
// Sin DOM: se usa desde la página y desde las pruebas `node --test`.

export const TIPOS = {
  entero: 'Número entero',
  texto: 'Texto (longitud)',
  cedula: 'Cédula (dígitos)',
  correo: 'Correo electrónico',
  fecha: 'Fecha',
  select: 'Lista (select)',
};

const POR_DEFECTO = {
  entero: { min: 0, max: 100 },
  texto: { min: 1, max: 50 },
  cedula: { min: 6, max: 10 },
  correo: {},
  fecha: { desde: '2026-12-01', hasta: '2026-12-31' },
  select: { opciones: ['A', 'B', 'C'] },
};

const NOMBRE_POR_TIPO = { entero: 'Número', texto: 'Texto', cedula: 'Cédula', correo: 'Correo', fecha: 'Fecha', select: 'Opción' };

// Correo válido según el estándar HTML (WHATWG, input type=email) + longitudes de RFC 5321.
const RE_CORREO = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
export const CORREO_LOCAL_MAX = 64;
export const CORREO_TOTAL_MAX = 254;

const sinTildes = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const largo = (s) => [...s].length;

// ---------- fechas (ISO AAAA-MM-DD, en UTC para no depender de la zona horaria) ----------
const DIA = 86400000;
export function fechaValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split('-').map(Number);
  const f = new Date(Date.UTC(2000, m - 1, d));
  f.setUTCFullYear(a);
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}
export function aDia(s) {
  const [a, m, d] = s.split('-').map(Number);
  const f = new Date(Date.UTC(2000, m - 1, d));
  f.setUTCFullYear(a);
  return Math.round(f.getTime() / DIA);
}
export function deDia(n) {
  const f = new Date(n * DIA);
  const a = String(f.getUTCFullYear()).padStart(4, '0');
  return `${a}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`;
}
export const sumarDias = (s, n) => deDia(aDia(s) + n);

// ---------- normalizar y validar la definición ----------
export function normalizar(entrada = {}) {
  const tipo = TIPOS[entrada.tipo] ? entrada.tipo : 'texto';
  const c = { tipo, nombre: (entrada.nombre || '').trim() || NOMBRE_POR_TIPO[tipo], obligatorio: entrada.obligatorio !== false };
  const d = POR_DEFECTO[tipo];
  if (tipo === 'entero' || tipo === 'texto' || tipo === 'cedula') {
    c.min = Number.isFinite(+entrada.min) && entrada.min !== '' && entrada.min != null ? Math.trunc(+entrada.min) : d.min;
    c.max = Number.isFinite(+entrada.max) && entrada.max !== '' && entrada.max != null ? Math.trunc(+entrada.max) : d.max;
  } else if (tipo === 'fecha') {
    c.desde = entrada.desde || d.desde;
    c.hasta = entrada.hasta || d.hasta;
  } else if (tipo === 'select') {
    const ops = (Array.isArray(entrada.opciones) ? entrada.opciones : String(entrada.opciones || '').split(','))
      .map((o) => String(o).trim()).filter(Boolean);
    c.opciones = [...new Set(ops)];
    if (!c.opciones.length) c.opciones = [...d.opciones];
    c.opcionesDistintas = entrada.opcionesDistintas !== false;
  }
  return c;
}

// Devuelve un texto con el problema de la definición, o null si es coherente.
export function problema(c) {
  if (c.tipo === 'entero' || c.tipo === 'texto' || c.tipo === 'cedula') {
    if (c.min > c.max) return `El mínimo (${c.min}) es mayor que el máximo (${c.max}).`;
    if (c.tipo !== 'entero' && c.min < 0) return 'Una longitud no puede ser negativa.';
    if (c.tipo === 'cedula' && c.min < 1) return 'La cédula necesita al menos 1 dígito.';
    if (c.tipo !== 'entero' && c.max > 500) return 'Longitud máxima demasiado grande para esta herramienta (500).';
    if (c.tipo === 'entero' && (Math.abs(c.min) > 1e12 || Math.abs(c.max) > 1e12)) return 'Use límites de hasta 12 cifras.';
  }
  if (c.tipo === 'fecha') {
    if (!fechaValida(c.desde) || !fechaValida(c.hasta)) return 'Las fechas deben tener el formato AAAA-MM-DD y existir.';
    if (c.desde > c.hasta) return 'La fecha inicial es posterior a la final.';
  }
  return null;
}

// ---------- el oráculo: ¿el sistema debería aceptar esta entrada? ----------
export function validar(campo, entrada) {
  const c = normalizar(campo);
  const s = String(entrada ?? '');
  if (s.trim() === '') {
    if (c.obligatorio) return { ok: false, motivo: s === '' ? 'vacío y obligatorio' : 'solo espacios y obligatorio' };
    if (s === '' || c.tipo !== 'texto') return { ok: true, motivo: 'vacío permitido (opcional)' };
  }
  switch (c.tipo) {
    case 'entero': {
      const t = s.trim();
      if (!/^[+-]?\d+$/.test(t)) return { ok: false, motivo: /^[+-]?\d+[.,]\d+$/.test(t) ? 'tiene decimales' : 'no es un número' };
      const n = Number(t);
      if (n < c.min) return { ok: false, motivo: `menor que ${c.min}` };
      if (n > c.max) return { ok: false, motivo: `mayor que ${c.max}` };
      return { ok: true, motivo: 'dentro del rango' };
    }
    case 'texto': {
      const L = largo(s);
      if (L < c.min) return { ok: false, motivo: `${L} caracteres, mínimo ${c.min}` };
      if (L > c.max) return { ok: false, motivo: `${L} caracteres, máximo ${c.max}` };
      return { ok: true, motivo: 'longitud permitida' };
    }
    case 'cedula': {
      if (/[.\s-]/.test(s)) return { ok: false, motivo: 'tiene puntos o separadores' };
      if (!/^\d+$/.test(s)) return { ok: false, motivo: 'tiene caracteres que no son dígitos' };
      if (s.length < c.min) return { ok: false, motivo: `${s.length} dígitos, mínimo ${c.min}` };
      if (s.length > c.max) return { ok: false, motivo: `${s.length} dígitos, máximo ${c.max}` };
      return { ok: true, motivo: 'cantidad de dígitos permitida' };
    }
    case 'correo': {
      if (!RE_CORREO.test(s)) return { ok: false, motivo: 'sintaxis de correo no válida' };
      const local = s.slice(0, s.indexOf('@'));
      if (local.length > CORREO_LOCAL_MAX) return { ok: false, motivo: `parte local de ${local.length} caracteres (máx. ${CORREO_LOCAL_MAX})` };
      if (s.length > CORREO_TOTAL_MAX) return { ok: false, motivo: `${s.length} caracteres en total (máx. ${CORREO_TOTAL_MAX})` };
      return { ok: true, motivo: 'correo válido' };
    }
    case 'fecha': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, motivo: 'formato distinto de AAAA-MM-DD' };
      if (!fechaValida(s)) return { ok: false, motivo: 'esa fecha no existe' };
      if (s < c.desde) return { ok: false, motivo: `antes de ${c.desde}` };
      if (s > c.hasta) return { ok: false, motivo: `después de ${c.hasta}` };
      return { ok: true, motivo: 'dentro del rango de fechas' };
    }
    case 'select':
      return c.opciones.includes(s) ? { ok: true, motivo: 'opción de la lista' } : { ok: false, motivo: 'valor que no está en la lista' };
    default:
      return { ok: false, motivo: 'tipo desconocido' };
  }
}

// ---------- generadores de valores ----------
const letras = (n) => 'a'.repeat(Math.max(0, n));
const digitos = (n) => Array.from({ length: Math.max(0, n) }, (_, i) => String((i + 1) % 10)).join('');
const conPuntos = (d) => d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function dominioDe(d) {
  // dominio válido de exactamente d caracteres: etiquetas de hasta 63, terminado en ".co"
  if (d < 4) return 'b'.repeat(Math.max(1, d));
  const partes = [];
  let r = d - 3;
  let k = 0;
  while (r > 0) {
    const t = r <= 63 ? r : Math.min(63, r - 2);
    partes.push('bcdefghijk'[k++ % 10].repeat(t));
    r -= t + (r <= t ? 0 : 1);
  }
  return `${partes.join('.')}.co`;
}
export function correoDeLargo(local, total) {
  const d = total - local - 1;
  return `${letras(local)}@${dominioDe(d)}`;
}

// Muestra corta de una entrada larga, para la tabla en pantalla.
export function muestra(s) {
  if (s === '') return '(vacío)';
  if (s.trim() === '') return `(${largo(s)} espacio${largo(s) === 1 ? '' : 's'})`;
  if (largo(s) <= 24) return s;
  const m = /^(a+)@(.+)$/.exec(s);
  if (m) return `a×${m[1].length}@… (${largo(s)} car.)`;
  if (/^a+$/.test(s)) return `a×${s.length}`;
  if (/^\d+$/.test(s)) return `${s.slice(0, 6)}…${s.slice(-3)} (${s.length} díg.)`;
  return `${[...s].slice(0, 20).join('')}… (${largo(s)} car.)`;
}

// Puntos de límite (valores numéricos) para un rango [a, b] con BVA de 2 o 3 valores.
export function puntosLimite(a, b, modo = 2, piso = -Infinity) {
  const p = modo === 3 ? [a - 1, a, a + 1, b - 1, b, b + 1] : [a - 1, a, b, b + 1];
  return [...new Set(p)].filter((x) => x >= piso).sort((x, y) => x - y);
}

// ---------- generador principal ----------
// Devuelve { campo, eje, clases, casos, conteo } o { error }.
export function generar(entrada, opciones = {}) {
  const c = normalizar(entrada);
  const err = problema(c);
  if (err) return { campo: c, error: err };
  const modo = opciones.bva === 3 ? 3 : 2;
  const clases = [];
  const casos = [];
  let eje = null;
  const clase = (id, nombre, valida, extra = {}) => { clases.push({ id, nombre, valida, ...extra }); return id; };
  const caso = (entradaTxt, claseId, tecnica, porque, x) => {
    const previo = casos.find((k) => k.entrada === entradaTxt);
    if (previo) { // misma entrada para dos razones: se fusiona, no se cuenta dos veces
      if (!previo.porque.includes(porque)) previo.porque += ` · ${porque}`;
      if (!previo.tecnica.includes(tecnica)) previo.tecnica += ` + ${tecnica}`;
      return;
    }
    casos.push({ entrada: entradaTxt, clase: claseId, tecnica, porque, x });
  };
  const vacio = () => {
    if (c.obligatorio) caso('', clase(`I${clases.filter((k) => !k.valida).length + 1}`, 'Vacío', false), 'EP', 'Campo obligatorio: dejarlo vacío debe dar error.');
    else caso('', clase(`V${clases.filter((k) => k.valida).length + 1}`, 'Vacío (opcional)', true), 'EP', 'Campo opcional: vacío se acepta.');
  };
  const nV = () => `V${clases.filter((k) => k.valida).length + 1}`;
  const nI = () => `I${clases.filter((k) => !k.valida).length + 1}`;

  if (c.tipo === 'entero' || c.tipo === 'texto' || c.tipo === 'cedula') {
    const esLong = c.tipo !== 'entero';
    const unidad = c.tipo === 'cedula' ? 'dígitos' : c.tipo === 'texto' ? 'caracteres' : '';
    const piso = c.tipo === 'cedula' ? 1 : esLong ? 0 : -Infinity;
    const hayBajo = c.min - 1 >= piso;
    const iBajo = hayBajo ? clase(nI(), esLong ? `Menos de ${c.min} ${unidad}` : `Menor que ${c.min}`, false, { rango: [-Infinity, c.min - 1] }) : null;
    const v = clase(nV(), esLong ? `De ${c.min} a ${c.max} ${unidad}` : `De ${c.min} a ${c.max}`, true, { rango: [c.min, c.max] });
    const iAlto = clase(nI(), esLong ? `Más de ${c.max} ${unidad}` : `Mayor que ${c.max}`, false, { rango: [c.max + 1, Infinity] });
    eje = { tipo: esLong ? 'longitud' : 'numero', min: c.min, max: c.max, unidad, piso };
    const valor = (n) => (c.tipo === 'entero' ? String(n) : c.tipo === 'cedula' ? digitos(n) : letras(n));
    for (const n of puntosLimite(c.min, c.max, modo, piso)) {
      const dentro = n >= c.min && n <= c.max;
      const cl = dentro ? v : n < c.min ? iBajo : iAlto;
      const rol = n === c.min ? 'el mínimo' : n === c.max ? 'el máximo' : n === c.min - 1 ? 'justo debajo del mínimo' : n === c.max + 1 ? 'justo encima del máximo' : n === c.min + 1 ? 'el vecino interior del mínimo' : 'el vecino interior del máximo';
      const que = esLong ? `${n} ${unidad}` : String(n);
      const porque = `Límite: ${que} es ${rol}; ${dentro ? 'debe aceptarse' : 'debe rechazarse'}.`;
      if (esLong && n === 0) caso('', cl, 'BVA', porque, n);
      else caso(valor(n), cl, 'BVA', porque, n);
    }
    if (c.tipo === 'entero') {
      caso('abc', clase(nI(), 'No numérico', false), 'EP', 'Letras en un campo numérico: otra clase inválida.');
      const medio = Math.floor((c.min + c.max) / 2);
      caso(`${medio}.5`, clase(nI(), 'Con decimales', false), 'EP', 'Decimal dentro del rango: un entero no admite fracciones.');
    } else if (c.tipo === 'cedula') {
      const base = digitos(Math.max(c.min, 1));
      caso(`${base.slice(0, -1)}A`, clase(nI(), 'Con letras', false), 'EP', `${c.min} caracteres pero uno es una letra.`);
      const lp = Math.min(Math.max(c.min, 7), c.max);
      if (lp >= 4) caso(conPuntos(digitos(lp)), clase(nI(), 'Con puntos de miles', false), 'EP', 'Formato «1.234.567»: muy común al escribir una cédula.');
    } else if (c.obligatorio) {
      const n = Math.max(c.min, 1);
      if (n <= c.max) caso(' '.repeat(n), clase(nI(), 'Solo espacios', false), 'EP', `${n} espacio${n === 1 ? '' : 's'}: cumple la longitud pero no tiene contenido.`);
    }
    // vacío: en texto puede coincidir con un límite (0 caracteres); se fusiona.
    const yaVacio = casos.find((k) => k.entrada === '');
    if (yaVacio) {
      if (c.obligatorio && c.min <= 0) { // 0 es válido por longitud pero el campo es obligatorio
        yaVacio.clase = clase(nI(), 'Vacío', false);
        yaVacio.porque = 'Longitud 0 está en el rango, pero el campo es obligatorio: debe rechazarse.';
        yaVacio.tecnica = 'BVA + EP';
        yaVacio.x = undefined;
      } else if (c.obligatorio) {
        yaVacio.porque += ' · También cubre «vacío» en un campo obligatorio.';
        yaVacio.tecnica = 'BVA + EP';
      } else {
        yaVacio.clase = clase(nV(), 'Vacío (opcional)', true);
        yaVacio.porque = 'Campo opcional: vacío se acepta aunque el mínimo sea mayor que 0.';
        yaVacio.tecnica = 'EP';
        yaVacio.x = undefined;
      }
    } else vacio();
  } else if (c.tipo === 'fecha') {
    const a = aDia(c.desde); const b = aDia(c.hasta);
    eje = { tipo: 'fecha', min: a, max: b, desde: c.desde, hasta: c.hasta };
    const iAntes = clase(nI(), `Antes de ${c.desde}`, false, { rango: [-Infinity, a - 1] });
    const v = clase(nV(), `De ${c.desde} a ${c.hasta}`, true, { rango: [a, b] });
    const iDespues = clase(nI(), `Después de ${c.hasta}`, false, { rango: [b + 1, Infinity] });
    for (const n of puntosLimite(a, b, modo)) {
      const dentro = n >= a && n <= b;
      const rol = n === a ? 'el primer día permitido' : n === b ? 'el último día permitido' : n === a - 1 ? 'el día anterior al rango' : n === b + 1 ? 'el día siguiente al rango' : 'vecino interior de un límite';
      caso(deDia(n), dentro ? v : n < a ? iAntes : iDespues, 'BVA', `Límite: ${rol}; ${dentro ? 'debe aceptarse' : 'debe rechazarse'}.`, n);
    }
    const anio = c.desde.slice(0, 4);
    caso(`${anio}-02-30`, clase(nI(), 'Fecha inexistente', false), 'EP', 'El 30 de febrero no existe: el sistema no debe «corregirla» a marzo.');
    const [y, m, d] = c.desde.split('-');
    caso(`${d}/${m}/${y}`, clase(nI(), 'Otro formato (DD/MM/AAAA)', false), 'EP', 'Mismo día, otro formato: se espera AAAA-MM-DD.');
    vacio();
  } else if (c.tipo === 'correo') {
    const vSint = clase(nV(), 'Sintaxis válida, longitudes permitidas', true);
    const iLocal = clase(nI(), `Parte local de más de ${CORREO_LOCAL_MAX}`, false);
    const iTotal = clase(nI(), `Más de ${CORREO_TOTAL_MAX} caracteres`, false);
    const locales = modo === 3 ? [CORREO_LOCAL_MAX - 1, CORREO_LOCAL_MAX, CORREO_LOCAL_MAX + 1] : [CORREO_LOCAL_MAX, CORREO_LOCAL_MAX + 1];
    for (const n of locales) {
      const s = `${letras(n)}@ejemplo.co`;
      caso(s, n > CORREO_LOCAL_MAX ? iLocal : vSint, 'BVA', `Límite de la parte local (RFC 5321): ${n} caracteres antes de la @; ${n > CORREO_LOCAL_MAX ? 'debe rechazarse' : 'debe aceptarse'}.`, n);
    }
    const totales = modo === 3 ? [CORREO_TOTAL_MAX - 1, CORREO_TOTAL_MAX, CORREO_TOTAL_MAX + 1] : [CORREO_TOTAL_MAX, CORREO_TOTAL_MAX + 1];
    for (const n of totales) {
      caso(correoDeLargo(CORREO_LOCAL_MAX, n), n > CORREO_TOTAL_MAX ? iTotal : vSint, 'BVA', `Límite de longitud total: ${n} caracteres; ${n > CORREO_TOTAL_MAX ? 'debe rechazarse' : 'debe aceptarse'}.`, n);
    }
    caso('ana.ejemplo.co', clase(nI(), 'Sin @', false), 'EP', 'Falta la @.');
    caso('@ejemplo.co', clase(nI(), 'Sin usuario', false), 'EP', 'Nada antes de la @.');
    caso('ana@', clase(nI(), 'Sin dominio', false), 'EP', 'Nada después de la @.');
    caso('ana@@ejemplo.co', clase(nI(), 'Dos @', false), 'EP', 'Más de una @.');
    caso('ana maria@ejemplo.co', clase(nI(), 'Con espacio', false), 'EP', 'Los espacios no se admiten sin comillas.');
    vacio();
  } else if (c.tipo === 'select') {
    if (c.opcionesDistintas) {
      for (const o of c.opciones) caso(o, clase(nV(), `«${o}»`, true), 'EP', `Cada opción puede cambiar el comportamiento: «${o}» es su propia clase.`);
    } else {
      caso(c.opciones[0], clase(nV(), 'Cualquier opción de la lista', true), 'EP', 'Las opciones se comportan igual: basta una como representante.');
    }
    let fuera = 'OTRO';
    while (c.opciones.includes(fuera)) fuera += 'X';
    caso(fuera, clase(nI(), 'Valor fuera de la lista', false), 'EP', 'Petición manipulada (consola o API): la interfaz no lo deja elegir, el servidor debe rechazarlo.');
    vacio();
  }

  // resultado esperado según el oráculo + identificadores
  casos.forEach((k, i) => {
    const r = validar(c, k.entrada);
    k.id = `CP${String(i + 1).padStart(2, '0')}`;
    k.esperado = r.ok ? 'Acepta' : 'Rechaza';
    k.motivo = r.motivo;
    k.muestra = muestra(k.entrada);
  });
  // ordenar: los del eje primero (por posición), luego el resto en orden de aparición
  const conX = casos.filter((k) => Number.isFinite(k.x)).sort((p, q) => p.x - q.x);
  const sinX = casos.filter((k) => !Number.isFinite(k.x));
  const orden = [...conX, ...sinX];
  orden.forEach((k, i) => { k.id = `CP${String(i + 1).padStart(2, '0')}`; });

  const conteo = {
    total: orden.length,
    clases: clases.length,
    validas: clases.filter((k) => k.valida).length,
    invalidas: clases.filter((k) => !k.valida).length,
    limites: orden.filter((k) => k.tecnica.includes('BVA')).length,
    aceptan: orden.filter((k) => k.esperado === 'Acepta').length,
    rechazan: orden.filter((k) => k.esperado === 'Rechaza').length,
  };
  return { campo: c, modo, eje, clases, casos: orden, conteo };
}

// ---------- ¿cuántas entradas tendría una prueba exhaustiva? (calculado aquí) ----------
const log10Suma = (base, nMax) => { // log10( Σ_{L=0}^{nMax} base^L )
  if (nMax <= 40) { let s = 0; for (let L = 0; L <= nMax; L++) s += base ** L; return Math.log10(s); }
  return (nMax + 1) * Math.log10(base) - Math.log10(base - 1);
};
export const DIAS_0001_9999 = aDia('9999-12-31') - aDia('0001-01-01') + 1;

export function exhaustivo(campo) {
  const c = normalizar(campo);
  switch (c.tipo) {
    case 'entero': return { log10: 32 * Math.log10(2), supuesto: 'todos los enteros de 32 bits (sin contar letras ni decimales)' };
    case 'texto': return { log10: log10Suma(95, c.max + 1), supuesto: `todas las cadenas de 0 a ${c.max + 1} caracteres con los 95 caracteres ASCII imprimibles` };
    case 'cedula': return { log10: log10Suma(10, c.max + 1), supuesto: `todas las cadenas de solo dígitos de 0 a ${c.max + 1} cifras (sin contar letras)` };
    case 'correo': return { log10: log10Suma(95, CORREO_TOTAL_MAX + 1), supuesto: `todas las cadenas ASCII imprimibles de hasta ${CORREO_TOTAL_MAX + 1} caracteres` };
    case 'fecha': return { log10: Math.log10(DIAS_0001_9999), supuesto: 'todas las fechas reales del año 0001 al 9999 (sin contar textos mal escritos)' };
    case 'select': return { log10: Math.log10(c.opciones.length + 1), supuesto: 'lo que deja elegir la interfaz: cada opción y «sin elegir»' };
    default: return { log10: 0, supuesto: '' };
  }
}

// ---------- interpretar una descripción en español ----------
export function interpretar(texto) {
  const original = String(texto || '').trim();
  const t = sinTildes(original.toLowerCase());
  let tipo;
  let listaTras = /:\s*([^:]+,[^:]+)$/.exec(original);
  if (listaTras && /\bentre\b|\d+\s*(a|y|-)\s*\d+|caracteres|digitos/.test(sinTildes(listaTras[1].toLowerCase()))) listaTras = null;
  if (listaTras || /\b(select|desplegable|lista de|una de las opciones|opciones)\b/.test(t)) tipo = 'select';
  else if (/\b(correo|e-?mail|email)\b/.test(t)) tipo = 'correo';
  else if (/\b(cedula|documento de identidad|dni|nuip)\b/.test(t)) tipo = 'cedula';
  else if (/\bfecha\b|\bnacimiento\b|\d{4}-\d{2}-\d{2}/.test(t)) tipo = 'fecha';
  else if (/\b(texto|caracteres|letras|longitud|nombre|apellido|comentario|direccion|contrasena|usuario|descripcion)\b/.test(t)) tipo = 'texto';
  else if (/\b(edad|enter[oa]|numero|cantidad|anos|unidades|cuotas|puntaje|nota)\b/.test(t) || /\d/.test(t)) tipo = 'entero';
  else tipo = 'texto';

  const c = { tipo };
  if (/\bopcional\b|no obligatori|no es obligatori|no requerid/.test(t)) c.obligatorio = false;
  else c.obligatorio = true;

  // nombre: lo que va antes del primer conector
  let nombre = original.replace(/^(campo|un|una|el|la)\s+/i, '');
  const corte = /\s+(enter[oa]s?|entre|con|desde|de\s+-?\d|que|obligatori[oa]|opcional|texto|cadena|n[uú]mero)\b|[,:(]/i.exec(nombre);
  if (corte && corte.index > 0) nombre = nombre.slice(0, corte.index);
  nombre = nombre.trim().slice(0, 30);
  if (nombre) c.nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);

  if (tipo === 'fecha') {
    const f = original.match(/\d{4}-\d{2}-\d{2}/g) || [];
    if (f.length >= 2) [c.desde, c.hasta] = [f[0], f[1]].sort();
  } else if (tipo === 'select') {
    const lista = listaTras ? listaTras[1] : (original.split(':')[1] || '');
    c.opciones = lista.split(/,|\s+o\s+|\s+y\s+|\//).map((s) => s.replace(/[.;]$/, '').trim()).filter(Boolean);
    if (/(se comportan igual|equivalentes|da igual)/.test(t)) c.opcionesDistintas = false;
  } else if (tipo !== 'correo') {
    const nums = (t.match(/-?\d+/g) || []).map(Number);
    if (nums.length >= 2) { c.min = Math.min(nums[0], nums[1]); c.max = Math.max(nums[0], nums[1]); }
    else if (nums.length === 1) {
      if (/(max|maximo|hasta|como mucho|a lo sumo)\D*\d/.test(t)) c.max = nums[0];
      else if (/(min|minimo|al menos|desde|como minimo)\D*\d/.test(t)) c.min = nums[0];
      else if (tipo === 'cedula' || tipo === 'texto') { c.min = nums[0]; c.max = nums[0]; } // «exactamente n»
      else c.max = nums[0];
    }
  }
  return normalizar(c);
}

// La descripción canónica de un campo (para sincronizar los controles con el cuadro de texto).
export function describir(campo) {
  const c = normalizar(campo);
  const ob = c.obligatorio ? 'obligatorio' : 'opcional';
  const n = c.nombre;
  const tiene = (k) => sinTildes(n.toLowerCase()).includes(k);
  switch (c.tipo) {
    case 'entero': return `${n}, entero entre ${c.min} y ${c.max}, ${ob}`;
    case 'texto': return `${n}, ${tiene('texto') ? '' : 'texto '}de ${c.min} a ${c.max} caracteres, ${ob}`;
    case 'cedula': return `${n}${tiene('cedula') ? '' : ', cédula'} de ${c.min} a ${c.max} dígitos, ${ob}`;
    case 'correo': return `${n}${tiene('correo') ? '' : ', correo electrónico'}, ${ob}`;
    case 'fecha': return `${n}${tiene('fecha') ? '' : ', fecha'} entre ${c.desde} y ${c.hasta}, ${ob}`;
    case 'select': return `${n}, lista${c.opcionesDistintas ? '' : ' (opciones equivalentes)'}, ${ob}: ${c.opciones.join(', ')}`;
    default: return n;
  }
}
