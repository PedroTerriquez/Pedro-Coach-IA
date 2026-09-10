<script lang="ts">
  import '$lib/../app.css'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import TabBar from '$lib/components/TabBar.svelte'
  import Toast from '$lib/components/Toast.svelte'
  import RestTimerBanner from '$lib/components/RestTimerBanner.svelte'
  import RestTimerFullscreen from '$lib/components/RestTimerFullscreen.svelte'
  import OnboardingBanner from '$lib/components/OnboardingBanner.svelte'
  import { restBannerState, cancelRestTimer, adjustRestTimer, restartRestTimer } from '$lib/rest-timer'
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { ROUTES } from '$lib/routes'

  let { children } = $props()

  onMount(() => {
    settings.load()
  })

  $effect(() => {
    const s = $settings
    if (s.accentColor) {
      document.documentElement.style.setProperty('--accent', s.accentColor)
    }
    document.querySelector<HTMLElement>('.app-shell')?.style.setProperty('--ui-zoom', String(s.fontScale || 1))
  })

  let toastState = $derived($toast)
  let accent = $derived($settings.accentColor || '#d4ff3a')
  let currentPath = $derived($page.url.pathname)
  let onboarded = $derived($settings.onboarded ?? false)
  let onboardingStep = $derived($settings.onboardingStep ?? 0)

  let dismissed = $state(false)

  $effect(() => {
    currentPath
    dismissed = false
  })

  function advanceOnboarding() {
    const next = onboardingStep + 1
    if (next >= 4) {
      settings.update({ onboarded: true, onboardingStep: -1 })
    } else {
      settings.update({ onboardingStep: next })
    }
  }

  function skipOnboarding() {
    dismissed = true
  }

  function getBannerStep(): number {
    if (onboarded || dismissed) return -1
    if (onboardingStep === 0 || onboardingStep === 1) return currentPath === ROUTES.you ? onboardingStep : -1
    if (onboardingStep === 2 || onboardingStep === 3) return currentPath === ROUTES.today ? onboardingStep : -1
    return -1
  }

  let bannerStep = $derived(getBannerStep())

  // The rest timer opens full screen; "minimizar" collapses it to the floating
  // banner. Every new rest (new tag) opens full screen again.
  let restMinimized = $state(false)
  let restTag = $derived($restBannerState.tag)

  $effect(() => {
    restTag
    restMinimized = false
  })
</script>

<svelte:head>
  <title>Coach Pedro AI</title>
</svelte:head>

<div class="app-shell">
  {@render children()}
</div>

<TabBar />

<RestTimerFullscreen
  visible={$restBannerState.visible && !restMinimized}
  timer={$restBannerState}
  {accent}
  onskip={() => cancelRestTimer($restBannerState.tag)}
  onminimize={() => restMinimized = true}
  onadjust={(delta) => adjustRestTimer(delta)}
  onrestart={() => restartRestTimer()}
/>

<RestTimerBanner
  visible={$restBannerState.visible && restMinimized}
  endTime={$restBannerState.endTime}
  restSec={$restBannerState.restSec}
  name={$restBannerState.name}
  sets={$restBannerState.sets}
  reps={$restBannerState.reps}
  {accent}
  onskip={() => cancelRestTimer($restBannerState.tag)}
  onexpand={() => restMinimized = false}
/>

{#if bannerStep >= 0}
  <OnboardingBanner
    step={bannerStep}
    {accent}
    onNext={advanceOnboarding}
    onSkip={skipOnboarding}
  />
{/if}

<Toast visible={toastState.visible} message={toastState.message} isError={toastState.isError} />

<style>
  .app-shell {
    padding-bottom: 96px;
    min-height: 100dvh;
    zoom: var(--ui-zoom, 1);
  }
</style>
