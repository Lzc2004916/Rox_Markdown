

import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { ElectronAPI, SaveImageResult, SelectImageResult } from './types'

function noopUnsubscribe(): () => void {
  return () => {}
}

function base64FromDataUrl(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/\w+;base64,/, '')
}

export function createMobileAPI(): ElectronAPI {
  return {

    // 移动端不支持插入本地图片（桌面端独占功能）
    selectImage: async (): Promise<SelectImageResult | null> => null,



    saveImage: async (dataUrl: string, defaultName: string): Promise<SaveImageResult> => {
      try {
        const base64 = base64FromDataUrl(dataUrl)
        const result = await Filesystem.writeFile({
          path: defaultName,
          data: base64,
          directory: Directory.Cache,
          recursive: true,
        })

        
        await Share.share({
          title: '保存图片',
          files: [result.uri],
        })

        return { success: true, path: result.uri }
      } catch (error) {
        
        if (error instanceof Error && error.message.includes('canceled')) {
          return { success: false }
        }
        console.error('Failed to save image:', error)
        return { success: false }
      }
    },

    saveImagesToFolder: async (
      images: { dataUrl: string; filename: string }[],
    ): Promise<{ success: boolean; folder?: string; count?: number }> => {
      try {
        
        const uris: string[] = []
        for (const img of images) {
          const base64 = base64FromDataUrl(img.dataUrl)
          const result = await Filesystem.writeFile({
            path: img.filename,
            data: base64,
            directory: Directory.Cache,
            recursive: true,
          })
          uris.push(result.uri)
        }

        
        if (uris.length > 0) {
          await Share.share({
            title: `保存 ${images.length} 张图片`,
            files: [uris[0]!],
          })
        }

        return { success: true, count: images.length }
      } catch (error) {
        if (error instanceof Error && error.message.includes('canceled')) {
          return { success: false }
        }
        console.error('Failed to batch save images:', error)
        return { success: false }
      }
    },

    

    openMarkdown: async () => {
      return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.md,.markdown,text/markdown'
        input.style.display = 'none'

        const cleanup = (): void => {
          input.remove()
          
          if (timeoutId) clearTimeout(timeoutId)
        }

        
        const timeoutId = setTimeout(() => {
          cleanup()
          resolve(null)
        }, 120_000)

        input.onchange = async () => {
          const file = input.files?.[0]
          if (!file) {
            cleanup()
            resolve(null)
            return
          }

          try {
            const content = await file.text()
            cleanup()
            resolve({ path: file.name, content })
          } catch {
            cleanup()
            resolve(null)
          }
        }

        
        input.oncancel = () => {
          cleanup()
          resolve(null)
        }

        
        document.body.appendChild(input)
        setTimeout(() => input.click(), 0)
      })
    },

    saveMarkdown: async (
      content: string,
      defaultName: string,
    ): Promise<boolean> => {
      try {
        const result = await Filesystem.writeFile({
          path: defaultName,
          data: content,
          directory: Directory.Documents,
          recursive: true,
        })

        await Share.share({
          title: '保存 Markdown',
          text: content,
          files: [result.uri],
        })

        return true
      } catch (error) {
        if (error instanceof Error && error.message.includes('canceled')) {
          return false
        }
        console.error('Failed to save markdown:', error)
        return false
      }
    },

    

    onMenuAction: (_channel: string, _callback: (...args: unknown[]) => void) => {
      return noopUnsubscribe()
    },

    onFileOpened: (_callback: (payload: { path: string; content: string }) => void) => {
      return noopUnsubscribe()
    },

    

    minimizeWindow: async () => {},
    toggleMaximize: async () => {},
    getWindowState: async () => ({ isMaximized: false }),
    confirmClose: async () => {},

    onWindowStateChanged: (
      _callback: (state: { isMaximized: boolean }) => void,
    ) => {
      return noopUnsubscribe()
    },

    onCloseRequest: (_callback: () => void) => {
      return noopUnsubscribe()
    },

    

    onSearchOpen: (_callback: () => void) => {
      
      return noopUnsubscribe()
    },
  }
}
