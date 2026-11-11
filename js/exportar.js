// Exporta los casos generados a CSV (RFC 4180) y a Gherkin (español o inglés). Funciones puras.

const comillas = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) || s !== s.trim() || s === '' ? `"${s.replace(/"/g, '""')}"` : s;
};

export function aCSV(res) {
  const filas = [['id', 'campo', 'tecnica', 'clase', 'entrada', 'esperado', 'porque']];
  const nombreClase = Object.fromEntries(res.clases.map((k) => [k.id, `${k.id} ${k.nombre}`]));
  for (const k of res.casos) filas.push([k.id, res.campo.nombre, k.tecnica, nombreClase[k.clase], k.entrada, k.esperado, k.porque]);
  return filas.map((f) => f.map(comillas).join(',')).join('\r\n') + '\r\n';
}

const celda = (v) => String(v ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, '\\n');

const TEXTOS = {
  es: {
    cab: '# language: es', car: 'Característica', esq: 'Esquema del escenario', dado: 'Dado', cuando: 'Cuando', y: 'Y', entonces: 'Entonces', ej: 'Ejemplos',
    titulo: (n) => `Validación del campo «${n}»`,
    desc: (m) => `Casos mínimos: partición de equivalencia y análisis de valores límite de ${m} valores (ISTQB).`,
    paso1: 'que estoy en el formulario', paso2: (n) => `ingreso "<entrada>" en el campo "${n}"`, paso3: 'envío el formulario',
    paso4: 'el sistema <resultado> el valor', acepta: 'acepta', rechaza: 'rechaza', cols: ['id', 'entrada', 'resultado', 'porque'],
  },
  en: {
    cab: '# language: en', car: 'Feature', esq: 'Scenario Outline', dado: 'Given', cuando: 'When', y: 'And', entonces: 'Then', ej: 'Examples',
    titulo: (n) => `Validation of the "${n}" field`,
    desc: (m) => `Minimal cases: equivalence partitioning and ${m}-value boundary value analysis (ISTQB).`,
    paso1: 'I am on the form', paso2: (n) => `I enter "<entrada>" in the "${n}" field`, paso3: 'I submit the form',
    paso4: 'the system <resultado> the value', acepta: 'accepts', rechaza: 'rejects', cols: ['id', 'entrada', 'resultado', 'porque'],
  },
};

export function aGherkin(res, idioma = 'es') {
  const t = TEXTOS[idioma] || TEXTOS.es;
  const n = res.campo.nombre.replace(/"/g, "'");
  const filas = [t.cols, ...res.casos.map((k) => [k.id, k.entrada, k.esperado === 'Acepta' ? t.acepta : t.rechaza, k.porque])].map((f) => f.map(celda));
  const anchos = t.cols.map((_, i) => Math.max(...filas.map((f) => [...f[i]].length)));
  const linea = (f) => `      | ${f.map((v, i) => v + ' '.repeat(anchos[i] - [...v].length)).join(' | ')} |`;
  return [
    t.cab,
    `${t.car}: ${t.titulo(n)}`,
    `  ${t.desc(res.modo)}`,
    '',
    `  ${t.esq}: <id> ${n} = "<entrada>"`,
    `    ${t.dado} ${t.paso1}`,
    `    ${t.cuando} ${t.paso2(n)}`,
    `    ${t.y} ${t.paso3}`,
    `    ${t.entonces} ${t.paso4}`,
    '',
    `    ${t.ej}:`,
    ...filas.map(linea),
    '',
  ].join('\n');
}
