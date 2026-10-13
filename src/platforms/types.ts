

export interface SaveImageResult {
  success: boolean
  
  path?: string
}

export interface OpenMarkdownResult {
  
  path: string
  
  content: string
}

export interface ElectronAPI {
  
  saveImage: (dataUrl: string, defaultName: string) => Promise<SaveImageResult>

  
  saveImagesToFolder: (
    images: { dataUrl: string; filename: string }[],
  ) => Promise<{ success: boolean; folder?: string; count?: number }>

  
  openMarkdown: () => Promise<OpenMarkdownResult | null>

  
  saveMarkdown: (content: string, defaultName: string) => Promise<boolean>

  
  onMenuAction: (channel: string, callback: (...args: unknown[]) => void) => () => void

  
  onFileOpened: (callback: (payload: { path: string; content: string }) => void) => () => void

  

  minimizeWindow: () => Promise<void>
  toggleMaximize: () => Promise<void>
  getWindowState: () => Promise<{ isMaximized: boolean }>
  confirmClose: () => Promise<void>

  onWindowStateChanged: (callback: (state: { isMaximized: boolean }) => void) => () => void
  onCloseRequest: (callback: () => void) => () => void

  

  onSearchOpen: (callback: () => void) => () => void
}
