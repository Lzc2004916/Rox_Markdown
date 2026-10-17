

export interface SaveImageResult {
  success: boolean
  
  path?: string
}

export interface OpenMarkdownResult {

  path: string

  content: string
}

export interface SelectImageResult {
  /** 桌面端为绝对路径；移动端/web 兜底为 data URL */
  path: string
  /** 文件名（去扩展名），用作 alt 文本 */
  name: string
}

export interface ElectronAPI {

  selectImage: () => Promise<SelectImageResult | null>


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
