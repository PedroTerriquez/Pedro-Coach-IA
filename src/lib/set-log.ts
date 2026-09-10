import { getLogsForDate, logWeight } from '$lib/storage'
import type { ExerciseLog, ExerciseLogBlock } from '$lib/types'

// Per-set logging for the full-screen rest timer.
//
// While you rest you register the set you just finished (peso + reps). The
// source of truth stays the same single log per exercise per day that the
// detail sheet writes: sets are expanded from that log, edited one at a time
// and collapsed back. If every set ends up identical the log stays a plain
// "60kg" record; the moment one set differs it becomes the detailed one
// (`blocks`), exactly what the block editor shows.

export interface SetEntry {
  reps: number
  weight: number
}

export const SET_LOG_EVENT = 'logs-updated'

function localDateKey(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 10)
}

export function expandBlocks(blocks: ExerciseLogBlock[]): SetEntry[] {
  return blocks.flatMap(b =>
    Array.from({ length: Math.max(1, Math.round(b.sets || 1)) }, () => ({ reps: b.reps, weight: b.weight }))
  )
}

// Consecutive sets with the same peso+reps become one block, which is how the
// detail editor already groups them ("3×10 @ 60" + "1×8 @ 70").
export function collapseSets(entries: SetEntry[]): ExerciseLogBlock[] {
  const blocks: ExerciseLogBlock[] = []
  for (const e of entries) {
    const last = blocks[blocks.length - 1]
    if (last && last.reps === e.reps && last.weight === e.weight) last.sets += 1
    else blocks.push({ sets: 1, reps: e.reps, weight: e.weight })
  }
  return blocks
}

export function logToSets(log: ExerciseLog | null | undefined): SetEntry[] {
  if (!log) return []
  if (log.blocks?.length) return expandBlocks(log.blocks)
  if (!(log.weight > 0)) return []
  const reps = parseInt(String(log.reps ?? '').match(/\d+/)?.[0] || '0', 10)
  const sets = Math.max(1, Math.round(log.sets || 1))
  return Array.from({ length: sets }, () => ({ reps, weight: log.weight }))
}

export async function getTodaySets(exerciseId: string): Promise<SetEntry[]> {
  const logs = await getLogsForDate(localDateKey())
  return logToSets(logs.find(l => l.exerciseId === exerciseId))
}

// Sets registered out of order leave holes (you logged set 3 without logging
// set 2): fill them with what we know so far so the collapse still describes a
// real workout instead of 0kg gaps.
function fillGaps(entries: SetEntry[], upTo: number, fallback: SetEntry): SetEntry[] {
  const filled = entries.slice()
  while (filled.length < upTo) filled.push({ ...(filled[filled.length - 1] || fallback) })
  return filled
}

// A plain "60kg" log (the simple path of the detail sheet) records no reps, so
// its sets come back with reps 0. Adopt the reps being registered instead of
// writing a "0 reps" block nobody did.
function withReps(entries: SetEntry[], reps: number): SetEntry[] {
  return entries.map(e => (e.reps > 0 ? e : { ...e, reps }))
}

export async function persistSets(exerciseId: string, entries: SetEntry[], units: string): Promise<void> {
  const blocks = collapseSets(entries)
  if (!blocks.length) return
  const top = blocks.reduce((best, b) => (b.weight > best.weight ? b : best), blocks[0])
  const totalSets = blocks.reduce((a, b) => a + b.sets, 0)
  // One uniform block → plain record. Anything else → detailed blocks.
  const detailed = blocks.length > 1 ? blocks : undefined
  await logWeight(exerciseId, top.weight, units, totalSets, String(top.reps), undefined, detailed)
  try {
    window.dispatchEvent(new CustomEvent(SET_LOG_EVENT, { detail: { exerciseId } }))
  } catch {}
}

// Register (or correct) one set and rewrite today's log from the full picture.
export async function saveSetEntry(
  exerciseId: string,
  setNumber: number,
  entry: SetEntry,
  units: string
): Promise<SetEntry[]> {
  const current = withReps(await getTodaySets(exerciseId), entry.reps)
  const entries = fillGaps(current, setNumber - 1, entry)
  entries[setNumber - 1] = { ...entry }
  await persistSets(exerciseId, entries, units)
  return entries
}
