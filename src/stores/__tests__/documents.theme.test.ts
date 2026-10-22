import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDocumentsStore } from '@/stores/documents'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('document card themes', () => {
  it('keeps each document theme independent after switching tabs', () => {
    const store = useDocumentsStore()
    store.init()
    const firstId = store.activeId

    store.updateTheme(firstId, 'peach-cloud')
    const secondId = store.addDocument()

    expect(store.activeDocument?.cardTheme).toBe('peach-cloud')

    store.updateTheme(secondId, 'moss-paper')
    store.setActive(firstId)
    expect(store.activeDocument?.cardTheme).toBe('peach-cloud')

    store.setActive(secondId)
    expect(store.activeDocument?.cardTheme).toBe('moss-paper')
  })

  it('uses the active document theme for newly created documents', () => {
    const store = useDocumentsStore()
    store.init()
    store.updateTheme(store.activeId, 'peach-cloud')

    const newId = store.addDocument()

    expect(store.documents.find((document) => document.id === newId)?.cardTheme).toBe('peach-cloud')
  })
})
