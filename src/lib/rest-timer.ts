import { PUSH_SERVER_URL } from '$lib/config'
import { writable } from 'svelte/store'
import { sendPushNotification, notifyWatch, getDeviceId } from '$lib/push'

const REST_PENDING_CACHE = 'rest-pending'
const REST_TIMER_CACHE = 'rest-timer'
const SET_COUNT_KEY = 'rest-set-counts'

// Everything the full-screen timer needs to render on its own. It travels
// Iniciar → push → notification tap → app, so whatever is not in here simply
// isn't available while the timer is on screen.
export interface RestPendingData {
  name: string
  restSec: number
  tag: string
  exerciseId: string
  sets: number
  reps: string
  muscle?: string
  imgUrl?: string
  gifUrl?: string
  units?: string
  lastWeight?: number
  maxWeight?: number
  setIndex?: number
}

export interface RestTimerData extends RestPendingData {
  endTime: number
}

const EMPTY_TIMER: RestTimerData = {
  endTime: 0, restSec: 0, name: '', sets: 0, reps: '', tag: '', exerciseId: ''
}

export const restBannerState = writable<RestTimerData & { visible: boolean }>({
  ...EMPTY_TIMER,
  visible: false
})

let _restTimerTickId: ReturnType<typeof setTimeout> | null = null
let _completionId: ReturnType<typeof setTimeout> | null = null

export async function storeRestPending(data: RestPendingData): Promise<void> {
  const cache = await caches.open(REST_PENDING_CACHE)
  const response = new Response(JSON.stringify(data))
  await cache.put('/pending', response)
}

export async function getRestPending(): Promise<RestPendingData | null> {
  try {
    const cache = await caches.open(REST_PENDING_CACHE)
    const response = await cache.match('/pending')
    if (!response) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function clearRestPending(): Promise<void> {
  const cache = await caches.open(REST_PENDING_CACHE)
  await cache.delete('/pending')
}

export async function storeRestTimer(data: RestTimerData): Promise<void> {
  const cache = await caches.open(REST_TIMER_CACHE)
  const response = new Response(JSON.stringify(data))
  await cache.put('/pending', response)
}

export async function getRestTimer(): Promise<RestTimerData | null> {
  try {
    const cache = await caches.open(REST_TIMER_CACHE)
    const response = await cache.match('/pending')
    if (!response) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function clearRestTimer(): Promise<void> {
  const cache = await caches.open(REST_TIMER_CACHE)
  await cache.delete('/pending')
}

export async function getFromNotificationFlag(): Promise<boolean> {
  try {
    const cache = await caches.open(REST_PENDING_CACHE)
    const res = await cache.match('/from-notification')
    if (!res) return false
    await cache.delete('/from-notification')
    return true
  } catch {
    return false
  }
}

// ── Set counter ──
// Each "Iniciar" means one set just finished, so the Nth tap of the day on an
// exercise is its Nth set. Kept in localStorage (not IndexedDB) because the
// timer reads it synchronously while the sheet is closing, and reset per day.

function localDateKey(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 10)
}

function readSetCounts(): { date: string; counts: Record<string, number> } {
  try {
    const raw = localStorage.getItem(SET_COUNT_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && parsed.date === localDateKey()) return parsed
  } catch {}
  return { date: localDateKey(), counts: {} }
}

export function nextSetIndex(exerciseId: string): number {
  const state = readSetCounts()
  state.counts[exerciseId] = (state.counts[exerciseId] || 0) + 1
  try { localStorage.setItem(SET_COUNT_KEY, JSON.stringify(state)) } catch {}
  return state.counts[exerciseId]
}

export function getSetIndex(exerciseId: string): number {
  return readSetCounts().counts[exerciseId] || 0
}

let _handlingPendingRest = false

export async function checkPendingRest(): Promise<void> {
  if (_handlingPendingRest) return
  _handlingPendingRest = true
  try {
    const flag = await getFromNotificationFlag()
    if (!flag) return
    const pending = await getRestPending()
    if (!pending || !pending.name || !(pending.restSec > 0)) return
    await scheduleRestTimer({ ...pending, tag: pending.tag || 'rest-' + Date.now() })
  } finally {
    _handlingPendingRest = false
  }
}

function _showRestTimerBanner(data: RestTimerData) {
  restBannerState.set({ ...data, visible: true })
}

function _hideRestTimerBanner() {
  restBannerState.set({ ...EMPTY_TIMER, visible: false })
  if (_restTimerTickId) { clearInterval(_restTimerTickId); _restTimerTickId = null }
}

export async function _checkRestTimer() {
  try {
    const cache = await caches.open(REST_TIMER_CACHE)
    const res = await cache.match('/pending')
    if (!res) return
    const data: RestTimerData = await res.json()
    const remaining = data.endTime - Date.now()
    if (remaining <= 0) {
      await cache.delete('/pending')
      if (_restTimerTickId) { clearInterval(_restTimerTickId); _restTimerTickId = null }
      _hideRestTimerBanner()
    } else {
      if (_restTimerTickId) clearInterval(_restTimerTickId)
      _restTimerTickId = setTimeout(_checkRestTimer, remaining)
      _showRestTimerBanner(data)
    }
  } catch {}
}

async function stagePushSpec(kind: 'start' | 'done', exerciseData: RestPendingData): Promise<void> {
  try {
    const cache = await caches.open('push-pending')
    await cache.put('/pending', new Response(JSON.stringify({ kind, exerciseData })))
  } catch {}
}

// The delayed push is the source of truth for "rest over" — the in-app timer is
// decorative best-effort. Fired 10s early to compensate for delivery latency.
async function scheduleDelayedPush(data: RestTimerData): Promise<void> {
  try {
    await fetch(`${PUSH_SERVER_URL}/api/rest-timer/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endTime: Math.max(data.endTime - 10000, Date.now() + 1000),
        deviceId: getDeviceId(),
        tag: data.tag,
        title: data.name,
        body: `${data.sets}×${data.reps}`,
        exerciseId: data.exerciseId,
        sets: data.sets,
        reps: data.reps,
        restSec: data.restSec
      })
    })
  } catch {}
}

async function cancelDelayedPush(tag: string): Promise<void> {
  try {
    await fetch(`${PUSH_SERVER_URL}/api/rest-timer/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, deviceId: getDeviceId() })
    })
  } catch {}
}

function armCompletion(data: RestTimerData): void {
  if (_completionId) clearTimeout(_completionId)
  _completionId = setTimeout(() => {
    _completionId = null
    completeRest(data.name, data.tag)
  }, Math.max(0, data.endTime - Date.now()) + 2000)
}

// Single place that puts a rest on the clock: cache it, stage the "done"
// notification spec, queue the delayed push and start the on-screen countdown.
async function armRest(data: RestTimerData): Promise<void> {
  await storeRestTimer(data)
  await stagePushSpec('done', data)
  await scheduleDelayedPush(data)
  _checkRestTimer()
  armCompletion(data)
}

export async function scheduleRestTimer(pending: RestPendingData): Promise<void> {
  await armRest({ ...pending, endTime: Date.now() + pending.restSec * 1000 })
}

// "+30 s" / "−15 s": move the end forward or back, then re-queue the delayed
// push under a fresh tag so the worker supersedes the one already in flight.
export async function adjustRestTimer(deltaSec: number): Promise<void> {
  const current = await getRestTimer()
  if (!current) return
  const endTime = Math.max(Date.now() + 3000, current.endTime + deltaSec * 1000)
  const restSec = Math.max(1, current.restSec + deltaSec)
  await cancelDelayedPush(current.tag)
  await armRest({ ...current, endTime, restSec, tag: 'rest-' + Date.now() })
}

// "Reiniciar descanso" from the full-screen timer: the same machinery the
// Iniciar button ends up running, minus the tapeable start notification —
// here the rest starts on the spot. It still queues the delayed push, so both
// entry points finish a rest exactly the same way.
export async function restartRestTimer(): Promise<void> {
  const current = await getRestTimer()
  if (!current) return
  await cancelDelayedPush(current.tag)
  await scheduleRestTimer({ ...current, tag: 'rest-' + Date.now() })
}

export async function completeRest(name: string, tag: string): Promise<void> {
  _hideRestTimerBanner()

  const { toast } = await import('$lib/stores/ui')
  toast.show(`⏰ ${name} — Descanso terminado`)

  const { notifyWatch } = await import('$lib/push')
  await notifyWatch(`⏰ ${name}`, 'Descanso terminado — Tap para iniciar', tag)

  const pending = await getRestPending()
  if (pending) await storeRestPending(pending)

  await clearRestTimer()
}

// Shared "Iniciar" handler for ExerciseDetail's onStartRest — used identically from
// today/+page.svelte, plan/+page.svelte and Calendar.svelte so every route triggers
// the same rest-timer push/watch flow instead of duplicating it.
export async function startRestFromExercise(data: RestPendingData): Promise<void> {
  const pending: RestPendingData = { ...data, setIndex: nextSetIndex(data.exerciseId) }
  await storeRestPending(pending)
  await stagePushSpec('start', pending)
  await new Promise((r) => setTimeout(r, 2000))
  const body = `${pending.sets}×${pending.reps} · Tap para iniciar descanso`
  const ok = await sendPushNotification(pending.name, body, pending.tag, { exerciseId: pending.exerciseId })
  if (!ok) await notifyWatch(pending.name, body, pending.tag)
}

export async function cancelRestTimer(tag: string): Promise<void> {
  _hideRestTimerBanner()
  if (_completionId) { clearTimeout(_completionId); _completionId = null }
  await clearRestTimer()
  await clearRestPending()
  await cancelDelayedPush(tag)
}
