// Interfaz de «¿Cuántas pruebas necesita este campo?»: descripción → campo → casos.
import { iniciarTema } from './tema.js';
import { generar, interpretar, describir, normalizar, exhaustivo, TIPOS } from './campos.js';
import { aCSV, aGherkin } from './exportar.js';
import { tablaDecision, combinar } from './decision.js';
import { recta } from './diagrama.js';
import { cantidad, duracion, miles } from './formato.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...hijos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
  }
  e.append(...hijos);
  return e;
};

const estado = { campo: null, bva: 2, vista: 'tabla', idioma: 'es', res: null };

// ---------- entrada ----------
function leerControles() {
  const tipo = $('c-tipo').value;
  return normalizar({
    tipo,
    nombre: $('c-nombre').value,
    obligatorio: $('c-oblig').checked,
    min: $('c-min').value, max: $('c-max').value,
    desde: $('c-desde').value, hasta: $('c-hasta').value,
    opciones: $('c-opciones').value,
    opcionesDistintas: $('c-distintas').checked,
  });
}

function pintarControles(c) {
  // no se reescribe el control que la persona está editando
  const poner = (id, v) => { if (document.activeElement !== $(id)) $(id).value = v; };
  $('c-tipo').value = c.tipo;
  poner('c-nombre', c.nombre);
  $('c-oblig').checked = c.obligatorio;
  const rango = c.tipo === 'entero' || c.tipo === 'texto' || c.tipo === 'cedula';
  if (rango) { poner('c-min', c.min); poner('c-max', c.max); }
  if (c.tipo === 'fecha') { poner('c-desde', c.desde); poner('c-hasta', c.hasta); }
  if (c.tipo === 'select') { poner('c-opciones', c.opciones.join(', ')); $('c-distintas').checked = c.opcionesDistintas; }
  const u = c.tipo === 'texto' ? ' (caracteres)' : c.tipo === 'cedula' ? ' (dígitos)' : '';
  $('c-min-t').textContent = `Mínimo${u}`;
  $('c-max-t').textContent = `Máximo${u}`;
  for (const l of document.querySelectorAll('[data-para]')) {
    const p = l.dataset.para;
    l.hidden = !((p === 'rango' && rango) || (p === 'fecha' && c.tipo === 'fecha') || (p === 'select' && c.tipo === 'select'));
  }
}

function marcarEjemplo() {
  const v = $('desc').value.trim();
  for (const b of document.querySelectorAll('.entrada [data-desc]')) b.setAttribute('aria-pressed', String(b.dataset.desc === v));
}

function desdeTexto() {
  estado.campo = interpretar($('desc').value);
  pintarControles(estado.campo);
  marcarEjemplo();
  guardarURL();
  pintar();
}

function desdeControles() {
  estado.campo = leerControles();
  pintarControles(estado.campo);
  $('desc').value = describir(estado.campo);
  marcarEjemplo();
  guardarURL();
  pintar();
}

function guardarURL() {
  try {
    const u = new URL(location.href);
    u.searchParams.set('campo', $('desc').value);
    if (estado.bva === 3) u.searchParams.set('bva', '3'); else u.searchParams.delete('bva');
    history.replaceState(null, '', u);
  } catch { /* sin history: no pasa nada */ }
}

// ---------- salida ----------
function pintarHUD(res) {
  const err = $('error-def');
  if (res.error) {
    $('total').textContent = '?';
    $('total-u').textContent = '';
    err.hidden = false;
    err.textContent = res.error;
    $('desglose').replaceChildren();
    return;
  }
  err.hidden = true;
  const k = res.conteo;
  $('total').textContent = k.total;
  $('total-u').textContent = k.total === 1 ? 'prueba' : 'pruebas';
  const li = (n, t, cls) => el('li', { class: cls }, el('b', { text: String(n) }), ` ${t}`);
  $('desglose').replaceChildren(
    li(k.validas, k.validas === 1 ? 'clase válida' : 'clases válidas', 'd-val'),
    li(k.invalidas, k.invalidas === 1 ? 'clase inválida' : 'clases inválidas', 'd-inv'),
    li(k.limites, k.limites === 1 ? 'valor límite' : 'valores límite', 'd-lim'),
    li(`${k.aceptan} / ${k.rechazan}`, 'aceptan / rechazan', 'd-res'),
  );
  const ex = exhaustivo(res.campo);
  const n = cantidad(ex.log10);
  const t = duracion(ex.log10 - 3);
  const sup = (o) => (o.exp == null ? [o.texto] : [o.texto, el('sup', { text: String(o.exp) }), o.despues || '']);
  $('exh-n').replaceChildren(...sup(n));
  $('exh-t').replaceChildren(...sup(t));
  $('exh-sup').textContent = `Supuesto: ${ex.supuesto}. Con las técnicas: ${k.total}.`;
}

function pintarClases(res) {
  const r = $('recta');
  r.innerHTML = res.error ? '' : recta(res, { compacto: r.parentElement.clientWidth < 620 });
  r.hidden = !res.eje || !!res.error;
  const ficha = (cl) => {
    const casos = res.casos.filter((k) => k.clase === cl.id);
    return el('li', { class: `ficha ${cl.valida ? 'f-val' : 'f-inv'}` },
      el('span', { class: 'f-id', text: cl.id }),
      el('span', { class: 'f-nom', text: cl.nombre }),
      el('span', { class: 'f-val-t' }, ...casos.flatMap((k, i) => [i ? ' · ' : '', el('code', { text: k.muestra, title: k.id })])));
  };
  const cl = res.error ? [] : res.clases;
  $('cl-validas').replaceChildren(...cl.filter((k) => k.valida).map(ficha));
  $('cl-invalidas').replaceChildren(...cl.filter((k) => !k.valida).map(ficha));
}

function pintarCasos(res) {
  const cuerpo = $('t-casos');
  if (res.error) { cuerpo.replaceChildren(); $('vista-texto').textContent = ''; return; }
  const nom = Object.fromEntries(res.clases.map((k) => [k.id, k.nombre]));
  $('cap-casos').textContent = `${res.conteo.total} casos para «${res.campo.nombre}» (${TIPOS[res.campo.tipo]}), análisis de valores límite de ${res.modo} valores.`;
  cuerpo.replaceChildren(...res.casos.map((k) => {
    const larga = k.muestra !== k.entrada && k.entrada !== '' && k.entrada.trim() !== '';
    return el('tr', {},
      el('th', { scope: 'row', class: 'num', text: k.id }),
      el('td', { class: 'c-ent' }, el('code', larga ? { text: k.muestra, title: `${k.entrada.length} caracteres` } : { text: k.muestra })),
      el('td', {}, el('span', { class: `chip ${k.esperado === 'Acepta' ? 'chip-ok' : 'chip-no'}`, text: k.esperado })),
      el('td', { text: `${k.clase} · ${nom[k.clase]}` }),
      el('td', { class: 'c-tec', text: k.tecnica }),
      el('td', { class: 'c-por', text: k.porque }),
    );
  }));
  pintarTexto();
}

function pintarTexto() {
  const res = estado.res;
  if (!res || res.error) return;
  if (estado.vista === 'csv') $('vista-texto').textContent = aCSV(res);
  if (estado.vista === 'gherkin') $('vista-texto').textContent = aGherkin(res, estado.idioma);
}

function pintar() {
  estado.res = generar(estado.campo, { bva: estado.bva });
  pintarHUD(estado.res);
  pintarClases(estado.res);
  pintarCasos(estado.res);
  pintarDecision();
}

// ---------- pestañas y copiar ----------
const PESTANAS = ['tabla', 'csv', 'gherkin'];
function vista(v, foco = false) {
  estado.vista = v;
  for (const p of PESTANAS) {
    const b = $(`tab-${p}`);
    b.setAttribute('aria-selected', String(p === v));
    b.tabIndex = p === v ? 0 : -1;
    if (p === v && foco) b.focus();
  }
  $('vista-tabla').hidden = v !== 'tabla';
  $('vista-texto').hidden = v === 'tabla';
  if (v !== 'tabla') $('vista-texto').setAttribute('aria-labelledby', `tab-${v}`);
  $('idioma-l').hidden = v !== 'gherkin';
  $('copiar').textContent = v === 'gherkin' ? 'Copiar Gherkin' : 'Copiar CSV';
  pintarTexto();
}

async function copiar() {
  const res = estado.res;
  if (!res || res.error) return;
  const texto = estado.vista === 'gherkin' ? aGherkin(res, estado.idioma) : aCSV(res);
  let ok = false;
  try { await navigator.clipboard.writeText(texto); ok = true; } catch {
    const t = el('textarea', { class: 'visual-oculto' });
    t.value = texto;
    document.body.append(t);
    t.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    t.remove();
  }
  const aviso = $('copiado');
  aviso.textContent = ok ? `¡Copiado! ${res.conteo.total} casos en ${estado.vista === 'gherkin' ? 'Gherkin' : 'CSV'}.` : 'No se pudo copiar: selecciona el texto de la pestaña y cópialo a mano.';
  if (!ok && estado.vista === 'tabla') vista('csv');
  clearTimeout(copiar.t);
  copiar.t = setTimeout(() => { aviso.textContent = ''; }, 4000);
}

// ---------- tabla de decisión ----------
const FORM = [
  { id: 'edad', nombre: 'Edad', desc: 'edad entera entre 18 y 65, obligatoria', on: true },
  { id: 'correo', nombre: 'Correo', desc: 'correo electrónico, obligatorio', on: true },
  { id: 'doc', nombre: 'Tipo de documento', desc: 'tipo de documento: CC, CE, TI, PA', on: true },
  { id: 'cedula', nombre: 'Cédula', desc: 'cédula colombiana de 6 a 10 dígitos, obligatoria', on: false },
  { id: 'fecha', nombre: 'Fecha de la cita', desc: 'fecha de la cita entre 2026-12-01 y 2026-12-31, obligatoria', on: false },
  { id: 'usuario', nombre: 'Nombre de usuario', desc: 'nombre de usuario, texto de 3 a 20 caracteres, obligatorio', on: false },
];

function montarDecision() {
  const caja = $('dec-campos');
  caja.replaceChildren(el('span', { class: 'etiqueta', text: 'Formulario' }), ...FORM.map((f) => {
    const b = el('button', { type: 'button', class: 'mini', 'aria-pressed': String(f.on), 'data-id': f.id, text: f.nombre });
    b.addEventListener('click', () => {
      const activos = FORM.filter((x) => x.on).length;
      if (f.on && activos <= 2) return avisoDecision('Deja al menos 2 campos.');
      if (!f.on && activos >= 3) return avisoDecision('Máximo 3 campos: quita uno antes.');
      f.on = !f.on;
      b.setAttribute('aria-pressed', String(f.on));
      pintarDecision();
    });
    return b;
  }));
}
function avisoDecision(t) { $('dec-res').textContent = t; setTimeout(pintarDecision, 2200); }

function tablaHTML(destino, titulo, condiciones, reglas) {
  const cab = el('tr', {}, el('th', { scope: 'col', text: 'Regla' }), ...reglas.map((_, i) => el('th', { scope: 'col', class: 'num', text: `R${i + 1}` })));
  const filas = condiciones.map((c, i) => el('tr', {}, el('th', { scope: 'row', text: `¿${c} válido?` }),
    ...reglas.map((r) => {
      const v = r.valores[i];
      return el('td', { class: `dc ${v === null ? 'd-ind' : v ? 'd-si' : 'd-no'}`, text: v === null ? '–' : v ? 'S' : 'N' });
    })));
  const acc = el('tr', { class: 'd-acc' }, el('th', { scope: 'row', text: 'Acción' }),
    ...reglas.map((r) => el('td', { class: r.registra ? 'a-ok' : 'a-no', text: r.registra ? 'Registrar' : `Error: ${r.errores.join(', ')}` })));
  destino.replaceChildren(el('caption', { text: titulo }), el('thead', {}, cab), el('tbody', {}, ...filas, acc));
}

function pintarDecision() {
  const activos = FORM.filter((f) => f.on);
  const res = activos.map((f) => generar(interpretar(f.desc), { bva: estado.bva }));
  const t = tablaDecision(activos.map((f) => f.nombre));
  const c = combinar(res);
  tablaHTML($('dec-completa'), `Completa: 2^${activos.length} = ${t.completa.length} reglas`, t.condiciones, t.completa);
  tablaHTML($('dec-colapsada'), `Colapsada: ${t.colapsada.length} reglas («–» = da igual)`, t.condiciones, t.colapsada);
  $('dec-res').replaceChildren(
    'Probar todas las combinaciones de casos: ', el('b', { text: `${res.map((r) => r.conteo.total).join(' × ')} = ${miles(c.producto)}` }),
    '. Bien combinadas: ', el('strong', { class: 'dec-min', text: `${c.minimo} pruebas` }),
    ` (los ${Math.max(...c.validos)} casos válidos se combinan entre sí; cada uno de los ${c.invalidos.reduce((a, b) => a + b, 0)} inválidos va solo, con los demás campos válidos, para que un error no tape a otro).`,
  );
}

// ---------- arranque ----------
function iniciar() {
  iniciarTema($('tema'));
  try {
    const p = new URLSearchParams(location.search);
    if (p.get('campo')) $('desc').value = p.get('campo').slice(0, 300);
    if (p.get('bva') === '3') { estado.bva = 3; document.querySelector('input[name="bva"][value="3"]').checked = true; }
  } catch { /* URL rara: se queda el ejemplo */ }

  let t;
  $('desc').addEventListener('input', () => { clearTimeout(t); t = setTimeout(desdeTexto, 120); });
  for (const b of document.querySelectorAll('.entrada [data-desc]')) {
    b.addEventListener('click', () => { $('desc').value = b.dataset.desc; desdeTexto(); });
  }
  for (const id of ['c-tipo', 'c-oblig', 'c-distintas', 'c-desde', 'c-hasta']) $(id).addEventListener('change', () => {
    if (id === 'c-tipo') { // al cambiar de tipo se parte de sus valores por defecto
      estado.campo = normalizar({ tipo: $('c-tipo').value, nombre: $('c-nombre').value, obligatorio: $('c-oblig').checked });
      pintarControles(estado.campo);
    }
    desdeControles();
  });
  for (const id of ['c-nombre', 'c-min', 'c-max', 'c-opciones']) $(id).addEventListener('input', () => { clearTimeout(t); t = setTimeout(desdeControles, 200); });
  for (const r of document.querySelectorAll('input[name="bva"]')) r.addEventListener('change', () => { estado.bva = Number(r.value); guardarURL(); pintar(); });

  PESTANAS.forEach((p, i) => {
    const b = $(`tab-${p}`);
    b.addEventListener('click', () => vista(p));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        vista(PESTANAS[(i + (e.key === 'ArrowRight' ? 1 : PESTANAS.length - 1)) % PESTANAS.length], true);
      }
    });
  });
  $('idioma').addEventListener('change', () => { estado.idioma = $('idioma').value; pintarTexto(); });
  $('copiar').addEventListener('click', copiar);

  let ancho = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - ancho) < 40) return;
    ancho = window.innerWidth;
    clearTimeout(t); t = setTimeout(() => pintarClases(estado.res), 150);
  });

  montarDecision();
  desdeTexto();
}

iniciar();
