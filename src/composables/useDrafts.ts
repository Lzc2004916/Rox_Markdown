import { watch } from 'vue'
import { useDocumentsStore, type Document } from '@/stores/documents'

const STORAGE_KEY = 'md2card:drafts'




export interface AppSettings {
  cardTheme: string
  bodyFontMode: string
  bodyFontSize: number
  highlightStyle: string
  
  highlightColor?: string | null
  footerEnabled: boolean
  split: number
  rightSplit: number
  previewScale: number
  
  bodyFontWeight: number
  gradientConfig?: { enabled: boolean; color1: string; color2: string; angle: number }
  
  bodyTextColor?: string | null
}

interface DraftPayload {
  documents: Document[]
  settings: AppSettings | null
}



export const DEFAULT_SETTINGS: AppSettings = {
  cardTheme: 'moss-paper',
  bodyFontMode: 'wenkai',
  bodyFontSize: 30,
  highlightStyle: 'underline',
  footerEnabled: true,
  split: 50,
  rightSplit: 22,
  previewScale: 1.0,
  bodyFontWeight: 400,
  gradientConfig: { enabled: false, color1: '#6c5ce7', color2: '#a29bfe', angle: 135 },
}




function persist(docs: Document[], settings: AppSettings | null): void {
  try {
    const payload: DraftPayload = { documents: docs, settings }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    
  }
}


function readPayload(): DraftPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.documents) || parsed.documents.length === 0) return null
    return parsed as DraftPayload
  } catch {
    return null
  }
}


function clearDrafts(): void {
  localStorage.removeItem(STORAGE_KEY)
}


function isValidDocument(d: unknown): d is Document {
  if (!d || typeof d !== 'object') return false
  const doc = d as Record<string, unknown>
  return (
    typeof doc.id === 'string' && doc.id.length > 0 &&
    typeof doc.content === 'string' &&
    typeof doc.title === 'string' &&
    typeof doc.savedAt === 'string' &&
    Array.isArray(doc.tags)
  )
}




let promptedThisSession = false



export function useDrafts(): {
  
  hasDrafts: () => boolean
  
  restore: () => AppSettings
  
  discard: () => void
  
  dismissPrompt: () => void
  
  saveSettings: (settings: AppSettings) => void
} {
  const store = useDocumentsStore()

  
  


  let timer: ReturnType<typeof setTimeout> | null = null
  let latestSettings: AppSettings | null = null

  function schedulePersist(): void {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      persist(store.documents, latestSettings)
    }, 1000) 
  }

  
  watch(
    () => [store.documents.length, store.activeId] as const,
    () => schedulePersist(),
  )

  
  watch(
    () => store.activeDocument?.content,
    () => schedulePersist(),
  )

  

  window.addEventListener('beforeunload', () => {
    if (store.documents.length > 0) persist(store.documents, latestSettings)
  })

  

  function hasDrafts(): boolean {
    return !promptedThisSession && readPayload() !== null
  }

  function saveSettings(settings: AppSettings): void {
    latestSettings = { ...settings }
    schedulePersist()
  }

  function restore(): AppSettings {
    const payload = readPayload()
    if (!payload) return { ...DEFAULT_SETTINGS }

    
    const seen = new Set<string>()
    const valid = (payload.documents ?? []).filter((d) => {
      if (!isValidDocument(d)) return false
      if (seen.has(d.id)) return false
      seen.add(d.id)
      return true
    })

    if (valid.length === 0) {
      
      clearDrafts()
      store.init()
      return { ...DEFAULT_SETTINGS }
    }

    store.documents = valid
    
    store.activeId = valid[0].id

    
    return payload.settings
      ? { ...DEFAULT_SETTINGS, ...payload.settings }
      : { ...DEFAULT_SETTINGS }
  }

  function discard(): void {
    clearDrafts()
  }

  function dismissPrompt(): void {
    promptedThisSession = true
  }

  return { hasDrafts, restore, discard, dismissPrompt, saveSettings }
}