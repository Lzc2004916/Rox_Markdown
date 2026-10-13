import { defineStore } from 'pinia'
import { ref, computed } from 'vue'



export interface Document {
  id: string
  title: string
  content: string
  savedAt: string
  
  tags: string[]
}



interface Frontmatter {
  title?: string
  description?: string
  date?: string
  tags?: string[]
  image?: string
}


function parseFrontmatter(content: string): Frontmatter | null {
  const trimmed = content.trimStart()
  if (!trimmed.startsWith('---')) return null

  const secondDelim = trimmed.indexOf('\n---', 3)
  if (secondDelim === -1) return null

  const fmBlock = trimmed.slice(3, secondDelim)
  const result: Frontmatter = {}

  for (const line of fmBlock.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue

    const key = line.slice(0, colonIdx).trim()
    let value = line.slice(colonIdx + 1).trim()

    
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    
    const arrayKeys = new Set<string>(['tags'])
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1)
      const items = inner
        .split(',')
        .map((s) => s.trim().replace(/['"]/g, ''))
        .filter(Boolean)
      if (arrayKeys.has(key)) (result as Record<string, unknown>)[key] = items
      continue
    }

    switch (key) {
      case 'title':
        result.title = value
        break
      case 'description':
        result.description = value
        break
      case 'date':
        result.date = value
        break
      case 'tags': {
        const items = value
          .split(',')
          .map((s) => s.trim().replace(/['"]/g, ''))
          .filter(Boolean)
        result.tags = items
        break
      }
      case 'image':
        result.image = value
        break
    }
  }

  return result
}


export function extractTitle(content: string): string {
  const fm = parseFrontmatter(content)
  if (fm?.title) return fm.title

  
  const headingMatch = content.match(/^#\s+(.+)$/m)
  if (headingMatch) return headingMatch[1].trim()

  return '' 
}


export function extractTags(content: string): string[] {
  const fm = parseFrontmatter(content)
  return fm?.tags ?? []
}



function uid(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

function defaultDoc(): Document {
  return {
    id: uid(),
    title: '',
    content: '',
    savedAt: new Date().toISOString(),
    tags: [],
  }
}



const WELCOME_CONTENT = `# Welcome to Markdown Card

## Getting Started

This is a **Markdown editor** with live card preview.

### Features

- Real-time preview
- Syntax highlighting

### Code Example

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

### Blockquote

> The best way to predict the future is to create it.

### Table

| Feature | Status |
|---------|--------|
| Markdown | ✅ |
| Diagrams | ✅ |

Enjoy writing! 😊
`



export const useDocumentsStore = defineStore('documents', () => {
  

  const documents = ref<Document[]>([])
  const activeId = ref<string>('')

  

  const MAX_HISTORY = 100

  
  const undoStacks = ref<Map<string, string[]>>(new Map())

  
  const redoStacks = ref<Map<string, string[]>>(new Map())

  
  const lastPushTime = new Map<string, number>()

  
  const COALESCE_WINDOW_MS = 500

  

  const activeDocument = computed<Document | null>(() => {
    return documents.value.find((d) => d.id === activeId.value) ?? null
  })

  const documentCount = computed(() => documents.value.length)

  

  
  function init(): void {
    if (documents.value.length > 0) return
    const doc = defaultDoc()
    doc.content = WELCOME_CONTENT
    doc.title = extractTitle(WELCOME_CONTENT)
    doc.tags = extractTags(WELCOME_CONTENT)
    documents.value.push(doc)
    activeId.value = doc.id
  }

  
  function addDocument(content: string = ''): string {
    const doc = defaultDoc()
    doc.content = content
    doc.title = extractTitle(content)
    doc.tags = extractTags(content)
    documents.value.push(doc)
    activeId.value = doc.id
    return doc.id
  }

  
  function removeDocument(id: string): void {
    
    clearHistory(id)

    if (documents.value.length <= 1) {
      
      const doc = defaultDoc()
      documents.value = [doc]
      activeId.value = doc.id
      return
    }

    const idx = documents.value.findIndex((d) => d.id === id)
    if (idx === -1) return

    documents.value.splice(idx, 1)

    
    if (activeId.value === id) {
      const newIdx = Math.min(idx, documents.value.length - 1)
      activeId.value = documents.value[newIdx].id
    }
  }

  
  function setActive(id: string): void {
    if (documents.value.some((d) => d.id === id)) {
      activeId.value = id
    }
  }

  

  
  function pushUndo(id: string, content: string): void {
    let stack = undoStacks.value.get(id)
    if (!stack) {
      stack = []
      undoStacks.value.set(id, stack)
    }

    
    const now = Date.now()
    const last = lastPushTime.get(id) ?? 0
    if (now - last < COALESCE_WINDOW_MS && stack.length > 0) {
      stack[stack.length - 1] = content
    } else {
      if (stack.length >= MAX_HISTORY) stack.shift() 
      stack.push(content)
    }
    lastPushTime.set(id, now)

    
    redoStacks.value.delete(id)
  }

  
  function undo(id: string): string | null {
    const doc = documents.value.find((d) => d.id === id)
    if (!doc) return null

    const stack = undoStacks.value.get(id)
    if (!stack || stack.length === 0) return null

    
    let redoStack = redoStacks.value.get(id)
    if (!redoStack) {
      redoStack = []
      redoStacks.value.set(id, redoStack)
    }
    redoStack.push(doc.content)

    
    const previous = stack.pop()!
    if (stack.length === 0) undoStacks.value.delete(id)

    return previous
  }

  
  function redo(id: string): string | null {
    const doc = documents.value.find((d) => d.id === id)
    if (!doc) return null

    const stack = redoStacks.value.get(id)
    if (!stack || stack.length === 0) return null

    
    let undoStack = undoStacks.value.get(id)
    if (!undoStack) {
      undoStack = []
      undoStacks.value.set(id, undoStack)
    }
    undoStack.push(doc.content)

    
    const next = stack.pop()!
    if (stack.length === 0) redoStacks.value.delete(id)

    return next
  }

  
  function canUndo(id: string): boolean {
    const stack = undoStacks.value.get(id)
    return (stack?.length ?? 0) > 0
  }

  
  function canRedo(id: string): boolean {
    const stack = redoStacks.value.get(id)
    return (stack?.length ?? 0) > 0
  }

  
  function clearHistory(id: string): void {
    undoStacks.value.delete(id)
    redoStacks.value.delete(id)
    lastPushTime.delete(id)
  }

  

  
  const extractTimers = new Map<string, ReturnType<typeof setTimeout>>()

  
  const EXTRACT_DEBOUNCE_MS = 500

  
  function updateContent(id: string, content: string): void {
    const doc = documents.value.find((d) => d.id === id)
    if (!doc) return

    
    doc.content = content
    doc.savedAt = new Date().toISOString()

    
    const existing = extractTimers.get(id)
    if (existing) clearTimeout(existing)

    extractTimers.set(id, setTimeout(() => {
      
      const d = documents.value.find((d) => d.id === id)
      if (!d) return

      
      const fm = parseFrontmatter(content)
      d.title = fm?.title ?? ''
      
      if (!d.title) {
        const headingMatch = content.match(/^#\s+(.+)$/m)
        d.title = headingMatch ? headingMatch[1].trim() : ''
      }
      d.tags = fm?.tags ?? []

      extractTimers.delete(id)
    }, EXTRACT_DEBOUNCE_MS))
  }

  

  return {
    documents,
    activeId,
    activeDocument,
    documentCount,
    init,
    addDocument,
    removeDocument,
    setActive,
    updateContent,
    pushUndo,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  }
})