

export type Platform = 'electron' | 'ios' | 'android' | 'web'

export function detectPlatform(): Platform {
  const win = window as unknown as Record<string, unknown>

  
  if (win.Capacitor && typeof win.Capacitor === 'object') {
    const cap = win.Capacitor as { isNativePlatform?: () => boolean; getPlatform?: () => string }
    if (cap.isNativePlatform?.()) {
      const p = cap.getPlatform?.()
      if (p === 'ios' || p === 'android') return p
    }
  }

  
  if (win.electronAPI) {
    return 'electron'
  }

  return 'web'
}

export function isDesktop(): boolean {
  return detectPlatform() === 'electron'
}

export function isMobile(): boolean {
  const p = detectPlatform()
  return p === 'ios' || p === 'android'
}

export const platform = detectPlatform()
