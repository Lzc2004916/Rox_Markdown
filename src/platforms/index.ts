

import { detectPlatform } from './detection'

export async function initPlatform(): Promise<void> {
  const platform = detectPlatform()

  if (platform === 'ios' || platform === 'android') {
    
    const { createMobileAPI } = await import('./mobile')
    ;(window as unknown as Record<string, unknown>).electronAPI = createMobileAPI()
  }
  
  
}
