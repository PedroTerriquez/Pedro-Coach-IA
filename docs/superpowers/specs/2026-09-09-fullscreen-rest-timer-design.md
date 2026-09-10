# Design: Timer de descanso a pantalla completa

Fecha: 2026-09-09
Estado: Aprobado

## Objetivo

Convertir el descanso en una vista propia a pantalla completa, no un banner
flotante. El caso real: entro a la app **durante** el descanso para ver en qué
serie voy, cuál es el máximo de series, cuánto levanté la última vez o cuál es
mi récord. El reloj ocupa el mayor espacio posible y el resto de la pantalla
redistribuye esa información.

El banner anterior (`RestTimerBanner`) no desaparece: pasa a ser el **estado
minimizado** del mismo descanso.

## Diseño

El diseño vive en Claude Design, proyecto "Training with Pedro — Design System"
(`b0cb0621-bd00-46bb-983d-f45eda792441`), cards `Rest timer — pantalla completa`,
`Rest timer — estados` y `Rest timer — registro de serie`.

Orden de los elementos (arriba → abajo), por utilidad durante el descanso:

1. **Barra superior** — minimizar (chevron ↓), etiqueta "DESCANSO" con punto
   pulsante, "Saltar".
2. **Reloj** con `−15 s` / `+30 s` a los costados — los dos botones son
   círculos de 44 px pegados a los bordes, aprovechando el hueco muerto que
   deja el anillo; así el ajuste de tiempo no gasta una fila entera de alto.
   Debajo del reloj, el descanso total ("de 1:30").
3. **Serie X de Y** con barritas: hechas / actual / pendientes.
4. **Tarjeta del ejercicio** — miniatura (gif o imagen), nombre, músculo, tira
   de 4 datos (series · reps · última · récord) y el registro de la serie.
5. **Acción** — "Reiniciar descanso" a ancho completo.

Últimos 10 segundos: el acento pasa a `#ff5b4d` y el reloj parpadea.

### Responsive (es una app de celular)

Nada tiene tamaño fijo: **el reloj es el bloque que cede**. El anillo toma el
alto que sobra (`height: 100%` + `aspect-ratio: 1`) con dos topes —
`min(308px, 100vw − 140px)`, donde los 140 px reservan los dos botones de
ajuste — y las cifras se miden contra el propio anillo (`27cqw`, con
`clamp(42px, 20vw, 84px)` de fallback), así que encogen con él en vez de
desbordarlo. Los campos de peso/reps también escalan (`clamp`), para que
"62.5" no se corte en pantallas de 320 px.

Bajo `max-height: 720px` (iPhone SE y parecidos) entra un modo compacto: cada
bloque fijo devuelve unos px (paddings, miniatura, alto de los botones) para
que el reloj no quede reducido a una franja. Medido: anillo de 149 px en
320×568, 247 px en 375×667 y 250 px en 390×844, sin scroll horizontal ni nada
recortado en ninguno.

**Descartado:** una fila "Siguiente ejercicio". El timer vive en `+layout.svelte`,
encima de todas las rutas, y solo recibe una foto de datos — no conoce la lista ni
el índice, así que la flecha `›` prometía una navegación que no existía.

## Datos que ve el timer

Todo lo que muestra viaja dentro de `RestPendingData`, porque ese payload es lo
único que sobrevive el viaje `Iniciar → push → tap → app`. Lo que no esté ahí no
está disponible mientras descansas.

| Campo | Origen |
|---|---|
| `name`, `sets`, `reps`, `restSec`, `exerciseId` | prescripción del día |
| `muscle`, `imgUrl`, `gifUrl` | ficha del ejercicio |
| `units`, `lastWeight`, `maxWeight` | logs (`última` y récord histórico) |
| `setIndex` | contador de series (abajo) |

### Contador de series

Cada "Iniciar" significa una serie terminada, así que el N-ésimo tap del día
sobre un ejercicio es su serie N. Se guarda en `localStorage`
(`rest-set-counts`, `{ date, counts: { [exerciseId]: n } }`) y se reinicia solo
al cambiar el día. Si superas las series prescritas, la etiqueta dice la verdad
("Serie 5 de 4"): es tu entrenamiento, no se capa.

`nextSetIndex()` incrementa y devuelve; `getSetIndex()` solo lee.

## Registro de la serie durante el descanso

El descanso es justo el hueco para anotar la serie que acabas de terminar, así
que la tarjeta del ejercicio lleva debajo de los 4 datos un bloque **Registrar
serie N** con dos campos: **peso** (pasos de 2.5) y **reps** (pasos de 1).

- **Semilla de los campos:** lo que ya tenga esa serie → si no, la serie
  anterior de hoy → si no, `lastWeight` ("última") y `parseRepsDefault(reps)`.
- **No hay botón "Guardar":** tocar un `±` o escribir ya es la intención de
  guardar. Se escribe con 450 ms de debounce y aparece "✓ Guardada". Sin
  interacción no se escribe nada: abrir el timer nunca inventa un registro.
- Debajo, un recap de lo registrado hoy (`S1 62.5kg×10 · S2 …`).

### Cómo se guarda (uno o detallado)

Todo vive en **el mismo log del día** que escribe la hoja de detalle — no hay
un almacén paralelo. `src/lib/set-log.ts` lo expande a series sueltas, cambia
la serie N y lo vuelve a colapsar:

| Situación | Qué queda en el log |
|---|---|
| Todas las series con el mismo peso y reps | Registro simple: `weight`, `sets`, `reps`, **sin** `blocks` |
| Alguna serie distinta | Detallado: `blocks` agrupando series consecutivas iguales (`2×10 @62.5` + `1×8 @65`), con `weight`/`reps` del bloque más pesado |

Es exactamente la forma que ya entiende el editor por bloques de
`WorkoutTab`, así que lo registrado en el timer se abre y se edita ahí sin
conversión. Si registras la serie 3 sin haber registrado la 2, el hueco se
rellena con la serie conocida más reciente. Y si lo que había era un registro
simple ("60kg", sin reps), esas series adoptan las reps que estás registrando
en vez de convertirse en bloques de "0 reps".

La escritura va con 450 ms de debounce, así que **apunta al ejercicio y la
serie que estaban en pantalla al tocar**, no a los de cuando el temporizador
dispara: si tocas `+` y le das a "Saltar" enseguida, ese peso cae en su
ejercicio aunque para entonces ya haya empezado otro descanso.

Al guardar se emite `window` → `logs-updated`; `today/+page.svelte` lo escucha
y refresca sus tarjetas (el timer vive en el layout, encima de la página).

## Dos formas de arrancar un descanso

Esta es la parte a no romper. Hay **dos entradas** y comparten toda la maquinaria
(`armRest`) salvo un paso:

| | Botón "Iniciar" (ExerciseDetail) | "Reiniciar descanso" (timer) |
|---|---|---|
| Notificación tapeable de inicio | **Sí** — `startRestFromExercise()` la manda y el descanso arranca cuando la tapeas | **No** — arranca en el momento |
| Push retardado ("Descanso terminado") | Sí | Sí |
| Cuenta una serie nueva (`setIndex`) | Sí | No — sigues en la misma serie |
| Función | `startRestFromExercise()` → push → tap → `checkPendingRest()` → `scheduleRestTimer()` | `restartRestTimer()` → `scheduleRestTimer()` |

`restartRestTimer()` cancela el push encolado del descanso en curso y vuelve a
programar desde cero con `restSec` **actual** (el que muestra "de X:XX"): si
habías sumado 30 s, reinicia a ese total, no a la prescripción original.

## Ajuste de tiempo (`−15 s` / `+30 s`)

Los botones viven a los lados del anillo (ver arriba). `adjustRestTimer(delta)` mueve `endTime` y `restSec`, cancela el push en vuelo y
reencola uno nuevo con **tag fresco**. El worker descarta el viejo por su regla
de `active_<deviceId>` (una sola programación activa por dispositivo). El piso es
`ahora + 3 s`, para que restar tiempo nunca programe un push en el pasado.

## Minimizar

`+layout.svelte` guarda `restMinimized`. El chevron ↓ colapsa al banner; tocar el
banner (`.rtb-open`) reabre a pantalla completa. Cada descanso nuevo (tag nuevo)
vuelve a abrir a pantalla completa.

## Archivos

| Archivo | Rol |
|---|---|
| `src/lib/components/RestTimerFullscreen.svelte` | La vista |
| `src/lib/components/RestTimerBanner.svelte` | Estado minimizado (`onexpand`) |
| `src/lib/rest-timer.ts` | `armRest`, `scheduleRestTimer`, `adjustRestTimer`, `restartRestTimer`, contador de series |
| `src/lib/set-log.ts` | Expandir/colapsar series ↔ `blocks` y guardar la serie N |
| `src/routes/+layout.svelte` | Monta ambos estados y cablea las acciones |
| `src/lib/components/ExerciseDetail.svelte` | Llena el payload al tocar "Iniciar" |

## Verificación

`tests/big.spec.cjs` → `Rest timer — registro de series`: registra la serie 1
(un solo registro), la 2 igual (sigue un solo registro, `sets: 2`) y la 3 con
otro peso y otras reps (pasa a `blocks`), y comprueba que al reabrir esa serie
los campos muestran lo guardado. Termina con un barrido responsive en 320×568,
375×667, 390×844 y 430×932: el anillo sigue siendo cuadrado y usable, no choca
con `−15 s` / `+30 s`, las acciones caben en pantalla, no hay scroll horizontal
y ningún campo queda recortado.

`tests/big.spec.cjs` → `Rest timer — pantalla completa`: abre el timer por la ruta
real (tap de notificación), comprueba serie/músculo/última/récord, `+30 s`
(valida push nuevo, tag distinto y `restSec` actualizado), "Reiniciar descanso"
(el reloj vuelve al total y se reencola), minimiza, reabre y salta.
