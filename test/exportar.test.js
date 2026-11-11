import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generar, interpretar } from '../js/campos.js';
import { aCSV, aGherkin } from '../js/exportar.js';
import { tablaDecision, combinar } from '../js/decision.js';
import { cantidad, duracion, miles } from '../js/formato.js';

const edad = generar(interpretar('edad entera entre 18 y 65, obligatoria'));

test('CSV: cabecera, una fila por caso y comillas en vacíos', () => {
  const csv = aCSV(edad).trim().split('\r\n');
  assert.equal(csv[0], 'id,campo,tecnica,clase,entrada,esperado,porque');
  assert.equal(csv.length, 1 + edad.casos.length);
  assert.ok(csv.some((l) => l.includes(',"",Rechaza,')));
});

test('CSV: escapa comillas y comas', () => {
  const r = generar({ tipo: 'select', nombre: 'Ciudad', opciones: ['Bogotá, D.C.', 'Cali "la sucursal"'] });
  const csv = aCSV(r);
  assert.ok(csv.includes('"Bogotá, D.C."'));
  assert.ok(csv.includes('"Cali ""la sucursal"""'));
});

test('Gherkin en español y en inglés con su tabla de ejemplos', () => {
  const es = aGherkin(edad, 'es');
  assert.match(es, /^# language: es\nCaracterística: Validación del campo «Edad»/);
  assert.match(es, /Esquema del escenario/);
  assert.equal((es.match(/^ {6}\| CP\d\d/gm) || []).length, edad.casos.length);
  const en = aGherkin(edad, 'en');
  assert.match(en, /Scenario Outline/);
  assert.match(en, /\| rejects /);
});

test('Gherkin escapa barras verticales', () => {
  const r = generar({ tipo: 'select', opciones: ['a|b', 'c'] });
  assert.ok(aGherkin(r).includes('a\\|b'));
});

test('tabla de decisión: 2^n reglas completas y n+1 colapsadas', () => {
  const t = tablaDecision(['Edad', 'Correo', 'Tipo']);
  assert.equal(t.completa.length, 8);
  assert.equal(t.colapsada.length, 4);
  assert.equal(t.completa[0].registra, true);
  assert.deepEqual(t.completa[7].errores, ['Edad', 'Correo', 'Tipo']);
  assert.deepEqual(t.colapsada[2].valores, [null, false, null]);
});

test('combinar: producto de combinaciones frente al mínimo ISTQB', () => {
  const r = [edad, generar(interpretar('correo electrónico, obligatorio')), generar(interpretar('tipo de documento: CC, CE, TI, PA'))];
  const c = combinar(r);
  assert.equal(c.producto, 7 * 10 * 6);
  assert.equal(c.minimo, 4 + 5 + 8 + 2);
});

test('formato de cifras', () => {
  assert.equal(miles(4294967296), '4.294.967.296');
  assert.deepEqual(cantidad(9.633), { texto: miles(10 ** 9.633), exp: null });
  assert.equal(cantidad(504.3).exp, 504);
  assert.equal(duracion(Math.log10(4294967296 / 1000)).texto, '49,7 días');
});
