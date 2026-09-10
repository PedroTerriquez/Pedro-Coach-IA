<script lang="ts">
  import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'

  let {
    visible = false,
    endTime = 0,
    restSec = 0,
    name = '',
    sets = 0,
    reps = '',
    accent = 'var(--accent)',
    onskip = undefined,
    onexpand = undefined
  }: {
    visible: boolean
    endTime: number
    restSec: number
    name: string
    sets: number
    reps: string
    accent: string
    onskip?: () => void
    onexpand?: () => void
  } = $props()

  let remainingMs = $state(0)
  let tickId: ReturnType<typeof setInterval> | null = null

  let displayName = $derived(getExerciseDisplayName({ name }) || name)
  let meta = $derived(sets && reps ? `${sets} × ${reps}` : '')
  let isEnding = $derived(remainingMs <= 10000)

  function fmtClock(ms: number) {
    const total = Math.max(0, Math.ceil(ms / 1000))
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
  }

  function ringOffset(ms: number) {
    const dur = restSec * 1000
    const pct = dur > 0 ? Math.max(0, Math.min(1, ms / dur)) : 0
    return 100 * (1 - pct)
  }

  $effect(() => {
    if (tickId) { clearInterval(tickId); tickId = null }
    if (!visible || endTime <= 0) return
    remainingMs = Math.max(0, endTime - Date.now())
    tickId = setInterval(() => {
      remainingMs = Math.max(0, endTime - Date.now())
    }, 1000)
    return () => { if (tickId) clearInterval(tickId) }
  })
</script>

{#if visible && remainingMs > 0}
  <div class="rtb" class:is-ending={isEnding} data-component="RestTimerBanner" style="--accent:{accent}">
    <button class="rtb-open" type="button" aria-label="Abrir descanso a pantalla completa" onclick={onexpand}>
    <div class="rtb-ring-wrap">
      <svg class="rtb-ring" viewBox="0 0 56 56" aria-hidden="true">
        <circle class="rtb-ring-track" cx="28" cy="28" r="24"></circle>
        <circle class="rtb-ring-prog" cx="28" cy="28" r="24" pathLength="100"
          style="stroke-dashoffset:{ringOffset(remainingMs)}"></circle>
      </svg>
      <span class="rtb-time">{fmtClock(remainingMs)}</span>
    </div>
    <div class="rtb-info">
      <span class="rtb-label">Descanso</span>
      <span class="rtb-name">{displayName}</span>
      {#if meta}<span class="rtb-meta">{meta}</span>{/if}
    </div>
    </button>
    <button class="rtb-skip" type="button" aria-label="Saltar descanso" onclick={onskip}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 3.2l8 5.8-8 5.8V3.2z" fill="currentColor"/><rect x="12.5" y="3" width="2" height="12" rx="1" fill="currentColor"/></svg>
    </button>
  </div>
{/if}

<style>
  .rtb {
    --rt-color: var(--accent);
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 60px);
    left: 12px;
    right: 12px;
    margin: 0 auto;
    max-width: 460px;
    z-index: 9998;
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 22px 20px 22px 22px;
    border-radius: var(--radius-2xl);
    background:
      radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--rt-color) 9%, transparent), transparent 55%),
      linear-gradient(180deg, rgba(32,32,34,0.86), rgba(16,16,18,0.9));
    -webkit-backdrop-filter: blur(22px) saturate(1.3);
    backdrop-filter: blur(22px) saturate(1.3);
    border: 0.5px solid color-mix(in srgb, var(--rt-color) 24%, rgba(255,255,255,0.07));
    box-shadow:
      0 12px 44px rgba(0,0,0,0.55),
      inset 0 0.5px 0 rgba(255,255,255,0.06),
      0 0 30px -10px color-mix(in srgb, var(--rt-color) 55%, transparent);
    font-family: var(--font-sans);
    cursor: default;
    animation: rtb-in 0.55s var(--ease-smooth);
    will-change: transform, opacity;
  }
  .rtb-open {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 18px;
    background: none;
    border: 0;
    padding: 0;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }
  .rtb-open:active { transform: scale(0.99); }
  .rtb-ring-wrap {
    position: relative;
    width: 104px;
    height: 104px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
  }
  .rtb-ring {
    width: 104px;
    height: 104px;
    transform: rotate(-90deg);
    overflow: visible;
  }
  .rtb-ring-track {
    fill: none;
    stroke: rgba(255,255,255,0.09);
    stroke-width: 4;
  }
  .rtb-ring-prog {
    fill: none;
    stroke: var(--rt-color);
    stroke-width: 4;
    stroke-linecap: round;
    stroke-dasharray: 100;
    transition: stroke-dashoffset 1s linear, stroke 0.45s ease;
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--rt-color) 65%, transparent));
  }
  .rtb-time {
    position: absolute;
    font-family: var(--font-mono);
    font-size: 26px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
  }
  .rtb-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }
  .rtb-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: var(--rt-color);
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .rtb-label::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--rt-color);
    box-shadow: 0 0 10px var(--rt-color);
    animation: rtb-blink 1.4s ease-in-out infinite;
  }
  .rtb-name {
    font-size: 21px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.3px;
    line-height: 1.15;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rtb-meta {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-muted);
    letter-spacing: 0.3px;
  }
  .rtb-skip {
    flex-shrink: 0;
    width: 60px;
    height: 60px;
    border-radius: var(--radius-full);
    border: 0.5px solid var(--border-medium);
    background: rgba(255,255,255,0.05);
    color: var(--text-secondary);
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, transform 0.12s var(--ease-smooth);
  }
  .rtb-skip svg {
    width: 24px;
    height: 24px;
  }
  .rtb-skip:active {
    transform: scale(0.9);
    background: rgba(255,255,255,0.1);
    color: var(--text);
  }
  .is-ending {
    --rt-color: #ff5b4d;
    animation: rtb-in 0.55s var(--ease-smooth), rtb-pulse 1s ease-in-out infinite 0.55s;
  }
  .is-ending .rtb-time {
    animation: rtb-blip 1s ease-in-out infinite;
  }
  @keyframes rtb-in {
    from { opacity: 0; transform: translateY(-16px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes rtb-pulse {
    0%, 100% { box-shadow: 0 12px 44px rgba(0,0,0,0.55), inset 0 0.5px 0 rgba(255,255,255,0.06), 0 0 30px -10px color-mix(in srgb, var(--rt-color) 55%, transparent); }
    50%      { box-shadow: 0 12px 44px rgba(0,0,0,0.55), inset 0 0.5px 0 rgba(255,255,255,0.06), 0 0 40px -4px color-mix(in srgb, var(--rt-color) 85%, transparent); }
  }
  @keyframes rtb-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
  @keyframes rtb-blip {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @media (prefers-reduced-motion: reduce) {
    .rtb, .is-ending, .rtb-label::before, .is-ending .rtb-time {
      animation: none;
    }
  }
</style>
