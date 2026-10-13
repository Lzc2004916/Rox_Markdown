

import type { ElectronAPI } from './platforms/types'

declare global {
  interface Window {
    electronAPI: ElectronAPI
    
    Capacitor?: {
      isNativePlatform: () => boolean
      getPlatform: () => string
    }
  }
}

