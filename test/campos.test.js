import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  generar, validar, interpretar, describir, exhaustivo, puntosLimite, correoDeLargo, fechaValida, sumarDias, DIAS_0001_9999, problema, normalizar,
} from '../js/campos.js';

const M = JSON.parse(readFileSync(new URL('./muestras.json', import.meta.url)));
const entradas = (r) => r.casos.map((k) => k.entrada);

test('edad 18–65 obligatoria: 7 casos con BVA de 2 valores', () => {
  const r = generar(interpretar('edad entera entre 18 y 65, obligatoria'));
  assert.equal(r.conteo.total, 7);
  assert.deepEqual(entradas(r).slice(0, 4), ['17', '18', '65', '66']);
  assert.deepEqual(r.casos.slice(0, 4).map((k) => k.esperado), ['Rechaza', 'Acepta', 'Acepta', 'Rechaza']);
  assert.ok(entradas(r).includes(''));
  assert.ok(entradas(r).includes('abc'));
});

test('BVA de 3 valores agrega los vecinos interiores', () => {
  const r = generar({ tipo: 'entero', min: 18, max: 65 }, { bva: 3 });
  assert.deepEqual(entradas(r).slice(0, 6), ['17', '18', '19', '64', '65', '66']);
  assert.equal(r.conteo.total, 9);
});

test('puntosLimite no duplica cuando el rango es de un solo valor', () => {
  assert.deepEqual(puntosLimite(5, 5, 2), [4, 5, 6]);
  assert.deepEqual(puntosLimite(5, 6, 3), [4, 5, 6, 7]);
  assert.deepEqual(puntosLimite(0, 10, 2, 0), [0, 10, 11]);
});

test('ejemplo de clase (edad 18–60): los límites caen donde el cuadro decía', () => {
  const { min, max } = M.edad_clase;
  const r = generar({ tipo: 'entero', nombre: 'Edad', min, max });
  const rech = r.casos.filter((k) => k.esperado === 'Rechaza').map((k) => k.entrada);
  assert.ok(rech.includes('17') && rech.includes('61'));
  assert.equal(validar({ tipo: 'entero', min, max }, '60').ok, true);
});

test('todos los presets dan el conteo documentado', () => {
  for (const p of M.presets) {
    const c = interpretar(p.texto);
    assert.equal(c.tipo, p.tipo, p.texto);
    assert.equal(generar(c).conteo.total, p.total2, p.texto);
  }
});

test('propiedad: el resultado esperado de cada caso coincide con el oráculo (todos los tipos, 2 y 3 valores)', () => {
  const campos = [
    ...M.presets.map((p) => interpretar(p.texto)),
    { tipo: 'entero', min: -5, max: 5, obligatorio: false },
    { tipo: 'texto', min: 0, max: 3, obligatorio: true },
    { tipo: 'texto', min: 0, max: 3, obligatorio: false },
    { tipo: 'texto', min: 1, max: 1 },
    { tipo: 'cedula', min: 1, max: 2, obligatorio: false },
    { tipo: 'select', opciones: ['OTRO', 'OTROX'], opcionesDistintas: false },
  ];
  for (const c of campos) for (const bva of [2, 3]) {
    const r = generar(c, { bva });
    assert.ok(!r.error, JSON.stringify(c));
    for (const k of r.casos) assert.equal(k.esperado, validar(c, k.entrada).ok ? 'Acepta' : 'Rechaza', `${JSON.stringify(c)} ${k.entrada}`);
    assert.equal(new Set(entradas(r)).size, r.casos.length, 'sin entradas repetidas');
  }
});

test('cobertura EP: cada clase tiene al menos un caso', () => {
  for (const p of M.presets) {
    const r = generar(interpretar(p.texto));
    for (const cl of r.clases) assert.ok(r.casos.some((k) => k.clase === cl.id), `${p.texto}: ${cl.nombre}`);
  }
});

test('campo opcional: vacío se acepta', () => {
  const r = generar({ tipo: 'entero', min: 1, max: 9, obligatorio: false });
  assert.equal(r.casos.find((k) => k.entrada === '').esperado, 'Acepta');
});

test('texto con mínimo 0 y obligatorio: el vacío está en el rango pero se rechaza', () => {
  const r = generar({ tipo: 'texto', min: 0, max: 5, obligatorio: true });
  const v = r.casos.find((k) => k.entrada === '');
  assert.equal(v.esperado, 'Rechaza');
  assert.match(v.porque, /obligatorio/);
});

test('cédula: puntos de miles y letras se rechazan; 6 y 10 dígitos se aceptan', () => {
  const c = { tipo: 'cedula', min: 6, max: 10 };
  assert.equal(validar(c, '1.234.567').ok, false);
  assert.equal(validar(c, '12345A').ok, false);
  assert.equal(validar(c, '123456').ok, true);
  assert.equal(validar(c, '1234567890').ok, true);
  assert.equal(validar(c, '12345678901').ok, false);
});

test('correo: límites de RFC 5321 (64 local, 254 total) y sintaxis WHATWG', () => {
  const c = { tipo: 'correo' };
  assert.equal(correoDeLargo(64, 254).length, 254);
  assert.equal(correoDeLargo(64, 255).length, 255);
  assert.equal(validar(c, correoDeLargo(64, 254)).ok, true);
  assert.equal(validar(c, correoDeLargo(64, 255)).ok, false);
  assert.equal(validar(c, `${'a'.repeat(65)}@ejemplo.co`).ok, false);
  assert.equal(validar(c, 'ana@ejemplo').ok, true, 'el estándar HTML acepta dominios sin punto');
  for (const malo of ['ana.ejemplo.co', '@ejemplo.co', 'ana@', 'ana@@ejemplo.co', 'ana maria@ejemplo.co']) assert.equal(validar(c, malo).ok, false, malo);
});

test('fecha: límites del rango, 30 de febrero y otro formato', () => {
  const c = { tipo: 'fecha', desde: '2026-12-01', hasta: '2026-12-31' };
  const r = generar(c);
  assert.deepEqual(entradas(r).slice(0, 4), ['2026-11-30', '2026-12-01', '2026-12-31', '2027-01-01']);
  assert.equal(fechaValida('2026-02-30'), false);
  assert.equal(fechaValida('2028-02-29'), true);
  assert.equal(sumarDias('2028-02-28', 1), '2028-02-29');
  assert.equal(validar(c, '01/12/2026').ok, false);
});

test('select: cada opción es una clase; con opciones equivalentes basta una', () => {
  const r = generar(interpretar('tipo de documento: CC, CE, TI, PA'));
  assert.deepEqual(r.campo.opciones, ['CC', 'CE', 'TI', 'PA']);
  assert.equal(r.conteo.validas, 4);
  const r2 = generar({ ...r.campo, opcionesDistintas: false });
  assert.equal(r2.conteo.total, 3);
  assert.ok(r.casos.some((k) => k.entrada === 'OTRO' && k.esperado === 'Rechaza'));
});

test('interpretar: nombre, obligatoriedad y rangos en distintas redacciones', () => {
  assert.deepEqual(interpretar('Cantidad de artículos de 1 a 10, opcional'), normalizar({ tipo: 'entero', nombre: 'Cantidad de artículos', min: 1, max: 10, obligatorio: false }));
  assert.equal(interpretar('comentario, máximo 200 caracteres').max, 200);
  assert.equal(interpretar('edad: entre 18 y 60').tipo, 'entero');
  assert.equal(interpretar('e-mail del cliente').tipo, 'correo');
  assert.equal(interpretar('fecha de nacimiento entre 1900-01-01 y 2008-11-10').hasta, '2008-11-10');
});

test('describir e interpretar son inversos para los presets', () => {
  for (const p of M.presets) {
    const c = interpretar(p.texto);
    assert.deepEqual(interpretar(describir(c)), c, describir(c));
  }
});

test('problema(): detecta definiciones incoherentes', () => {
  assert.match(problema(normalizar({ tipo: 'entero', min: 10, max: 1 })), /mayor/);
  assert.match(problema(normalizar({ tipo: 'fecha', desde: '2026-02-30', hasta: '2026-03-01' })), /existir/);
  assert.ok(generar({ tipo: 'texto', min: 5, max: 2 }).error);
  assert.equal(problema(normalizar({ tipo: 'cedula', min: 6, max: 10 })), null);
});

test('exhaustivo (calculado aquí): 2^32 enteros, 3.652.059 fechas, select = opciones + 1', () => {
  assert.equal(Math.round(10 ** exhaustivo({ tipo: 'entero' }).log10), 4294967296);
  assert.equal(DIAS_0001_9999, 3652059);
  assert.equal(Math.round(10 ** exhaustivo({ tipo: 'select', opciones: ['a', 'b', 'c', 'd'] }).log10), 5);
  const cor = exhaustivo({ tipo: 'correo' }).log10;
  assert.ok(cor > 504 && cor < 505, String(cor));
});
