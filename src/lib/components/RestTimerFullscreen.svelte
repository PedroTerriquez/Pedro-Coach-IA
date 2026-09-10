<script lang="ts">
  import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
  import { parseRepsDefault } from '$lib/exercise-utils'
  import { getTodaySets, saveSetEntry, type SetEntry } from '$lib/set-log'
  import type { RestTimerData } from '$lib/rest-timer'

  let {
    visible = false,
    timer,
    accent = 'var(--accent)',
    onskip = undefined,
    onminimize = undefined,
    onadjust = undefined,
    onrestart = undefined
  }: {
    visible: boolean
    timer: RestTimerData
    accent?: string
    onskip?: () => void
    onminimize?: () => void
    onadjust?: (deltaSec: number) => void
    onrestart?: () => void
  } = $props()

  const WEIGHT_STEP = 2.5

  let remainingMs = $state(0)
  let tickId: ReturnType<typeof setInterval> | null = null

  // Per-set log: the set you just finished is the one you register while you
  // rest. Everything is read back from today's log, so the detail sheet and
  // the timer always show the same thing.
  let entries = $state<SetEntry[]>([])
  let weight = $state(0)
  let reps = $state(0)
  let saved = $state(false)
  let loadedKey = ''
  let saveId: ReturnType<typeof setTimeout> | null = null
  // What the debounced write is about to save. Captured at tap time, because
  // by the time it fires the timer may already be on another exercise.
  let pending: { exerciseId: string; setNo: number; units: string; entry: SetEntry } | null = null

  let displayName = $derived(getExerciseDisplayName({ name: timer.name }) || timer.name)
  let isEnding = $derived(remainingMs <= 10000)
  let units = $derived(timer.units || 'kg')
  let setIndex = $derived(timer.setIndex || 0)
  let dots = $derived(Array.from({ length: Math.max(timer.sets || 0, setIndex) }, (_, i) => i + 1))
  let media = $derived(timer.gifUrl || timer.imgUrl || '')
  let setNo = $derived(Math.max(1, setIndex))
  let recap = $derived(
    entries
      .map((e, i) => `S${i + 1} ${fmtNum(e.weight)}${units}×${e.reps}`)
      .join('  ·  ')
  )

  function fmtNum(n: number): string {
    return Number.isInteger(n) ? String(n) : String(+n.toFixed(1))
  }

  function fmtClock(ms: number) {
    const total = Math.max(0, Math.ceil(ms / 1000))
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
  }

  function ringOffset(ms: number) {
    const dur = timer.restSec * 1000
    const pct = dur > 0 ? Math.max(0, Math.min(1, ms / dur)) : 0
    return 100 * (1 - pct)
  }

  function adjust(deltaSec: number) {
    if (navigator.vibrate) navigator.vibrate(20)
    onadjust?.(deltaSec)
  }

  function restart() {
    if (navigator.vibrate) navigator.vibrate(30)
    onrestart?.()
  }

  // Seeds the two fields: whatever this set already has, else the previous set
  // of today, else the last workout's weight and the prescribed reps.
  async function loadSets() {
    const list = await getTodaySets(timer.exerciseId)
    const mine = list[setNo - 1]
    const prev = list[setNo - 2] || list[list.length - 1]
    entries = list
    weight = mine?.weight ?? prev?.weight ?? timer.lastWeight ?? 0
    reps = mine?.reps || prev?.reps || parseRepsDefault(timer.reps)
    saved = !!mine
  }

  // No "guardar" button: touching a stepper or typing is the intent to save,
  // debounced so a run of taps writes once.
  function commit() {
    saved = false
    pending = { exerciseId: timer.exerciseId, setNo, units, entry: { reps, weight } }
    if (saveId) clearTimeout(saveId)
    saveId = setTimeout(flush, 450)
  }

  async function flush() {
    if (saveId) { clearTimeout(saveId); saveId = null }
    const p = pending
    pending = null
    if (!p || !p.exerciseId || !(p.entry.weight > 0) || !(p.entry.reps > 0)) return
    const list = await saveSetEntry(p.exerciseId, p.setNo, p.entry, p.units)
    // Only repaint if the timer is still showing the set that was written.
    if (p.exerciseId === timer.exerciseId && p.setNo === setNo) {
      entries = list
      saved = true
    }
  }

  function stepWeight(delta: number) {
    weight = Math.max(0, +(weight + delta).toFixed(1))
    if (navigator.vibrate) navigator.vibrate(10)
    commit()
  }

  function stepReps(delta: number) {
    reps = Math.max(1, Math.min(100, Math.round(reps + delta)))
    if (navigator.vibrate) navigator.vibrate(10)
    commit()
  }

  function inputWeight(e: Event) {
    const raw = (e.target as HTMLInputElement).value.replace(/[^0-9.]/g, '')
    weight = raw === '' ? 0 : parseFloat(raw)
    commit()
  }

  function inputReps(e: Event) {
    const raw = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '')
    reps = raw === '' ? 0 : parseInt(raw, 10)
    commit()
  }

  // Tapping "+" and then "Saltar" right away must still save that set.
  $effect(() => () => { flush() })

  $effect(() => {
    const key = `${timer.exerciseId}#${setNo}`
    if (!visible || !timer.exerciseId || key === loadedKey) return
    loadedKey = key
    loadSets()
  })

  $effect(() => {
    if (tickId) { clearInterval(tickId); tickId = null }
    if (!visible || timer.endTime <= 0) return
    remainingMs = Math.max(0, timer.endTime - Date.now())
    tickId = setInterval(() => {
      remainingMs = Math.max(0, timer.endTime - Date.now())
    }, 1000)
    return () => { if (tickId) clearInterval(tickId) }
  })
</script>

{#if visible && remainingMs > 0}
  <div class="rtf" class:is-ending={isEnding} data-component="RestTimerFullscreen" style="--rt:{accent}" role="dialog" aria-label="Descanso">

    <header class="rtf-top">
      <button class="rtf-icon-btn" type="button" aria-label="Minimizar descanso" onclick={onminimize}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <span class="rtf-status">Descanso</span>
      <button class="rtf-skip" type="button" aria-label="Saltar descanso" onclick={onskip}>
        Saltar
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M4 3.2l8 5.8-8 5.8V3.2z" fill="currentColor"/><rect x="12.5" y="3" width="2" height="12" rx="1" fill="currentColor"/></svg>
      </button>
    </header>

    <section class="rtf-clock">
      <button class="rtf-nudge rtf-nudge-minus" type="button" aria-label="−15 s" onclick={() => adjust(-15)}>
        <span class="rtf-nudge-n">−15</span><span class="rtf-nudge-u">s</span>
      </button>
      <div class="rtf-ring-wrap">
        <svg class="rtf-ring" viewBox="0 0 308 308" aria-hidden="true">
          <circle class="rtf-ring-track" cx="154" cy="154" r="150"></circle>
          <circle class="rtf-ring-prog" cx="154" cy="154" r="150" pathLength="100"
            style="stroke-dashoffset:{ringOffset(remainingMs)}"></circle>
        </svg>
        <div class="rtf-center">
          <div class="rtf-time">{fmtClock(remainingMs)}</div>
          <div class="rtf-total">de {fmtClock(timer.restSec * 1000)}</div>
        </div>
      </div>
      <button class="rtf-nudge rtf-nudge-plus" type="button" aria-label="+30 s" onclick={() => adjust(30)}>
        <span class="rtf-nudge-n">+30</span><span class="rtf-nudge-u">s</span>
      </button>
    </section>

    {#if dots.length}
      <section class="rtf-serie">
        <div class="rtf-serie-label">
          Serie <b>{setIndex || 1}</b> de <b>{timer.sets}</b>
        </div>
        <div class="rtf-dots">
          {#each dots as n}
            <span class="rtf-dot" class:is-done={n < setIndex} class:is-now={n === setIndex}></span>
          {/each}
        </div>
      </section>
    {/if}

    <section class="rtf-card">
      <div class="rtf-card-head">
        <div class="rtf-thumb">
          {#if media}
            <img src={media} alt="" />
          {:else}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"/></svg>
          {/if}
        </div>
        <div class="rtf-ex">
          <div class="rtf-ex-name">{displayName}</div>
          {#if timer.muscle}
            <div class="rtf-ex-sub"><span class="rtf-chip">{timer.muscle}</span></div>
          {/if}
        </div>
      </div>
      <div class="rtf-stats">
        <div class="rtf-stat"><span class="rtf-stat-v">{timer.sets}</span><span class="rtf-stat-l">series</span></div>
        <div class="rtf-stat"><span class="rtf-stat-v">{timer.reps}</span><span class="rtf-stat-l">reps</span></div>
        <div class="rtf-stat">
          <span class="rtf-stat-v" class:is-accent={!!timer.lastWeight}>{timer.lastWeight ? `${timer.lastWeight}${units}` : '—'}</span>
          <span class="rtf-stat-l">última</span>
        </div>
        <div class="rtf-stat">
          <span class="rtf-stat-v">{timer.maxWeight ? `${timer.maxWeight}${units}` : '—'}</span>
          <span class="rtf-stat-l">récord</span>
        </div>
      </div>

      {#if timer.exerciseId}
        <div class="rtf-log">
          <div class="rtf-log-head">
            <span class="rtf-log-title">Registrar serie {setNo}</span>
            {#if saved}
              <span class="rtf-log-saved">
                <svg width="10" height="8" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l4 4 8-8.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Guardada
              </span>
            {/if}
          </div>
          <div class="rtf-log-grid">
            <div class="rtf-field">
              <button class="rtf-field-btn" type="button" aria-label="Menos peso" onclick={() => stepWeight(-WEIGHT_STEP)}>−</button>
              <div class="rtf-field-val">
                <input
                  class="rtf-field-input"
                  inputmode="decimal"
                  aria-label="Peso de la serie"
                  value={weight ? fmtNum(weight) : ''}
                  oninput={inputWeight}
                  placeholder="0"
                >
                <span class="rtf-field-unit">{units}</span>
              </div>
              <button class="rtf-field-btn" type="button" aria-label="Más peso" onclick={() => stepWeight(WEIGHT_STEP)}>+</button>
            </div>
            <div class="rtf-field">
              <button class="rtf-field-btn" type="button" aria-label="Menos reps" onclick={() => stepReps(-1)}>−</button>
              <div class="rtf-field-val">
                <input
                  class="rtf-field-input"
                  inputmode="numeric"
                  aria-label="Reps de la serie"
                  value={reps ? String(reps) : ''}
                  oninput={inputReps}
                  placeholder="0"
                >
                <span class="rtf-field-unit">reps</span>
              </div>
              <button class="rtf-field-btn" type="button" aria-label="Más reps" onclick={() => stepReps(1)}>+</button>
            </div>
          </div>
          {#if recap}
            <div class="rtf-log-recap">{recap}</div>
          {/if}
        </div>
      {/if}
    </section>

    <footer class="rtf-actions">
      <button class="rtf-act rtf-act-restart" type="button" onclick={restart}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M2.5 12a9 9 0 0 1 15.5-5L21.5 8"/><path d="M2.5 22v-6h6"/><path d="M21.5 12a9 9 0 0 1-15.5 5L2.5 16"/></svg>
        Reiniciar descanso
      </button>
    </footer>

  </div>
{/if}

<style>
  .rtf {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    padding:
      calc(env(safe-area-inset-top, 0px) + 14px)
      20px
      calc(env(safe-area-inset-bottom, 0px) + 26px);
    background:
      radial-gradient(120% 70% at 50% 0%, color-mix(in srgb, var(--rt) 9%, transparent), transparent 62%),
      radial-gradient(90% 50% at 50% 100%, rgba(255,255,255,0.03), transparent 70%),
      var(--bg);
    font-family: var(--font-sans);
    animation: rtf-in 0.35s var(--ease-smooth);
  }

  .rtf-top { display: flex; align-items: center; justify-content: space-between; height: 44px; flex-shrink: 0; }
  .rtf-icon-btn {
    width: 38px; height: 38px; border-radius: var(--radius-full);
    border: 0.5px solid var(--border-medium); background: rgba(255,255,255,0.04);
    color: var(--text-secondary); display: grid; place-items: center; cursor: pointer;
  }
  .rtf-icon-btn:active { transform: scale(0.92); }
  .rtf-status {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--font-mono); font-size: 11px; font-weight: 600;
    letter-spacing: 2px; text-transform: uppercase; color: var(--rt);
  }
  .rtf-status::before {
    content: ""; width: 7px; height: 7px; border-radius: 50%;
    background: var(--rt); box-shadow: 0 0 10px var(--rt);
    animation: rtf-blink 1.4s ease-in-out infinite;
  }
  .rtf-skip {
    height: 38px; padding: 0 16px; border-radius: var(--radius-full);
    border: 0.5px solid var(--border-medium); background: rgba(255,255,255,0.04);
    color: var(--text-secondary); font-size: 14px; font-weight: 500;
    display: flex; align-items: center; gap: 6px; cursor: pointer;
  }
  .rtf-skip:active { transform: scale(0.96); }

  /* −15 s / +30 s live in the dead space either side of the ring, which buys
     the per-set fields a whole row of height. */
  .rtf-clock { position: relative; flex: 1; min-height: 0; display: grid; place-items: center; }
  .rtf-nudge {
    position: absolute; top: 50%; transform: translateY(-50%);
    width: 44px; height: 44px; border-radius: 50%;
    border: 0.5px solid var(--border-medium); background: rgba(255,255,255,0.045);
    color: var(--text); cursor: pointer; padding: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
    transition: background 0.15s, transform 0.12s var(--ease-smooth);
  }
  .rtf-nudge-n { font-family: var(--font-mono); font-size: 13px; font-weight: 500; letter-spacing: -0.4px; line-height: 1; }
  .rtf-nudge-u { font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.8px; color: var(--text-muted); line-height: 1; }
  .rtf-nudge:active { transform: translateY(-50%) scale(0.94); background: rgba(255,255,255,0.09); }
  .rtf-nudge-minus { left: 0; }
  .rtf-nudge-plus { right: 0; }
  /* The clock is the block that gives way: it takes the height left over by
     the card and the actions, and the width cap keeps it clear of the two
     nudge buttons (52px + 12px breathing room each side). */
  .rtf-ring-wrap {
    position: relative;
    height: 100%;
    max-height: min(308px, calc(100vw - 140px));
    width: auto;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    container-type: size;
  }
  .rtf-ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
  .rtf-ring-track { fill: none; stroke: rgba(255,255,255,0.07); stroke-width: 3; }
  .rtf-ring-prog {
    fill: none; stroke: var(--rt); stroke-width: 3; stroke-linecap: round;
    stroke-dasharray: 100; transition: stroke-dashoffset 1s linear, stroke 0.45s ease;
    filter: drop-shadow(0 0 8px color-mix(in srgb, var(--rt) 70%, transparent));
  }
  .rtf-center { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  /* Sized against the ring itself (cqw), so the digits shrink with it instead
     of spilling out of a small circle. The clamp is the no-container-query
     fallback. */
  .rtf-time {
    font-family: var(--font-mono); font-size: clamp(42px, 20vw, 84px); font-weight: 500;
    letter-spacing: -0.055em; line-height: 0.92; color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .rtf-total {
    font-family: var(--font-mono); font-size: 12px; letter-spacing: 1.6px;
    text-transform: uppercase; color: var(--text-muted);
  }
  @container (min-width: 0px) {
    .rtf-time { font-size: 27cqw; }
    .rtf-total { font-size: max(9px, 4cqw); }
  }

  .rtf-serie { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 4px 0 20px; }
  .rtf-serie-label { font-size: 15px; color: var(--text-secondary); letter-spacing: -0.2px; }
  .rtf-serie-label b { color: var(--text); font-weight: 600; }
  .rtf-dots { display: flex; gap: 9px; flex-wrap: wrap; justify-content: center; }
  .rtf-dot { width: 30px; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.1); }
  .rtf-dot.is-done { background: color-mix(in srgb, var(--rt) 55%, transparent); }
  .rtf-dot.is-now { background: var(--rt); box-shadow: 0 0 12px color-mix(in srgb, var(--rt) 70%, transparent); }

  .rtf-card {
    flex-shrink: 0;
    border-radius: var(--radius-2xl);
    border: 0.5px solid var(--border);
    background: linear-gradient(180deg, rgba(26,26,26,0.9), rgba(20,20,20,0.9));
    padding: 16px;
  }
  .rtf-card-head { display: flex; align-items: center; gap: 13px; }
  .rtf-thumb {
    width: 54px; height: 54px; flex-shrink: 0; border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--rt) 8%, var(--surface-2));
    border: 0.5px solid var(--border-medium);
    display: grid; place-items: center; color: var(--rt); overflow: hidden;
  }
  .rtf-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .rtf-ex { min-width: 0; }
  .rtf-ex-name {
    font-size: 19px; font-weight: 600; letter-spacing: -0.3px; line-height: 1.15; color: var(--text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .rtf-ex-sub { margin-top: 5px; display: flex; align-items: center; gap: 7px; }
  .rtf-chip {
    font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase;
    color: var(--text-tertiary); border: 0.5px solid var(--border-medium); border-radius: var(--radius-full);
    padding: 3px 9px;
  }
  .rtf-stats {
    margin-top: 14px; padding-top: 14px; border-top: 0.5px solid var(--border);
    display: grid; grid-template-columns: repeat(4, 1fr);
  }
  .rtf-stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .rtf-stat + .rtf-stat { border-left: 0.5px solid var(--border); }
  .rtf-stat-v { font-family: var(--font-mono); font-size: 17px; font-weight: 500; letter-spacing: -0.5px; color: var(--text); }
  .rtf-stat-v.is-accent { color: var(--rt); }
  .rtf-stat-l { font-family: var(--font-mono); font-size: 9px; letter-spacing: 1.1px; text-transform: uppercase; color: var(--text-muted); }

  .rtf-log { margin-top: 14px; padding-top: 13px; border-top: 0.5px solid var(--border); }
  .rtf-log-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }
  .rtf-log-title {
    font-family: var(--font-mono); font-size: 9.5px; font-weight: 600;
    letter-spacing: 1.3px; text-transform: uppercase; color: var(--text-muted);
  }
  .rtf-log-saved {
    display: inline-flex; align-items: center; gap: 5px;
    font-family: var(--font-mono); font-size: 9px; font-weight: 600;
    letter-spacing: 1.2px; text-transform: uppercase; color: var(--rt);
  }
  .rtf-log-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .rtf-field {
    display: flex; align-items: center; gap: 4px;
    background: rgba(0,0,0,0.25); border: 0.5px solid rgba(255,255,255,0.07);
    border-radius: var(--radius-md); padding: 5px;
  }
  .rtf-field-btn {
    width: clamp(28px, 8.5vw, 34px); height: 38px; flex-shrink: 0; border-radius: 9px;
    background: rgba(255,255,255,0.06); border: 0.5px solid rgba(255,255,255,0.1);
    color: var(--text); font-family: var(--font-mono); font-size: 18px; line-height: 1;
    display: grid; place-items: center; cursor: pointer; padding: 0;
  }
  .rtf-field-btn:active { transform: scale(0.94); background: rgba(255,255,255,0.11); }
  .rtf-field-val { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 1px; }
  .rtf-field-input {
    width: 100%; background: transparent; border: 0; outline: none; text-align: center;
    font-family: var(--font-mono); font-size: clamp(16px, 5.3vw, 21px); font-weight: 500;
    letter-spacing: -0.8px; line-height: 1; color: var(--text); padding: 0;
  }
  .rtf-field-unit {
    font-family: var(--font-mono); font-size: 8px; letter-spacing: 1.1px;
    text-transform: uppercase; color: var(--text-muted);
  }
  .rtf-log-recap {
    margin-top: 9px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2px;
    color: var(--text-tertiary); white-space: nowrap; overflow-x: auto; scrollbar-width: none;
  }
  .rtf-log-recap::-webkit-scrollbar { display: none; }

  .rtf-actions { flex-shrink: 0; margin-top: 14px; display: flex; flex-direction: column; gap: 10px; }
  .rtf-act {
    height: 56px; border-radius: var(--radius-xl);
    border: 0.5px solid var(--border-medium); background: rgba(255,255,255,0.045);
    color: var(--text); font-family: var(--font-mono); font-size: 16px; font-weight: 500;
    letter-spacing: -0.3px; cursor: pointer;
    transition: background 0.15s, transform 0.12s var(--ease-smooth);
  }
  .rtf-act:active { transform: scale(0.97); background: rgba(255,255,255,0.09); }
  .rtf-act-restart {
    display: flex; align-items: center; justify-content: center; gap: 9px;
    font-family: var(--font-sans); font-size: 16px; font-weight: 500;
    color: var(--rt);
    border-color: color-mix(in srgb, var(--rt) 26%, transparent);
    background: color-mix(in srgb, var(--rt) 7%, transparent);
  }

  .is-ending { --rt: #ff5b4d; }
  .is-ending .rtf-time { color: #ff5b4d; animation: rtf-blink 1s ease-in-out infinite; }

  @keyframes rtf-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
  @keyframes rtf-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

  /* Short phones (SE-class): every fixed block gives back a few px so the
     clock keeps a usable size instead of collapsing to a sliver. */
  @media (max-height: 720px) {
    .rtf { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); }
    .rtf-nudge { width: 38px; height: 38px; }
    .rtf-nudge-n { font-size: 12px; }
    .rtf-ring-wrap { max-height: min(308px, calc(100vw - 128px)); }
    .rtf-serie { gap: 8px; padding: 0 0 10px; }
    .rtf-serie-label { font-size: 14px; }
    .rtf-card { padding: 12px; }
    .rtf-thumb { width: 46px; height: 46px; }
    .rtf-ex-name { font-size: 17px; }
    .rtf-stats { margin-top: 10px; padding-top: 10px; }
    .rtf-log { margin-top: 10px; padding-top: 10px; }
    .rtf-actions { margin-top: 10px; }
    .rtf-act { height: 48px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .rtf, .rtf-status::before, .is-ending .rtf-time { animation: none; }
  }
</style>
