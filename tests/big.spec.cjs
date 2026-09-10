// GUARDRAIL: If you're removing/modifying steps below, STOP.
// This is the single source of truth for behavioral/E2E coverage of the app —
// all behavior tests live here, against the real SvelteKit app (real routes,
// real components, no hash-routing or window-exposed test hooks left over
// from the pre-migration vanilla-JS app). Don't add new top-level test files
// for app behavior; add a step to the main flow below, or a new
// `test.describe()` block containing exactly ONE `test()` in this same file.
// Removing any step WILL break the guardrail assertion below.
// Add new steps after step 15, or add your scenario as its own
// `test.describe()` block (one test per block — see rule below).
// If you truly must remove a step, update the EXPECTED_STEPS array.
//
// E2E means the state carries through, not "everything in one function":
// seed with seedIndexedDB() ONCE at the top of the test, then keep building
// on that same state by acting through the real UI — click "Siguiente",
// reload the page, navigate to another route — exactly like the numbered
// steps above do. Do NOT call seedIndexedDB() a second time mid-test to
// jump to the next assertion; that resets the world and turns "one flow"
// into several disconnected scenarios that just happen to share a function
// body. If a describe block ends up with more than one `test()`, that's the
// tell that they don't actually share a journey — each is reseeding on its
// own — so split them into their own `test.describe()` blocks instead of
// forcing them together.

const EXPECTED_STEPS = [
  'Step 1: Verify Profile',
  'Step 2: Ejercicios Tab Hydration',
  'Step 3: Visit Today — Phase Cards',
  'Step 4: Warmup — Navigate Prev/Next, Mark Done',
  'Step 5: Plan — Switch Week',
  'Step 6: Back to Today — Training Card',
  'Step 7: Coach IA FAB',
  'Step 8: Log Weights for Both Exercises',
  'Step 9: Streak Celebration',
  'Step 10: Effort Modal + Coach Card',
  'Step 11: History Verification',
  'Step 12: Friends',
  'Step 13: Language Toggle',
  'Step 14: Tab Bar Always Visible',
  'Step 15: No Uncaught JS Errors',
]

// Guardrail runs at import time — if any step is missing, the test file is corrupt.
const _source = require('fs').readFileSync(__filename, 'utf8')
for (const step of EXPECTED_STEPS) {
  if (!_source.includes(step)) {
    throw new Error(`GUARDRAIL FAILED: Missing "${step}" in ${__filename}. Restore it or update EXPECTED_STEPS.`)
  }
}

const { test, expect } = require('@playwright/test')

function getDayIdx() {
  return (new Date().getDay() + 6) % 7
}

function buildDayArray(workoutDay) {
  const idx = getDayIdx()
  const days = []
  for (let i = 0; i < idx; i++) {
    days.push({ name: 'Rest', subtitle: '', duration: 0, exercises: [] })
  }
  days.push(workoutDay)
  return days
}

const SEED = {
  exercises: [
    {
      id: 'ex-bench',
      name: 'Press Banca',
      dictId: 'dict_press-banca-barra',
      muscle: 'Chest',
      imgUrl: '',
      gifUrl: '',
      tips: ['Mantén los hombros hacia atrás y abajo', 'No rebotes el pecho', 'Respira profundo en cada repetición'],
      alternatives: [
        { name: 'Press Banca con Mancuernas', reason: 'Más rango de movimiento, activa estabilizadores' },
        { name: 'Press Inclinado con Barra', reason: 'Mayor énfasis en la parte superior del pecho' },
      ],
    },
    {
      id: 'ex-military',
      name: 'Press Militar',
      dictId: 'dict_press-militar-barra',
      muscle: 'Shoulders',
      imgUrl: '',
      gifUrl: '',
      tips: ['Mantén el core apretado', 'No arquees la espalda', 'La barra baja hasta la clavícula'],
      alternatives: [
        { name: 'Press Militar con Mancuernas', reason: 'Permite mayor rotación y menos tensión en hombros' },
      ],
    },
    {
      id: 'ex-squat',
      name: 'Sentadilla',
      dictId: 'dict_sentadilla-barra-back-squat',
      muscle: 'Quadriceps',
      imgUrl: '',
      gifUrl: '',
      tips: ['Mantén el pecho arriba', 'Rodillas hacia afuera', 'Baja hasta paralela'],
      alternatives: [
        { name: 'Sentadilla Búlgara', reason: 'Más trabajo unilateral, menos carga lumbar' },
      ],
    },
    {
      id: 'ex-deadlift',
      name: 'Peso Muerto',
      dictId: 'dict_peso-muerto-convencional',
      muscle: 'Back',
      imgUrl: '',
      gifUrl: '',
      tips: ['Espalda recta', 'Empuja con las piernas', 'Activa el core'],
      alternatives: [
        { name: 'Peso Muerto Rumano', reason: 'Menos rango, más isquiotibiales' },
      ],
    },
  ],
  getSettings() {
    return {
      id: 'settings',
      activeProgramId: 'prog-sample',
      currentWeekIdx: 0,
      units: 'kg',
      accentColor: '#d4ff3a',
      hasWatch: false,
      userName: 'TestUser',
      height: '180',
      weight: '80',
      sex: 'Masculino',
      age: '28',
      goal: 'hipertrofia',
      experience: 'intermedio',
      occupation: 'Ingeniero',
      pushSubscribed: false,
      pushServerUrl: '',
      sessionState: null,
      lastCoachAnalysis: null,
      rescheduleWeekOrder: {},
      language: 'es',
    }
  },
  getProgram() {
    const bench = { exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }
    const military = { exerciseId: 'ex-military', sets: 3, reps: '10-12', rest: 90 }
    const benchHeavy = { exerciseId: 'ex-bench', sets: 5, reps: '5', rest: 180 }
    const squat = { exerciseId: 'ex-squat', sets: 4, reps: '8-10', rest: 120 }

    return {
      id: 'prog-sample',
      name: 'Programa de Prueba',
      weeks: [
        {
          name: 'Semana 1 · Volumen',
          subtitle: '',
          tag: 'BUILD',
          days: buildDayArray({
            name: 'Empuje',
            subtitle: 'Press Banca · Press Militar',
            duration: 60,
            exercises: [bench, military],
          }),
        },
        {
          name: 'Semana 2 · Fuerza',
          subtitle: '',
          tag: 'STRENGTH',
          days: buildDayArray({
            name: 'Pierna y Espalda',
            subtitle: 'Press Banca 5×5 · Sentadilla',
            duration: 60,
            exercises: [benchHeavy, squat],
          }),
        },
      ],
    }
  },
}

async function seedIndexedDB(page, data, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.evaluate((d) => {
        return new Promise((resolve, reject) => {
          const req = indexedDB.open('coach-pedro-ai', 2)
          req.onupgradeneeded = () => {
            const db = req.result
            const stores = ['exercises', 'exerciseLogs', 'programs', 'settings', 'gymSessions']
            stores.forEach((s) => {
              if (db.objectStoreNames.contains(s)) return
              const store = db.createObjectStore(s, { keyPath: 'id' })
              if (s === 'exerciseLogs') {
                store.createIndex('exerciseId', 'exerciseId', { unique: false })
                store.createIndex('date', 'date', { unique: false })
              }
            })
          }
          req.onsuccess = () => {
            try {
              const db = req.result
              const tx = db.transaction(['exercises', 'exerciseLogs', 'programs', 'settings', 'gymSessions'], 'readwrite')
              tx.objectStore('exercises').clear()
              tx.objectStore('exerciseLogs').clear()
              tx.objectStore('programs').clear()
              tx.objectStore('settings').clear()
              tx.objectStore('gymSessions').clear()
              d.exercises.forEach(ex => tx.objectStore('exercises').put(ex))
              ;(d.exerciseLogs || []).forEach(log => tx.objectStore('exerciseLogs').put(log))
              if (d.program) tx.objectStore('programs').put(d.program)
              tx.objectStore('settings').put(d.settings)
              tx.oncomplete = () => { db.close(); resolve() }
              tx.onerror = () => reject(tx.error)
            } catch (e) {
              reject(e)
            }
          }
          req.onerror = () => reject(req.error)
        })
      }, data)
      return // success
    } catch (e) {
      if (attempt === retries) throw e
      await page.waitForTimeout(1000)
    }
  }
}

// Generic /api/ interceptor shared by the sub-tab suites below — mirrors the
// default branch of the main flow's route handler (coach-style JSON), since
// most of these tests don't care about AI response shape, only that the UI
// reacts to *a* response. Tests that DO care (e.g. AI import needs `weeks`)
// register a more specific page.route override before triggering the action;
// Playwright matches the most-recently-registered handler first.
async function mockApiRoutes(page) {
  await page.route(/\/api\//, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        analysis: 'Buen trabajo.',
        verdict: 'positive',
        rotation_topic: 'comparativa',
        _provider: 'test',
      }),
    })
  })
}

test('full user flow: profile → warmup → week switch (A→B) → training → stretch → coach → history → friends', async ({ page }) => {
  test.setTimeout(90000)

  // ── Fail on ANY uncaught JS error (hydration / runtime) ──
  const jsErrors = []
  page.on('pageerror', err => jsErrors.push(err.message))

  // ── Seed IndexedDB ──
  const program = SEED.getProgram()
  const settings = SEED.getSettings()
  await page.goto('today')
  await page.waitForTimeout(600)
  await seedIndexedDB(page, { exercises: SEED.exercises, program, settings })

  await page.waitForTimeout(200)
  await page.reload()
  await page.waitForTimeout(1000)
  // No appRefresh hook needed — SvelteKit re-reads IndexedDB on every route's
  // onMount, so a plain reload (or goto) is enough to pick up seeded data.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 5000 }).catch(() => {})

  // Intercept Worker API calls
  await page.route(/\/api\//, async (route) => {
    const url = route.request().url()
    if (url.includes('/api/user/register')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    }
    if (url.includes('/api/user/sync')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    }
    if (url.includes('/api/user/check')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ exists: true }) })
    }
    if (url.includes('/api/friends/search')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ username: 'Ana', streak: 12, exercisedToday: true }] }) })
    }
    if (url.includes('/api/friends/add')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    }
    if (url.includes('/api/friends/list')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [{ username: 'Ana', streak: 12, exercisedToday: true, lastUpdate: new Date().toISOString() }] }) })
    }
    // Default: coach AI response (used by You → Programas → Coach IA, not by
    // the local post-workout coach card, which is client-side only)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        analysis: 'Buen trabajo hoy, TestUser.',
        verdict: 'positive',
        proximo_objetivo: 'Press Banca → 55kg @ RIR 1-2',
        recommendations: ['Sube Press Banca 2.5kg la próxima sesión'],
        rotation_topic: 'comparativa',
        _provider: 'test',
      }),
    })
  })

  // ── Step 1: Verify Profile ──
  // Nota: el username se muestra ahora en Friends (header simplificado en 5d134e8),
  // por eso se verifica en Step 12. Aquí solo se verifican los campos de perfil,
  // que viven en ProfileCard bajo la tab Perfil (default).
  await page.goto('you')

  await expect(page.locator('#height-input')).toHaveValue('180')
  await expect(page.locator('#weight-input')).toHaveValue('80')
  await expect(page.locator('#sex-input')).toHaveValue('Masculino')
  await expect(page.locator('#age-input')).toHaveValue('28')
  await expect(page.locator('#goal-input')).toHaveValue('hipertrofia')
  await expect(page.locator('#exp-input')).toHaveValue('intermedio')
  await expect(page.locator('#occ-input')).toHaveValue('Ingeniero')

  // ── Step 2: Ejercicios Tab Hydration ──
  // Proves the SegmentedControl is actually interactive post-hydration by
  // checking the real effect of clicking it (content swap), not a CSS color.
  await page.click('#you-tab-ejercicios')
  await page.waitForTimeout(300)
  await expect(page.locator('#you-tab-ejercicios')).toHaveClass(/seg-active/)
  await expect(page.locator('.ex-count')).toBeVisible()

  // ── Step 3: Visit Today — Phase Cards ──
  await page.goto('today')
  await page.waitForTimeout(500)

  // Warmup + training are PhaseCards; stretch is a LockedCard (locked by warmup)
  await expect(page.locator('[data-phase="warmup"]')).toBeVisible()
  await expect(page.locator('[data-phase="training"]')).toBeVisible()
  await expect(page.locator('#today-locked-warmup-stretch')).toBeVisible()

  // ── Step 4: Warmup — Navigate Prev/Next, Mark Done ──
  await page.locator('[data-phase="warmup"]').click()
  await page.waitForTimeout(400)

  const hechoBtn = page.getByRole('button', { name: 'Hecho' })
  await expect(hechoBtn).toBeVisible({ timeout: 3000 })

  const getCounter = () => page.getByText(/\d+ \/ \d+/).first()
  const counter1 = await getCounter().textContent()
  expect(counter1).toMatch(/^1 \/ \d+$/)

  // Click Siguiente → counter changes
  // (Warmup's swipe transition holds a `swiping` lock for ~550ms; clicking
  // again before it clears is a silent no-op, so these waits must clear it.)
  await page.getByRole('button', { name: 'Siguiente' }).first().click()
  await page.waitForTimeout(700)
  const counter2 = await getCounter().textContent()
  expect(counter2).not.toBe(counter1)

  // Click Anterior → counter reverts
  await page.getByRole('button', { name: 'Anterior' }).first().click()
  await page.waitForTimeout(700)
  const counter3 = await getCounter().textContent()
  expect(counter3).toBe(counter1)

  // Mark warmup done — the Hoy tab must still show the Calentamiento card
  // (now completed) alongside the training card, not swap it away.
  await hechoBtn.click()
  await expect(hechoBtn).not.toBeVisible({ timeout: 2000 })
  await page.waitForTimeout(400)

  const warmupCard = page.locator('[data-phase="warmup"]')
  await expect(warmupCard).toBeVisible()
  await expect(warmupCard).toHaveClass(/completed/)
  await expect(page.locator('[data-phase="training"]')).toBeVisible()

  // ── Step 5: Plan — Switch Week ──
  // Wait for persistPhase() from warmup completion to settle in IndexedDB
  await page.waitForTimeout(800)
  await page.goto('plan')
  await page.waitForTimeout(500)

  const week2Tab = page.locator('button:has-text("Semana 2")').first()
  await expect(week2Tab).toBeVisible()
  await week2Tab.click()
  await page.waitForTimeout(500)

  // After switching weeks, the current day must auto-expand showing exercises
  // from the NEW week (not the previous one).
  const planDaysGrid = page.locator('#plan-days-grid')
  await expect(planDaysGrid).toContainText('Press de Banca')
  await expect(planDaysGrid).toContainText('Sentadilla')

  // ── Step 6: Back to Today — Training Card ──
  await page.goto('today')
  await page.waitForTimeout(800)

  const trainingCard = page.locator('[data-phase="training"]').first()
  await expect(trainingCard).toBeVisible()
  await expect(trainingCard).toContainText('Entrenamiento')

  // The completed Calentamiento card stays on the Hoy tab alongside the
  // training card — it must not disappear once warmup is done.
  await expect(page.locator('[data-phase="warmup"]')).toBeVisible()
  await expect(page.locator('[data-phase="warmup"]')).toHaveClass(/completed/)

  // Estiramiento is locked until the (new week's) exercises are finished.
  await expect(page.getByText('Termina el entrenamiento primero')).toBeVisible()

  // Exercise previews must render INSIDE the training card (not a separate
  // list elsewhere on the page).
  await expect(trainingCard.locator('.exercise-row')).toHaveCount(2)
  await expect(page.locator('#today-exercise-list')).toHaveCount(0)

  // Click training card → open detail sheet
  await trainingCard.click()
  await page.waitForTimeout(500)

  // Verify Google + TikTok exercise-search buttons (video search is intentional —
  // exercise demo videos, not a plain web search). Los search links ya no son
  // anchors <a href>: ahora son <button onclick={location.href=...}> en
  // ExerciseHero, así que verificamos presencia + aria-label en vez del href.
  const googleBtn = page.locator('.hero-google-btn').first()
  const tiktokBtn = page.locator('.hero-tiktok-btn').first()
  await expect(googleBtn).toBeVisible()
  await expect(tiktokBtn).toBeVisible()
  await expect(googleBtn).toHaveAttribute('aria-label', 'Buscar en Google')
  await expect(tiktokBtn).toHaveAttribute('aria-label', 'Buscar en TikTok')

  // ── Step 7: Coach IA (botón cyberpunk) ──
  // El acceso al coach IA ya no es un FAB global (#coach-fab, eliminado en
  // a334f38): ahora es el botón cyberpunk dentro del ExerciseDetail, que ya
  // está abierto tras el click a la trainingCard del Step 6.
  const coachBtn = page.locator('.coach-cyber-btn')
  await expect(coachBtn).toBeVisible({ timeout: 3000 })
  await expect(coachBtn).toContainText('Preguntar al coach')

  // Click to open Coach IA overlay
  await coachBtn.click()
  await page.waitForTimeout(400)

  // Verify overlay shows close button + exercise-specific greeting
  await expect(page.locator('.coach-close-btn')).toBeVisible()
  await expect(page.locator('text=¡Qué onda!')).toBeVisible()
  await expect(page.locator('text=Mejorar técnica')).toBeVisible()
  await expect(page.locator('text=¿Voy muy pesado?')).toBeVisible()

  // Close overlay via close button
  await page.locator('.coach-close-btn').click()
  await page.waitForTimeout(200)

  // Verify overlay is gone
  await expect(page.locator('.coach-close-btn')).not.toBeVisible()

  // ── Step 8: Log Weights for Both Exercises ──
  // Exercise 1: Press Banca 5×5
  const stepperInc = page.locator('.stepper-inc').first()
  await expect(stepperInc).toBeVisible()
  await stepperInc.click()
  await page.waitForTimeout(100)

  const weightInput = page.locator('input[inputmode="decimal"]').first()
  const weightVal = await weightInput.inputValue()
  expect(parseFloat(weightVal)).toBe(5)

  // Register weight — match "Registrar · 5kg"
  const registerBtn = page.getByRole('button', { name: /Registrar ·/ })
  await expect(registerBtn).toBeVisible()
  await registerBtn.click()
  await page.waitForTimeout(600)

  // Merged from the former tests/notifications.spec.cjs — a real user taps
  // "Iniciar" right after logging a set, to start resting before the next one.
  // This only stages the rest-timer push for the service worker; it must NOT
  // arm the in-app timer/banner itself — those only start once the OS
  // notification is tapped (covered in the "Rest timer notification flow"
  // suite below, which picks up from exactly this staged state).
  const iniciarBtn = page.getByRole('button', { name: 'Iniciar' })
  await expect(iniciarBtn).toBeVisible()
  await iniciarBtn.click()
  await page.waitForTimeout(600)

  const stagedPush = await page.evaluate(async () => {
    const cache = await caches.open('push-pending')
    const res = await cache.match('/pending')
    return res ? await res.json() : null
  })
  expect(stagedPush).not.toBeNull()
  expect(stagedPush.kind).toBe('start')
  expect(stagedPush.exerciseData.name).toBe('Press de Banca con Barra')
  expect(stagedPush.exerciseData.restSec).toBe(180)
  expect(stagedPush.exerciseData.sets).toBe(5)
  expect(stagedPush.exerciseData.exerciseId).toBe('ex-bench')
  await expect(page.locator('[data-component="RestTimerBanner"]')).toHaveCount(0)

  // Navigate to exercise 2 via Siguiente nav pill
  await page.getByRole('button', { name: 'Siguiente' }).first().click()
  await page.waitForTimeout(400)

  // Exercise 2: Should show Sentadilla (from Week B), NOT Press Militar (from Week A)
  // This verifies the week-switch navigation bug: the detail sheet must search
  // only the current week, not all weeks, for prev/next context.
  await expect(page.locator('text=Sentadilla').first()).toBeVisible({ timeout: 2000 })

  // Increment stepper + register
  const stepperInc2 = page.locator('.stepper-inc').first()
  await stepperInc2.click()
  await page.waitForTimeout(100)
  const registerBtn2 = page.getByRole('button', { name: /Registrar ·/ })
  await expect(registerBtn2).toBeVisible()
  await registerBtn2.click()
  await page.waitForTimeout(600)

  // Close detail sheet → triggers refresh() which recalculates today's done count
  const sheetCloseBtn = page.getByRole('button', { name: 'Cerrar' }).first()
  await expect(sheetCloseBtn).toBeVisible()
  await sheetCloseBtn.click()
  await page.waitForTimeout(500)

  // Finishing all exercises must NOT force-launch the stretch overlay — the
  // Hoy tab keeps showing the completed Calentamiento + Entrenamiento cards
  // plus a tappable Estiramiento card, same as the warmup → training handoff.
  await expect(page.locator('[data-phase="warmup"]')).toBeVisible()
  await expect(page.locator('[data-phase="training"]')).toBeVisible()
  const stretchCard = page.locator('[data-phase="stretch"]')
  await expect(stretchCard).toBeVisible({ timeout: 5000 })
  await stretchCard.click()
  await page.waitForTimeout(400)

  const stretchHecho = page.getByRole('button', { name: 'Hecho' })
  await expect(stretchHecho).toBeVisible({ timeout: 5000 })

  // Navigate stretch if controls visible
  const stretchNext = page.getByRole('button', { name: 'Siguiente' })
  if (await stretchNext.isVisible()) {
    await stretchNext.click()
    await page.waitForTimeout(500)
  }
  const stretchPrev = page.getByRole('button', { name: 'Anterior' })
  if (await stretchPrev.isVisible()) {
    await stretchPrev.click()
    await page.waitForTimeout(500)
  }

  await stretchHecho.click()
  await page.waitForTimeout(500)

  // ── Step 9: Streak Celebration ──
  const streakOverlay = page.locator('#streak-overlay')
  await expect(streakOverlay).toBeVisible({ timeout: 5000 })
  await expect(streakOverlay.locator('text=Semanas consecutivas')).toBeVisible()
  // Wait for auto-dismiss
  await expect(streakOverlay).not.toBeVisible({ timeout: 5000 })

  // ── Step 10: Effort Modal + Coach Card ──
  const effortOverlay = page.locator('#effort-overlay')
  await expect(effortOverlay).toBeVisible({ timeout: 5000 })
  await effortOverlay.locator('[data-effort="Justo"]').click()

  const coachCard = page.locator('[data-component="CoachResultCard"]')
  await expect(coachCard).toBeVisible({ timeout: 10000 })
  // La card post-workout se renombró (a334f38: CyberpunkCard label WORKOUT_ANALYSIS).
  await expect(coachCard).toContainText('WORKOUT_ANALYSIS')

  // Regression guard: the post-workout coach card must show the *real*
  // /api/ai/coach response, not a static canned string keyed only by effort
  // level (the old client-side-only stub). Asserting this test's mocked
  // payload verbatim proves the network call is actually wired up.
  await expect(coachCard).toContainText('Buen trabajo hoy, TestUser.')
  await expect(coachCard).toContainText('Press Banca → 55kg @ RIR 1-2')
  await expect(coachCard).toContainText('Sube Press Banca 2.5kg la próxima sesión')

  // ── Step 10b: Coach result survives closing and reopening the app ──
  // Regression guard: reloading must keep showing the coach's analysis for
  // today, not fall back to just the bare "Racha/Volumen/PRs" stat grid.
  await page.reload()
  await page.waitForTimeout(1000)
  const coachCardAfterReload = page.locator('[data-component="CoachResultCard"]')
  await expect(coachCardAfterReload).toBeVisible({ timeout: 10000 })
  await expect(coachCardAfterReload).toContainText('Buen trabajo hoy, TestUser.')

  // ── Step 11: History Verification ──
  await page.goto('history')
  await page.waitForTimeout(500)

  // History shows the completed session with exercise names (from Week B)
  await expect(page.locator('body')).toContainText('Press de Banca')
  await expect(page.locator('body')).toContainText('Sentadilla')
  await expect(page.locator('body')).toContainText('Completado')

  // History shows logged weights from Step 8
  await expect(page.locator('body')).toContainText('5')

  // History/Calendar must show resolved exercise names, never raw ids like "ex-bench"
  const bodyText = await page.locator('body').textContent()
  expect(bodyText).not.toContain('ex-bench')
  expect(bodyText).not.toContain('ex-squat')

  // ── Step 12: Friends ──
  // No window overrides — the real Friends page calls the API directly;
  // routes are intercepted above.
  await page.goto('friends')
  await page.waitForTimeout(500)

  // El prompt #username-prompt solo aparece si el usuario NO tiene nombre.
  // Como este flujo ya seedea settings.userName = 'TestUser', Friends renderiza
  // directo la vista principal; el nombre se verifica abajo en el UsernameEditor.
  await expect(page.locator('.friends-my-streak')).toContainText('Racha')

  // El username ahora vive aquí (en Mi Perfil / UsernameEditor), no en el header
  // de You (se movió en 5d134e8). Es el nuevo lugar de verificación del nombre.
  await expect(page.locator('.username-editor .name-text')).toContainText('TestUser')

  // Search for friend
  const searchInput = page.locator('#friend-search-input')
  await expect(searchInput).toBeVisible()
  await searchInput.fill('Ana')
  await page.waitForTimeout(500)

  // Search result shows mock friend
  const searchResult = page.locator('.sr-item')
  await expect(searchResult).toBeVisible()
  await expect(searchResult).toContainText('Ana')

  // Add friend
  const addBtn = page.getByRole('button', { name: 'Agregar' })
  await expect(addBtn).toBeVisible()
  await addBtn.click()
  await page.waitForTimeout(500)

  // Verify friend appears in list with streak (leaderboard grid — Ana es una card).
  const friendCard = page.locator('.friend-card').filter({ has: page.locator('.name', { hasText: 'Ana' }) })
  await expect(friendCard).toBeVisible()
  await expect(friendCard).toContainText('Ana')
  await expect(friendCard).toContainText('12')
  await expect(friendCard).toContainText('✅')

  // ── Step 13: Language Toggle — Exercise Names ──
  await page.goto('you')
  await page.waitForTimeout(500)

  const langBtn = page.locator('#lang-toggle-btn')
  await expect(langBtn).toBeVisible()
  await expect(langBtn).toContainText('Español')

  // Click to switch to English
  await langBtn.click()
  await page.waitForTimeout(500)

  // Navigate to History — exercise names should be in English
  await page.goto('history')
  await page.waitForTimeout(500)
  await expect(page.locator('body')).toContainText('Barbell Bench Press')
  await expect(page.locator('body')).toContainText('Barbell Full Squat')

  // Toggle back to Spanish
  await page.goto('you')
  await page.waitForTimeout(500)
  const langBtn2 = page.locator('#lang-toggle-btn')
  await expect(langBtn2).toContainText('English')
  await langBtn2.click()
  await page.waitForTimeout(500)

  // Verify Spanish names restored
  await page.goto('history')
  await page.waitForTimeout(500)
  await expect(page.locator('body')).toContainText('Press de Banca')

  // ── Step 14: Tab Bar Always Visible — on every page, without scrolling ──
  const tabBarPages = ['today', 'plan', 'history', 'you']
  for (const tabPage of tabBarPages) {
    await page.goto(tabPage)
    await page.waitForTimeout(400)

    const hoyBtn = page.getByRole('link', { name: 'Hoy' })
    await expect(hoyBtn).toBeVisible()
    await expect(hoyBtn).toBeInViewport()

    // After scrolling content, tab bar must stay fixed at the bottom
    await page.evaluate(() => window.scrollTo(0, 9999))
    await page.waitForTimeout(200)
    await expect(hoyBtn).toBeInViewport()
  }

  // ── Step 15: No Uncaught JS Errors ──
  expect(jsErrors).toEqual([])
})

// Merged from the former tests/warmup-detail.spec.cjs — same rule: all app
// behavior lives in this one file. These are independent, narrowly-seeded
// scenarios (not steps in the main flow above), so they're separate test()
// calls sharing the seedIndexedDB/buildDayArray helpers already defined above.
test.describe('You — Tamaño de texto (accessibility)', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: null, currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  test('cycles Normal → Grande → Extra grande, scales the whole app, and persists', async ({ page }) => {
    await page.goto('you')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, { exercises: [], settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    const fontBtn = page.locator('#font-size-toggle-btn')
    await expect(fontBtn).toBeVisible()
    await expect(fontBtn).toContainText('Normal')
    await expect(page.locator('.app-shell')).toHaveCSS('zoom', '1')

    await fontBtn.click()
    await page.waitForTimeout(300)
    await expect(fontBtn).toContainText('Grande')
    await expect(page.locator('.app-shell')).toHaveCSS('zoom', '1.15')

    await fontBtn.click()
    await page.waitForTimeout(300)
    await expect(fontBtn).toContainText('Extra grande')
    await expect(page.locator('.app-shell')).toHaveCSS('zoom', '1.3')

    // Persisted to Settings — survives a reload, not just local component state
    await page.reload()
    await page.waitForTimeout(600)
    await expect(page.locator('#font-size-toggle-btn')).toContainText('Extra grande')
    await expect(page.locator('.app-shell')).toHaveCSS('zoom', '1.3')

    // Cycles back to Normal
    await page.locator('#font-size-toggle-btn').click()
    await page.waitForTimeout(300)
    await expect(page.locator('#font-size-toggle-btn')).toContainText('Normal')
    await expect(page.locator('.app-shell')).toHaveCSS('zoom', '1')
  })
})

test.describe('Warmup detail sheet rendering', () => {
  const BASE_SETTINGS = {
    id: 'settings',
    activeProgramId: 'prog-test',
    currentWeekIdx: 0,
    units: 'kg',
    accentColor: '#d4ff3a',
    hasWatch: false,
    pushSubscribed: false,
    pushServerUrl: '',
    sessionState: null,
    lastCoachAnalysis: null,
    rescheduleWeekOrder: {},
  }

  function getTodayStr() {
    return new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  }

  test('renders sectioned cards when item has posInicial/ejecucion/respiracion/duracion', async ({ page }) => {
    const program = {
      id: 'prog-test',
      name: 'Test Program',
      weeks: [{
        name: 'Semana 1',
        subtitle: '',
        tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje',
          subtitle: 'Press Banca',
          duration: 60,
          exercises: [{ exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }],
        }),
      }],
    }

    await page.goto('today')
    await page.waitForTimeout(600)
    await seedIndexedDB(page, {
      exercises: [{ id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', tips: [], alternatives: [] }],
      program,
      settings: { ...BASE_SETTINGS },
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(1000)

    // The warmup sheet doesn't auto-open — the user opens it via the phase card.
    await page.locator('[data-phase="warmup"]').click()
    await page.waitForTimeout(500)

    // Chest warmup items from WARMUP_DATA have all 4 sections
    await expect(page.getByText('Posición Inicial').first()).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Ejecución').first()).toBeVisible()
    await expect(page.getByText('Respiración').first()).toBeVisible()
    await expect(page.getByText('Duración').first()).toBeVisible()
  })

  test('falls back to desc for GENERIC_WARMUP items without section fields', async ({ page }) => {
    // Quadriceps does not resolve to any WARMUP_DATA key -> GENERIC_WARMUP_ONLY fallback
    const program = {
      id: 'prog-test',
      name: 'Test Program',
      weeks: [{
        name: 'Semana 1',
        subtitle: '',
        tag: 'BUILD',
        days: buildDayArray({
          name: 'Piernas',
          subtitle: 'Sentadilla',
          duration: 60,
          exercises: [{ exerciseId: 'ex-squat', sets: 4, reps: '8-10', rest: 120 }],
        }),
      }],
    }

    await page.goto('today')
    await page.waitForTimeout(600)
    await seedIndexedDB(page, {
      exercises: [{ id: 'ex-squat', name: 'Sentadilla', muscle: 'Quadriceps', imgUrl: '', tips: [], alternatives: [] }],
      program,
      settings: { ...BASE_SETTINGS },
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(1000)

    await page.locator('[data-phase="warmup"]').click()
    await page.waitForTimeout(500)

    // GENERIC_WARMUP items have a desc field, not sections
    // "Cómo hacerlo" label shows in the fallback path
    await expect(page.getByText('Cómo hacerlo').first()).toBeVisible({ timeout: 3000 })

    // Section labels should NOT appear
    await expect(page.getByText('Posición Inicial')).toHaveCount(0)
  })

  test('shows STALLBAR badge when item has stallbar: true', async ({ page }) => {
    // Chest exercise; seed sessionState at phase 3 with todayExDone matching
    // the day's exercise count so the app lands on the Hoy tab with the
    // Estiramiento card tappable (it doesn't auto-open on mount).
    const program = {
      id: 'prog-test',
      name: 'Test Program',
      weeks: [{
        name: 'Semana 1',
        subtitle: '',
        tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje',
          subtitle: 'Press Banca',
          duration: 60,
          exercises: [{ exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }],
        }),
      }],
    }
    const today = getTodayStr()

    await page.goto('today')
    await page.waitForTimeout(600)
    await seedIndexedDB(page, {
      exercises: [{ id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', tips: [], alternatives: [] }],
      program,
      // A real logged weight is required — the app reconciles todayExDone
      // against actual exerciseLogs on mount and would otherwise zero it out.
      exerciseLogs: [{ id: 'log-bench-today', exerciseId: 'ex-bench', date: today, weight: 60, units: 'kg' }],
      settings: { ...BASE_SETTINGS, sessionState: { date: today, phase: 3, todayExDone: 1 } },
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(1000)

    // The Estiramiento card is now visible and active on the Hoy tab — tap it to open.
    await page.locator('[data-phase="stretch"]').click()
    await page.waitForTimeout(500)

    // Chest stretch: 3rd item "Apertura de Pecho Pasiva en Espaldera" has stallbar: true
    // Navigate Siguiente twice (same ~550ms swipe-lock as the main flow's warmup step)
    const nextBtn = page.getByRole('button', { name: 'Siguiente' }).first()
    await expect(nextBtn).toBeVisible({ timeout: 3000 })
    await nextBtn.click()
    await page.waitForTimeout(700)
    await nextBtn.click()
    await page.waitForTimeout(700)

    // STALLBAR badge should now be visible
    await expect(page.getByText('STALLBAR').first()).toBeVisible({ timeout: 2000 })
  })
})

// The suites below close the sub-tab gaps the main flow above never reaches:
// Tú → Programas, Tú → Datos, Tú → Ejercicios CRUD (main flow only proves the
// tab hydrates), Plan → Reprogramar mode, Plan's own ExerciseDetail wiring,
// and Historial → Ejercicios. Same rule as the warmup suite above: independent
// scenarios live here as their own test()/describe(), not steps in the main flow.

test.describe('You — Programas tab', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-a', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }
  const PROGRAM_A = {
    id: 'prog-a', name: 'Programa Activo',
    weeks: [{ name: 'Semana 1', subtitle: '', tag: 'BUILD', days: [{ name: 'Día 1', subtitle: '', duration: 60, exercises: [] }] }],
  }

  test('create, activate, duplicate, delete a program + Coach IA response', async ({ page }) => {
    test.setTimeout(60000)
    await mockApiRoutes(page)

    await page.goto('you')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, { exercises: [], program: PROGRAM_A, settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await page.getByRole('button', { name: 'Programas' }).click()
    await page.waitForTimeout(300)

    // Create a new program
    await page.getByPlaceholder('Nombre del nuevo programa').fill('Programa Nuevo')
    await page.getByRole('button', { name: '+ Nuevo' }).click()
    await page.waitForTimeout(500)

    const newCard = page.locator('[data-component="ProgramCard"]', { hasText: 'Programa Nuevo' }).first()
    await expect(newCard).toBeVisible()

    // Activate it — the ACTIVO pill should move off "Programa Activo"
    await newCard.getByRole('button', { name: 'Activar' }).click()
    await page.waitForTimeout(400)
    await expect(newCard).toHaveClass(/active/)
    const oldCard = page.locator('[data-component="ProgramCard"]', { hasText: 'Programa Activo' })
    await expect(oldCard).not.toHaveClass(/active/)

    // Duplicate
    await newCard.getByRole('button', { name: 'Duplicar' }).click()
    await page.waitForTimeout(400)
    const dupCard = page.locator('[data-component="ProgramCard"]', { hasText: 'Programa Nuevo (copia)' })
    await expect(dupCard).toBeVisible()

    // Delete the duplicate
    page.once('dialog', d => d.accept())
    await dupCard.getByRole('button', { name: 'Eliminar' }).click()
    await page.waitForTimeout(400)
    await expect(page.locator('[data-component="ProgramCard"]', { hasText: 'Programa Nuevo (copia)' })).toHaveCount(0)

    // Coach IA — switch to IA Powered sub-tab, ask a question, verify a response renders
    await page.getByRole('button', { name: 'IA Powered' }).click()
    await page.waitForTimeout(300)
    await page.locator('[data-component="ProgramEditorIACard"] textarea').fill('¿Está balanceada mi rutina?')
    await page.getByRole('button', { name: 'Enviar al coach' }).click()
    await page.waitForTimeout(600)
    await expect(page.locator('[data-component="CoachResponseCard"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-component="CoachResponseCard"]')).toContainText('Listo.')
  })
})

test.describe('You — Datos tab', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: null, currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
    onboarded: true, onboardingStep: -1,
  }

  test('AI import, dictionary migration, and JSON export/import', async ({ page }) => {
    test.setTimeout(60000)

    // Only the AI-import endpoint needs a real payload (it requires `weeks`);
    // registered as its own route so it's matched ahead of nothing else here.
    await page.route((url) => url.href.includes('/api/ai/import'), (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        program_name: 'Programa IA',
        weeks: [{
          name: 'Semana 1', subtitle: '', tag: 'BUILD',
          days: [{ name: 'Día 1', subtitle: '', duration: 60, exercises: [{ name: 'Press Banca', muscle: 'Chest' }] }],
        }],
      }),
    }))

    await page.goto('you')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, { exercises: [], settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await page.getByRole('button', { name: 'Programas' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'IA Powered' }).click()
    await page.waitForTimeout(300)

    // AI import — now redirects to the Manual sub-tab, so the new program card appears
    await page.locator('.ai-textarea-wrap textarea').fill('Lunes: Press banca 4x8')
    await page.getByRole('button', { name: 'Importar con IA' }).click()
    await page.waitForTimeout(600)
    await expect(page.locator('[data-component="ProgramCard"]', { hasText: 'Programa IA' })).toBeVisible({ timeout: 5000 })

    // Dictionary migration now lives at the top of the Ejercicios tab
    await page.getByRole('button', { name: 'Ejercicios' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Sobrescribir' }).click()
    await page.waitForTimeout(500)
    await expect(page.locator('#dict-migrate-status')).toContainText('Actualizados')

    // Switch to Datos tab for JSON import/export
    await page.getByRole('button', { name: 'Datos' }).click()
    await page.waitForTimeout(300)

    // Export exercises JSON
    const [download1] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-component="DataExportSection"]').getByRole('button', { name: 'Exportar JSON' }).first().click(),
    ])
    expect(download1.suggestedFilename()).toMatch(/^ejercicios-\d{4}-\d{2}-\d{2}\.json$/)

    // Import exercises JSON
    const fs = require('fs')
    const os = require('os')
    const path = require('path')
    const exFile = path.join(os.tmpdir(), `pw-exercises-${Date.now()}.json`)
    fs.writeFileSync(exFile, JSON.stringify([
      { id: 'ex-imported', name: 'Curl de Bíceps', muscle: 'Biceps', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
    ]))
    try {
      await page.locator('[data-component="DataImportSection"] input[type="file"]').first().setInputFiles(exFile)
      await page.waitForTimeout(500)
      await expect(page.locator('[data-component="DataImportSection"]')).toContainText('1 ejercicios importados')
    } finally {
      fs.unlinkSync(exFile)
    }

    // Import logs+settings JSON
    const logsFile = path.join(os.tmpdir(), `pw-logs-${Date.now()}.json`)
    fs.writeFileSync(logsFile, JSON.stringify({
      exerciseLogs: [{ id: 'log-imported', exerciseId: 'ex-imported', date: '2026-07-01', weight: 40, units: 'kg' }],
    }))
    try {
      await page.locator('[data-component="DataImportSection"] input[type="file"]').nth(1).setInputFiles(logsFile)
      await page.waitForTimeout(500)
      await expect(page.locator('[data-component="DataImportSection"]')).toContainText('Importados 1 logs')
    } finally {
      fs.unlinkSync(logsFile)
    }
  })

  // Merged from the former tests/dict-normalize.spec.cjs — same Ejercicios tab,
  // continuing the route with an exercise the dictionary can't resolve.
  test('shows ver más link + overlay for exercises with no dictionary match', async ({ page }) => {
    const exercises = [
      { id: 'ex-bench', name: 'Press Banca', dictId: '', muscle: '', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
      { id: 'ex-madeup', name: 'Ejercicio Inventado X7', dictId: '', muscle: '', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
    ]

    await page.goto('you')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, { exercises, settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await page.getByRole('button', { name: 'Ejercicios' }).click()
    await page.waitForTimeout(300)

    // "Sobrescribir" re-runs the migration even if already applied this session
    const forceBtn = page.getByRole('button', { name: 'Sobrescribir' })
    await expect(forceBtn).toBeVisible()
    await forceBtn.click()

    const statusEl = page.locator('#dict-migrate-status')
    await expect(statusEl).toContainText('sin match 1', { timeout: 10000 })

    const verMas = page.locator('#ver-mas-link')
    await expect(verMas).toBeVisible()
    await expect(verMas).toContainText('ver más')
    await verMas.click()
    await page.waitForTimeout(300)

    const overlay = page.locator('#skipped-overlay')
    await expect(overlay).toBeVisible()
    await expect(overlay).toContainText('Ejercicio Inventado X7')

    const closeBtn = page.locator('#skipped-close-btn')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()
    await page.waitForTimeout(200)
    await expect(overlay).not.toBeVisible()
  })
})

test.describe('You — Ejercicios tab CRUD', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: null, currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  test('search, add, edit, delete an exercise', async ({ page }) => {
    test.setTimeout(60000)

    await page.goto('you')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, {
      exercises: [
        { id: 'ex-a', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
        { id: 'ex-b', name: 'Sentadilla', muscle: 'Quadriceps', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
      ],
      settings: SETTINGS,
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await page.click('#you-tab-ejercicios')
    await page.waitForTimeout(300)
    await expect(page.locator('#ex-count')).toHaveText('2 ejercicios')

    // Search filters the list down to one match
    await page.getByPlaceholder('Buscar ejercicio…').fill('sentad')
    await page.waitForTimeout(300)
    await expect(page.locator('[data-component="ExerciseListItem"]')).toHaveCount(1)
    await expect(page.locator('[data-component="ExerciseListItem"]')).toContainText('Sentadilla')
    await page.getByPlaceholder('Buscar ejercicio…').fill('')
    await page.waitForTimeout(300)

    // Add a new exercise
    await page.getByRole('button', { name: '+ Nuevo' }).click()
    await page.getByPlaceholder('Nombre del ejercicio').fill('Remo con Barra')
    await page.getByPlaceholder('Músculo (ej: Pecho, Espalda)').fill('Espalda')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await page.waitForTimeout(400)
    await expect(page.locator('#ex-count')).toHaveText('3 ejercicios')
    const newItem = page.locator('[data-component="ExerciseListItem"]', { hasText: 'Remo con Barra' })
    await expect(newItem).toBeVisible()

    // Edit it
    await newItem.locator('.exercise-toggle').click()
    await page.waitForTimeout(300)
    await newItem.getByRole('button', { name: 'Editar' }).click()
    await newItem.getByPlaceholder('Nombre').fill('Remo con Barra (editado)')
    await newItem.getByRole('button', { name: 'Guardar' }).click()
    await page.waitForTimeout(400)
    const editedItem = page.locator('[data-component="ExerciseListItem"]', { hasText: 'Remo con Barra (editado)' })
    await expect(editedItem).toBeVisible()

    // Delete it — still expanded from the edit step above (a second toggle
    // click here would collapse it again and hide the Eliminar button)
    page.once('dialog', d => d.accept())
    await editedItem.getByRole('button', { name: 'Eliminar' }).click()
    await page.waitForTimeout(400)
    await expect(page.locator('#ex-count')).toHaveText('2 ejercicios')
  })
})

test.describe('Plan — Reprogramar mode', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-plan', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }
  // Fixed 7-day week (not built from buildDayArray, which pads only up to
  // "today") so day names/positions are deterministic regardless of run date.
  const PROGRAM_PLAN = {
    id: 'prog-plan', name: 'Programa Plan',
    weeks: [{
      name: 'Semana 1', subtitle: '', tag: 'BUILD',
      days: [
        { name: 'Empuje', subtitle: '', duration: 60, exercises: [] },
        { name: 'Rest', subtitle: '', duration: 0, exercises: [] },
        { name: 'Tirón', subtitle: '', duration: 60, exercises: [] },
        { name: 'Rest', subtitle: '', duration: 0, exercises: [] },
        { name: 'Pierna', subtitle: '', duration: 60, exercises: [] },
        { name: 'Rest', subtitle: '', duration: 0, exercises: [] },
        { name: 'Rest', subtitle: '', duration: 0, exercises: [] },
      ],
    }],
  }

  test('drag days, cancel on release outside, reset, shift, and persist a reschedule', async ({ page }) => {
    test.setTimeout(60000)

    await page.goto('plan')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, { exercises: [], program: PROGRAM_PLAN, settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await page.locator('#plan-reprogram-btn').click()
    await page.waitForTimeout(300)
    await expect(page.getByText('Reprogramando esta semana')).toBeVisible()

    // Enter drag mode via the "Mover" button; every day (including Rest days)
    // shows a handle ⠿
    await page.locator('#plan-move-btn').click()
    await page.waitForTimeout(300)
    await expect(page.locator('.drag-handle')).toHaveCount(7)

    // Swap Empuje (Mon, slot 0) and Tirón (Wed, slot 2) by dragging the handle
    const slots = page.locator('.drag-slot')
    await expect(slots).toHaveCount(7)
    const box0 = await slots.nth(0).boundingBox()
    const box1 = await slots.nth(1).boundingBox()
    const step = box1.y - box0.y
    await expect(page.locator('.drag-handle').first()).toBeVisible()
    const handle = page.locator('.drag-handle').first()
    const hb = await handle.boundingBox()
    const grabOffset = hb.y - box0.y
    const cx = hb.x + hb.width / 2
    const cy = hb.y + hb.height / 2
    const targetY = box0.y + 2 * step + grabOffset
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx, targetY, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    await expect(slots.nth(2).getByText('Empuje')).toBeVisible()
    await expect(slots.nth(2).locator('.moved-chip')).toContainText('desde Lun')
    await expect(slots.nth(0).getByText('Tirón')).toBeVisible()
    await expect(slots.nth(0).locator('.moved-chip')).toContainText('desde Mié')

    // Releasing outside the list cancels: Empuje stays where it is
    const empHandle = page.locator('.drag-slot', { hasText: 'Empuje' }).locator('.drag-handle')
    const ehb = await empHandle.boundingBox()
    const ecy = ehb.y + ehb.height / 2
    const ecx = ehb.x + ehb.width / 2
    await page.mouse.move(ecx, ecy)
    await page.mouse.down()
    await page.mouse.move(ecx, ecy + step, { steps: 5 })
    await page.mouse.move(5, 5)
    await page.mouse.up()
    await page.waitForTimeout(300)
    await expect(slots.nth(2).getByText('Empuje')).toBeVisible()
    await expect(page.locator('.moved-chip')).toHaveCount(2)

    // Reset clears the reorder
    await page.locator('#plan-reset-btn').click()
    await page.waitForTimeout(300)
    await expect(page.locator('.moved-chip')).toHaveCount(0)

    // "Me salté un día" rotates every workout forward by one day
    await page.locator('#plan-shift-btn').click()
    await page.waitForTimeout(300)
    await expect(page.locator('.drag-slot', { hasText: 'Empuje' }).locator('.moved-chip')).toContainText('desde Lun')
    await expect(page.locator('.drag-slot', { hasText: 'Tirón' }).locator('.moved-chip')).toContainText('desde Mié')

    // Save — a persistent "changes" banner should appear outside edit mode
    await page.locator('#plan-reprogram-btn').click()
    await page.waitForTimeout(400)
    await expect(page.locator('#plan-changes-banner')).toBeVisible()
    await expect(page.locator('#plan-changes-banner')).toContainText('cambios')

    // Reload — the reschedule must have actually persisted to settings, not
    // just local component state
    await page.reload()
    await page.waitForTimeout(800)
    await expect(page.locator('#plan-changes-banner')).toBeVisible()
  })
})

test.describe('Plan — drag onto a free slot', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-free', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }
  // 5-day program with real weekdays → Lun and Sáb free. weekday: 1=Lun … 7=Dom.
  const PROGRAM = {
    id: 'prog-free', name: 'Rutina Libre',
    weeks: [{
      name: 'Semana 1', subtitle: '', tag: 'BUILD',
      days: [
        { name: 'Pecho · Tríceps', subtitle: '', duration: 60, exercises: [], weekday: 2 },
        { name: 'Espalda · Bíceps', subtitle: '', duration: 60, exercises: [], weekday: 3 },
        { name: 'Pierna', subtitle: '', duration: 60, exercises: [], weekday: 4 },
        { name: 'Hombro · Core', subtitle: '', duration: 60, exercises: [], weekday: 5 },
        { name: 'Full Body', subtitle: '', duration: 60, exercises: [], weekday: 7 },
      ],
    }],
  }

  test('dragging a workout onto a free slot repositions it', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto('plan')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, { exercises: [], program: PROGRAM, settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await page.locator('#plan-reprogram-btn').click()
    await page.waitForTimeout(300)
    await page.locator('#plan-move-btn').click()
    await page.waitForTimeout(300)

    // natural order = [Lun libre, Mar Pecho, Mié Espalda, Jue Pierna, Vie Hombro, Sáb libre, Dom Full Body]
    // drags SWAP slots: dragging a day onto another slot exchanges their positions
    const slots = page.locator('.drag-slot')
    await expect(slots).toHaveCount(7)
    await expect(page.locator('.drag-handle')).toHaveCount(5)
    await expect(slots.nth(0).getByText('Sin entrenamiento')).toBeVisible()

    // Later slots sit partly under the fixed tab bar — bring slot 3's handle
    // into the clear first, or elementFromPoint hits the "Plan" tab link and
    // the pointerdown never reaches the handle.
    await page.evaluate(() => {
      const els = document.querySelectorAll('.drag-slot')
      const h = els[3].querySelector('.drag-handle').getBoundingClientRect()
      const safe = window.innerHeight - 110
      if (h.bottom > safe) window.scrollBy(0, h.bottom - safe)
    })
    await page.waitForTimeout(100)

    const box0 = await slots.nth(0).boundingBox()
    const box1 = await slots.nth(1).boundingBox()
    const step = box1.y - box0.y
    const box3 = await slots.nth(3).boundingBox()
    const hb = await slots.nth(3).locator('.drag-handle').boundingBox()
    const grabOffset = hb.y - box3.y
    const cx = hb.x + hb.width / 2
    const cy = hb.y + hb.height / 2
    const targetY = box0.y + grabOffset
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx, targetY, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    // Pierna (Jue) swaps with the free Lun slot
    await expect(slots.nth(0).getByText('Pierna')).toBeVisible()
    await expect(slots.nth(0).locator('.moved-chip')).toContainText('desde Jue')
    await expect(slots.nth(3).getByText('Sin entrenamiento')).toBeVisible()

    // Listo → persists as a temporary reschedule
    await page.locator('#plan-reprogram-btn').click()
    await page.waitForTimeout(400)
    await expect(page.locator('#plan-changes-banner')).toBeVisible()
    await expect(page.locator('#plan-changes-banner')).toContainText('2 cambios')
  })
})

test.describe('Plan — weekday mapping (Mar-Vie + Dom)', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-weekday', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }
  // Rutina importada con días reales Mar–Vie + Dom. `weekday`: 1=Lun … 7=Dom.
  // Fixed day names (not buildDayArray) so slot placement is deterministic
  // regardless of the date the suite runs on.
  const PROGRAM = {
    id: 'prog-weekday', name: 'Rutina Mar-Vie+Dom',
    weeks: [{
      name: 'Semana 1', subtitle: '', tag: 'BUILD',
      days: [
        { name: 'Pecho · Tríceps', subtitle: '', duration: 60, exercises: [], weekday: 2 },
        { name: 'Espalda · Bíceps', subtitle: '', duration: 60, exercises: [], weekday: 3 },
        { name: 'Pierna', subtitle: '', duration: 60, exercises: [], weekday: 4 },
        { name: 'Hombro · Core', subtitle: '', duration: 60, exercises: [], weekday: 5 },
        { name: 'Full Body', subtitle: '', duration: 60, exercises: [], weekday: 7 },
      ],
    }],
  }

  test('places days on their real weekday slots; Mon and Sat stay free', async ({ page }) => {
    test.setTimeout(60000)

    await page.goto('plan')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, { exercises: [], program: PROGRAM, settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    const slotCard = (day) => page.locator('#plan-days-grid .day-card')
      .filter({ has: page.locator('.badge-day', { hasText: day }) })

    await expect(slotCard('Lun').locator('.day-empty')).toContainText('Sin entrenamiento')
    await expect(slotCard('Mar').locator('.day-title')).toHaveText('Pecho · Tríceps')
    await expect(slotCard('Mié').locator('.day-title')).toHaveText('Espalda · Bíceps')
    await expect(slotCard('Jue').locator('.day-title')).toHaveText('Pierna')
    await expect(slotCard('Vie').locator('.day-title')).toHaveText('Hombro · Core')
    await expect(slotCard('Sáb').locator('.day-empty')).toContainText('Sin entrenamiento')
    await expect(slotCard('Dom').locator('.day-title')).toHaveText('Full Body')

    // No "moved" chips in view mode: weekday placement is intrinsic, not an override
    await expect(page.locator('#plan-days-grid .moved-chip')).toHaveCount(0)

    // Today respects the same mapping: a fixed Monday (2026-08-17) is a rest day
    await page.clock.setFixedTime(new Date('2026-08-17T10:00:00'))
    await page.goto('today')
    await page.waitForTimeout(1000)
    await expect(page.locator('.hero-title', { hasText: 'Descanso' })).toBeVisible()

    // ── Regression: Reprogramar + Listo WITHOUT changes must NOT persist an
    // identity override — that used to mask the intrinsic weekdays forever and
    // snap the routine back to Mon–Fri. Back to Plan (clock still Monday).
    await page.goto('plan')
    await page.waitForTimeout(600)
    await expect(page.locator('#plan-changes-banner')).toHaveCount(0)
    await page.locator('#plan-reprogram-btn').click()
    await page.waitForTimeout(300)
    await page.locator('#plan-reprogram-btn').click() // "Listo" with zero edits
    await page.waitForTimeout(400)
    const rs = await page.evaluate(() => new Promise((resolve) => {
      const rq = indexedDB.open('coach-pedro-ai', 2)
      rq.onsuccess = () => {
        const db = rq.result
        const g = db.transaction('settings', 'readonly').objectStore('settings').get('settings')
        g.onsuccess = () => { db.close(); resolve(g.result?.rescheduleWeekOrder || {}) }
      }
    }))
    expect(Object.keys(rs)).toHaveLength(0)

    // Placement survives the reload — weekdays keep controlling, not overrides
    await page.reload()
    await page.waitForTimeout(800)
    await expect(page.locator('#plan-changes-banner')).toHaveCount(0)
    await expect(slotCard('Mar').locator('.day-title')).toHaveText('Pecho · Tríceps')
    await expect(slotCard('Dom').locator('.day-title')).toHaveText('Full Body')
  })
})

test.describe('Plan — exercise detail sheet', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-detail', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  test('opens and closes ExerciseDetail from the Plan day grid', async ({ page }) => {
    const program = {
      id: 'prog-detail', name: 'Programa Detalle',
      weeks: [{
        name: 'Semana 1', subtitle: '', tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje', subtitle: 'Press Banca', duration: 60,
          exercises: [{ exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }],
        }),
      }],
    }

    await page.goto('plan')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, {
      exercises: [{ id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] }],
      program,
      settings: SETTINGS,
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    // "Banca" (not the full seeded name) — the dictionary auto-normalizes
    // display names by name-match even without an explicit dictId, e.g.
    // "Press Banca" renders as "Press de Banca con Barra".
    const exerciseRow = page.locator('#plan-days-grid .exercise-row', { hasText: 'Banca' })
    await expect(exerciseRow).toBeVisible({ timeout: 3000 })
    await exerciseRow.click()
    await page.waitForTimeout(400)

    // Same shared ExerciseDetail/ExerciseHero used on Today — proves Plan's
    // wiring (openExerciseDetailAt) actually opens the real sheet, not a stub
    await expect(page.locator('.hero-google-btn')).toBeVisible()
    const closeBtn = page.getByRole('button', { name: 'Cerrar' }).first()
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()
    await page.waitForTimeout(300)
    await expect(page.locator('.hero-google-btn')).not.toBeVisible()
  })

  test('multi-block logger: build 3 blocks, save real volume, and see the breakdown in Historial', async ({ page }) => {
    const program = {
      id: 'prog-blocks', name: 'Programa Bloques',
      weeks: [{
        name: 'Semana 1', subtitle: '', tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje', subtitle: 'Press Banca', duration: 60,
          exercises: [{ exerciseId: 'ex-bench', sets: 3, reps: '10', rest: 90 }],
        }),
      }],
    }

    await page.goto('plan')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, {
      exercises: [{ id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] }],
      program,
      settings: { ...SETTINGS, activeProgramId: 'prog-blocks' },
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    const exerciseRow = page.locator('#plan-days-grid .exercise-row', { hasText: 'Banca' })
    await expect(exerciseRow).toBeVisible({ timeout: 3000 })
    await exerciseRow.click()
    await page.waitForTimeout(400)

    // Enter the multi-block editor
    await page.getByRole('button', { name: /Series y repeticiones por bloque/ }).click()
    await page.waitForTimeout(200)
    await expect(page.locator('.block-card')).toHaveCount(1)

    // Block 1 defaults to the plan's 3 sets × 10 reps — just set the weight to 10kg
    const block1Weight = page.locator('.block-card').nth(0).locator('.block-field-input').nth(2)
    await block1Weight.fill('10')

    // Duplicate block 1 → edit into block 2 (3×12·8kg)
    await page.locator('.block-card').nth(0).locator('.block-actions button').nth(0).click()
    await page.waitForTimeout(150)
    await expect(page.locator('.block-card')).toHaveCount(2)
    await page.locator('.block-card').nth(1).locator('.block-field-input').nth(1).fill('12')
    await page.locator('.block-card').nth(1).locator('.block-field-input').nth(2).fill('8')

    // Duplicate block 2 → edit into block 3 (3×8·12kg)
    await page.locator('.block-card').nth(1).locator('.block-actions button').nth(0).click()
    await page.waitForTimeout(150)
    await expect(page.locator('.block-card')).toHaveCount(3)
    await page.locator('.block-card').nth(2).locator('.block-field-input').nth(1).fill('8')
    await page.locator('.block-card').nth(2).locator('.block-field-input').nth(2).fill('12')

    // Totals bar: 3 bloques · 9 series · 876 kg volumen (3×10×10 + 3×12×8 + 3×8×12)
    const totalValues = page.locator('.total-value')
    await expect(totalValues.nth(0)).toHaveText('3')
    await expect(totalValues.nth(1)).toHaveText('9')
    await expect(totalValues.nth(2)).toContainText('876')

    const logBtn = page.locator('.log-btn')
    await expect(logBtn).toContainText('Registrar · 3 bloques · máx 12kg')
    await logBtn.click()
    await page.waitForTimeout(400)
    await expect(logBtn).toContainText('Guardado · 3 bloques · máx 12kg')

    // Historial should read the same blocks back for today's breakdown
    await page.locator('[data-component="ExerciseDetail"] .seg-btn', { hasText: 'Historial' }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('.session-sr').first()).toHaveText('3×10@10 · 3×12@8 · 3×8@12')
    await expect(page.locator('.stat-block', { hasText: 'Máx total' })).toContainText('12')
  })
})

test.describe('Historial — Constancia day detail', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-cal-detail', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  test('clicking an exercise row in the day detail opens ExerciseDetail', async ({ page }) => {
    const program = {
      id: 'prog-cal-detail', name: 'Programa Detalle Calendario',
      weeks: [{
        name: 'Semana 1', subtitle: '', tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje', subtitle: 'Press Banca', duration: 60,
          exercises: [{ exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }],
        }),
      }],
    }

    await page.goto('history')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, {
      exercises: [{ id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] }],
      program,
      settings: SETTINGS,
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    const exerciseRow = page.locator('.cal-detail .exercise-row', { hasText: 'Banca' })
    await expect(exerciseRow).toBeVisible({ timeout: 3000 })
    await exerciseRow.click()
    await page.waitForTimeout(400)

    // Same shared ExerciseDetail used on Plan/Today — proves Calendar's
    // day-detail wiring opens the real sheet, not just a static row.
    await expect(page.locator('.hero-google-btn')).toBeVisible()
    const closeBtn = page.getByRole('button', { name: 'Cerrar' }).first()
    await closeBtn.click()
    await page.waitForTimeout(300)
    await expect(page.locator('.hero-google-btn')).not.toBeVisible()
  })
})

test.describe('Exercise detail navigation', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-nav', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  function getTodayStr() {
    return new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  }

  // Fires synthetic touch events directly at the element (bypassing the need
  // for a real touch-capable browser context) to exercise ExerciseDetail's
  // swipe-to-navigate handlers the same way a finger drag would.
  async function swipe(page, dx) {
    await page.evaluate((dx) => {
      const el = document.querySelector('.detail-scroll')
      const startX = 200
      const startY = 400
      const start = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 1, target: el, clientX: startX, clientY: startY })],
        bubbles: true,
        cancelable: true,
      })
      el.dispatchEvent(start)
      const end = new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 1, target: el, clientX: startX + dx, clientY: startY })],
        bubbles: true,
        cancelable: true,
      })
      el.dispatchEvent(end)
    }, dx)
  }

  test('Anterior/Siguiente buttons and swipe both navigate exercises, keeping Registrar + Historial subtabs in sync', async ({ page }) => {
    const program = {
      id: 'prog-nav', name: 'Programa Nav',
      weeks: [{
        name: 'Semana 1', subtitle: '', tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje', subtitle: 'Press Banca · Press Militar', duration: 60,
          exercises: [
            { exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 },
            { exerciseId: 'ex-military', sets: 3, reps: '10-12', rest: 90 },
          ],
        }),
      }],
    }
    const today = getTodayStr()

    await page.goto('today')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, {
      exercises: [
        { id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
        { id: 'ex-military', name: 'Press Militar', muscle: 'Shoulders', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
      ],
      // Only Press Banca has a past log — Press Militar's Historial should
      // start empty, proving the subtab re-derives data per exercise instead
      // of holding onto whatever was shown for the previous one.
      exerciseLogs: [{ id: 'log-bench', exerciseId: 'ex-bench', date: '2026-07-01', weight: 50, units: 'kg' }],
      program,
      // phase 2 = warmup already done, so the training card is tappable immediately.
      settings: { ...SETTINGS, sessionState: { date: today, phase: 2, todayExDone: 0 } },
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    const trainingCard = page.locator('[data-phase="training"]').first()
    await expect(trainingCard).toBeVisible()
    await trainingCard.click()
    await page.waitForTimeout(400)

    const heroName = page.locator('.hero-name')
    const anteriorBtn = page.getByRole('button', { name: 'Anterior' }).first()
    const siguienteBtn = page.getByRole('button', { name: 'Siguiente' }).first()
    const historialTab = page.locator('[data-component="ExerciseDetail"] .seg-btn', { hasText: 'Historial' })
    const actualStat = page.locator('.stat-block', { hasText: 'Actual' })
    const weightInput = page.locator('input[inputmode="decimal"]').first()
    const logBtn = page.locator('.log-btn').first()

    await expect(heroName).toContainText('Banca')
    await expect(anteriorBtn).toBeDisabled()
    await expect(siguienteBtn).toBeEnabled()
    await expect(weightInput).toHaveValue('50')
    await expect(logBtn).toContainText('Registrar · 50kg')

    await siguienteBtn.click()
    await page.waitForTimeout(300)
    await expect(heroName).toContainText('Militar')
    await expect(anteriorBtn).toBeEnabled()
    await expect(siguienteBtn).toBeDisabled()
    await expect(weightInput).toHaveValue('')
    await expect(logBtn).toContainText('Registrar · 0kg')

    await historialTab.click()
    await page.waitForTimeout(300)
    await expect(page.locator('.empty-history')).toBeVisible()

    await anteriorBtn.click()
    await page.waitForTimeout(300)
    await expect(heroName).toContainText('Banca')
    await expect(page.locator('.empty-history')).not.toBeVisible()
    await expect(actualStat).toContainText('50')

    await page.locator('[data-component="ExerciseDetail"] .seg-btn', { hasText: 'Registrar' }).click()
    await page.waitForTimeout(300)
    await expect(weightInput).toHaveValue('50')
    await expect(logBtn).toContainText('Registrar · 50kg')

    await swipe(page, -150)
    await page.waitForTimeout(300)
    await expect(heroName).toContainText('Militar')
    await expect(weightInput).toHaveValue('')
    await expect(logBtn).toContainText('Registrar · 0kg')

    await swipe(page, 150)
    await page.waitForTimeout(300)
    await expect(heroName).toContainText('Banca')
    await expect(weightInput).toHaveValue('50')
    await expect(logBtn).toContainText('Registrar · 50kg')
  })
})

test.describe('Historial — Ejercicios sub-tab', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: null, currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  test('filters by muscle and shows sparkline + delta stats', async ({ page }) => {
    await page.goto('history')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, {
      exercises: [
        { id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
        { id: 'ex-deadlift', name: 'Peso Muerto', muscle: 'Back', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
      ],
      exerciseLogs: [
        { id: 'log-1', exerciseId: 'ex-bench', date: '2026-07-01', weight: 50, units: 'kg' },
        { id: 'log-2', exerciseId: 'ex-bench', date: '2026-07-15', weight: 60, units: 'kg' },
        { id: 'log-3', exerciseId: 'ex-deadlift', date: '2026-07-01', weight: 80, units: 'kg' },
      ],
      settings: SETTINGS,
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await page.getByRole('button', { name: 'Ejercicios' }).click()
    await page.waitForTimeout(400)

    await expect(page.locator('.ex-card')).toHaveCount(2)
    // "Banca" (not the full seeded name) — display names are dictionary-
    // normalized by name-match, e.g. "Press Banca" → "Press de Banca con Barra".
    const benchCard = page.locator('.ex-card', { hasText: 'Banca' })
    await expect(benchCard.locator('.ex-last')).toContainText('60')
    await expect(benchCard.locator('.ex-delta')).toContainText('+10.0')
    await expect(benchCard.locator('.ex-sparkline-placeholder')).toHaveCount(0)

    // Filter to Chest only
    await page.locator('.chips-row').getByText('Chest', { exact: true }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('.ex-card')).toHaveCount(1)
    await expect(page.locator('.ex-card')).toContainText('Banca')

    // Back to all
    await page.locator('.chips-row').getByText('Todos', { exact: true }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('.ex-card')).toHaveCount(2)
  })
})

// Merged from the former tests/notifications.spec.cjs — picks up where the
// main flow's Step 8 "Iniciar" tap left off (a push staged, nothing armed
// yet) and walks the rest of that same journey: the OS notification gets
// tapped, the app comes back to the foreground, and the in-app rest timer
// takes over from there. All three tests re-stage the SW caches by hand
// (standing in for "user tapped the OS push"), since Playwright can't
// dispatch a real system notification tap.
test.describe('Rest timer notification flow', () => {
  test('tapping the start notification schedules the delayed push and shows the rest banner', async ({ page }) => {
    let startTimerPayload = null
    await page.route(/rest-timer\/start/, async (route) => {
      startTimerPayload = route.request().postData()
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'scheduled' }) })
    })
    let cancelPayload = null
    await page.route(/rest-timer\/cancel/, async (route) => {
      cancelPayload = route.request().postData()
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'ok' })
    })

    await page.goto('today')
    await page.waitForTimeout(600)

    // The SW writes the exercise payload + flag when a start notification is tapped.
    await page.evaluate(async () => {
      const cache = await caches.open('rest-pending')
      await cache.put('/pending', new Response(JSON.stringify({
        name: 'Press Banca', restSec: 120, sets: 4, reps: '8-10', exerciseId: 'ex-bench',
      })))
      await cache.put('/from-notification', new Response('1'))
    })

    // Returning to the foreground (from tapping the OS notification) fires focus.
    await page.evaluate(async () => {
      window.dispatchEvent(new Event('focus'))
      await new Promise(r => setTimeout(r, 300))
    })
    await page.waitForTimeout(1000)

    // Tapping the start notification now opens the timer full screen.
    const timer = page.locator('[data-component="RestTimerFullscreen"]')
    await expect(timer).toBeVisible({ timeout: 3000 })
    await expect(timer).toContainText('Press de Banca con Barra')

    expect(startTimerPayload).not.toBeNull()
    const payload = JSON.parse(startTimerPayload)
    // endTime targets ~10s before the real rest end (latency compensation).
    expect(typeof payload.endTime).toBe('number')
    expect(payload.endTime).toBeGreaterThan(Date.now() + 100 * 1000)
    expect(payload.endTime).toBeLessThan(Date.now() + 120 * 1000)
    expect(payload.deviceId).toBeTruthy()
    expect(payload.exerciseId).toBe('ex-bench')
    expect(payload.restSec).toBe(120)
    expect(payload.sets).toBe(4)
    expect(payload.reps).toBe('8-10')
    expect(payload.title).toBe('Press Banca')
    expect(payload.tag).toBeTruthy()

    // The "Saltar" button cancels the queued delayed push (tapping the card
    // itself no longer cancels — avoids accidental cancels).
    await timer.locator('.rtf-skip').click()
    await page.waitForTimeout(500)
    expect(cancelPayload).not.toBeNull()
    const cancelData = JSON.parse(cancelPayload)
    expect(cancelData.tag).toBeTruthy()
    expect(cancelData.deviceId).toBeTruthy()
  })

  test('banner completion disappears silently and does not reschedule', async ({ page }) => {
    let restTimerCalled = false
    await page.route(/rest-timer\/start/, async (route) => {
      restTimerCalled = true
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'scheduled' }) })
    })

    await page.goto('today')
    await page.waitForTimeout(600)

    await page.evaluate(async () => {
      const cache = await caches.open('rest-timer')
      await cache.put('/pending', new Response(JSON.stringify({
        endTime: Date.now() - 1000,
        name: 'Press Banca', tag: 'test-tag', restSec: 120, sets: 4, reps: '8-10', exerciseId: 'ex-bench',
      })))
    })

    await page.evaluate(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await new Promise(r => setTimeout(r, 100))
    })
    await page.waitForTimeout(1500)

    // Banner is decorative: it just disappears. No "Descanso terminado" toast —
    // that message belongs to the delayed push (avoids a double notification).
    await expect(page.locator('[data-component="RestTimerFullscreen"]')).toHaveCount(0)
    await expect(page.locator('[data-component="RestTimerBanner"]')).toHaveCount(0)
    const toastText = await page.evaluate(() => {
      const t = document.getElementById('backup-toast')
      return t ? t.textContent : ''
    })
    expect(toastText).not.toContain('Descanso terminado')
    // Completion must not schedule a new delayed push (the push drives the cycle).
    expect(restTimerCalled).toBe(false)
  })

  // Regression: returning to the foreground fires focus + visibilitychange
  // near-simultaneously. A single tap must schedule exactly ONE delayed push,
  // not one per event (the "3 notifications" bug).
  test('concurrent foreground events schedule only one rest cycle', async ({ page }) => {
    let startCalls = 0
    await page.route(/rest-timer\/start/, async (route) => {
      startCalls++
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'scheduled' }) })
    })
    await page.route(/rest-timer\/cancel/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'ok' })
    })

    await page.goto('today')
    await page.waitForTimeout(600)

    await page.evaluate(async () => {
      const cache = await caches.open('rest-pending')
      await cache.put('/pending', new Response(JSON.stringify({
        name: 'Press Banca', restSec: 120, sets: 4, reps: '8-10', exerciseId: 'ex-bench',
      })))
      await cache.put('/from-notification', new Response('1'))
      // Fire the foreground events back-to-back, like iOS does on notification tap.
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('focus'))
      await new Promise(r => setTimeout(r, 500))
    })
    await page.waitForTimeout(1000)

    await expect(page.locator('[data-component="RestTimerFullscreen"]')).toBeVisible({ timeout: 3000 })
    expect(startCalls).toBe(1)
  })
})

test.describe('Rest timer — pantalla completa', () => {
  test('shows the exercise data, adjusts the rest, minimizes to the banner and back', async ({ page }) => {
    const startPayloads = []
    await page.route(/rest-timer\/start/, async (route) => {
      startPayloads.push(JSON.parse(route.request().postData()))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'scheduled' }) })
    })
    let cancelPayload = null
    await page.route(/rest-timer\/cancel/, async (route) => {
      cancelPayload = route.request().postData()
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'ok' })
    })

    await page.goto('today')
    await page.waitForTimeout(600)

    // Same payload the SW caches on notification tap — now carrying everything
    // the full-screen timer renders (serie, músculo, última, récord, siguiente).
    await page.evaluate(async () => {
      const cache = await caches.open('rest-pending')
      await cache.put('/pending', new Response(JSON.stringify({
        name: 'Press Banca', restSec: 120, sets: 4, reps: '8-10', exerciseId: 'ex-bench',
        muscle: 'Chest', units: 'kg', lastWeight: 60, maxWeight: 70, setIndex: 2,
      })))
      await cache.put('/from-notification', new Response('1'))
      window.dispatchEvent(new Event('focus'))
      await new Promise(r => setTimeout(r, 300))
    })
    await page.waitForTimeout(1000)

    const timer = page.locator('[data-component="RestTimerFullscreen"]')
    await expect(timer).toBeVisible({ timeout: 3000 })

    // The clock is the hero and the exercise context sits under it.
    await expect(timer.locator('.rtf-time')).toContainText(/[12]:\d\d/)
    await expect(timer.locator('.rtf-serie-label')).toContainText('Serie 2 de 4')
    await expect(timer.locator('.rtf-dot.is-now')).toHaveCount(1)
    await expect(timer.locator('.rtf-chip')).toContainText('Chest')
    await expect(timer.locator('.rtf-stats')).toContainText('60kg')
    await expect(timer.locator('.rtf-stats')).toContainText('70kg')

    // "+30 s" pushes the end back and re-queues the delayed push under a new tag.
    const beforeAdjust = startPayloads.length
    await timer.getByRole('button', { name: '+30 s' }).click()
    await page.waitForTimeout(800)
    expect(startPayloads.length).toBe(beforeAdjust + 1)
    const [first, second] = [startPayloads[beforeAdjust - 1], startPayloads[beforeAdjust]]
    expect(second.endTime - first.endTime).toBeGreaterThan(25000)
    expect(second.tag).not.toBe(first.tag)
    expect(second.restSec).toBe(150)
    await expect(timer.locator('.rtf-time')).toContainText(/2:[23]\d/)

    // "Reiniciar descanso" restarts the rest right away — no tapeable start
    // notification (that one only comes from Iniciar), but it does re-queue the
    // delayed push, same as any other rest.
    const beforeRestart = startPayloads.length
    await timer.getByRole('button', { name: 'Reiniciar descanso' }).click()
    await page.waitForTimeout(800)
    expect(startPayloads.length).toBe(beforeRestart + 1)
    const restarted = startPayloads[beforeRestart]
    expect(restarted.restSec).toBe(150)
    expect(restarted.tag).not.toBe(second.tag)
    await expect(timer.locator('.rtf-time')).toContainText(/2:(2[89]|30)/)
    // Restarting is not a new set — you are still resting the same one.
    await expect(timer.locator('.rtf-serie-label')).toContainText('Serie 2 de 4')

    // Minimizing collapses to the floating banner; tapping it re-opens full screen.
    await timer.getByRole('button', { name: 'Minimizar descanso' }).click()
    await expect(page.locator('[data-component="RestTimerFullscreen"]')).toHaveCount(0)
    const banner = page.locator('[data-component="RestTimerBanner"]')
    await expect(banner).toBeVisible()
    await banner.locator('.rtb-open').click()
    await expect(page.locator('[data-component="RestTimerFullscreen"]')).toBeVisible()
    await expect(page.locator('[data-component="RestTimerBanner"]')).toHaveCount(0)

    // Saltar still cancels the queued push and clears the timer.
    await page.locator('[data-component="RestTimerFullscreen"] .rtf-skip').click()
    await page.waitForTimeout(500)
    expect(cancelPayload).not.toBeNull()
    await expect(page.locator('[data-component="RestTimerFullscreen"]')).toHaveCount(0)
  })
})

test.describe('Rest timer — registro de series', () => {
  // The rest is when you write down the set you just finished. Uniform sets
  // stay a single record; the first set that differs turns today's log into
  // the detailed one (blocks), the same shape the block editor writes.
  test('registers weight and reps per set, collapsing to one record while they match', async ({ page }) => {
    await page.route(/rest-timer\/(start|cancel)/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    })

    const openRestForSet = async (setIndex) => {
      await page.evaluate(async (idx) => {
        const cache = await caches.open('rest-pending')
        await cache.put('/pending', new Response(JSON.stringify({
          name: 'Press Banca', restSec: 120, sets: 3, reps: '8-10', exerciseId: 'ex-bench',
          muscle: 'Chest', units: 'kg', lastWeight: 60, maxWeight: 70, setIndex: idx,
        })))
        await cache.put('/from-notification', new Response('1'))
        window.dispatchEvent(new Event('focus'))
        await new Promise(r => setTimeout(r, 300))
      }, setIndex)
      await page.waitForTimeout(900)
      const timer = page.locator('[data-component="RestTimerFullscreen"]')
      await expect(timer).toBeVisible({ timeout: 3000 })
      return timer
    }

    const todayLog = () => page.evaluate(async () => {
      const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      const today = d.toISOString().slice(0, 10)
      const req = indexedDB.open('coach-pedro-ai', 2)
      const db = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error) })
      const store = db.transaction('exerciseLogs', 'readonly').objectStore('exerciseLogs')
      const all = await new Promise((res, rej) => { const r = store.getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
      db.close()
      return all.find(l => l.exerciseId === 'ex-bench' && l.date === today) || null
    })

    await page.goto('today')
    await page.waitForTimeout(600)

    // Serie 1 — seeded from "última" (60kg) and the prescribed reps (10).
    let timer = await openRestForSet(1)
    await expect(timer.locator('.rtf-log-title')).toContainText('Registrar serie 1')
    await expect(timer.locator('.rtf-field-input').first()).toHaveValue('60')
    await expect(timer.locator('.rtf-field-input').nth(1)).toHaveValue('10')

    await timer.getByRole('button', { name: 'Más peso' }).click()
    await page.waitForTimeout(900)
    await expect(timer.locator('.rtf-log-saved')).toBeVisible()
    await expect(timer.locator('.rtf-log-recap')).toContainText('S1 62.5kg×10')

    let log = await todayLog()
    expect(log).not.toBeNull()
    expect(log.weight).toBe(62.5)
    expect(log.sets).toBe(1)
    expect(log.reps).toBe('10')
    expect(log.blocks).toBeUndefined()

    // Serie 2 with the same peso/reps — still one record, now 2 series.
    await timer.locator('.rtf-skip').click()
    await page.waitForTimeout(400)
    timer = await openRestForSet(2)
    // Seeded from serie 1, so a single tap up and back down leaves it identical.
    await expect(timer.locator('.rtf-field-input').first()).toHaveValue('62.5')
    await timer.getByRole('button', { name: 'Más peso' }).click()
    await timer.getByRole('button', { name: 'Menos peso' }).click()
    await page.waitForTimeout(900)
    log = await todayLog()
    expect(log.weight).toBe(62.5)
    expect(log.sets).toBe(2)
    expect(log.blocks).toBeUndefined()

    // Serie 3 heavier and shorter — now the log has to keep the detail.
    await timer.locator('.rtf-skip').click()
    await page.waitForTimeout(400)
    timer = await openRestForSet(3)
    await timer.getByRole('button', { name: 'Más peso' }).click()
    await timer.getByRole('button', { name: 'Menos reps' }).click()
    await timer.getByRole('button', { name: 'Menos reps' }).click()
    await page.waitForTimeout(900)
    await expect(timer.locator('.rtf-log-recap')).toContainText('S3 65kg×8')

    log = await todayLog()
    expect(log.blocks).toEqual([
      { sets: 2, reps: 10, weight: 62.5 },
      { sets: 1, reps: 8, weight: 65 },
    ])
    expect(log.sets).toBe(3)
    expect(log.weight).toBe(65)
    expect(log.reps).toBe('8')

    // Reopening the same set shows what was registered, not a fresh guess.
    await timer.locator('.rtf-skip').click()
    await page.waitForTimeout(400)
    timer = await openRestForSet(3)
    await expect(timer.locator('.rtf-field-input').first()).toHaveValue('65')
    await expect(timer.locator('.rtf-field-input').nth(1)).toHaveValue('8')
    await expect(timer.locator('.rtf-log-saved')).toBeVisible()

    // The fields cost a chunk of height, so the clock is what gives way — on
    // every phone size, and without ever colliding with the −15 s / +30 s
    // buttons that now sit either side of the ring.
    for (const size of [
      { width: 320, height: 568 },  // iPhone SE 1
      { width: 375, height: 667 },  // iPhone SE 2/3
      { width: 390, height: 844 },  // iPhone 14
      { width: 430, height: 932 },  // iPhone 15 Pro Max
    ]) {
      await page.setViewportSize(size)
      await page.waitForTimeout(350)
      const ring = await timer.locator('.rtf-ring-wrap').boundingBox()
      const actions = await timer.locator('.rtf-actions').boundingBox()
      const minus = await timer.locator('.rtf-nudge-minus').boundingBox()
      const plus = await timer.locator('.rtf-nudge-plus').boundingBox()
      const fields = await timer.locator('.rtf-log-grid').boundingBox()

      expect(ring.height, `ring too small at ${size.width}`).toBeGreaterThan(140)
      expect(Math.round(ring.width)).toBe(Math.round(ring.height))
      expect(ring.x, `ring hits −15 s at ${size.width}`).toBeGreaterThanOrEqual(minus.x + minus.width)
      expect(ring.x + ring.width, `ring hits +30 s at ${size.width}`).toBeLessThanOrEqual(plus.x)
      // Everything stays on screen: nothing clipped, nothing scrolls sideways.
      expect(actions.y + actions.height).toBeLessThanOrEqual(size.height)
      expect(fields.x).toBeGreaterThanOrEqual(0)
      expect(fields.x + fields.width).toBeLessThanOrEqual(size.width)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `horizontal overflow at ${size.width}`).toBeLessThanOrEqual(0)
      // The digits track the ring instead of spilling out of it.
      const digits = await timer.locator('.rtf-time').boundingBox()
      expect(digits.width).toBeLessThan(ring.width)
      // And the values are never clipped ("62." instead of "62.5").
      const clipped = await timer.locator('.rtf-field-input').evaluateAll(
        els => els.filter(el => el.scrollWidth > el.clientWidth + 1).length
      )
      expect(clipped, `clipped field at ${size.width}`).toBe(0)
    }
  })

  // A plain "60kg" record (the simple path of the detail sheet) carries no
  // reps. Registering a later set must adopt the reps you are logging instead
  // of writing a block of "0 reps".
  test('a plain weight-only log does not turn into 0-rep blocks', async ({ page }) => {
    await page.route(/rest-timer\/(start|cancel)/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    })

    await page.goto('today')
    await page.waitForTimeout(600)

    const today = await page.evaluate(() => {
      const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      return d.toISOString().slice(0, 10)
    })
    await seedIndexedDB(page, {
      exercises: [{ id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] }],
      exerciseLogs: [{ id: 'log-plain', exerciseId: 'ex-bench', date: today, weight: 60, units: 'kg' }],
      settings: { id: 'settings', units: 'kg', accentColor: '#d4ff3a', language: 'es' },
    })
    await page.reload()
    await page.waitForTimeout(800)

    await page.evaluate(async () => {
      const cache = await caches.open('rest-pending')
      await cache.put('/pending', new Response(JSON.stringify({
        name: 'Press Banca', restSec: 120, sets: 3, reps: '8-10', exerciseId: 'ex-bench',
        units: 'kg', lastWeight: 60, setIndex: 2,
      })))
      await cache.put('/from-notification', new Response('1'))
      window.dispatchEvent(new Event('focus'))
      await new Promise(r => setTimeout(r, 300))
    })
    await page.waitForTimeout(900)

    const timer = page.locator('[data-component="RestTimerFullscreen"]')
    await expect(timer).toBeVisible({ timeout: 3000 })
    await timer.getByRole('button', { name: 'Más peso' }).click()
    await page.waitForTimeout(900)

    const log = await page.evaluate(async (date) => {
      const req = indexedDB.open('coach-pedro-ai', 2)
      const db = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error) })
      const store = db.transaction('exerciseLogs', 'readonly').objectStore('exerciseLogs')
      const all = await new Promise((res, rej) => { const r = store.getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
      db.close()
      return all.find(l => l.exerciseId === 'ex-bench' && l.date === date) || null
    }, today)

    // Set 1 (the old plain 60kg) inherits the 10 reps being registered.
    expect(log.blocks).toEqual([
      { sets: 1, reps: 10, weight: 60 },
      { sets: 1, reps: 10, weight: 62.5 },
    ])
  })

  // The write is debounced ~450ms. Tapping "+" and skipping straight away must
  // land on the exercise that was on screen, not on whatever rest starts next.
  test('a set tapped right before Saltar lands on its own exercise', async ({ page }) => {
    await page.route(/rest-timer\/(start|cancel)/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    })

    await page.goto('today')
    await page.waitForTimeout(600)

    const openRest = async (exerciseId) => {
      await page.evaluate(async (id) => {
        const cache = await caches.open('rest-pending')
        await cache.put('/pending', new Response(JSON.stringify({
          name: id, restSec: 120, sets: 3, reps: '8-10', exerciseId: id,
          units: 'kg', lastWeight: 60, setIndex: 1,
        })))
        await cache.put('/from-notification', new Response('1'))
        window.dispatchEvent(new Event('focus'))
        await new Promise(r => setTimeout(r, 300))
      }, exerciseId)
      await page.waitForTimeout(900)
      const t = page.locator('[data-component="RestTimerFullscreen"]')
      await expect(t).toBeVisible({ timeout: 3000 })
      return t
    }

    const timer = await openRest('ex-first')
    // Tap and skip immediately — inside the debounce window.
    await timer.getByRole('button', { name: 'Más peso' }).click()
    await timer.locator('.rtf-skip').click()
    await page.waitForTimeout(1200)

    // A different exercise's rest starts right after.
    await openRest('ex-second')
    await page.waitForTimeout(1200)

    const logs = await page.evaluate(async () => {
      const req = indexedDB.open('coach-pedro-ai', 2)
      const db = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error) })
      const store = db.transaction('exerciseLogs', 'readonly').objectStore('exerciseLogs')
      const all = await new Promise((res, rej) => { const r = store.getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
      db.close()
      return all.map(l => ({ exerciseId: l.exerciseId, weight: l.weight }))
    })

    expect(logs.find(l => l.exerciseId === 'ex-first')).toEqual({ exerciseId: 'ex-first', weight: 62.5 })
    // Nothing was written for the exercise that merely came next.
    expect(logs.find(l => l.exerciseId === 'ex-second')).toBeUndefined()
  })
})

test.describe('You — Datos export/import roundtrip', () => {
  test('exports logs+settings, clears stores, reimports, verifies integrity', async ({ page }) => {
    test.setTimeout(60000)
    const fs = require('fs')

    const exercises = [
      { id: 'ex-rt-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: ['Mantén hombros atrás'], alternatives: [] },
      { id: 'ex-rt-deadlift', name: 'Peso Muerto', muscle: 'Back', imgUrl: '', gifUrl: '', tips: ['Espalda recta'], alternatives: [] },
    ]
    const exerciseLogs = [
      { id: 'log-rt-1', exerciseId: 'ex-rt-bench', date: '2026-07-01', weight: 50, units: 'kg' },
      { id: 'log-rt-2', exerciseId: 'ex-rt-deadlift', date: '2026-07-01', weight: 80, units: 'kg' },
      { id: 'log-rt-3', exerciseId: 'ex-rt-bench', date: '2026-07-15', weight: 55, units: 'kg' },
    ]
    const program = {
      id: 'prog-rt', name: 'Programa Roundtrip',
      weeks: [{ name: 'Semana 1', subtitle: '', tag: 'BUILD', days: [{ name: 'Día 1', subtitle: '', duration: 60, exercises: [{ exerciseId: 'ex-rt-bench', sets: 4, reps: '8-10', rest: 120 }] }] }],
    }
    const settings = {
      id: 'settings', activeProgramId: 'prog-rt', currentWeekIdx: 0, units: 'kg',
      accentColor: '#d4ff3a', hasWatch: false, userName: 'RoundTripUser', height: '175', weight: '78',
      sex: 'Masculino', age: '30', goal: 'hipertrofia', experience: 'intermedio', occupation: 'Dev',
      pushSubscribed: false, pushServerUrl: '', sessionState: null, lastCoachAnalysis: null,
      rescheduleWeekOrder: {}, language: 'es',
    }

    await page.goto('you')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, { exercises, exerciseLogs, program, settings })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await page.getByRole('button', { name: 'Datos' }).click()
    await page.waitForTimeout(300)

    // Export logs+settings JSON (second Exportar JSON button)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-component="DataExportSection"]').getByRole('button', { name: 'Exportar JSON' }).nth(1).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^training-backup-\d{4}-\d{2}-\d{2}\.json$/)

    // Read file and verify content matches seeded data
    const filePath = await download.path()
    expect(filePath).not.toBeNull()
    await page.waitForTimeout(500)
    const raw = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw)
    expect(data.exercises).toHaveLength(2)
    expect(data.exerciseLogs).toHaveLength(3)
    expect(data.programs).toHaveLength(1)
    expect(data.settings.activeProgramId).toBe('prog-rt')
    expect(data.exercises[0].name).toBe('Press Banca')
    expect(data.exercises[1].name).toBe('Peso Muerto')
    expect(data.exerciseLogs[0].weight).toBe(50)
    expect(data.exerciseLogs[2].weight).toBe(55)
    expect(data.settings.language).toBe('es')
    expect(data.exportedAt).toBeDefined()

    // Clear all stores
    await page.evaluate(async () => {
      const req = indexedDB.open('coach-pedro-ai', 2)
      const db = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const tx = db.transaction(['exercises', 'exerciseLogs', 'programs', 'settings', 'gymSessions'], 'readwrite')
      tx.objectStore('exercises').clear()
      tx.objectStore('exerciseLogs').clear()
      tx.objectStore('programs').clear()
      tx.objectStore('settings').clear()
      tx.objectStore('gymSessions').clear()
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => reject(tx.error)
      })
    })
    await page.reload()
    await page.waitForTimeout(800)

    // Verify empty state
    await page.waitForSelector('#you-tab-ejercicios')
    await page.locator('#you-tab-ejercicios').click()
    await page.waitForTimeout(300)
    await expect(page.locator('#ex-count')).toContainText('0 ejercicios')

    // Import the exported file back
    await page.getByRole('button', { name: 'Datos' }).click()
    await page.waitForTimeout(300)
    await page.locator('[data-component="DataImportSection"] input[type="file"]').nth(1).setInputFiles(filePath)
    await page.waitForTimeout(600)
    await expect(page.locator('[data-component="DataImportSection"]')).toContainText('Importados 2 ejercicios, 1 programas, 3 logs')

    // Reload so the app picks up restored settings
    await page.reload()
    await page.waitForTimeout(800)

    // Verify exercises restored
    await page.locator('#you-tab-ejercicios').click()
    await page.waitForTimeout(300)
    await expect(page.locator('#ex-count')).toContainText('2 ejercicios')
    await expect(page.locator('[data-component="ExerciseListItem"]', { hasText: 'Banca' })).toBeVisible()
    await expect(page.locator('[data-component="ExerciseListItem"]', { hasText: 'Muerto' })).toBeVisible()

    // Verify settings survived roundtrip (perfil en You — ProfileCard)
    await page.goto('you')
    await page.waitForTimeout(500)
    await expect(page.locator('#height-input')).toHaveValue('175')
    await expect(page.locator('#weight-input')).toHaveValue('78')

    // El username ya no vive en el header de You (se movió a Friends en 5d134e8):
    // comprobar que 'RoundTripUser' sobrevivió el roundtrip navegando a Friends,
    // donde ahora se muestra en el UsernameEditor (Mi Perfil).
    await page.goto('friends')
    await page.waitForTimeout(800)
    await expect(page.locator('.username-editor .name-text')).toContainText('RoundTripUser')
  })
})

test.describe('Today — Alternative exercise swap', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-alt', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  function getTodayStr() {
    return new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  }

  test('E2E: select an alternative, log/persist/revert it, then move on within the same seeded state', async ({ page }) => {
    const today = getTodayStr()
    const program = {
      id: 'prog-alt', name: 'Programa Alt',
      weeks: [{
        name: 'Semana 1', subtitle: '', tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje', subtitle: 'Press Banca · Press Militar', duration: 60,
          exercises: [
            { exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 },
            { exerciseId: 'ex-military', sets: 3, reps: '10-12', rest: 90 },
          ],
        }),
      }],
    }

    // ── Step 1: Seed today's workout ONCE — Press Banca (has 2 curated
    // alternatives) and Press Militar (has none) — everything from here on
    // builds on this same state, no re-seeding mid-test ──
    await page.goto('today')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, {
      exercises: [
        SEED.exercises[0], // ex-bench, has 2 curated alternatives
        { id: 'ex-military', name: 'Press Militar', muscle: 'Shoulders', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
      ],
      program,
      // phase 2 = warmup already done, so the training card is tappable immediately.
      settings: { ...SETTINGS, sessionState: { date: today, phase: 2, todayExDone: 0 } },
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    const trainingCard = page.locator('[data-phase="training"]').first()
    await expect(trainingCard).toBeVisible()
    await trainingCard.click()
    await page.waitForTimeout(400)

    const heroName = page.locator('.hero-name')
    const altTab = page.locator('[data-component="ExerciseDetail"] .seg-btn', { hasText: 'Alternativas' })
    const registrarTab = page.locator('[data-component="ExerciseDetail"] .seg-btn', { hasText: 'Registrar' })

    // ── Step 2: Open Press Banca, see its curated alternatives ──
    await expect(heroName).toContainText('Banca')
    await expect(altTab).toBeVisible()
    await altTab.click()
    await page.waitForTimeout(300)

    const altCards = page.locator('[data-component="AlternativesTab"] .alt-card')
    await expect(altCards).toHaveCount(2)
    const dumbbellCard = altCards.filter({ hasText: 'Mancuernas' })
    await expect(dumbbellCard).toBeVisible()
    await expect(page.locator('[data-component="AlternativesTab"]')).toContainText('activa estabilizadores')

    // ── Step 3: Selecting one swaps the sheet's whole identity and jumps to Registrar ──
    await dumbbellCard.click()
    await page.waitForTimeout(500)
    await expect(registrarTab).toHaveClass(/seg-active/)
    await expect(heroName).toContainText('Mancuernas')

    // ── Step 4: Log a weight for the alternative ──
    const weightInput = page.locator('input[inputmode="decimal"]').first()
    await weightInput.fill('45')
    await page.getByRole('button', { name: /Registrar ·/ }).click()
    await page.waitForTimeout(500)

    // ── Step 5: Reload the app (closing/reopening) — the swap and the logged
    // weight must both survive, proving they're persisted, not in-memory state ──
    await page.reload()
    await page.waitForTimeout(800)
    await expect(trainingCard).toBeVisible()
    await trainingCard.click()
    await page.waitForTimeout(400)
    await expect(heroName).toContainText('Mancuernas')
    await expect(weightInput).toHaveValue('45')

    // ── Step 6: Revert back to the original exercise for today ──
    await altTab.click()
    await page.waitForTimeout(300)
    const revertBtn = page.locator('.revert-row')
    await expect(revertBtn).toContainText('Volver a Press Banca')
    await revertBtn.click()
    await page.waitForTimeout(500)
    await expect(heroName).toContainText('Banca')
    await expect(heroName).not.toContainText('Mancuernas')

    // ── Step 7: Move to Press Militar in the SAME sheet via Siguiente — it
    // has no curated alternatives, so the tab must not be offered for it ──
    await page.getByRole('button', { name: 'Siguiente' }).first().click()
    await page.waitForTimeout(300)
    await expect(heroName).toContainText('Militar')
    await expect(altTab).toHaveCount(0)

    // ── Step 8: Close the sheet and open the same day from Historial — the
    // tab must ALSO show there: the detail always offers curated alternatives
    // regardless of where it's opened from (no isToday gating) ──
    await page.getByRole('button', { name: 'Cerrar' }).first().click()
    await page.waitForTimeout(300)
    await page.goto('history')
    await page.waitForTimeout(400)

    const exerciseRow = page.locator('.cal-detail .exercise-row', { hasText: 'Banca' })
    await expect(exerciseRow).toBeVisible({ timeout: 3000 })
    await exerciseRow.click()
    await page.waitForTimeout(400)

    await expect(page.locator('.hero-google-btn')).toBeVisible()
    await expect(altTab).toBeVisible()
    await expect(altTab).toHaveCount(1)
  })
})

// ── Hoy: ejercicios completados marcados en verde ──
// Un ejercicio del día cuenta como hecho cuando existe exerciseLog de hoy
// con peso > 0 (misma fuente que todayExDone). La TrainingCard debe marcar
// cada fila con data-done="true|false" y badge verde en las hechas.
test.describe('Hoy — ejercicios completados marcados', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-done', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  function getTodayStr() {
    return new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  }

  test('marks rows of logged exercises as done and persists after reload', async ({ page }) => {
    const today = getTodayStr()
    await page.goto('today')
    await page.waitForTimeout(600)
    await seedIndexedDB(page, {
      // ex-bench con imgUrl para que el thumb renderice un <img> y así poder
      // verificar el borde verde sobre la imagen (regla d0f6a55).
      exercises: SEED.exercises.map(e => e.id === 'ex-bench' ? { ...e, imgUrl: 'https://example.com/bench.jpg' } : e),
      program: {
        id: 'prog-done',
        name: 'Programa Done',
        weeks: [{
          name: 'Semana 1', subtitle: '', tag: 'BUILD',
          days: buildDayArray({
            name: 'Empuje',
            subtitle: 'Press Banca · Press Militar',
            duration: 60,
            exercises: [
              { exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 },
              { exerciseId: 'ex-military', sets: 3, reps: '10-12', rest: 90 },
            ],
          }),
        }],
      },
      // Log real de hoy para ex-bench: es la fuente de verdad del marcado.
      exerciseLogs: [{ id: 'log-bench-done', exerciseId: 'ex-bench', date: today, weight: 60, units: 'kg' }],
      // phase 2 = calentamiento hecho → la TrainingCard muestra las rows
      // directamente en el tab Hoy (sin interactuar con overlays).
      settings: { ...SETTINGS, sessionState: { date: today, phase: 2, todayExDone: 1 } },
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(1000)

    const benchRow = page.locator('[data-component="ExerciseRow"]', { hasText: 'Press de Banca con Barra' })
    const militaryRow = page.locator('[data-component="ExerciseRow"]', { hasText: 'Press Militar' })

    // Press Banca tiene log de hoy → marcado. Press Militar no → sin marcar.
    await expect(benchRow).toHaveAttribute('data-done', 'true')
    await expect(benchRow).toHaveClass(/row-done/)
    await expect(militaryRow).toHaveAttribute('data-done', 'false')

    // Badge verde solo en el thumbnail de la fila hecha.
    await expect(benchRow.locator('.ex-done-badge')).toBeVisible()
    await expect(militaryRow.locator('.ex-done-badge')).toHaveCount(0)

    // Borde verde sobre la imagen del thumb (regla .ex-thumb img de d0f6a55):
    // la fila hecha muestra el <img> con borde verde; la no-hecha también tiene
    // <img> (resuelto del diccionario) pero SIN el borde verde.
    const benchImg = benchRow.locator('.ex-thumb img')
    await expect(benchImg).toBeVisible()
    await expect(benchImg).toHaveCSS('border-color', 'rgb(52, 199, 89)')
    const militaryImg = militaryRow.locator('.ex-thumb img')
    await expect(militaryImg).toBeVisible()
    await expect(militaryImg).not.toHaveCSS('border-color', 'rgb(52, 199, 89)')

    // El marcado se recalcula desde IndexedDB en cada carga — sobrevive reload.
    await page.reload()
    await page.waitForTimeout(1000)
    await expect(page.locator('[data-component="ExerciseRow"]', { hasText: 'Press de Banca con Barra' })).toHaveAttribute('data-done', 'true')
  })
})

// ── Hoy: timer de sesión y momentos centrados ──
// Revival del legado: overlay "Inicia tu Smart Watch" al terminar warmup
// (si hasWatch), overlay "Estira bb" con tiempo al completar ejercicios, y
// duración total en la card del coach.
test.describe('Hoy — timer de sesión y momentos', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-timer', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: true, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  test('watch moment tras warmup, Estira bb al completar, duración en coach card', async ({ page }) => {
    test.setTimeout(90000)
    await mockApiRoutes(page)

    await page.goto('today')
    await page.waitForTimeout(600)
    await seedIndexedDB(page, {
      exercises: SEED.exercises,
      program: {
        id: 'prog-timer',
        name: 'Programa Timer',
        weeks: [{
          name: 'Semana 1', subtitle: '', tag: 'BUILD',
          days: buildDayArray({
            name: 'Empuje',
            subtitle: 'Press Banca · Press Militar',
            duration: 60,
            exercises: [
              { exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 },
              { exerciseId: 'ex-military', sets: 3, reps: '10-12', rest: 90 },
            ],
          }),
        }],
      },
      settings: { ...SETTINGS },
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(1000)

    // ── Warmup → momento watch ──
    await page.locator('[data-phase="warmup"]').click()
    await page.waitForTimeout(500)
    const hechoBtn = page.getByRole('button', { name: 'Hecho' })
    await expect(hechoBtn).toBeVisible({ timeout: 3000 })
    await hechoBtn.click()

    const watchToast = page.locator('[data-component="CenterToast"]', { hasText: 'Inicia tu Smart Watch' })
    await expect(watchToast).toBeVisible({ timeout: 2000 })
    await expect(watchToast).not.toBeVisible({ timeout: 4000 })

    // ── Loguear ambos ejercicios ──
    await page.locator('[data-phase="training"]').click()
    await page.waitForTimeout(500)

    const stepperInc = page.locator('.stepper-inc').first()
    await expect(stepperInc).toBeVisible()
    await stepperInc.click()
    await page.waitForTimeout(100)
    await page.getByRole('button', { name: /Registrar ·/ }).click()
    await page.waitForTimeout(600)

    // Si aparece el botón Iniciar (prompt de descanso), ignorarlo: Siguiente navega igual.
    await page.getByRole('button', { name: 'Siguiente' }).first().click()
    await page.waitForTimeout(400)

    await page.locator('.stepper-inc').first().click()
    await page.waitForTimeout(100)
    await page.getByRole('button', { name: /Registrar ·/ }).click()
    await page.waitForTimeout(600)

    // Cerrar sheet → la rama de completado dispara el overlay Estira bb
    await page.getByRole('button', { name: 'Cerrar' }).first().click()

    const stretchToast = page.locator('[data-component="CenterToast"]', { hasText: 'Estira bb' })
    await expect(stretchToast).toBeVisible({ timeout: 3000 })
    await expect(stretchToast).toContainText(/seg|min/)
    await expect(stretchToast).not.toBeVisible({ timeout: 5000 })

    // ── Stretch → esfuerzo → coach card con Duración ──
    await page.locator('[data-phase="stretch"]').click()
    await page.waitForTimeout(500)
    const stretchHecho = page.getByRole('button', { name: 'Hecho' })
    await expect(stretchHecho).toBeVisible({ timeout: 3000 })
    await stretchHecho.click()
    await page.waitForTimeout(600)

    // Streak se auto-descarta (~2.6s) y abre el selector de esfuerzo
    await expect(page.locator('#streak-overlay')).not.toBeVisible({ timeout: 6000 })
    const effortOverlay = page.locator('#effort-overlay')
    await expect(effortOverlay).toBeVisible({ timeout: 5000 })
    await effortOverlay.locator('[data-effort="Justo"]').click()

    const coachCard = page.locator('[data-component="CoachResultCard"]')
    await expect(coachCard).toBeVisible({ timeout: 10000 })
    const duracionStat = page.locator('[data-component="StatBlock"]', { hasText: 'Duración' })
    await expect(duracionStat).toBeVisible({ timeout: 5000 })
    await expect(duracionStat).toContainText(/\d{1,3}:\d{2}/)
  })
})

// ── ExerciseDetail — botón coach cyberpunk ──
// Antes el coach se abría desde un FAB global (#coach-fab); tras el redesign
// (a334f38 → cdf71cb) vive dentro del ExerciseDetail como .coach-cyber-btn
// ("Preguntar al coach"). Esta suite ataca el botón REAL, no el selector viejo.
test.describe('ExerciseDetail — botón coach cyberpunk', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-coach-btn', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  test('renders the cyberpunk coach button and opens the coach chat', async ({ page }) => {
    test.setTimeout(90000)
    const program = {
      id: 'prog-coach-btn', name: 'Programa Coach',
      weeks: [{
        name: 'Semana 1', subtitle: '', tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje', subtitle: 'Press Banca', duration: 60,
          exercises: [{ exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }],
        }),
      }],
    }

    await page.goto('plan')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, {
      exercises: [{ id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] }],
      program,
      settings: SETTINGS,
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    const exerciseRow = page.locator('#plan-days-grid .exercise-row', { hasText: 'Banca' })
    await expect(exerciseRow).toBeVisible({ timeout: 3000 })
    await exerciseRow.click()
    await page.waitForTimeout(400)

    // El botón cyberpunk real (no el #coach-fab eliminado) debe renderizar
    // dentro del ExerciseDetail con su etiqueta + subtexto.
    const coachBtn = page.locator('.coach-cyber-btn')
    await expect(coachBtn).toBeVisible()
    await expect(coachBtn).toContainText('Preguntar al coach')
    await expect(coachBtn).toContainText('Técnica · Variantes · Dolor')

    // Click → abre el overlay real con su close button y chips.
    await coachBtn.click()
    await page.waitForTimeout(400)
    await expect(page.locator('.coach-close-btn')).toBeVisible()
    await expect(page.locator('text=Mejorar técnica')).toBeVisible()
  })
})

// ── Friends — ranking, username y eliminar amigo ──
// Cubre la rediseñada pantalla de Amigos: Leaderboard con medallas + badge
// "Yo", edición inline del username (UsernameEditor), y el flujo de eliminar
// amigo con confirmación en 2 pasos (usa /api/friends/remove).
test.describe('Friends — ranking, username y eliminar amigo', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: '', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
    username: 'TestUser',
  }

  test('renders rank with medals + Yo badge, edits username, removes friend with 2-step confirm', async ({ page }) => {
    test.setTimeout(90000)
    await page.goto('friends')
    await page.waitForTimeout(500)
    await seedIndexedDB(page, { exercises: [], settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(500)

    // username ya presente → sin prompt, se muestra el my-streak
    await expect(page.locator('#username-prompt')).not.toBeVisible()
    await expect(page.locator('.friends-my-streak')).toContainText('Racha')

    // Estado vacío: sin amigos listados → Leaderboard muestra el mensaje.
    await page.route(/\/api\/friends\/list/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) }))
    await page.route(/\/api\/friends\/remove/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }))
    await page.route(/\/api\/user\/register/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }))
    await page.route(/\/api\/user\/sync/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }))
    await page.route(/\/api\/user\/check/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ exists: false }) }))
    await page.reload()
    await page.waitForTimeout(800)
    await expect(page.locator('.leaderboard .empty')).toContainText('Aún no tienes amigos')

    // Con amigos: copas, orden por tiempo en el gym y badge "Yo".
    const friends = [
      { username: 'Luis', streak: 20, exercisedToday: true, gymTime: 5040, lastUpdate: new Date().toISOString() },
      { username: 'Ana', streak: 12, exercisedToday: false, gymTime: 7800, lastUpdate: new Date(Date.now() - 86400000).toISOString() },
    ]
    await page.route(/\/api\/friends\/list/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends }) }))
    await page.reload()
    await page.waitForTimeout(800)

    const cards = page.locator('.friend-card')
    await expect(cards).toHaveCount(3) // Luis, Ana + yo (TestUser)
    // Orden por tiempo en el gym: Ana (7800s) primero con 🏆, Luis (5040s) con 🥈, yo (0) al final.
    await expect(cards.nth(0)).toContainText('Ana')
    await expect(cards.nth(0)).toContainText('🏆')
    await expect(cards.nth(0)).toContainText('12')
    await expect(cards.nth(1)).toContainText('Luis')
    await expect(cards.nth(1)).toContainText('🥈')
    await expect(cards.nth(1)).toContainText('20')
    await expect(cards.nth(2)).toContainText('🥉')

    // Tiempo en el gym semanal (de cada amigo): streak junto al nombre y minutos abajo.
    await expect(cards.nth(0)).toContainText('130 minutos de gym esta semana') // 7800s
    await expect(cards.nth(1)).toContainText('84 minutos de gym esta semana') // 5040s

    // Badge "Yo" sobre mi propia card.
    const myCard = page.locator('.friend-card', { hasText: 'TestUser' })
    await expect(myCard).toContainText('Yo')

    // Editar username inline (UsernameEditor en "Mi Perfil").
    const editBtn = page.getByRole('button', { name: 'Editar nombre' })
    await expect(editBtn).toBeVisible()
    await editBtn.click()
    await page.waitForTimeout(200)
    const nameInput = page.locator('.name-input')
    await expect(nameInput).toBeVisible()
    await nameInput.fill('Pedro')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await page.waitForTimeout(600)
    await expect(page.locator('.name-text')).toContainText('Pedro')

    // Eliminar amigo: 2 pasos (confirmación) → desaparece de la lista.
    const anaCard = page.locator('.friend-card').filter({ has: page.locator('.name', { hasText: 'Ana' }) })
    const removeBtn = anaCard.getByRole('button', { name: 'Eliminar amigo' })
    await expect(removeBtn).toBeVisible()
    await removeBtn.click()
    await page.waitForTimeout(200)
    // Primera pulsación: cambia a estado de confirmación.
    await expect(anaCard.getByRole('button', { name: 'Confirmar eliminar' })).toBeVisible()
    await anaCard.getByRole('button', { name: 'Confirmar eliminar' }).click()
    await page.waitForTimeout(600)
    await expect(page.locator('.friend-card').filter({ has: page.locator('.name', { hasText: 'Ana' }) })).toHaveCount(0)
  })

  test('registro manual: botón junto al lápiz aparece si el usuario no existe y avisa si ya existe', async ({ page }) => {
    test.setTimeout(90000)
    await page.goto('friends')
    await page.waitForTimeout(500)
    await seedIndexedDB(page, { exercises: [], settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(500)

    // No existe en el servidor → se muestra el botón junto al lápiz.
    await page.route(/\/api\/user\/check/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ exists: false }) }))
    await page.route(/\/api\/user\/register/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }))
    await page.route(/\/api\/user\/sync/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }))
    await page.route(/\/api\/friends\/list/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) }))
    await page.reload()
    await page.waitForTimeout(800)

    const registerBtn = page.getByRole('button', { name: 'Registrar usuario' })
    await expect(registerBtn).toBeVisible()

    // Al registrarlo se oculta el botón (ya registrado).
    await registerBtn.click()
    await page.waitForTimeout(600)
    await expect(page.getByRole('button', { name: 'Registrar usuario' })).not.toBeVisible()

    // Si el nombre ya existe en el servidor, el botón NO aparece (ya está registrado).
    await page.route(/\/api\/user\/check/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ exists: true }) }))
    await page.goto('friends')
    await page.waitForTimeout(500)
    await seedIndexedDB(page, { exercises: [], settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await expect(page.getByRole('button', { name: 'Registrar usuario' })).not.toBeVisible()
  })
})

// ── Hoy: sobreescribir el peso registrado tras guardar ──
// Regression guard: tras registrar un peso hoy, teclear otro valor se había
// revertido al peso guardado (el $effect de ExerciseDetail re-leía pendingWeight
// y reseteaba el input en cada tecla), clava el botón en "Guardado" y no permitía
// corregir el valor. Sobreescribir = el peso anterior se borra y solo queda el nuevo.
test.describe('Hoy — sobreescribir peso tras registrar', () => {
  function getTodayStr() {
    return new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  }

  test('el peso nuevo reemplaza al anterior y persiste tras recargar', async ({ page }) => {
    const today = getTodayStr()
    const program = {
      id: 'prog-overwrite', name: 'Programa Overwrite',
      weeks: [{
        name: 'Semana 1', subtitle: '', tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje', subtitle: 'Press Banca', duration: 60,
          exercises: [{ exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }],
        }),
      }],
    }
    const baseSettings = {
      id: 'settings', activeProgramId: 'prog-overwrite', currentWeekIdx: 0, units: 'kg',
      accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
      sessionState: { date: today, phase: 2, todayExDone: 0 }, lastCoachAnalysis: null,
      rescheduleWeekOrder: {}, language: 'es',
    }

    await page.goto('today')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, {
      exercises: [{ id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] }],
      exerciseLogs: [{ id: 'log-overwrite', exerciseId: 'ex-bench', date: today, weight: 41, units: 'kg' }],
      program,
      settings: baseSettings,
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    const trainingCard = page.locator('[data-phase="training"]').first()
    await expect(trainingCard).toBeVisible()
    await trainingCard.click()
    await page.waitForTimeout(400)

    const weightInput = page.locator('input[inputmode="decimal"]').first()
    await expect(weightInput).toHaveValue('41')

    // 1) Sobreescribir 41 → 40: el input debe reemplazar el valor (no "410",
    //    no revertirse al guardado) y el botón pasar a "Actualizar".
    await weightInput.click()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('40')
    await page.waitForTimeout(500)
    await expect(weightInput).toHaveValue('40')
    await expect(page.getByRole('button', { name: /Actualizar · 40kg/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Guardado/ })).toHaveCount(0)

    // 2) Corregir a 41 (el peso correcto): el 40 se borra y solo queda el nuevo
    //    41. Como 41 coincide con el log de hoy, el botón vuelve a "Guardado".
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('41')
    await page.waitForTimeout(500)
    await expect(weightInput).toHaveValue('41')
    await expect(page.getByRole('button', { name: /Guardado · 41kg/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Actualizar/ })).toHaveCount(0)

    // 3) Dejar 40 (sobreescribiendo) y guardar: verificar que 40 persiste.
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('40')
    await page.waitForTimeout(500)
    await expect(weightInput).toHaveValue('40')
    await page.getByRole('button', { name: /Actualizar · 40kg/ }).click()
    await page.waitForTimeout(600)
    await page.reload()
    await page.waitForTimeout(800)
    await expect(trainingCard).toBeVisible()
    await trainingCard.click()
    await page.waitForTimeout(400)
    await expect(weightInput).toHaveValue('40')
  })
})

