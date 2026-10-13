


import type { ThemeDefinition } from './types'
import { THEMES } from './themes'



type Listener = () => void
const listeners = new Set<Listener>()

function emitChange(): void {
  listeners.forEach((fn) => fn())
}



const registry = new Map<string, ThemeDefinition>()


function init(): void {
  for (const theme of THEMES) {
    registry.set(theme.id, theme)
  }
}


init()




export function registerTheme(theme: ThemeDefinition): void {
  registry.set(theme.id, theme)
  emitChange()
}


export function unregisterTheme(id: string): boolean {
  
  if (THEMES.some((t) => t.id === id)) return false
  const deleted = registry.delete(id)
  if (deleted) emitChange()
  return deleted
}


export function getTheme(id: string): ThemeDefinition {
  return registry.get(id) ?? registry.get('moss-paper') ?? THEMES[0]
}


export function getAllThemes(): ThemeDefinition[] {
  return Array.from(registry.values())
}


export function hasTheme(id: string): boolean {
  return registry.has(id)
}


export function getThemeCount(): number {
  return registry.size
}


export function onRegistryChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}


export function resetRegistry(): void {
  registry.clear()
  init()
  emitChange()
}