// Formato de cifras en español de Colombia (punto de miles, coma decimal). Funciones puras.

export function miles(n) {
  const s = String(Math.round(Math.abs(n)));
  return (n < 0 ? '−' : '') + s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function decimal(n, d = 1) {
  const [e, f] = Math.abs(n).toFixed(d).split('.');
  return (n < 0 ? '−' : '') + miles(Number(e)) + (f && Number(f) ? `,${f.replace(/0+$/, '')}` : '');
}

// Cantidad grande a partir de su log10: exacta si cabe, si no «m × 10^k».
export function cantidad(log10) {
  if (log10 < 15) return { texto: miles(10 ** log10), exp: null };
  const k = Math.floor(log10);
  const m = 10 ** (log10 - k);
  return { texto: `${decimal(m, 1)} × 10`, exp: k };
}

const ANIO = 365.25 * 86400;
// Duración legible de `log10` segundos.
export function duracion(log10seg) {
  if (log10seg < Math.log10(ANIO * 1e6)) {
    const s = 10 ** log10seg;
    if (s < 1) return { texto: 'menos de 1 s', exp: null };
    if (s < 60) return { texto: `${Math.round(s)} s`, exp: null };
    if (s < 3600) return { texto: `${Math.round(s / 60)} min`, exp: null };
    if (s < 86400) return { texto: `${decimal(s / 3600, 1)} h`, exp: null };
    if (s < ANIO) return { texto: `${decimal(s / 86400, 1)} días`, exp: null };
    return { texto: `${decimal(s / ANIO, 1)} años`, exp: null };
  }
  const la = log10seg - Math.log10(ANIO);
  const k = Math.floor(la);
  return { texto: `${decimal(10 ** (la - k), 1)} × 10`, exp: k, despues: ' años' };
}
