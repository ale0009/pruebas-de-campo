// Tabla de decisión para combinar 2 o 3 campos de un formulario (ISTQB CTFL v4.0, 4.2.3).
// Condición i: «el campo i es válido» (S/N). Acción: registrar o mostrar el error de cada campo inválido.

export function tablaDecision(nombres) {
  const n = nombres.length;
  const completa = [];
  for (let m = 0; m < 2 ** n; m++) {
    // orden clásico: la primera regla con todo «S»
    const valores = nombres.map((_, i) => !((m >> (n - 1 - i)) & 1));
    const malos = nombres.filter((_, i) => !valores[i]);
    completa.push({ valores, registra: malos.length === 0, errores: malos });
  }
  // colapsada: si cada campo se valida por separado, el error de un campo no depende de los demás
  const colapsada = [{ valores: nombres.map(() => true), registra: true, errores: [] }];
  nombres.forEach((nom, i) => colapsada.push({ valores: nombres.map((_, j) => (j === i ? false : null)), registra: false, errores: [nom] }));
  return { condiciones: [...nombres], completa, colapsada };
}

// Pruebas del formulario completo a partir de los casos de cada campo.
// Todas las combinaciones = producto. Mínimo (ISTQB): los válidos se combinan entre sí y cada inválido
// se prueba solo, con los demás campos válidos, para que un error no tape a otro.
export function combinar(resultados) {
  const v = resultados.map((r) => r.casos.filter((k) => k.esperado === 'Acepta').length);
  const i = resultados.map((r) => r.casos.filter((k) => k.esperado === 'Rechaza').length);
  const producto = resultados.reduce((p, r) => p * r.casos.length, 1);
  const minimo = Math.max(0, ...v) + i.reduce((a, b) => a + b, 0);
  return { producto, minimo, validos: v, invalidos: i };
}
