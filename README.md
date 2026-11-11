# ¿Cuántas pruebas necesita este campo?

**Español** · [English](README.en.md)

Una página que hace una sola cosa: describes un campo de formulario en una frase («edad entera entre 18 y 65, obligatoria») y te dice **cuántas pruebas necesita** y cuáles son, con **partición de equivalencia** y **análisis de valores límite** (ISTQB CTFL v4.0).

- **Seis tipos de campo:** número entero, texto (longitud mínima y máxima), cédula (cantidad de dígitos), correo (estándar HTML + RFC 5321), fecha (rango) y lista (select). Obligatorio u opcional.
- **Las clases en una recta numérica** esquemática: válidas en azul, inválidas en rojo rayado, y cada caso en su sitio.
- **La tabla de casos**: identificador, entrada, resultado esperado, clase, técnica y por qué.
- **Valores límite de 2 o 3 valores.**
- **Copiar como CSV o Gherkin** (español o inglés, esquema de escenario con tabla de ejemplos).
- **Tabla de decisión** para combinar 2 o 3 campos de un formulario: completa (2ⁿ reglas) y colapsada (n + 1), y el número de pruebas del formulario.
- **Frente a probarlo todo:** cuántas entradas tendría una prueba exhaustiva y cuánto tardaría.
- `/proceso/`: el trabajo de clase, el método, la comparación exhaustivas frente a mínimas (con gráfica), las decisiones de diseño, las limitaciones, la fe de erratas y las fuentes.

Todo se calcula en el navegador; no hay API ni servidor. El enlace guarda el campo (`?campo=…&bva=3`).

## Cifras (calculado aquí, BVA de 2 valores)

| Campo | Entradas posibles | A 1.000 pruebas/s | Pruebas mínimas |
|---|---|---|---|
| Edad, entero 18–65 | 4.294.967.296 (enteros de 32 bits) | 49,7 días | **7** |
| Cédula, 6–10 dígitos | 111.111.111.111 (solo dígitos, 0–11 cifras) | 3,5 años | **7** |
| Fecha en diciembre de 2026 | 3.652.059 (fechas del año 1 al 9999) | 1 h | **7** |
| Texto, 3–20 caracteres | 3,4 × 10⁴¹ | 1,1 × 10³¹ años | **6** |
| Correo | 2,1 × 10⁵⁰⁴ | 6,7 × 10⁴⁹³ años | **10** |
| Select de 4 opciones | 5 (lo que deja elegir la interfaz) | < 1 s | **6** |

Edad, correo y tipo de documento juntos: 7 × 10 × 6 = 420 combinaciones; bien combinadas, 19 pruebas.

## Uso

```bash
python3 -m http.server 8000   # y abrir http://localhost:8000
node --test                   # 24 pruebas (Node 20 o superior)
```

Para GitHub Pages basta con servir la rama `main` desde la raíz.

## Estructura

```
index.html, proceso/index.html   las dos páginas (sin build)
css/estilo.css                   línea "Tinta y trama" (claro) y "Jisseki" (oscuro)
js/campos.js                     intérprete de la frase, oráculo validar(), generador EP + BVA, exhaustivo
js/exportar.js                   CSV y Gherkin
js/decision.js                   tabla de decisión y combinación de campos
js/diagrama.js                   recta numérica en SVG
js/formato.js                    cifras en español
js/main.js, js/proceso.js, js/tema.js   interfaz
test/                            pruebas node --test y muestras del trabajo de clase
```

## Limitaciones

Genera los casos para la regla que describes: si la regla está mal, los casos también. Como toda técnica de caja negra, supone que el sistema trata igual a toda una clase. El intérprete entiende frases cortas; «Lo que entendí» permite corregirlo. La tabla de decisión supone que cada campo se valida por separado.

## De qué trabajo sale

Del cuadro comparativo de técnicas de prueba de la asignatura Pruebas de Software (2023), donde el equipo de Mario investigó las tablas de decisión y otros equipos la partición de equivalencia y los valores límite. El cuadro describía las técnicas; esta herramienta las aplica a cualquier campo y cuenta los casos. El botón «Caso de clase» carga el ejemplo de 18 a 60 años del cuadro.

## Créditos

[Mario Puerta «ale0009»](https://github.com/ale0009) × [David Rincón «Kuronoma»](https://www.linkedin.com/in/davidalexanderrinconcorredorkuronoma/). Licencia MIT.
