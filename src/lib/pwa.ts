const _VER_BASE = 'v2.66'
const _VER_DESC = 'Registro de peso y reps por serie en el timer de descanso'
const _VER_TIME = '2026-09-09 18:31'
export const APP_VERSION = `${_VER_BASE} · ${_VER_TIME} · ${_VER_DESC}`

let deferredPrompt: any = null
let installed = false

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installed = true
  })
}

export function getPlatform(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (ios) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'other'
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
}

export function canInstall(): boolean {
  if (installed || isStandalone()) return false
  const platform = getPlatform()
  if (platform === 'android') return true
  if (platform === 'ios') return true
  return false
}

export function useNativePrompt(): boolean {
  return getPlatform() === 'android' && !!deferredPrompt
}

export async function installPWA() {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  if (outcome === 'accepted') installed = true
}
