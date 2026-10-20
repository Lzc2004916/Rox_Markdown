


import type { ThemeDefinition, GradientConfig } from './types'
import { BODY_TEXT_WEIGHT } from './types'



export interface CardDesignTokens {
  
  bgColor: string
  
  bodyColor: string
  
  bodyFontWeight: number
  
  bodyFontSize: number
  
  bodyLineHeight: number
  
  gradientEnabled: boolean
  
  gradientColor1: string
  
  gradientColor2: string
  
  gradientAngle: number
}




const DEFAULT_GRADIENT_ANGLE = 135


export function extractTokens(
  theme: ThemeDefinition,
  gradientOverride?: GradientConfig,
): CardDesignTokens {
  const grad = gradientOverride ?? theme.gradient

  return {
    bgColor: theme.palette.page,
    bodyColor: theme.palette.text,
    bodyFontWeight: BODY_TEXT_WEIGHT,
    bodyFontSize: theme.editor.bodySize,
    bodyLineHeight: theme.editor.lineHeight,
    gradientEnabled: grad?.enabled ?? false,
    gradientColor1: grad?.color1 ?? theme.palette.pageAlt,
    gradientColor2: grad?.color2 ?? theme.palette.page,
    gradientAngle: grad?.angle ?? DEFAULT_GRADIENT_ANGLE,
  }
}




export const TOKEN_CSS_VAR_MAP: Record<keyof CardDesignTokens, string> = {
  bgColor: '--card-bg-color',
  bodyColor: '--card-body-color',
  bodyFontWeight: '--card-body-font-weight',
  bodyFontSize: '--card-body-font-size',
  bodyLineHeight: '--card-body-line-height',
  gradientEnabled: '--card-gradient-enabled',
  gradientColor1: '--card-gradient-color1',
  gradientColor2: '--card-gradient-color2',
  gradientAngle: '--card-gradient-angle',
}


export function applyTokensToElement(
  el: HTMLElement,
  tokens: CardDesignTokens,
): void {
  for (const [key, varName] of Object.entries(TOKEN_CSS_VAR_MAP)) {
    const value = tokens[key as keyof CardDesignTokens]
    const strValue =
      typeof value === 'boolean' ? (value ? '1' : '0') : String(value)
    el.style.setProperty(varName, strValue)
  }
}




export function tokensToJSON(tokens: CardDesignTokens): string {
  return JSON.stringify(tokens)
}


export function tokensFromJSON(json: string): CardDesignTokens | null {
  try {
    const parsed = JSON.parse(json)
    
    const required: (keyof CardDesignTokens)[] = [
      'bgColor', 'bodyColor', 'bodyFontWeight', 'bodyFontSize',
      'bodyLineHeight',
    ]
    for (const key of required) {
      if (!(key in parsed)) return null
    }
    return parsed as CardDesignTokens
  } catch {
    return null
  }
}
