


import type { ThemeDefinition, ThemeMode } from './types'
import { BODY_FONT_MODES } from './types'



export interface ValidationResult {
  valid: boolean
  errors: string[]
  theme?: ThemeDefinition
}



const VALID_MODES: Set<string> = new Set([
  'paper', 'sage', 'vintage', 'obsidian', 'archive', 'swiss',
  'cyber', 'glass', 'brutal', 'luxe', 'frost',
])

const VALID_HIGHLIGHT_STYLES: Set<string> = new Set([
  'underline', 'border', 'highlight',
])

const VALID_BODY_FONT_MODES: Set<string> = new Set(Object.keys(BODY_FONT_MODES))

const VALID_SUBHEADING_STYLES: Set<string> = new Set([
  'large', 'accent',
])



const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/
const RGBA_COLOR_RE = /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*\)$/

function isColor(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return HEX_COLOR_RE.test(value) || RGBA_COLOR_RE.test(value)
}

function isAlpha(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && Number.isFinite(value)
}


function isNonNegativeBounded(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max
}



export interface ThemeConfigJSON {
  id: string
  name: string
  mood?: string
  preset?: string
  description?: string
  tags?: string[]
  mode: string
  palette: Record<string, string>
  surface: Record<string, number | string>
  components: Record<string, number | string>
  editor: Record<string, number | string>
  category?: string
  decor?: {
    kind: string
    opacity: number
    color?: string
    scale?: number
  }
}



function addError(errors: string[], path: string, msg: string): void {
  errors.push(`${path}: ${msg}`)
}

function validatePalette(
  palette: unknown,
  errors: string[],
): palette is Record<string, string> {
  if (!palette || typeof palette !== 'object') {
    addError(errors, 'palette', 'must be an object')
    return false
  }
  const p = palette as Record<string, unknown>
  const required = ['page', 'pageAlt', 'text', 'muted', 'accent', 'accentSoft', 'border', 'shadow', 'glow']
  let ok = true
  for (const key of required) {
    if (!(key in p)) {
      addError(errors, `palette.${key}`, 'is required')
      ok = false
    } else if (!isColor(p[key])) {
      addError(errors, `palette.${key}`, `invalid color: ${String(p[key])}`)
      ok = false
    }
  }
  return ok
}

function validateSurface(
  surface: unknown,
  errors: string[],
): surface is Record<string, number | string> {
  if (!surface || typeof surface !== 'object') {
    addError(errors, 'surface', 'must be an object')
    return false
  }
  const s = surface as Record<string, unknown>
  const alphaKeys = [
    'grainAlpha', 'vignetteAlpha', 'washStrength', 'innerFrameAlpha',
    'titleAccentMix', 'footerLineAlpha', 'footerTextAlpha',
  ]
  let ok = true
  for (const key of alphaKeys) {
    if (!(key in s)) {
      addError(errors, `surface.${key}`, 'is required')
      ok = false
    } else if (!isAlpha(s[key])) {
      addError(errors, `surface.${key}`, `must be a number 0-1, got ${String(s[key])}`)
      ok = false
    }
  }
  
  if (!('innerFrameInset' in s)) {
    addError(errors, 'surface.innerFrameInset', 'is required')
    ok = false
  } else if (!isNonNegativeBounded(s.innerFrameInset, 200)) {
    addError(errors, 'surface.innerFrameInset', `must be a number 0-200, got ${String(s.innerFrameInset)}`)
    ok = false
  }
  if (!('previewShadow' in s) || typeof s.previewShadow !== 'string') {
    addError(errors, 'surface.previewShadow', 'must be a string')
    ok = false
  }
  return ok
}

function validateComponents(
  components: unknown,
  errors: string[],
): components is Record<string, number | string> {
  if (!components || typeof components !== 'object') {
    addError(errors, 'components', 'must be an object')
    return false
  }
  const c = components as Record<string, unknown>
  const alphaKeys = [
    'quoteFillAlpha', 'quoteStrokeAlpha', 'quoteBarAlpha',
    'highlightUnderlineAlpha', 'highlightMarkerAlpha', 'highlightDashAlpha',
  ]
  let ok = true
  for (const key of alphaKeys) {
    if (!(key in c)) {
      addError(errors, `components.${key}`, 'is required')
      ok = false
    } else if (!isAlpha(c[key])) {
      addError(errors, `components.${key}`, `must be a number 0-1, got ${String(c[key])}`)
      ok = false
    }
  }
  
  if (!('quoteRadius' in c)) {
    addError(errors, 'components.quoteRadius', 'is required')
    ok = false
  } else if (!isNonNegativeBounded(c.quoteRadius, 100)) {
    addError(errors, 'components.quoteRadius', `must be a number 0-100, got ${String(c.quoteRadius)}`)
    ok = false
  }
  const stringKeys = ['quoteTreatment', 'highlightTreatment']
  for (const key of stringKeys) {
    if (key in c && typeof c[key] !== 'string') {
      addError(errors, `components.${key}`, 'must be a string')
      ok = false
    }
  }
  return ok
}

function validateEditor(
  editor: unknown,
  errors: string[],
): editor is Record<string, number | string> {
  if (!editor || typeof editor !== 'object') {
    addError(errors, 'editor', 'must be an object')
    return false
  }
  const e = editor as Record<string, unknown>
  const numericKeys = ['bodySize', 'lineHeight']
  let ok = true
  for (const key of numericKeys) {
    if (!(key in e)) {
      addError(errors, `editor.${key}`, 'is required')
      ok = false
    } else if (!isPositiveNumber(e[key])) {
      addError(errors, `editor.${key}`, `must be a positive number, got ${String(e[key])}`)
      ok = false
    }
  }
  return ok
}




export function validateThemeConfig(raw: unknown): ValidationResult {
  const errors: string[] = []

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Root must be a JSON object'] }
  }

  const obj = raw as Record<string, unknown>

  
  const requiredStrings: [string, string][] = [
    ['id', 'id'], ['name', 'name'], ['mode', 'mode'],
  ]
  for (const [key, label] of requiredStrings) {
    if (typeof obj[key] !== 'string' || !obj[key]) {
      addError(errors, label, 'is required and must be a non-empty string')
    }
  }

  
  if (typeof obj.mode === 'string' && !VALID_MODES.has(obj.mode)) {
    addError(errors, 'mode', `unknown mode "${obj.mode}". Valid: ${[...VALID_MODES].join(', ')}`)
  }

  
  validatePalette(obj.palette, errors)

  
  validateSurface(obj.surface, errors)

  
  validateComponents(obj.components, errors)

  
  validateEditor(obj.editor, errors)

  
  if ('editor' in obj && typeof obj.editor === 'object' && obj.editor) {
    const ed = obj.editor as Record<string, unknown>
    if ('bodyFontMode' in ed && typeof ed.bodyFontMode === 'string' &&
        !VALID_BODY_FONT_MODES.has(ed.bodyFontMode)) {
      addError(errors, 'editor.bodyFontMode',
        `unknown body font mode "${ed.bodyFontMode}". Valid: ${[...VALID_BODY_FONT_MODES].join(', ')}`)
    }
    if ('subheadingStyle' in ed && typeof ed.subheadingStyle === 'string' &&
        !VALID_SUBHEADING_STYLES.has(ed.subheadingStyle)) {
      addError(errors, 'editor.subheadingStyle',
        `unknown subheading style "${ed.subheadingStyle}". Valid: ${[...VALID_SUBHEADING_STYLES].join(', ')}`)
    }
    if ('highlightStyle' in ed && typeof ed.highlightStyle === 'string' &&
        !VALID_HIGHLIGHT_STYLES.has(ed.highlightStyle)) {
      addError(errors, 'editor.highlightStyle',
        `unknown highlight style "${ed.highlightStyle}". Valid: ${[...VALID_HIGHLIGHT_STYLES].join(', ')}`)
    }
  }

  if ('decor' in obj && obj.decor && typeof obj.decor === 'object') {
    const decor = obj.decor as Record<string, unknown>
    if ('opacity' in decor && !isAlpha(decor.opacity)) {
      addError(errors, 'decor.opacity', `must be a number 0-1, got ${String(decor.opacity)}`)
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  
  const theme: ThemeDefinition = {
    id: obj.id as string,
    name: obj.name as string,
    mood: (obj.mood as string) ?? (obj.name as string),
    preset: (obj.preset as string) ?? (obj.name as string),
    description: (obj.description as string) ?? '',
    tags: Array.isArray(obj.tags) ? obj.tags as string[] : [],
    mode: obj.mode as ThemeMode,
    palette: obj.palette as ThemeDefinition['palette'],
    surface: obj.surface as ThemeDefinition['surface'],
    components: obj.components as ThemeDefinition['components'],
    editor: {
      bodySize: (obj.editor as Record<string, unknown>).bodySize as number,
      lineHeight: (obj.editor as Record<string, unknown>).lineHeight as number,
      bodyFontMode: ((obj.editor as Record<string, unknown>).bodyFontMode as ThemeDefinition['editor']['bodyFontMode']) ?? 'wenkai',
      subheadingStyle: ((obj.editor as Record<string, unknown>).subheadingStyle as ThemeDefinition['editor']['subheadingStyle']) ?? 'large',
      highlightStyle: ((obj.editor as Record<string, unknown>).highlightStyle as ThemeDefinition['editor']['highlightStyle']) ?? 'underline',
    },
    category: obj.category as ThemeDefinition['category'],
    decor: obj.decor as ThemeDefinition['decor'],
  }

  return { valid: true, errors: [], theme }
}


export function loadThemeFromJSON(jsonString: string): ValidationResult {
  try {
    const parsed = JSON.parse(jsonString)
    return validateThemeConfig(parsed)
  } catch (e) {
    return { valid: false, errors: [`JSON parse error: ${(e as Error).message}`] }
  }
}


export function themeToJSON(theme: ThemeDefinition): string {
  return JSON.stringify(theme, null, 2)
}


export function loadThemesFromJSON(
  jsonString: string,
): { themes: ThemeDefinition[]; errors: { index: number; errors: string[] }[] } {
  const themes: ThemeDefinition[] = []
  const allErrors: { index: number; errors: string[] }[] = []

  try {
    const parsed = JSON.parse(jsonString)
    const items = Array.isArray(parsed) ? parsed : [parsed]

    for (let i = 0; i < items.length; i++) {
      const result = validateThemeConfig(items[i])
      if (result.valid && result.theme) {
        themes.push(result.theme)
      } else {
        allErrors.push({ index: i, errors: result.errors })
      }
    }
  } catch (e) {
    allErrors.push({ index: -1, errors: [`JSON parse error: ${(e as Error).message}`] })
  }

  return { themes, errors: allErrors }
}