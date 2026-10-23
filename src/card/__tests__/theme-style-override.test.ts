

import { describe, it, expect, beforeEach } from 'vitest'
import {
  resolveHeadingScale,
  resolveHeadingColor,
  HEADING_SIZE_RATIOS,
} from '../types'
import type { ThemeDefinition } from '../types'

class MockCSSStyle {
  private vars = new Map<string, string>()

  setProperty(name: string, value: string): void {
    this.vars.set(name, value)
  }

  removeProperty(name: string): void {
    this.vars.delete(name)
  }

  getPropertyValue(name: string): string {
    return this.vars.get(name) ?? ''
  }

  getAllVars(): Map<string, string> {
    return new Map(this.vars)
  }
}

describe('CSS variable atomic reset on theme switch', () => {
  let mockStyle: MockCSSStyle

  beforeEach(() => {
    mockStyle = new MockCSSStyle()
  })

  
  function simulateThemeSwitch(_from: ThemeDefinition, to: ThemeDefinition): void {
    
    const headingBaseVars: string[] = []
    for (let level = 1; level <= 6; level++) {
      headingBaseVars.push(
        `--card-heading-scale-h${level}`,
        `--card-heading-line-height-h${level}`,
        `--card-heading-margin-top-h${level}`,
        `--card-heading-margin-bottom-h${level}`,
        `--card-heading-font-weight-h${level}`,
        `--card-heading-color-h${level}`,
      )
    }
    const coverVars = ['--card-cover-h1-scale', '--card-cover-h1-line-height',
      '--card-cover-h1-centered', '--card-cover-h1-top-offset']
    const allHeadingVars = [...headingBaseVars, ...coverVars]

    for (const v of allHeadingVars) {
      mockStyle.removeProperty(v)
    }

    
    for (let level = 1; level <= 6; level++) {
      const scale = resolveHeadingScale(level, to)
      const lineH = 1.5 
      mockStyle.setProperty(`--card-heading-scale-h${level}`, String(scale))
      mockStyle.setProperty(`--card-heading-line-height-h${level}`, String(lineH))

      const color = resolveHeadingColor(level, to)
      if (color) {
        mockStyle.setProperty(`--card-heading-color-h${level}`, color)
      } else {
        mockStyle.removeProperty(`--card-heading-color-h${level}`)
      }
    }

    
    const coverCfg = to.coverHeading
    mockStyle.setProperty('--card-cover-h1-scale', String(coverCfg?.h1Scale ?? 4.0))
    mockStyle.setProperty('--card-cover-h1-centered', coverCfg?.centered ? '1' : '0')
  }

  it('removes heading color variables when new theme has no heading colors', () => {
    const themeA: ThemeDefinition = {
      id: 'theme-a', name: 'A', mood: '', preset: '', description: '', tags: [],
      mode: 'paper',
      palette: { page: '#fff', pageAlt: '#f0f0f0', text: '#000', muted: '#888',
        accent: '#f00', accentSoft: 'rgba(255,0,0,0.1)', border: 'rgba(0,0,0,0.1)',
        shadow: 'rgba(0,0,0,0.1)', glow: 'rgba(255,0,0,0.05)' },
      surface: { grainAlpha: 0, vignetteAlpha: 0, washStrength: 0, innerFrameAlpha: 0,
        innerFrameInset: 24, titleAccentMix: 0.5, footerLineAlpha: 0.2, footerTextAlpha: 0.9,
        previewShadow: 'none' },
      components: { quoteFillAlpha: 0, quoteStrokeAlpha: 0, quoteBarAlpha: 0, quoteRadius: 0,
        quoteTreatment: 'paper' },
      editor: {
        bodySize: 30, lineHeight: 1.8,
        heading: { h1Color: '#ff0000', h2Color: '#00ff00' },
      },
    }

    const themeB: ThemeDefinition = {
      ...themeA,
      id: 'theme-b', name: 'B',
      editor: { bodySize: 30, lineHeight: 1.8 },
    }

    
    simulateThemeSwitch(themeA, themeB)

    
    expect(mockStyle.getPropertyValue('--card-heading-color-h1')).toBe('')
    expect(mockStyle.getPropertyValue('--card-heading-color-h2')).toBe('')
    
    expect(mockStyle.getPropertyValue('--card-heading-scale-h1')).toBe(String(HEADING_SIZE_RATIOS[1]))
  })

  it('preserves heading color when switching between themes both with colors', () => {
    const themeA: ThemeDefinition = {
      id: 'theme-a', name: 'A', mood: '', preset: '', description: '', tags: [],
      mode: 'paper',
      palette: { page: '#fff', pageAlt: '#f0f0f0', text: '#000', muted: '#888',
        accent: '#f00', accentSoft: 'rgba(255,0,0,0.1)', border: 'rgba(0,0,0,0.1)',
        shadow: 'rgba(0,0,0,0.1)', glow: 'rgba(255,0,0,0.05)' },
      surface: { grainAlpha: 0, vignetteAlpha: 0, washStrength: 0, innerFrameAlpha: 0,
        innerFrameInset: 24, titleAccentMix: 0.5, footerLineAlpha: 0.2, footerTextAlpha: 0.9,
        previewShadow: 'none' },
      components: { quoteFillAlpha: 0, quoteStrokeAlpha: 0, quoteBarAlpha: 0, quoteRadius: 0,
        quoteTreatment: 'paper' },
      editor: {
        bodySize: 30, lineHeight: 1.8,
        heading: { h1Color: '#ff0000' },
      },
    }

    const themeB: ThemeDefinition = {
      ...themeA,
      id: 'theme-b', name: 'B',
      editor: {
        bodySize: 30, lineHeight: 1.8,
        heading: { h1Color: '#0000ff' },
      },
    }

    
    simulateThemeSwitch(themeA, themeB)

    
    expect(mockStyle.getPropertyValue('--card-heading-color-h1')).toBe('#0000ff')
  })

  it('cover heading variables are properly reset and set on theme switch', () => {
    const themeA: ThemeDefinition = {
      id: 'theme-a', name: 'A', mood: '', preset: '', description: '', tags: [],
      mode: 'brutal',
      palette: { page: '#fff', pageAlt: '#fff', text: '#000', muted: '#444',
        accent: '#000', accentSoft: 'rgba(0,0,0,0.1)', border: 'rgba(0,0,0,0.9)',
        shadow: 'rgba(0,0,0,0)', glow: 'rgba(0,0,0,0)' },
      surface: { grainAlpha: 0, vignetteAlpha: 0, washStrength: 0, innerFrameAlpha: 0.9,
        innerFrameInset: 12, titleAccentMix: 0, footerLineAlpha: 0.9, footerTextAlpha: 1,
        previewShadow: 'none' },
      components: { quoteFillAlpha: 0, quoteStrokeAlpha: 0.9, quoteBarAlpha: 1, quoteRadius: 0,
        quoteTreatment: 'code' },
      editor: { bodySize: 28, lineHeight: 1.65 },
      coverHeading: { h1Scale: 5.5, h1LineHeight: 1.05, centered: true },
    }

    const themeB: ThemeDefinition = {
      ...themeA,
      id: 'theme-b', name: 'B',
      coverHeading: undefined,
    }

    
    simulateThemeSwitch(themeA, themeB)

    
    expect(mockStyle.getPropertyValue('--card-cover-h1-scale')).toBe('4')
    expect(mockStyle.getPropertyValue('--card-cover-h1-centered')).toBe('0')
  })

  it('heading scale changes atomically — no residual from previous theme', () => {
    const themeA: ThemeDefinition = {
      id: 'theme-a', name: 'A', mood: '', preset: '', description: '', tags: [],
      mode: 'paper',
      palette: { page: '#fff', pageAlt: '#f0f0f0', text: '#000', muted: '#888',
        accent: '#f00', accentSoft: 'rgba(255,0,0,0.1)', border: 'rgba(0,0,0,0.1)',
        shadow: 'rgba(0,0,0,0.1)', glow: 'rgba(255,0,0,0.05)' },
      surface: { grainAlpha: 0, vignetteAlpha: 0, washStrength: 0, innerFrameAlpha: 0,
        innerFrameInset: 24, titleAccentMix: 0.5, footerLineAlpha: 0.2, footerTextAlpha: 0.9,
        previewShadow: 'none' },
      components: { quoteFillAlpha: 0, quoteStrokeAlpha: 0, quoteBarAlpha: 0, quoteRadius: 0,
        quoteTreatment: 'paper' },
      editor: {
        bodySize: 30, lineHeight: 1.8,
        heading: { h1Scale: 4.5, h2Scale: 2.0 },
      },
    }

    const themeB: ThemeDefinition = {
      ...themeA,
      id: 'theme-b', name: 'B',
      editor: { bodySize: 24, lineHeight: 1.6 },
    }

    
    simulateThemeSwitch(themeA, themeB)

    
    for (let level = 1; level <= 6; level++) {
      const expectedScale = HEADING_SIZE_RATIOS[level] ?? 1
      expect(mockStyle.getPropertyValue(`--card-heading-scale-h${level}`))
        .toBe(String(expectedScale))
    }
  })
})

