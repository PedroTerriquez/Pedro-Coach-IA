<script lang="ts">
  import { resolvePanelItems } from '$lib/data/warmup-components'
  import { base } from '$app/paths'
  import { onMount } from 'svelte'
  import * as Storage from '$lib/storage'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import { getLogsForDate, logWeight } from '$lib/storage'
  import { recordGymSession, getWeeklyGymSeconds } from '$lib/storage'
  import { mondayOf } from '$lib/calendar-utils'
  import { startRestFromExercise, checkPendingRest, _checkRestTimer } from '$lib/rest-timer'
  import { SET_LOG_EVENT } from '$lib/set-log'
  import { runCoachAnalysis } from '$lib/coach-analysis'
  import { computeStreakWeeks, trainingDaysPerWeek } from '$lib/streak'
  import { resolveWeekOrder } from '$lib/week-order'
  import { syncUserToWorker } from '$lib/push'
  import { PUSH_SERVER_URL } from '$lib/config'
  import { APP_VERSION } from '$lib/pwa'
  import Warmup from '$lib/components/Warmup.svelte'
  import ExerciseDetail from '$lib/components/ExerciseDetail.svelte'
  import PhaseCard from '$lib/components/PhaseCard.svelte'
  import LockedCard from '$lib/components/LockedCard.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import GlowCard from '$lib/components/GlowCard.svelte'
  import CenterDialog from '$lib/components/CenterDialog.svelte'
  import EmptyState from '$lib/components/EmptyState.svelte'
  import CoachResultCard from '$lib/components/CoachResultCard.svelte'
  import RestDayView from '$lib/components/RestDayView.svelte'
  import OnboardingView from '$lib/components/OnboardingView.svelte'
  import PhaseHeader from '$lib/components/PhaseHeader.svelte'
  import EffortSelector from '$lib/components/EffortSelector.svelte'
  import Button from '$lib/components/Button.svelte'
  import StreakOverlay from '$lib/components/StreakOverlay.svelte'
  import TrainingCard from '$lib/components/TrainingCard.svelte'
  import CenterToast from '$lib/components/CenterToast.svelte'
  import type { Exercise, ExerciseLog, Program, ProgramDay, ProgramExercise, Settings } from '$lib/types'

  let phase = $state<'loading' | 'warmup' | 'training' | 'stretch' | 'complete'>('loading')
  let todayExercises = $state<any[]>([])
  let warmupItems = $state<any[]>([])
  let stretchItems = $state<any[]>([])
  let program = $state<Program | null>(null)
  let weekInfo = $state<any>(null)
  let todayExDone = $state(0)
  let doneIds = $state<Record<string, true>>({})
  let startedAt = $state<number | null>(null)
  let endedAt = $state<number | null>(null)
  let centerToast = $state<CenterToastData | null>(null)
  let coachCardMode = $state(false)
  let coachLoading = $state(false)
  let coachResult = $state<any>(null)
  let coachError = $state(false)
  let showCoach = $state(false)
  let showWarmup = $state(false)
  let showStretch = $state(false)
  let exercises = $state<Exercise[]>([])
  let allLogs = $state<ExerciseLog[]>([])
  let effortModalShow = $state(false)
  let streakModalShow = $state(false)
  let streakCount = $state(0)
  let effortValue = $state<string | null>(null)
  let coachDay = $state<any>(null)
  let coachEffort = $state<string | null>(null)
  let loaded = $state(false)
  let noProgram = $state(false)
  let warmupDone = $state(false)
  let stretchDone = $state(false)
  let completionToastShown = $state(false)
  let sessionDate = $state('')
  let todayDate = $state('')
  let weightInputs = $state<Record<string, number>>({})

  let showDetail = $state(false)
  let detailExercises = $state<any[]>([])
  let detailIdx = $state(0)
  let todaySwapsMap = $state<Record<string, string>>({})

  // originalExerciseId/originalExerciseName let ExerciseDetail's "Volver a B" action
  // know what to revert even once the slot is already showing D.
  function buildTodayExercises(currentDay: ProgramDay, currentExercises: Exercise[], currentLogs: ExerciseLog[]) {
    const byId = Object.fromEntries(currentExercises.map(e => [e.id, e]))
    return currentDay.exercises.map(ex => {
      const displayId = todaySwapsMap[ex.exerciseId] || ex.exerciseId
      return {
        ...ex,
        exerciseId: displayId,
        originalExerciseId: ex.exerciseId,
        originalExerciseName: byId[ex.exerciseId]?.name || '',
        ...(byId[displayId] || {}),
        logs: logsForExercise(displayId, currentLogs)
      }
    })
  }

  async function refreshAfterSwap() {
    const [s, exs] = await Promise.all([Storage.getSettings(), Storage.getExercises()])
    todaySwapsMap = (s.todaySwaps && s.todaySwaps.date === todayDate) ? s.todaySwaps.swaps : {}
    exercises = exs
    if (day) todayExercises = buildTodayExercises(day, exercises, allLogs)
    detailExercises = todayExercises
  }

  function openTrainingDetail() {
    if (hasWarmup && !warmupDone) return
    if (todayExercises.length === 0) return
    startSessionTimer()
    detailExercises = todayExercises
    detailIdx = 0
    showDetail = true
  }

  function openExerciseDetailAt(idx: number) {
    if (hasWarmup && !warmupDone) return
    if (todayExercises.length === 0) return
    startSessionTimer()
    detailExercises = todayExercises
    detailIdx = idx
    showDetail = true
  }

  function onStartRest(data: { name: string; restSec: number; tag: string; sets: number; reps: string; exerciseId: string }) {
    return startRestFromExercise(data)
  }

  function logsForExercise(exerciseId: string, source: ExerciseLog[]): ExerciseLog[] {
    return source
      .filter(l => l.exerciseId === exerciseId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  }

  async function refreshExerciseLogs() {
    allLogs = await Storage.getAllLogs()
    if (todayExercises.length > 0) {
      todayExercises = todayExercises.map(ex => ({
        ...ex,
        logs: logsForExercise(ex.exerciseId, allLogs)
      }))
      if (detailExercises.length > 0) detailExercises = todayExercises
    }
  }

  function onDetailClose() {
    showDetail = false
    detailExercises = []
    loadTodayLogs()
  }

  function onDetailLog() {
    loadTodayLogs()
    refreshExerciseLogs()
  }

  function onDetailNavigate(dir: 'prev' | 'next') {
    if (dir === 'next' && detailIdx < detailExercises.length - 1) {
      detailIdx++
    } else if (dir === 'prev' && detailIdx > 0) {
      detailIdx--
    }
  }

  let accent = $derived($settings.accentColor || '#d4ff3a')
  let units = $derived($settings.units || 'kg')

  const now = new Date()
  const jsDay = now.getDay()
  const detectedDayIdx = (jsDay + 6) % 7
  const DAYS_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const dateStr = `${monthNames[now.getMonth()]} ${now.getDate()} · ${now.getFullYear()}`
  const weekDayName = dayNames[jsDay]

  // Port literal del TOAST_SVG_WATCH del legacy (components/ui.js pre-migración)
  const WATCH_SVG = `<svg width="72" height="72" viewBox="0 0 72 72" fill="none"><rect x="14" y="6" width="44" height="60" rx="13" stroke="currentColor" stroke-width="2.5" fill="none"/><rect x="20" y="16" width="32" height="30" rx="6" fill="currentColor" fill-opacity="0.06"/><circle cx="36" cy="30" r="5" fill="currentColor" fill-opacity="0.2"/><path d="M30 28h12v2H30z" fill="currentColor"/><path d="M30 32h8v2H30z" fill="currentColor" fill-opacity="0.5"/><circle cx="36" cy="54" r="3" fill="currentColor" fill-opacity="0.15"/><rect x="28" y="3" width="16" height="4" rx="2" fill="currentColor" fill-opacity="0.12"/></svg>`

  type CenterToastData = {
    imageSrc?: string
    iconSvg?: string
    message: string
    subtext?: string
    timeLabel?: string
    duration: number
  }

  let programs: Program[] = $state([])
  let weekIdx = $state(0)
  let day: ProgramDay | null = $state(null)
  let weekObj: any = $state(null)
  let exercisesById = $derived(Object.fromEntries((exercises || []).map(e => [e.id, e])))
  let isRestDay = $derived(!day || (day as any).name === 'Rest' || (day as any).name === 'Descanso')
  let exercisesTotal = $derived((day as any)?.exercises?.length || 0)
  let hasWarmup = $derived(warmupItems.length > 0)
  let hasStretch = $derived(stretchItems.length > 0)
  let totalSteps = $derived((hasWarmup ? 1 : 0) + exercisesTotal + (hasStretch ? 1 : 0))
  let doneSteps = $derived(0)

  let timerDisplay = $state('')
  let timerSweepPct = $state(0)

  let effortShown = $state(false)
  let streakShown = $state('')

  onMount(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        checkPendingRest()
        _checkRestTimer()
      }
    }
    const onFocusCheck = () => {
      checkPendingRest()
      _checkRestTimer()
    }
    const onSWMessage = (e: MessageEvent) => {
      if (e.data?.type === 'rest-start') {
        checkPendingRest()
        _checkRestTimer()
      }
    }
    // The full-screen rest timer registers sets while it is on top of this
    // page, so it tells us when today's logs changed.
    const onSetLogged = () => onDetailLog()

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocusCheck, { passive: true })
    navigator.serviceWorker?.addEventListener('message', onSWMessage)
    window.addEventListener(SET_LOG_EVENT, onSetLogged)

    const cleanup = () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocusCheck)
      navigator.serviceWorker?.removeEventListener('message', onSWMessage)
      window.removeEventListener(SET_LOG_EVENT, onSetLogged)
    }

    ;(async () => {
      const [exs, progs, logs, s] = await Promise.all([
        Storage.getExercises(),
        Storage.getPrograms(),
        Storage.getAllLogs(),
        Storage.getSettings()
      ])
      exercises = exs
      programs = progs
      allLogs = logs
      program = programs.find(p => p.id === s.activeProgramId) || null
      weekIdx = s.currentWeekIdx || 0
      weekObj = program?.weeks?.[weekIdx]
      const toLocal = (date: Date) => {
        const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        return d.toISOString().slice(0, 10)
      }
      todayDate = toLocal(new Date())
      sessionDate = todayDate
      todaySwapsMap = (s.todaySwaps && s.todaySwaps.date === todayDate) ? s.todaySwaps.swaps : {}

      checkPendingRest()
      _checkRestTimer()

      if (!program && exercises.length === 0) {
        noProgram = true
        loaded = true
        return
      }

      if (!program || !weekObj) {
        loaded = true
        return
      }

      const order = resolveWeekOrder(
        weekObj,
        (s.rescheduleWeekOrder as Record<string, number[]> | undefined)?.[`${program.id}-week-${weekIdx}`]
      )
      const originalDayIdx = order[detectedDayIdx]
      day = weekObj.days?.[originalDayIdx] || null

      if (!day || day.name === 'Rest' || day.name === 'Descanso') {
        isRestDay
        loaded = true
        return
      }

      const exercisesByIdMap = Object.fromEntries(exs.map(e => [e.id, e]))
      const warmupMuscles = day.exercises.map(ex => {
        const displayId = todaySwapsMap[ex.exerciseId] || ex.exerciseId
        const resolved = { ...ex, ...(exercisesByIdMap[displayId] || {}) }
        return resolved.muscle
      }).filter(Boolean)
      warmupItems = resolvePanelItems(warmupMuscles, 'warmup')
      stretchItems = resolvePanelItems(warmupMuscles, 'stretch')

      if (s.sessionState?.date === todayDate) {
        const p = s.sessionState.phase || 1
        const exDone = s.sessionState.todayExDone || 0
        todayExDone = exDone
        if ((s.sessionState as any).startedAt) startedAt = (s.sessionState as any).startedAt
        if ((s.sessionState as any).endedAt) endedAt = (s.sessionState as any).endedAt
        if (p >= 2) warmupDone = true
        if (p >= 3) phase = 'training'
        if (p >= 4) { stretchDone = true; phase = 'stretch' }
        if (exDone >= day.exercises.length && p >= 3) phase = 'stretch'
        if (p >= 4 && hasStretch) stretchDone = true
        if (p >= 5) { phase = 'complete'; showCoach = true }
      }

      if (s.lastCoachAnalysis?.date === todayDate && s.lastCoachAnalysis?.weekIdx === weekIdx) {
        coachCardMode = true
        coachEffort = s.lastCoachAnalysis.effort || 'Justo'
        coachDay = day
        coachResult = s.lastCoachAnalysis
      }

      if (warmupDone || phase !== 'loading') phase = phase === 'loading' ? (warmupDone ? 'training' : 'warmup') : phase

      if (phase === 'loading') phase = hasWarmup ? 'warmup' : 'training'

      todayExercises = buildTodayExercises(day, exs, logs)

      loadTodayLogs()

      loaded = true
    })()

    return cleanup
  })

  async function loadTodayLogs() {
    const logs = await getLogsForDate(todayDate)
    const nextDone: Record<string, true> = {}
    const count = day ? day.exercises.filter(ex => {
      const isDone = logs.some(l => l.exerciseId === ex.exerciseId && l.weight > 0)
      if (isDone) nextDone[ex.exerciseId] = true
      return isDone
    }).length : 0
    doneIds = nextDone
    if (count !== todayExDone) {
      todayExDone = count
      persistPhase()
    }
    for (const log of logs) {
      if (log.weight > 0) {
        weightInputs[log.exerciseId] = log.weight
      }
    }
    if (count >= exercisesTotal && exercisesTotal > 0 && !completionToastShown && !stretchDone && !showDetail) {
      completionToastShown = true
      phase = 'stretch'
      stretchDone = false
      if (!hasStretch) {
        if (!endedAt) endedAt = Date.now()
        phase = 'complete'
        showCoach = true
        showEffortAfterStreak()
      } else {
        centerToast = {
          imageSrc: `${base}/images/pedro.png`,
          message: 'Estira bb',
          subtext: 'Ya no tienes 20 añitos',
          timeLabel: startedAt ? formatElapsed(startedAt, Date.now()) : '',
          duration: 3000,
        }
      }
      persistPhase()
    }
  }

  function startSessionTimer() {
    if (!startedAt) {
      startedAt = Date.now()
      persistPhase()
    }
  }

  function formatElapsed(startMs: number, endMs: number): string {
    const sec = Math.max(0, Math.floor((endMs - startMs) / 1000))
    const mm = Math.floor(sec / 60)
    const ss = sec % 60
    return mm > 0 ? `${mm} min ${ss} seg` : `${ss} seg`
  }

  function persistPhase() {
    if (!program) return
    let p = 1
    if (warmupDone) p = 2
    if (todayExDone >= exercisesTotal && warmupDone) p = 3
    if (stretchDone) p = 4
    if (showCoach) p = 5
    const sessionState = { date: todayDate, phase: p, todayExDone, startedAt, endedAt }
    Storage.saveSettings({ ...$settings, sessionState })
    settings.update({ sessionState } as any)
  }

  function onWarmupComplete() {
    warmupDone = true
    phase = 'training'
    showWarmup = false
    persistPhase()
    if ($settings.hasWatch) {
      centerToast = { iconSvg: WATCH_SVG, message: 'Inicia tu Smart Watch', duration: 2000 }
    }
  }

  function onStretchComplete() {
    stretchDone = true
    phase = 'complete'
    showStretch = false
    showCoach = true
    if (!endedAt) endedAt = Date.now()
    persistPhase()
    showEffortAfterStreak()
  }

  async function onExerciseCheck(ex: ProgramExercise, e: Event) {
    const checked = (e.target as HTMLInputElement).checked
    if (!checked) return
    const weight = weightInputs[ex.exerciseId] || 0
    if (weight > 0) {
      await logWeight(ex.exerciseId, weight, units)
    }
    todayExDone++
    persistPhase()
    if (todayExDone >= exercisesTotal) {
      completionToastShown = true
      phase = 'stretch'
      stretchDone = false
      if (!hasStretch) {
        phase = 'complete'
        showCoach = true
        showEffortAfterStreak()
      }
      persistPhase()
    }
  }

  async function showEffortAfterStreak() {
    const s = await Storage.getSettings()
    if (s.streakShownDate !== todayDate) {
      const streak = await computeStreak(todayDate)
      streakCount = Math.max(1, streak)
      streakModalShow = true
    } else {
      showEffortSelector()
    }
    // Session just completed: record today's gym time (startedAt → endedAt) into
    // the weekly accumulator, then push fresh streak + weekly gym time to friends.
    if (startedAt && endedAt) {
      const seconds = Math.max(0, Math.round((endedAt - startedAt) / 1000))
      await recordGymSession(todayDate, seconds)
    }
    if (PUSH_SERVER_URL && s.username) {
      const all = allLogs.length > 0 ? allLogs : await Storage.getAllLogs()
      const streak = await computeStreak(todayDate)
      const exercisedToday = all.some(l => l.date === todayDate && l.weight > 0)
      const weekStart = mondayOf(todayDate)
      const gymTime = await getWeeklyGymSeconds(weekStart)
      syncUserToWorker(s.username, streak, exercisedToday, gymTime).catch(() => {})
    }
  }

  function onStreakDone() {
    streakModalShow = false
    Storage.saveSettings({ ...$settings, streakShownDate: todayDate } as Settings).then(() => {
      settings.update({ streakShownDate: todayDate } as any)
    })
    showEffortSelector()
  }

  function showEffortSelector() {
    effortModalShow = true
  }

  async function onEffort(effort: string) {
    effortModalShow = false
    coachEffort = effort
    effortValue = effort
    coachLoading = true
    coachCardMode = true
    coachError = false
    coachResult = null
    coachDay = day
    try {
      const result = await runCoachAnalysis(day!, effort, exercises, todayDate, weekIdx, trainingDaysPerWeek(program, weekIdx))
      coachLoading = false
      if (!result) {
        coachError = true
        return
      }
      coachResult = result
      const s = await Storage.getSettings()
      s.lastCoachAnalysis = {
        ...result,
        date: todayDate,
        effort: coachEffort,
        weekIdx,
        sessionDurationSec: startedAt ? Math.round(((endedAt ?? Date.now()) - startedAt) / 1000) : undefined,
      }
      await Storage.saveCoachAnalysis(s.lastCoachAnalysis)
      settings.update({ lastCoachAnalysis: s.lastCoachAnalysis } as any)
      coachResult = s.lastCoachAnalysis
    } catch {
      coachLoading = false
      coachError = true
    }
  }

  function retryCoachAnalysis() {
    if (effortValue) onEffort(effortValue)
  }

  function resetDay() {
    coachCardMode = false
    coachLoading = false
    coachResult = null
    coachError = false
    coachDay = null
    coachEffort = null
    effortValue = null
    phase = 'warmup'
    warmupDone = false
    stretchDone = false
    todayExDone = 0
    doneIds = {}
    showCoach = false
    showWarmup = false
    showStretch = false
    startedAt = null
    endedAt = null
    completionToastShown = false
    centerToast = null
    weightInputs = {}
    const s = { ...$settings }
    delete s.lastCoachAnalysis
    s.sessionState = null
    Storage.saveSettings(s)
    settings.update({ lastCoachAnalysis: null, sessionState: null } as any)
  }

  async function computeStreak(todayDateStr: string) {
    const all = allLogs.length > 0 ? allLogs : await Storage.getAllLogs()
    return computeStreakWeeks(all, trainingDaysPerWeek(program, weekIdx), todayDateStr)
  }

  let timerInterval: ReturnType<typeof setInterval> | null = null

  $effect(() => {
    if ((doneSteps > 0 || todayExDone > 0) && !startedAt) startedAt = Date.now()
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
    if (startedAt && !endedAt) {
      timerInterval = setInterval(() => {
        const totalSec = Math.floor((Date.now() - startedAt!) / 1000)
        const hh = Math.floor(totalSec / 3600)
        const mm = Math.floor((totalSec % 3600) / 60)
        const ss = totalSec % 60
        const pad = (n: number) => String(n).padStart(2, '0')
        timerDisplay = hh > 0 ? `${hh}:${pad(mm)}` : `${pad(mm)}:${pad(ss)}`
        timerSweepPct = (totalSec % 3600) / 3600
      }, 1000)
    }
    return () => { if (timerInterval) clearInterval(timerInterval) }
  })

  $effect(() => {
    if (streakModalShow) {
      const t = setTimeout(() => { onStreakDone() }, 2600)
      return () => clearTimeout(t)
    }
  })

  let doneStepsVal = $derived((warmupDone ? 1 : 0) + (phase === 'stretch' || phase === 'complete' || stretchDone ? exercisesTotal : todayExDone) + (stretchDone || showCoach ? 1 : 0))
</script>

<div class="page">
  {#if !loaded}
    <EmptyState message="Cargando..." />
  {:else if noProgram}
    <OnboardingView {accent} />
  {:else if isRestDay}
    <RestDayView {weekObj} {weekIdx} />
  {:else}
    {#if (phase === 'warmup' || phase === 'training' || phase === 'stretch') && day && !showWarmup && !showStretch && !showCoach && !coachCardMode}
      <PhaseHeader
        {accent}
        dayName={day?.name || ''}
        daySubtitle={day?.subtitle || ''}
        weekName={weekObj?.name || ''}
        weekTag={weekObj?.tag || ''}
        showLiveDot={warmupDone}
        showTimer={warmupDone && !!startedAt && !endedAt}
        {timerDisplay}
        {timerSweepPct}
      />

      <div class="phase-list">
        {#if hasWarmup}
          <PhaseCard
            phaseLabel="Fase 01"
            title="Calentamiento"
            subtitle="Activación dinámica"
            count={warmupItems.length}
            status={warmupDone ? 'completed' : 'active'}
            {accent}
            dataPhase="warmup"
            onclick={() => { startSessionTimer(); showWarmup = true }}
          />
        {/if}

        {#if todayExercises.length > 0}
          {#if warmupDone && todayExDone < exercisesTotal}
            <TrainingCard
              {day}
              {accent}
              {todayExDone}
              {exercisesTotal}
              {exercisesById}
              {doneIds}
              onclick={openTrainingDetail}
              onExerciseClick={openExerciseDetailAt}
            />
          {:else if warmupDone && todayExDone >= exercisesTotal}
            <PhaseCard
              phaseLabel="Fase 02"
              title="Entrenamiento"
              subtitle={day?.subtitle || `${exercisesTotal} ejercicios`}
              count={exercisesTotal}
              countLabel="ejercicios"
              status="completed"
              {accent}
              progress={{ done: todayExDone, total: exercisesTotal }}
              dataPhase="training"
              onclick={openTrainingDetail}
            />
          {:else}
            <PhaseCard
              phaseLabel="Fase 02"
              title="Entrenamiento"
              subtitle={day?.subtitle || `${exercisesTotal} ejercicios`}
              count={exercisesTotal}
              countLabel="ejercicios"
              status="locked"
              {accent}
              disabled
              progress={{ done: todayExDone, total: exercisesTotal }}
              dataPhase="training"
              onclick={openTrainingDetail}
            />
          {/if}
        {/if}

        {#if hasStretch}
          {#if stretchDone}
            <PhaseCard
              phaseLabel="Fase 03"
              title="Estiramiento"
              subtitle="Enfriamiento estático"
              count={stretchItems.length}
              status="completed"
              accent="#c89bff"
              phaseColor="#c89bff"
              dataPhase="stretch"
              onclick={() => showStretch = true}
            />
          {:else if !warmupDone}
            <LockedCard
              id="today-locked-warmup-stretch"
              title="Termina el calentamiento primero"
              subtitle="Tus estiramientos aparecerán cuando completes todos los ejercicios."
            />
          {:else if todayExDone < exercisesTotal}
            <LockedCard
              title="Termina el entrenamiento primero"
              subtitle="Completa los {exercisesTotal - todayExDone} ejercicio(s) restante(s) para ver tus estiramientos."
            />
          {:else}
            <PhaseCard
              phaseLabel="Fase 03"
              title="Estiramiento"
              subtitle="Enfriamiento estático"
              count={stretchItems.length}
              status="active"
              accent="#c89bff"
              phaseColor="#c89bff"
              dataPhase="stretch"
              onclick={() => showStretch = true}
            />
          {/if}
        {/if}
      </div>
    {/if}

    {#if showCoach || coachCardMode}
      <div class="coach-complete">
        <CoachResultCard analysis={coachResult} {accent} loading={coachLoading} error={coachError} {units} onclick={resetDay} onretry={retryCoachAnalysis} />
        <Button variant="ghost" fullWidth onclick={resetDay}>
          <Icon name="restart" size={14} color="rgba(255,255,255,0.6)" />
          Reiniciar día
        </Button>
      </div>
    {/if}
  {/if}

  <div class="footer-bar">
    <div class="version-text">{APP_VERSION}</div>
    <Button variant="ghost" onclick={() => location.reload()}>↻</Button>
  </div>
</div>

{#if showWarmup && warmupItems.length > 0}
  <Warmup items={warmupItems} mode="warmup" {accent} onComplete={onWarmupComplete} />
{/if}

{#if showStretch && stretchItems.length > 0}
  <Warmup items={stretchItems} mode="stretch" {accent} onComplete={onStretchComplete} />
{/if}

{#if showDetail && detailExercises.length > 0}
  <ExerciseDetail exercise={detailExercises[detailIdx]} open={showDetail} {accent} {units} hasPrev={detailIdx > 0} hasNext={detailIdx < detailExercises.length - 1} isToday={true} onNavigate={onDetailNavigate} onClose={onDetailClose} onLog={onDetailLog} onStartRest={onStartRest} onSwap={refreshAfterSwap} onRevert={refreshAfterSwap} />
{/if}

<CenterDialog id="effort-overlay" open={effortModalShow} onclose={() => effortModalShow = false}>
  <EffortSelector {accent} onselect={onEffort} />
</CenterDialog>

{#if streakModalShow}
  <StreakOverlay count={streakCount} {accent} />
{/if}

{#if centerToast}
  <CenterToast
    imageSrc={centerToast.imageSrc}
    iconSvg={centerToast.iconSvg}
    message={centerToast.message}
    subtext={centerToast.subtext}
    timeLabel={centerToast.timeLabel}
    duration={centerToast.duration}
    {accent}
    onclose={() => centerToast = null}
  />
{/if}

<style>
  .page { padding: 56px 16px 104px; display: flex; flex-direction: column; }
  .phase-list { flex: 1; min-height: 0; margin-top: 16px; display: flex; flex-direction: column; gap: 11px; }
  .coach-complete { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: 16px; }
  .footer-bar { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; }
  .version-text { font-size: 10px; color: rgba(255,255,255,0.3); font-family: var(--font-mono); }
</style>
