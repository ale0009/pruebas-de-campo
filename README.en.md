# How many tests does this field need?

[Español](README.md) · **English**

A single-purpose page: describe a form field in one sentence (in Spanish, e.g. «edad entera entre 18 y 65, obligatoria») and it tells you **how many tests it needs** and which ones, using **equivalence partitioning** and **boundary value analysis** (ISTQB CTFL v4.0).

- **Six field types:** integer, text (min/max length), Colombian ID number (digit count), email (HTML standard + RFC 5321), date (range) and select. Required or optional.
- **Partitions on a schematic number line:** valid in blue, invalid in hatched red, each test case in place.
- **Test case table:** ID, input, expected result, partition, technique and rationale.
- **2-value or 3-value boundary analysis.**
- **Copy as CSV or Gherkin** (Spanish or English Scenario Outline with an Examples table).
- **Decision table** to combine 2–3 fields of a form: full (2ⁿ rules) and collapsed (n + 1), plus the number of tests for the whole form.
- **Versus exhaustive testing:** how many inputs an exhaustive test would need and how long it would take.
- `/proceso/` (Spanish): the coursework, the method, exhaustive vs. minimal testing (with a chart), design decisions, limitations, errata and sources.

Everything runs in the browser; no API, no server. The URL keeps the field (`?campo=…&bva=3`).

## Figures (computed here, 2-value BVA)

| Field | Possible inputs | At 1,000 tests/s | Minimal tests |
|---|---|---|---|
| Age, integer 18–65 | 4,294,967,296 (32-bit integers) | 49.7 days | **7** |
| ID, 6–10 digits | 111,111,111,111 (digits only, 0–11 long) | 3.5 years | **7** |
| Date in December 2026 | 3,652,059 (dates from year 1 to 9999) | 1 h | **7** |
| Text, 3–20 characters | 3.4 × 10⁴¹ | 1.1 × 10³¹ years | **6** |
| Email | 2.1 × 10⁵⁰⁴ | 6.7 × 10⁴⁹³ years | **10** |
| Select with 4 options | 5 (what the UI allows) | < 1 s | **6** |

Age, email and document type together: 7 × 10 × 6 = 420 combinations; combined properly, 19 tests.

## Usage

```bash
python3 -m http.server 8000   # then open http://localhost:8000
node --test                   # 24 tests (Node 20+)
```

## Limitations

Cases are generated for the rule you describe: a wrong rule gives wrong cases. Like any black-box technique, it assumes the system treats a whole partition the same way. The parser understands short sentences; the "Lo que entendí" panel lets you fix it. The decision table assumes each field is validated independently.

## Origin

Coursework from a Software Testing class (2023): a comparison table of test techniques, where Mario's team covered decision tables. The table described the techniques; this tool applies them to any field and counts the cases.

## Credits

[Mario Puerta «ale0009»](https://github.com/ale0009) × [David Rincón «Kuronoma»](https://www.linkedin.com/in/davidalexanderrinconcorredorkuronoma/). MIT License.
