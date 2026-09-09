# Design: Conversión de unidades en "última" + Fix buscadores Google/TikTok

Fecha: 2026-09-08
Estado: Aprobado

## Objetivo

1. **Conversión de unidades:** en el detalle de ejercicio, el peso "última" muestra
   su equivalente en la otra unidad (kg ↔ lb) en una línea pequeña sutil, siempre
   visible, sin interacción. Sirve al caso real: el usuario alterna entre gimnasios
   que usan discos en kg y en lb, y no quiere ir a Google a convertir.
2. **Fix buscadores Google/TikTok:** los botones del hero (`ExerciseHero`) dejan de
   depender de `location.href` (que no navega a sitios externos desde la PWA
   standalone de iOS). Al tocar: se copia el nombre del ejercicio al portapapeles
   (respaldo garantizado) y se intenta abrir la URL en una pestaña nueva (best effort).

## Contexto

- `ExerciseDetail.svelte:301` muestra `última`:
  `<StatBlock value={lastLog... ? \`${lastLog.weight}${units}\` : '—'} label="última" ... size="md" />`.
- `StatBlock.svelte` es un componente genérico (`value`, `label`, `unit`, `accent`, `size`)
  usado también en `HistoryTab` stats. No tiene prop de sub-línea.
- `ExerciseHero.svelte:64-67`: los botones `.hero-google-btn` y `.hero-tiktok-btn`
  hacen `location.href` a Google Video y TikTok. En la PWA standalone de iOS esto no
  abre nada (sin navegación externa), por eso "no sirven". `displayName` ya es el
  nombre traducido según `settings.language`.
- Utilidades: no existe helper de conversión kg↔lb compartido (solo `toKg`/`fromKg`
  locales a `coach-analysis.ts`).

## Cambios

### 1. Helper de conversión — `src/lib/exercise-utils.ts`

Añadir:

```ts
export function toOtherUnit(value: number, units: string): number {
  const kgPerLb = 0.45359237
  const out = units === 'lb' ? value * (1 / kgPerLb) : value * kgPerLb
  return Math.round(out)
}
```

- Semántica: recibe un valor expresado en `units` y devuelve su equivalente en la
  unidad opuesta, redondeado al entero más cercano (los discos son enteros).
- `otherUnit = units === 'kg' ? 'lb' : 'kg'` se deriva en el componente.

### 2. `StatBlock.svelte` — prop opcional `sub`

- Nueva prop `sub?: string`. Si viene, se renderiza una línea debajo del `label`:
  - `font-family: var(--font-mono)`, `font-size: 10px`, color terciario
    (`rgba(255,255,255,0.45)`), `letter-spacing: 0.3px`, `text-align: center`,
    `margin-top: 3px`.
- Componentes existentes sin `sub` no cambian visualmente.

### 3. `ExerciseDetail.svelte` — "última" con equivalencia

- En el StatsGrid (línea 301), cuando `lastLog && lastLog.weight > 0`:
  - value: `\`${lastLog.weight}${units}\``
  - `sub={\`≈ ${toOtherUnit(lastLog.weight, units)} ${units === 'kg' ? 'lb' : 'kg'}\`}`
- Cuando muestra `—` (sin peso previo), sin `sub`.
- Solo en el stat "última"; no en sesiones/listas.

### 4. `ExerciseHero.svelte` — fix botones Google/TikTok

- Importar `toast` desde `$lib/stores/ui`.
- Función `searchExternal(url: string)`:
  1. **Copiar:** `navigator.clipboard?.writeText(displayName)`; si no existe/falla,
     fallback legacy (textarea temporal + `document.execCommand('copy')`).
  2. **Toast:** `toast.show(\`🔍 ${displayName} copiado\`)`.
  3. **Abrir (best effort):** `window.open(url, '_blank')` después del copy.
- Ambos botones conservan sus clases (`.hero-google-btn` / `.hero-tiktok-btn`),
  `aria-label` ("Buscar en Google" / "Buscar en TikTok"), SVGs y queries.

## Flujo de datos

1. Detalle de ejercicio cargado → `lastLog.weight` + `settings.units` → conversión
   derivada → sub-línea en StatBlock. Sin persistencia (derivado en runtime).
2. Botón Google/TikTok → click → clipboard (nombre) + toast → `window.open`.
   Sin cambios de datos.

## Manejo de errores

- `navigator.clipboard` ausente/rechazado → fallback `execCommand('copy')`; si ambos
  fallan, el toast igual informa y `window.open` sigue intentándose (se ignora el
  error de clipboard silenciosamente).

## Testing

- **E2E (`tests/big.spec.cjs`):** en el bloque existente de ExerciseHero/Direccionar
  Google+TikTok, añadir steps que verifiquen el comportamiento al tocar:
  - Stub de `window.open` con `page.addInitScript` (acumula URLs, evita popup real).
  - Click en Google → assert URL guardada contiene `google.com/search?tbm=video&q=`
    → assert toast visible con el nombre.
  - Click en TikTok → assert URL contiene `tiktok.com/search?q=` → assert toast.
  - Actualizar `EXPECTED_STEPS` con los steps nuevos (sin quitar existentes).
  - No se prueba el clipboard en E2E (permisos/fragilidad) — se valida el fallback
    legacy manualmente.
- **Verificación abajo:** `npm run check`, `npx playwright test`, `npm run build`.