# Coach Pedro AI — Project Context

## Stack
- SvelteKit 2 + Svelte 5 (runes: `$state`, `$props`, `$derived`) + TypeScript, Vite 8
- `@sveltejs/adapter-static`, base path `/Pedro-IA-Coach`, SPA fallback (`index.html`)
- Mobile-first (iPhone PWA), dark mode only; desktop browsers work too (`npm run dev`)
- IndexedDB for all persistence (4 object stores) + localStorage mirror (`coach-pedro-ai-backup`)
- No runtime backend — Cloudflare Worker (`push-worker/`) for Web Push, AI (Workers AI), and users/friends endpoints
- Deploy: GitHub Pages via `.github/workflows/deploy.yml` (push to `main`)
- Entry: `src/routes/` (SPA). No SSR — all routes are static, client-rendered

## Platform Context
- **Device**: iPhone with iOS (PWA installed from Safari)
- **Browser**: Safari (PWA standalone mode)
- **Notifications**: Web Push via Cloudflare Worker; `showNotification()` actions NOT supported on iOS
- **Watch mirror**: Notifications mirror to Apple Watch, but long-press actions don't work on iOS — fallback to tap-to-start-timer in `src/service-worker.js`. Tap notification → timer starts, "⏱️ Xs · ejercicio" confirmation appears for 2s → when timer completes, "⏰ Descanso terminado" shows for 10s

## Project Structure
```
src/
  app.html                 → App shell (fonts, splash, script preloads)
  app.css                  → CSS variables, design tokens, global styles
  app.d.ts                 → Global types ($service-worker module decl)
  service-worker.js        → SvelteKit SW: network-first, caches scoped by build hash ($service-worker)
  routes/
    +layout.svelte         → App shell: TabBar, Toast, RestTimerFullscreen + RestTimerBanner (minimizado), Onboarding, Coach FAB
    +page.svelte           → Redirect: new user → /you, otherwise → /today
    today/                 → Session auto-detect, warmup, rest timer, ⌚ watch button
    plan/                  → Week selector + day grid
    history/               → Exercise list + muscle filter + sparklines
    friends/               → Friends + shared/assigned programs
    you/                   → Stats, settings, exercise/program CRUD, JSON import/export, AI import, admin link
  lib/
    routes.ts              → Tab route definitions (ROUTES with base)
    config.ts              → PUSH_SERVER_URL + VAPID_PUBLIC_KEY (intentionally public)
    pwa.ts                 → APP_VERSION (version + build date), PWA/install helpers
    db.ts                  → IndexedDB open/CRUD helpers (openDB, getAll, get, put, del, getByIndex, generateId)
    storage.ts             → Data service layer (Storage object): CRUD, backupAll, restoreFromBackup, migrations, dedup, import/export JSON
    types.ts               → Exercise, ExerciseLog, Program, Settings, Week, Day, etc.
    ai.ts                  → importWithAI, generateProgramWithAI, programCoach, exerciseCoachChat
    coach-analysis.ts      → runCoachAnalysis (post-workout insights)
    push.ts                → subscribePush, unsubscribePush, sendPushNotification, notifyWatch
    rest-timer.ts          → scheduleRestTimer, adjustRestTimer, restartRestTimer, completeRest, cancelRestTimer, checkPendingRest, nextSetIndex
    exercise-utils.ts      → getExerciseDisplayName (es/en), findById, keyword helpers
    calendar-utils.ts      → Date/week/day helpers
    stores/
      settings.ts          → settings store (reactive, persisted to IndexedDB)
      ui.ts                → toast store, confirm, prompt
      session.ts           → session (today's date, current view)
    components/            → 58 Svelte components (TabBar, ExerciseDetail, WorkoutTab, HistoryTab, CoachChat, Calendar, Warmup, RestTimerBanner, MediaPicker, ...)
    data/
      exercise-dictionary.ts → 171 entries + IMG_BASE/EX_GIF_BASE/_IMG/_GIF + resolveExerciseMedia
      warmup.ts              → warmup/stretch sequences by muscle group
      warmup-components.ts   → warmup movements
      warmup-gifs.ts         → warmup GIF paths
      body-parts.ts          → body-part pickers for coach chat
      recovery.ts            → RECOVERY_TIPS (rest days)
    brain/
      prompts.ts             → AI prompts (always Spanish)
      dictionary.ts          → buildAIDictionary / buildFilteredDictionary (lightweight subsets for Worker)
push-worker/
  src/index.js           → Cloudflare Worker: push, rest-timer queue, AI (import, program-coach, exercise-coach), users/friends
  wrangler.toml          → Worker config (KV, Queue, [ai], VAPID vars)
  package.json           → web-push dependency
scripts/
  bump-version.sh        → Bumps APP_VERSION minor + sets description (run before every commit)
tests/
  big.spec.cjs           → SINGLE E2E suite (Playwright). Guardrail EXPECTED_STEPS. Do not add new test files.
vite.config.ts           → SvelteKit + Vite config, __BUILD_TIME__ define, dev-only plugins (e.g. mediaEditorPlugin)
playwright.config.cjs    → base URL includes trailing slash (`/Pedro-IA-Coach/`)
AGENTS.md                ← This file
```

## Schema (4 IndexedDB object stores)

### `exercises`
| Field | Type | Notes |
|---|---|---|
| `id` | string | Auto-generated |
| `name` | string | User-defined |
| `muscle` | string | e.g. "Chest" |
| `imgUrl` | string | Optional, editable |
| `gifUrl` | string | Optional, editable |
| `dictId` | string | Optional FK → dictionary entry id (set by Normalizar) |
| `tips` | string[] | Form cue list |
| `alternatives` | { name, reason }[] | |

### `exerciseLogs`
| Field | Type | Notes |
|---|---|---|
| `id` | string | Auto-generated |
| `exerciseId` | string | FK → exercises.id |
| `date` | string | "YYYY-MM-DD" |
| `weight` | number | |
| `units` | string | "kg" or "lb" |

Indexes: `exerciseId`, `date`

### `programs`
| Field | Type | Notes |
|---|---|---|
| `id` | string | Auto-generated |
| `name` | string | e.g. "Push / Pull / Legs" |
| `weeks` | Week[] | Array of weeks |

Week structure:
```
{
  name: "Week A", subtitle: "Volume", tag: "BUILD",
  days: [{
    name: "Push", subtitle: "Chest · Shoulders · Triceps", duration: 65,
    exercises: [{ exerciseId: "ex-bench", sets: 4, reps: "6-8", rest: 180 }]
  }]
}
```

Sets, reps, rest LIVE on the program exercise instance, NOT on the exercise definition.

### `settings` (singleton)
```
{ id: "settings", activeProgramId, currentWeekIdx, units, accentColor, language, fontScale,
  userName, profile { weight, height, age, gender, experience }, onboarded, onboardingStep,
  hasWatch, pushSubscribed, friendCode, notificationsEnabled, restDuration, weekStart }
```

## Key Design Decisions
- Exercises are standalone entities — programs reference them by ID; stored exercises carry an optional `dictId` linking them to the dictionary
- The **exercise dictionary** (`src/lib/data/exercise-dictionary.ts`) is the single source of canonical names, media URLs, and keywords. `findOrCreateExerciseByName()` copies `image`/`gif` from the entry when creating exercises
- Media resolution pipeline (`resolveExerciseMedia`): `exercise.imgUrl` → `GYMVISUAL_OVERRIDES` → dictionary `image` → keyword-based image resolver → gif fallback
- Programs own the per-instance sets/reps/rest for each exercise
- Duplicate exercise IDs allowed in same program (different days)
- Logs are flat exerciseLogs — no workout grouping. Each log = one weight entry for one exercise on one date
- History is computed by scanning exerciseLogs per exerciseId, sorted by date
- No seed data — app starts empty, user creates exercises/programs or imports JSON / AI
- User picks active program from You screen; Today/Plan use active program
- Week-day mapping: Mon=0 through Sun=6 (converted from JS's Sun=0 via `(jsDay+6)%7`)
- Logging weight from Today auto-creates exerciseLog entry; no "start workout" ceremony
- Onboarding is required on first launch (redirects to You) — disabled only when `onboarded` is true
- Language: `settings.language` (es/en); dictionary names resolved via `getExerciseDisplayName()`

## Screens
| Route | View | Notes |
|---|---|---|
| `/today` (default) | Auto-detect day, session or rest day, warmup, rest timer | src/routes/today/+page.svelte |
| `/plan` | Week tabs + day cards | src/routes/plan/+page.svelte |
| `/history` | Exercise list + muscle filter + sparklines | src/routes/history/+page.svelte |
| `/friends` | Friend codes + shared/assigned programs | src/routes/friends/+page.svelte |
| `/you` | Stats, settings, CRUD, import/export, AI import, admin link | src/routes/you/+page.svelte |
| `/admin` (dev) | Dictionary media review/editing (image/gif) | src/routes/admin/+page.svelte |

## Design Tokens
- `--bg`: #0a0a0a
- `--surface`: #141414
- `--text`: #fafafa
- `--accent`: #d4ff3a (configurable via settings)
- `--border`: rgba(255,255,255,0.06)
- Fonts: Space Grotesk (headings/UI), JetBrains Mono (data/numbers)
- Corners: 14-18px cards, 20-28px sheets, 9999px tab bar
- Tab bar: glassmorphism with backdrop-filter blur

## Data Flow
1. Svelte store `settings` loads from IndexedDB on app start (`init()`); if data lost → `restoreFromBackup()`
2. User actions call `Storage.*` methods → IndexedDB → `backupAll()` (localStorage mirror) → stores update → Svelte re-renders
3. Reactive stores (`settings`, `ui`) drive re-renders — no manual `refresh()` needed
4. Weight logging: ExerciseDetail → `onLog()` → `Storage.logWeight()` → append to exerciseLogs
5. Media for an exercise comes from `resolveExerciseMedia()` (dictionary or stored override)

## Version Tracking
- `APP_VERSION` is defined in `src/lib/pwa.ts`: `${_VER_BASE} · ${__BUILD_TIME__} · ${_VER_DESC}` where `__BUILD_TIME__` is injected by `vite.config.ts` at build time
- **Bump the minor version +1 with every commit** (`v2.15` → `v2.16`), not just the date
- **Update `_VER_DESC`** to a concise (~10 words) description of the actual changes in that commit
- The SW cache is scoped by build hash via SvelteKit's `$service-worker` (`cache-${version}`) — it updates automatically, no manual CACHE bump needed
- Run `bash scripts/bump-version.sh` before every commit to bump minor + update date in `src/lib/pwa.ts`
- **`bump-version.sh` runs the tests ITSELF and ABORTS the bump if they fail.** It runs `npm run check` and `npx playwright test` BEFORE touching the version. Never bypass this gate (`BUMP_SKIP_TESTS=1` is only for quick diagnostics; never commit a bump with failing tests)
- The version shows in `src/routes/today/+page.svelte` (imports `APP_VERSION` from `$lib/pwa`)

## Exercise Dictionary & Media
- `src/lib/data/exercise-dictionary.ts` — 171 entries. Bases:
  - `IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'`
  - `EX_GIF_BASE = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/'`
  - `_IMG(dir)` → `IMG_BASE + dir + '/0.jpg'`; `_GIF(path)` → `EX_GIF_BASE + path + '.gif'`
- `GYMVISUAL_OVERRIDES` exists as a per-exercise block but is intentionally unused — edit dictionary entries directly

## Media Admin (dev)
`/admin` (desktop) lets you review and fix the dictionary's `image:`/`gif:` for all 171 entries. Opened from You → Datos → Mantenimiento → "Revisar imágenes del diccionario".

- **List**: compact rows with 112px img+gif thumbnails and ok/✕ badges; letter chips (A-Z) paginate the list (default A, no "all" view), plus muscle chips and a name/id search
- **Flow**: edit-img/edit-gif → picker with GitHub tree catalogs (free-exercise-db images + ExerciseGymGifsDB gifs) cached in localStorage 24h (`admin_img_catalog`/`admin_gif_catalog`), plus a manual URL field → drafts queue in memory → "Guardar (n)" applies all
- **Write path**: `src/lib/admin/media-file.ts` (pure: `findEntryRanges`, `applyFileText`, `fromUrl`/`toUrl`) serializes URLs back to `_IMG('<dir>')`/`_GIF('<path>')`; `mediaEditorPlugin()` in `vite.config.ts` serves `POST /__admin/dictionary-save` (dev-only) and rewrites `src/lib/data/exercise-dictionary.ts` on disk
- **Read-only in prod**: save button and plugin exist only when `import.meta.env.DEV` — preview/prod builds show "solo lectura"
- **Not covered by E2E**: the suite runs against the prod preview build, where the dev-only save flow can't run; the admin save path is verified manually with curl in dev instead

## Tests & Verification
- **E2E**: `npx playwright test` — runs `tests/big.spec.cjs` (the single test file, with `EXPECTED_STEPS` guardrail). New scenarios = new `describe` block with exactly one `test()`. Never add a second test file; never remove steps from the guardrail.
- **Type check**: `npm run check` (svelte-check)
- **Build**: `npm run build` (adapter-static, base `/Pedro-IA-Coach`)
- Before pushing, all three must pass.

## Push Notifications (Web Push via Cloudflare Worker)

Web Push replaces local-only notifications so they appear in iOS Notification Center and can mirror to Apple Watch. Single subscription (one device at a time).

### Architecture
```
today.js → sendPushNotification()
                  ↓
           fetch(POST /api/push/start)
                  ↓
        Cloudflare Worker + KV store
                  ↓
        Web Push Protocol (encrypted payload)
                  ↓
        Service Worker `push` event
                  ↓
        showNotification() → iOS Notification Center → Apple Watch
```

### Files
| File | Role |
|---|---|
| `src/lib/push.ts` | `subscribePush()`, `unsubscribePush()`, `sendPushNotification()`, `notifyWatch()` (local fallback) |
| `src/lib/rest-timer.ts` | `scheduleRestTimer()`, `adjustRestTimer()`, `restartRestTimer()`, `completeRest()`, `cancelRestTimer()`, `checkPendingRest()` (Cache API + Worker queue) |
| `src/service-worker.js` | `push` event → `showNotification()`; `notificationclick` → opens app + `from-notification` flag |
| `push-worker/src/index.js` | Endpoints: `/api/push/subscribe`, `/api/push/unsubscribe`, `/api/push/start`, `/api/rest-timer/start`, `/api/rest-timer/cancel`; `queue()` handler |
| `src/lib/config.ts` | `PUSH_SERVER_URL` + `VAPID_PUBLIC_KEY` (both public by design) |
| `push-worker/wrangler.toml` | KV `PUSH_KV`, Queue `rest-timers`, `[ai]` binding, VAPID vars |

### Config / Secrets (Nothing Secret in Repo)
- `PUSH_SERVER_URL` and `VAPID_PUBLIC_KEY` are public (Web Push spec: public key is meant to be public). Stored in `src/lib/config.ts`.
- `VAPID_PRIVATE_KEY` is the ONLY secret — set via `npx wrangler secret put VAPID_PRIVATE_KEY`, never in repo.
- `wrangler.toml` needs the KV namespace id (from `npx wrangler kv:namespace create PUSH_KV`) and the queue `rest-timers` created (`npx wrangler queues create rest-timers`).
- Deploy worker: `cd push-worker && npm install && npx wrangler deploy`.

### Troubleshooting
| Symptom | Likely Cause | Fix |
|---|---|---|
| Push not arriving | VAPID keys mismatch | Public key in `src/lib/config.ts` must match `wrangler secret put VAPID_PUBLIC_KEY` |
| 404 on subscribe | Worker URL wrong | Check `PUSH_SERVER_URL`; `wrangler deploy` again |
| 403 on subscribe | KV not bound | Verify `kv_namespaces` ID in `wrangler.toml` |
| Subscription expired | Push service cleaned up endpoint | Worker auto-deletes expired subs (410) |
| Not working on Watch | iOS needs at least one push while backgrounded | Open app, trigger ⌚, close PWA, check Watch settings |

## ADR: Rest Timer & Delayed Notifications (Worker Queue)

**Decision:** "⏰ Descanso terminado" is delivered primarily via the Cloudflare Worker Queue (`rest-timers`). The app-side `completeRest()` also calls `notifyWatch()` as a local fallback so the user always gets feedback.

**Rationale:** iOS suspends all JS (setTimeout, fetch, postMessage) when backgrounded. Only a server-timed mechanism (Worker queue → Web Push) can deliver at the exact rest duration. Web Push can fail silently, so a local `notifyWatch()` fallback covers the foreground case.

**RULES:**
1. `completeRest()` shows toast + calls `notifyWatch()` (local fallback) + re-stores data in `rest-pending` cache. It MUST NOT call `sendPushNotification()` (Web Push).
2. The Worker queue is the PRIMARY mechanism (delivers even when the app is closed).
3. `scheduleRestTimer()` sends `pushEndTime = endTime - 10000` — the push arrives ~10s before rest ends.
4. `cancelRestTimer()` POSTs `/api/rest-timer/cancel` — Worker sets KV `cancel_{tag}` so the queue skips delivery.
5. A rest can start from TWO places, and they share everything except the start notification:
   - **"Iniciar" (ExerciseDetail)** → `startRestFromExercise()` sends the tapeable start notification; the rest begins when the user taps it. Counts a new set (`nextSetIndex`).
   - **"Reiniciar descanso" (full-screen timer)** → `restartRestTimer()` starts the rest immediately, with NO start notification. Does NOT count a new set.
   Both end up in `scheduleRestTimer()` → `armRest()`, so both queue the delayed push identically. Adding a third entry point means reusing `armRest()`, never duplicating the queue call.
6. `adjustRestTimer(delta)` (`−15 s` / `+30 s`) and `restartRestTimer()` re-queue under a FRESH tag after cancelling the in-flight one — the Worker drops the stale message via `active_{deviceId}`.

### Key Points
- Worker queue delivers at EXACTLY the scheduled delay — iOS cannot interfere
- Push arrives 10s before rest ends so "Descanso terminado" lands right at the end
- App-side `setTimeout` is ONLY for the UI countdown banner and toast — not the delivery mechanism
- If app is closed at expiry: only the push arrives (correct). If open: toast + push both arrive
- On `visibilitychange` to visible, `checkPendingRest()` recovers pending timers from Cache API
- `scheduleRestTimer()` calls BOTH the Worker queue AND starts `setTimeout` — removing either breaks the system
- The rest UI is full screen (`RestTimerFullscreen`); `RestTimerBanner` is its minimized state. Both are decorative — the push still drives delivery
- Whatever the timer displays (muscle, última, récord, `setIndex`) must live in `RestPendingData`: that payload is all that survives the notification round trip
- Set counter lives in `localStorage` (`rest-set-counts`), reset per day — see `docs/superpowers/specs/2026-09-09-fullscreen-rest-timer-design.md`
- `subscribePush()` always calls `unsubscribe()` before `subscribe()` to replace expired endpoints
- Error recovery: 410 (expired) → Worker deletes sub, client refreshes subscription and retries; if all Web Push fails → `notifyWatch()` local notification

## AI Features (Cloudflare Workers AI)

All prompts live in `src/lib/brain/prompts.ts` (always Spanish) and clients call `src/lib/ai.ts`. The Worker (`push-worker/src/index.js`) runs `@cf/meta/llama-3.1-8b-instruct-fast` on Workers AI (free tier, 10k neurons/day).

| Endpoint | Client function | Purpose |
|---|---|---|
| `POST /api/ai/import` | `importWithAI(text)` | Paste plain-text routine → creates exercises + program |
| `POST /api/ai/generate` | `generateProgramWithAI(prompt, profile)` | Generate full program from free text + user profile |
| `POST /api/ai/program-coach` | `programCoach(text, program, settings)` | Ask/modify active program; returns JSON program or text reply |
| `POST /api/ai/exercise-coach` | `exerciseCoachChat(name, muscle, alts, messages)` | Per-exercise multi-turn chat (coach FAB) |

### Import with AI flow
1. User pastes routine in You → Datos → "Importar con IA"
2. `importWithAI(text)` bundles `{ text, systemPrompt, dictionary: buildAIDictionary() }` → POST to Worker
3. Worker returns structured JSON (program/week/day/exercise data)
4. Client iterates: `Storage.findOrCreateExerciseByName(name, muscle)` (uses dictionary, auto-fills image/gif/tips)
5. Builds program with `exerciseId` refs → `Storage.saveProgram()` → auto-activate → toast

### Exercise Coach (FAB)
Floating "Coach IA" button in ExerciseDetail opens a multi-turn chat overlay. Quick chips (Mejorar técnica, Me duele algo, ¿Voy muy pesado?, Variante fácil); "Me duele algo" shows a body-part picker based on muscle group. Sends only exercise name/muscle/alternatives + message history — NO user profile data.

## Implementer Agent — Commit Policy

When the `implementer` subagent finishes its work, it MUST:
1. Run `bash scripts/bump-version.sh` to bump `_VER_BASE` minor in `src/lib/pwa.ts` + update date. **This script runs `npm run check` + `npx playwright test` FIRST and aborts the bump if they fail** — fix any failures before proceeding.
2. **Update `_VER_DESC`** in `src/lib/pwa.ts` to describe the actual changes (concise, ~10 words)
3. Run `npm run build` — fix any failures
4. `git add` all changed files (only relevant ones, no untracked docs/artifacts)
5. `git commit` with a descriptive message including the version
6. `git push` — only after the tests that `bump-version.sh` gate ran have passed

Use `git status`, `git diff`, `git log --oneline -3` before committing to verify state. Never commit untracked files outside the scope of the task (e.g. docs/, training-with-pedro/).

## Build/Deploy
- No build step beyond Vite/SvelteKit: `npm run dev` for local, `npm run build` for static output, `npm run preview` to test the build
- GitHub Pages: push to `main` → `.github/workflows/deploy.yml` builds and deploys to `/Pedro-IA-Coach`
- Base path is `/Pedro-IA-Coach` (must match in `vite.config.ts` and Playwright base URL)

## Prior Art
Design prototype in `training-with-pedro/project/` — use for visual reference only.
IndexedDB is the source of truth at runtime.
