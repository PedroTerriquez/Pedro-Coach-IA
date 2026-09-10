<script lang="ts">
  import { logWeight, getSettings, findOrCreateExerciseByName, swapExerciseForToday, revertExerciseSwapForToday } from '$lib/storage'
  import { toast } from '$lib/stores/ui'
  import { settings } from '$lib/stores/settings'
  import { parseRepsDefault } from '$lib/exercise-utils'
  import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
  import type { ExerciseLogBlock } from '$lib/types'
  import Sheet from './Sheet.svelte'
  import SegmentedControl from './SegmentedControl.svelte'
  import CoachChat from './CoachChat.svelte'
  import ExerciseHero from './ExerciseHero.svelte'
  import WorkoutTab from './WorkoutTab.svelte'
  import HistoryTab from './HistoryTab.svelte'
  import AlternativesTab from './AlternativesTab.svelte'
  import Icon from './Icon.svelte'
  import StatsGrid from './StatsGrid.svelte'
  import StatBlock from './StatBlock.svelte'
  import DebugAIToggle from './DebugAIToggle.svelte'

  function getToday(): string {
    const d = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
    return d.toISOString().slice(0, 10)
  }

  interface Alternative {
    name: string
    reason: string
  }

  interface ExerciseLog {
    id: string
    exerciseId: string
    date: string
    weight: number
    units: string
    sets?: number
    reps?: string
    blocks?: ExerciseLogBlock[]
  }

  interface ExerciseDetail {
    id: string
    name: string
    muscle: string
    imgUrl?: string
    gifUrl?: string
    tips?: string[]
    alternatives?: Alternative[]
    sets: number
    reps: string
    rest: number
    logs?: ExerciseLog[]
    exerciseId?: string
    originalExerciseId?: string
    originalExerciseName?: string
  }

  let {
    exercise,
    open,
    accent = 'var(--accent)',
    units = 'kg',
    hasPrev = false,
    hasNext = false,
    isToday = false,
    onNavigate = null,
    onClose = null,
    onLog = null,
    onStartRest = null,
    onSwap = null,
    onRevert = null
  }: {
    exercise: ExerciseDetail
    open: boolean
    accent?: string
    units?: string
    hasPrev?: boolean
    hasNext?: boolean
    isToday?: boolean
    onNavigate?: ((dir: 'prev' | 'next') => void) | null
    onClose?: (() => void) | null
    onLog?: (() => void) | null
    onStartRest?: ((data: any) => void) | null
    onSwap?: (() => void) | null
    onRevert?: (() => void) | null
  } = $props()

  let todayStr = $derived(getToday())
  let todayLog = $derived(exercise.logs?.find(l => l.date === todayStr) || null)
  let lastLog = $derived(exercise.logs?.length ? exercise.logs[exercise.logs.length - 1] : null)

  let tab = $state<'workout' | 'history' | 'alternatives'>('workout')
  let pendingWeight = $state(todayLog ? todayLog.weight : (lastLog ? lastLog.weight : 0))
  let loggedToday = $state(!!todayLog)
  let iniciarLoading = $state(false)
  let showGif = $state(true)

  let chatOpen = $state(false)

  function seedBlocks(): ExerciseLogBlock[] {
    if (todayLog?.blocks?.length) return todayLog.blocks.map(b => ({ ...b }))
    if (todayLog?.sets !== undefined && todayLog?.reps !== undefined) {
      return [{ sets: todayLog.sets, reps: parseRepsDefault(todayLog.reps), weight: todayLog.weight }]
    }
    return [{ sets: exercise.sets, reps: parseRepsDefault(exercise.reps), weight: todayLog ? todayLog.weight : (lastLog ? lastLog.weight : 0) }]
  }

  let advanced = $state(!!todayLog?.blocks?.length)
  let blocks = $state<ExerciseLogBlock[]>(seedBlocks())
  let savedKey = $state<string | null>(advanced ? JSON.stringify(blocks) : (loggedToday ? String(pendingWeight) : null))

  let currentExerciseKey = $derived(exercise.exerciseId || exercise.id)
  let displayName = $derived(getExerciseDisplayName(exercise, $settings.language))
  let isSwapped = $derived(!!exercise.originalExerciseId && exercise.originalExerciseId !== currentExerciseKey)
  // The alternatives tab always shows when the exercise has curated alternatives
  // (regardless of whether the detail is opened from Today, Plan or History).
  // Stays visible while swapped even if the swapped-in exercise has no curated
  // alternatives of its own — otherwise there'd be no way back to the original.
  let showAlternativesTab = $derived(((exercise.alternatives?.length ?? 0) > 0) || isSwapped)
  $effect(() => {
    void currentExerciseKey
    const isBlockMode = !!todayLog?.blocks?.length
    const seededBlocks = seedBlocks()
    loggedToday = !!todayLog
    pendingWeight = todayLog ? todayLog.weight : (lastLog ? lastLog.weight : 0)
    advanced = isBlockMode
    blocks = seededBlocks
    // savedKey must only reflect the *persisted* value (todayLog/lastLog), NOT
    // the live pendingWeight. Reading pendingWeight here would make this effect
    // re-run on every keystroke, snapping the input back to the saved weight and
    // keeping isDirty=false (button stuck on "Guardado") — the "can't overwrite
    // after registering" bug.
    savedKey = isBlockMode ? JSON.stringify(seededBlocks) : (loggedToday ? String(todayLog?.weight ?? pendingWeight) : null)
    if (tab === 'alternatives' && !showAlternativesTab) tab = 'workout'
  })

  function close() {
    onClose?.()
  }

  let touchStartX = 0
  let touchStartY = 0

  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }

  function onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX
    const dy = e.changedTouches[0].clientY - touchStartY
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7) return
    if (dx < 0 && hasNext) onNavigate?.('next')
    else if (dx > 0 && hasPrev) onNavigate?.('prev')
  }

  let totalSets = $derived(blocks.reduce((a, b) => a + (b.sets || 0), 0))
  let topWeight = $derived(blocks.length ? Math.max(...blocks.map(b => b.weight)) : 0)
  let currentKey = $derived(advanced ? JSON.stringify(blocks) : String(pendingWeight))
  let isDirty = $derived(loggedToday && currentKey !== savedKey)
  let isLoggedState = $derived(loggedToday && !isDirty)

  async function handleSave() {
    if (advanced) {
      if (!blocks.length) return
      const top = blocks.reduce((best, b) => (b.weight > best.weight ? b : best), blocks[0])
      await logWeight(exercise.exerciseId || exercise.id, topWeight, units, totalSets, String(top.reps), undefined, blocks.map(b => ({ ...b })))
      pendingWeight = topWeight
      toast.show(`✅ ${blocks.length} bloque${blocks.length > 1 ? 's' : ''} · máx ${topWeight}${units} registrado`)
    } else {
      if (pendingWeight === 0) return
      await logWeight(exercise.exerciseId || exercise.id, pendingWeight, units)
      toast.show(`✅ ${pendingWeight}${units} registrado`)
      blocks = [{ sets: exercise.sets, reps: parseRepsDefault(exercise.reps), weight: pendingWeight }]
      advanced = true
    }
    savedKey = currentKey
    loggedToday = true
    onLog?.()

    const currentSettings = await getSettings()
    if (!currentSettings.onboarded && (currentSettings.onboardingStep ?? 0) <= 2) {
      await settings.update({ onboardingStep: 3 })
    }
  }

  async function handleClear() {
    loggedToday = false
    pendingWeight = lastLog ? lastLog.weight : 0
    advanced = false
    blocks = [{ sets: exercise.sets, reps: parseRepsDefault(exercise.reps), weight: lastLog ? lastLog.weight : 0 }]
    savedKey = null
  }

  async function selectAlternative(alt: Alternative) {
    const originalId = exercise.originalExerciseId || currentExerciseKey
    const newEx = await findOrCreateExerciseByName(alt.name, exercise.muscle)
    await swapExerciseForToday(originalId, newEx.id)
    tab = 'workout'
    toast.show(`🔄 Cambiado a ${getExerciseDisplayName(newEx, $settings.language)} por hoy`)
    onSwap?.()
  }

  async function revertAlternative() {
    const originalId = exercise.originalExerciseId || currentExerciseKey
    await revertExerciseSwapForToday(originalId)
    toast.show(`↺ Vuelto a ${exercise.originalExerciseName || ''}`)
    onRevert?.()
  }

  async function handleIniciar() {
    if (iniciarLoading) return
    iniciarLoading = true
    try {
      if (navigator.vibrate) navigator.vibrate(40)
      // Everything here survives the trip through the notification, so it is
      // also what the full-screen rest timer can show while resting.
      onStartRest?.({
        name: displayName,
        restSec: exercise.rest,
        tag: 'rest-' + Date.now(),
        sets: exercise.sets,
        reps: exercise.reps,
        exerciseId: exercise.exerciseId || exercise.id,
        muscle: exercise.muscle,
        imgUrl: exercise.imgUrl,
        gifUrl: exercise.gifUrl,
        units,
        lastWeight: lastLog?.weight || 0,
        maxWeight
      })
    } finally {
      iniciarLoading = false
    }
  }

  let allLogData = $derived(
    (exercise.logs || []).slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  )
  let maxWeight = $derived(allLogData.length ? Math.max(...allLogData.map(l => l.weight)) : 0)
  let weightCount = $derived(allLogData.filter(l => l.weight > 0).length)
  let firstLog = $derived(allLogData.length ? allLogData[0] : null)
  let totalGain = $derived(firstLog && lastLog ? lastLog.weight - firstLog.weight : 0)
  let pctChange = $derived(firstLog ? ((totalGain / firstLog.weight) * 100).toFixed(1) : '0')
  let reversedLogs = $derived([...allLogData].reverse())
</script>

{#if open}
  <Sheet bind:open={open} onclose={close}>
    <div class="detail-scroll" data-component="ExerciseDetail" ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
        <!-- Navigation pills -->
        <div class="nav-pills">
          <div class="nav-pill-row">
            <button class="pill-btn pill-prev" disabled={!hasPrev} onclick={() => onNavigate?.('prev')} aria-label="Anterior">
              <div class="pill-icon">
                <svg width="11" height="10" viewBox="0 0 11 10" fill="none"><path d="M10 5H1m0 0l4-4M1 5l4 4" stroke={hasPrev ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)'} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <div class="pill-label-col">
                <span class="pill-label">Anterior</span>
                <span class="pill-name">Anterior</span>
              </div>
            </button>
            <button class="iniciar-btn" style="background:{accent}" onclick={handleIniciar} disabled={iniciarLoading}>
              {#if iniciarLoading}
                <span class="iniciar-icon">⏳</span> Enviando...
              {:else}
                <span class="iniciar-icon">⚡</span> Iniciar
              {/if}
            </button>
            <button class="pill-btn pill-next" disabled={!hasNext} onclick={() => onNavigate?.('next')} aria-label="Siguiente">
              <div class="pill-label-col pill-label-col-end">
                <span class="pill-label">Siguiente</span>
                <span class="pill-name">Siguiente</span>
              </div>
              <div class="pill-icon">
                <svg width="11" height="10" viewBox="0 0 11 10" fill="none"><path d="M1 5h9m0 0L6 1m4 4L6 9" stroke={hasNext ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)'} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            </button>
          </div>
        </div>

        <!-- Hero -->
        <ExerciseHero {exercise} {accent} {loggedToday} bind:showGif={showGif} />

        <!-- Coach IA button -->
        <div class="coach-bar" data-component="CoachBar">
          <button class="coach-cyber-btn" style="--cyber-accent:{accent};border-color:color-mix(in srgb, {accent} 22%, transparent);background:color-mix(in srgb, {accent} 6%, var(--surface))" onclick={() => chatOpen = true}>
            <span class="coach-cyber-scanline"></span>
            <span class="coach-cyber-topline"></span>
            <div class="coach-cyber-inner">
              <span class="coach-cyber-icon" style="color:{accent}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/></svg>
              </span>
              <div class="coach-cyber-text">
                <span class="coach-cyber-label">{'>'} Preguntar al coach</span>
                <span class="coach-cyber-sub">Técnica · Variantes · Dolor</span>
              </div>
              <span class="coach-cyber-arrow" style="color:{accent}">›</span>
            </div>
          </button>
          <DebugAIToggle label="Exercise Coach IA" {accent} />
        </div>

        <!-- Prescription strip -->
        <StatsGrid columns={4} variant="card">
          <StatBlock value={exercise.sets} label="series" {accent} size="md" />
          <StatBlock value={exercise.reps} label="reps" {accent} size="md" />
          <StatBlock value={`${exercise.rest}s`} label="desc." {accent} size="md" />
          <StatBlock value={lastLog && lastLog.weight > 0 ? `${lastLog.weight}${units}` : '—'} label="última" accent={lastLog && lastLog.weight > 0 ? accent : '#fafafa'} size="md" />
        </StatsGrid>

        <!-- Tab selector -->
        <div class="tab-selector-wrap">
          <SegmentedControl
            options={[
              { label: 'Registrar', value: 'workout' },
              { label: 'Historial', value: 'history' },
              ...(showAlternativesTab ? [{ label: 'Alternativas', value: 'alternatives' }] : [])
            ]}
            bind:value={tab}
            {accent}
          />
        </div>

        <!-- Workout tab -->
        {#if tab === 'workout'}
          <WorkoutTab
            {exercise}
            {accent}
            {units}
            {loggedToday}
            {isDirty}
            {isLoggedState}
            bind:pendingWeight
            bind:blocks
            bind:advanced
            onSave={handleSave}
            onClear={handleClear}
          />

        <!-- History tab -->
        {:else if tab === 'history'}
          <HistoryTab
            {allLogData}
            {reversedLogs}
            {maxWeight}
            {lastLog}
            {totalGain}
            {pctChange}
            {weightCount}
            {accent}
            {units}
            {todayStr}
          />

        <!-- Alternatives tab -->
        {:else if tab === 'alternatives'}
          <AlternativesTab
            alternatives={exercise.alternatives || []}
            {accent}
            language={$settings.language}
            {isSwapped}
            originalName={exercise.originalExerciseName || ''}
            onSelect={selectAlternative}
            onRevert={revertAlternative}
          />
        {/if}
      </div>

    {#if chatOpen}
      <CoachChat {exercise} {accent} onclose={() => chatOpen = false} />
    {/if}
  </Sheet>
{/if}

<style>
  .detail-scroll {
    overflow-y: auto;
    color: var(--text);
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 0 0 14px;
  }
  .nav-pills {
    padding: 0;
  }
  .nav-pill-row {
    display: flex;
    gap: 8px;
  }
  .pill-btn {
    flex: 1;
    min-width: 0;
    background: rgba(255,255,255,0.02);
    border: 0.5px solid var(--border);
    border-radius: 12px;
    padding: 8px 12px;
    cursor: pointer;
    color: inherit;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 9px;
    opacity: 1;
  }
  .pill-btn:disabled {
    cursor: default;
    opacity: 0.45;
  }
  .pill-prev {
    flex-direction: row;
  }
  .pill-next {
    flex-direction: row-reverse;
  }
  .pill-icon {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: rgba(255,255,255,0.03);
    border: 0.5px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .pill-label-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .pill-label-col-end {
    align-items: flex-end;
  }
  .pill-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.3px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.45);
    font-weight: 600;
    line-height: 1;
  }
  .pill-name {
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.75);
    letter-spacing: -0.1px;
    line-height: 1.25;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pill-btn:disabled .pill-label,
  .pill-btn:disabled .pill-name {
    color: rgba(255,255,255,0.3);
  }
  .iniciar-btn {
    flex-shrink: 0;
    border: 0;
    border-radius: 12px;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--bg);
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.1px;
    touch-action: manipulation;
    white-space: nowrap;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .iniciar-btn:disabled {
    background: var(--border-medium);
    cursor: default;
    opacity: 0.5;
  }
  .iniciar-icon {
    font-size: 15px;
    line-height: 1;
  }
  .tab-selector-wrap {
    padding: 0;
  }

  /* Coach IA cyberpunk button */
  /* Coach IA cyberpunk button */
  .coach-bar {
    display: flex;
    align-items: center;
  }
  .coach-cyber-btn {
    position: relative;
    flex: 1;
    min-width: 0;
    border: 0.5px solid;
    border-radius: var(--radius-full);
    padding: 11px 14px;
    cursor: pointer;
    overflow: hidden;
    text-align: left;
    transition: transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .coach-cyber-btn:hover {
    transform: scale(1.01);
    box-shadow: 0 0 18px color-mix(in srgb, var(--cyber-accent) 14%, transparent);
    border-color: color-mix(in srgb, var(--cyber-accent) 35%, transparent);
  }
  .coach-cyber-btn:active {
    transform: scale(0.98);
    opacity: 0.85;
  }
  .coach-cyber-topline {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--cyber-accent), transparent);
    opacity: 0.4;
    pointer-events: none;
  }
  .coach-cyber-scanline {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--cyber-accent);
    opacity: 0.12;
    animation: coach-scanline 1.8s linear infinite;
    pointer-events: none;
  }
  @keyframes coach-scanline {
    0% { top: -2px; }
    100% { top: calc(100% + 2px); }
  }
  .coach-cyber-inner {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .coach-cyber-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    opacity: 0.85;
  }
  .coach-cyber-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .coach-cyber-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }
  .coach-cyber-sub {
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 0.6px;
    color: var(--text-tertiary);
    white-space: nowrap;
  }
  .coach-cyber-arrow {
    flex-shrink: 0;
    font-size: 18px;
    font-weight: 300;
    opacity: 0.4;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .coach-cyber-btn:hover .coach-cyber-arrow {
    opacity: 0.8;
    transform: translateX(2px);
  }

</style>
