


import type {
  HighlightStyle,
  HighlightTreatment,
  ParagraphBlock,
  PosterMetrics,
  QuoteBoxMetrics,
  RenderOptions,
  ThemeDefinition,
  CardCornerMode,
  TypographySettings,
  ColumnContainerBlock,
  Block,
  ListBlock,
  ListStyleConfig,
  HeadingStyleOverrides,
  InlineLine,
} from './types'
import {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  CONTENT_LEFT,
  CONTENT_RIGHT,
  CONTENT_WIDTH,
  CANVAS_SCALE,
  FOOTER_LINE_LEFT,
  FOOTER_LINE_RIGHT,
  FOOTER_LINE_Y,
  FOOTER_TEXT_Y,
  BODY_TEXT_WEIGHT,
  BODY_BOLD_WEIGHT,
  QUOTE_TEXT_WEIGHT,
  SUBHEADING_TEXT_WEIGHT,
  BODY_FONT_FAMILY,
  FOOTER_FONT_FAMILY,
  COLUMN_GAP,
  DEFAULT_LIST_STYLE,
  resolveHeadingSize,
  resolveHeadingLineHeight,
  resolveHeadingColor,
  resolveHeadingFontWeight,
  resolveHeadingStroke,
  resolveHeadingStrokeWidth,
  resolveHeadingShadow,
} from './types'
import {
  getPosterMetrics,
  getGapBetweenBlocks,
  measureParagraphBlock,
  measureListBlock,
  getBodyTokenWidth,
  parseInlineMarkdown,
  wrapInlineTokensByWidth,
  getParagraphVisualHeight,
  getQuoteBoxMetrics,
  getParagraphMaxLines,
} from './measure'
import { drawCodeBlock, measureCodeBlock } from './code-renderer'
import { drawTableBlock, measureTableBlock } from './table-renderer'
import { hexToRgba, hexToRgb, gradientAngleToPoints } from './color-utils'
import { drawDecor } from './decor-renderer'



function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}



interface NoiseCacheEntry {
  canvas: HTMLCanvasElement
  density: number
  darkMode: boolean
  grainAlpha: number
  textColor: string
}

const _noiseCache = new Map<string, NoiseCacheEntry>()


function getOrCreateNoiseTexture(
  theme: ThemeDefinition,
): HTMLCanvasElement | null {
  if (isBrutalTheme(theme) || isGlassTheme(theme)) return null
  if (theme.surface.grainAlpha <= 0) return null

  const dark = isDarkTheme(theme)
  const density = isDigitalEditorTheme(theme)
    ? 760
    : dark
      ? (theme.mode === 'cyber' ? 900 : 2200)
      : theme.mode === 'vintage'
        ? 1700
        : theme.mode === 'paper'
          ? 1900
          : theme.mode === 'luxe' || theme.mode === 'frost'
            ? 800
            : 1500

  const cacheKey = `${theme.id}|${density}|${dark}|${theme.surface.grainAlpha}|${theme.palette.text}|${theme.mode}`

  const cached = _noiseCache.get(cacheKey)
  if (cached && cached.density === density && cached.darkMode === dark &&
      cached.grainAlpha === theme.surface.grainAlpha && cached.textColor === theme.palette.text) {
    return cached.canvas
  }

  
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_WIDTH
  canvas.height = PAGE_HEIGHT
  const nctx = canvas.getContext('2d')
  if (!nctx) return null

  const [r, g, b] = hexToRgb(theme.palette.text)
  const rand = mulberry32(42) 

  
  for (let i = 0; i < density; i++) {
    const x = rand() * PAGE_WIDTH
    const y = rand() * PAGE_HEIGHT
    const size = rand() > 0.92 ? 1.4 : 0.8
    const alpha = theme.surface.grainAlpha * (rand() > 0.9 ? 1.4 : 0.8)
    nctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
    nctx.fillRect(x, y, size, size)
  }

  
  if (!isDigitalEditorTheme(theme) && !dark && theme.mode !== 'swiss') {
    const fiberCount = theme.mode === 'paper' ? 72 : 48
    nctx.lineWidth = 0.7
    nctx.lineCap = 'round'
    for (let i = 0; i < fiberCount; i++) {
      const x = rand() * PAGE_WIDTH
      const y = rand() * PAGE_HEIGHT
      const length = 18 + rand() * 54
      const drift = (rand() - 0.5) * 2.2
      const alpha = theme.surface.grainAlpha * (theme.mode === 'paper' ? 0.52 : 0.36)
      nctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
      nctx.beginPath()
      nctx.moveTo(x, y)
      nctx.lineTo(Math.min(PAGE_WIDTH, x + length), y + drift)
      nctx.stroke()
    }
  }

  _noiseCache.set(cacheKey, { canvas, density, darkMode: dark, grainAlpha: theme.surface.grainAlpha, textColor: theme.palette.text })

  
  if (_noiseCache.size > 12) {
    const firstKey = _noiseCache.keys().next().value
    if (firstKey !== undefined) _noiseCache.delete(firstKey)
  }

  return canvas
}



const _luminanceCache = new Map<string, number>()



function isDarkTheme(theme: ThemeDefinition): boolean {
  
  if (theme.mode === 'obsidian' || theme.mode === 'archive' || theme.mode === 'cyber') return true
  
  return getPageLuminance(theme) < 0.35
}


function getPageLuminance(theme: ThemeDefinition): number {
  const raw = theme.palette.page
  
  const cacheKey = raw
  const cached = _luminanceCache.get(cacheKey)
  if (cached !== undefined) return cached

  
  const rgbaMatch = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  let luminance: number
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]!) / 255
    const g = parseInt(rgbaMatch[2]!) / 255
    const b = parseInt(rgbaMatch[3]!) / 255
    const linearize = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    luminance = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
  } else {
    
    const hex = raw.replace('#', '')
    if (hex.length < 6) luminance = 0.5
    else {
      const r = parseInt(hex.slice(0, 2), 16) / 255
      const g = parseInt(hex.slice(2, 4), 16) / 255
      const b = parseInt(hex.slice(4, 6), 16) / 255
      const linearize = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      luminance = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
    }
  }
  _luminanceCache.set(cacheKey, luminance)
  return luminance
}

function isDigitalEditorTheme(theme: ThemeDefinition): boolean {
  return theme.id === 'warm-editor'
}

function isBrutalTheme(theme: ThemeDefinition): boolean {
  return theme.mode === 'brutal'
}

function isGlassTheme(theme: ThemeDefinition): boolean {
  return theme.mode === 'glass'
}

function isFrostTheme(theme: ThemeDefinition): boolean {
  return theme.mode === 'frost'
}

function isLuxeTheme(theme: ThemeDefinition): boolean {
  return theme.mode === 'luxe'
}



function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function traceCardShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cornerMode: CardCornerMode,
  radius = 36,
): void {
  if (cornerMode === 'rounded') {
    roundRectPath(ctx, x, y, w, h, radius)
  } else {
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.closePath()
  }
}



function drawBackground(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, PAGE_HEIGHT)

  if (theme.mode === 'archive') {
    gradient.addColorStop(0, theme.palette.pageAlt)
    gradient.addColorStop(0.58, theme.palette.page)
    gradient.addColorStop(1, '#101713')
  } else if (theme.mode === 'obsidian') {
    gradient.addColorStop(0, theme.palette.pageAlt)
    gradient.addColorStop(0.55, theme.palette.page)
    gradient.addColorStop(1, '#0e0d0c')
  } else if (theme.mode === 'cyber') {
    gradient.addColorStop(0, '#0f0c1a')
    gradient.addColorStop(0.5, theme.palette.page)
    gradient.addColorStop(1, '#06040d')
  } else if (theme.mode === 'brutal') {
    
    gradient.addColorStop(0, theme.palette.page)
    gradient.addColorStop(1, theme.palette.page)
  } else if (theme.mode === 'luxe') {
    gradient.addColorStop(0, theme.palette.pageAlt)
    gradient.addColorStop(0.6, theme.palette.page)
    gradient.addColorStop(1, '#f0e8d4')
  } else if (theme.mode === 'frost') {
    gradient.addColorStop(0, theme.palette.pageAlt)
    gradient.addColorStop(0.5, theme.palette.page)
    gradient.addColorStop(1, '#e8f0f6')
  } else if (theme.mode === 'glass') {
    
    const glassGrad = ctx.createLinearGradient(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    glassGrad.addColorStop(0, 'rgba(255,255,255,0.6)')
    glassGrad.addColorStop(0.3, '#f5f0ff')
    glassGrad.addColorStop(0.7, '#f8f5ff')
    glassGrad.addColorStop(1, 'rgba(240,235,255,0.7)')
    ctx.fillStyle = glassGrad
    ctx.fill()
    return
  } else if (theme.mode === 'swiss') {
    gradient.addColorStop(0, theme.palette.page)
    gradient.addColorStop(1, theme.palette.page)
  } else {
    gradient.addColorStop(0, theme.palette.pageAlt)
    gradient.addColorStop(1, theme.palette.page)
  }

  ctx.fillStyle = gradient
  ctx.fill()
}




function drawGradientOverlay(
  ctx: CanvasRenderingContext2D,
  color1: string,
  color2: string,
  angle = 135,
): void {
  ctx.save()
  ctx.globalAlpha = 0.28

  const { x0, y0, x1, y1 } = gradientAngleToPoints(angle, PAGE_WIDTH, PAGE_HEIGHT)
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1)
  gradient.addColorStop(0, color1)
  gradient.addColorStop(1, color2)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)

  ctx.restore()
}



function drawDigitalGrid(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  const gridAlpha = 0.042
  const majorAlpha = 0.062
  ctx.save()
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'multiply' as GlobalCompositeOperation
  ctx.lineWidth = 0.7

  for (let x = 54; x <= PAGE_WIDTH - 54; x += 28) {
    ctx.strokeStyle = hexToRgba(
      theme.palette.text,
      x % 112 === 54 ? majorAlpha : gridAlpha,
    )
    ctx.beginPath()
    ctx.moveTo(x, 42)
    ctx.lineTo(x, PAGE_HEIGHT - 42)
    ctx.stroke()
  }

  for (let y = 54; y <= PAGE_HEIGHT - 54; y += 28) {
    ctx.strokeStyle = hexToRgba(
      theme.palette.text,
      y % 112 === 54 ? majorAlpha : gridAlpha,
    )
    ctx.beginPath()
    ctx.moveTo(42, y)
    ctx.lineTo(PAGE_WIDTH - 42, y)
    ctx.stroke()
  }

  
  ctx.strokeStyle = hexToRgba(theme.palette.accent, 0.09)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(CONTENT_LEFT, 92)
  ctx.lineTo(CONTENT_RIGHT, 92)
  ctx.stroke()
  ctx.restore()
}

function paintAtmosphere(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  if (theme.mode === 'swiss') {
    if (theme.surface.vignetteAlpha > 0) {
      const shade = ctx.createLinearGradient(0, 0, PAGE_WIDTH, 0)
      shade.addColorStop(0, hexToRgba(theme.palette.accent, 0.04))
      shade.addColorStop(0.12, 'rgba(255,255,255,0)')
      shade.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = shade
      ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    }
    return
  }

  ctx.save()
  ctx.globalAlpha = theme.surface.washStrength

  
  const topWash = ctx.createRadialGradient(160, 120, 0, 160, 120, 220)
  topWash.addColorStop(
    0,
    isDarkTheme(theme)
      ? hexToRgba(theme.palette.accent, theme.mode === 'archive' ? 0.2 : 0.28)
      : theme.palette.glow,
  )
  topWash.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = topWash
  ctx.beginPath()
  ctx.arc(160, 120, 220, 0, Math.PI * 2)
  ctx.fill()

  
  const sideWash = ctx.createRadialGradient(616, 172, 0, 616, 172, 154)
  sideWash.addColorStop(
    0,
    isDarkTheme(theme)
      ? hexToRgba(theme.palette.accent, theme.mode === 'archive' ? 0.14 : 0.18)
      : theme.palette.glow,
  )
  sideWash.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = sideWash
  ctx.beginPath()
  ctx.arc(616, 172, 154, 0, Math.PI * 2)
  ctx.fill()

  
  const titleWash = ctx.createRadialGradient(278, 258, 18, 278, 258, 310)
  titleWash.addColorStop(
    0,
    isDarkTheme(theme)
      ? hexToRgba(theme.palette.accent, 0.12)
      : hexToRgba(
          theme.palette.accent,
          theme.mode === 'paper' ? 0.09 : 0.065,
        ),
  )
  titleWash.addColorStop(
    0.55,
    isDarkTheme(theme)
      ? hexToRgba(theme.palette.pageAlt, 0.08)
      : hexToRgba(theme.palette.pageAlt, 0.06),
  )
  titleWash.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = titleWash
  ctx.beginPath()
  ctx.ellipse(278, 258, 310, 190, -0.08, 0, Math.PI * 2)
  ctx.fill()

  
  const bottomWash = ctx.createRadialGradient(94, 820, 0, 94, 820, 124)
  bottomWash.addColorStop(0, theme.palette.accentSoft)
  bottomWash.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = bottomWash
  ctx.beginPath()
  ctx.arc(94, 820, 124, 0, Math.PI * 2)
  ctx.fill()

  
  if (theme.mode === 'vintage') {
    const filmSweep = ctx.createLinearGradient(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    filmSweep.addColorStop(0, hexToRgba(theme.palette.accent, 0.08))
    filmSweep.addColorStop(0.4, 'rgba(255,255,255,0)')
    filmSweep.addColorStop(1, hexToRgba(theme.palette.pageAlt, 0.18))
    ctx.fillStyle = filmSweep
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  }

  
  if (isDigitalEditorTheme(theme)) {
    drawDigitalGrid(ctx, theme)
  }

  
  if (theme.mode === 'paper' && !isDigitalEditorTheme(theme)) {
    const bloom = ctx.createLinearGradient(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    bloom.addColorStop(0, hexToRgba(theme.palette.pageAlt, 0.08))
    bloom.addColorStop(0.35, 'rgba(255,255,255,0)')
    bloom.addColorStop(1, hexToRgba(theme.palette.accent, 0.04))
    ctx.fillStyle = bloom
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  }

  
  if (isDarkTheme(theme)) {
    const darkVignette = ctx.createLinearGradient(0, 0, 0, PAGE_HEIGHT)
    darkVignette.addColorStop(
      0,
      theme.mode === 'archive'
        ? 'rgba(255,255,255,0.02)'
        : 'rgba(255,255,255,0.03)',
    )
    darkVignette.addColorStop(
      1,
      theme.mode === 'archive'
        ? 'rgba(0,0,0,0.18)'
        : theme.mode === 'cyber'
          ? 'rgba(0,0,0,0.35)'
          : 'rgba(0,0,0,0.24)',
    )
    ctx.fillStyle = darkVignette
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  }

  
  if (theme.mode === 'cyber') {
    ctx.globalAlpha = 0.04
    for (let y = 0; y < PAGE_HEIGHT; y += 4) {
      ctx.fillStyle = '#00f0ff'
      ctx.fillRect(0, y, PAGE_WIDTH, 2)
    }
    ctx.globalAlpha = theme.surface.washStrength
  }

  
  if (isFrostTheme(theme)) {
    ctx.globalAlpha = 0.06
    ctx.fillStyle = theme.palette.accent
    const cx = PAGE_WIDTH * 0.3
    const cy = PAGE_HEIGHT * 0.25
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const r = 80 + i * 28
      ctx.beginPath()
      ctx.arc(cx + Math.cos(angle) * r * 0.3, cy + Math.sin(angle) * r * 0.3, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = theme.surface.washStrength
  }

  
  if (isLuxeTheme(theme)) {
    ctx.globalAlpha = 0.08
    ctx.fillStyle = theme.palette.accent
    const seed = 42
    for (let i = 0; i < 60; i++) {
      const pseudoX = ((seed * (i + 1) * 17) % PAGE_WIDTH)
      const pseudoY = ((seed * (i + 1) * 31) % PAGE_HEIGHT)
      const size = (i % 3 === 0) ? 2.5 : 1.2
      ctx.beginPath()
      ctx.arc(pseudoX, pseudoY, size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = theme.surface.washStrength
  }

  
  if (isGlassTheme(theme)) {
    const glassOverlay = ctx.createLinearGradient(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    glassOverlay.addColorStop(0, 'rgba(255,255,255,0.25)')
    glassOverlay.addColorStop(0.4, 'rgba(255,255,255,0.05)')
    glassOverlay.addColorStop(0.6, 'rgba(108,92,231,0.04)')
    glassOverlay.addColorStop(1, 'rgba(255,255,255,0.15)')
    ctx.fillStyle = glassOverlay
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  }

  ctx.restore()

  
  const vignette = ctx.createRadialGradient(
    PAGE_WIDTH / 2,
    PAGE_HEIGHT / 2,
    PAGE_WIDTH * 0.18,
    PAGE_WIDTH / 2,
    PAGE_HEIGHT / 2,
    PAGE_WIDTH * 0.76,
  )
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, `rgba(0,0,0,${theme.surface.vignetteAlpha})`)
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
}



function applyNoiseTexture(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
): void {
  
  if (isBrutalTheme(theme) || isGlassTheme(theme)) return
  if (theme.surface.grainAlpha <= 0) return

  const noiseCanvas = getOrCreateNoiseTexture(theme)
  if (!noiseCanvas) return

  ctx.save()
  ctx.globalCompositeOperation = isDarkTheme(theme)
    ? ('screen' as GlobalCompositeOperation)
    : ('multiply' as GlobalCompositeOperation)
  ctx.drawImage(noiseCanvas, 0, 0)
  ctx.restore()
}



function resolveHighlightTreatment(
  theme: ThemeDefinition,
  highlightStyle: HighlightStyle,
): HighlightTreatment {
  if (highlightStyle === theme.editor.highlightStyle)
    return theme.components.highlightTreatment
  if (highlightStyle === 'highlight') return 'boldAccent'
  if (highlightStyle === 'border') return 'swissRule'
  return 'softUnderline'
}

function drawHighlightMark(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
  highlightStyle: HighlightStyle,
  x: number,
  baselineY: number,
  tokenWidth: number,
  fontSize: number,
  highlightColor?: string | null,
): void {
  const treatment = resolveHighlightTreatment(theme, highlightStyle)
  const accent = highlightColor ?? theme.palette.accent

  ctx.save()

  if (treatment === 'boldAccent') {
    
    ctx.restore()
    return
  } else if (treatment === 'swissRule') {
    ctx.strokeStyle = hexToRgba(
      accent,
      Math.max(theme.components.highlightDashAlpha, 0.78),
    )
    ctx.lineWidth = theme.mode === 'swiss' ? 4 : 3.2
    ctx.lineCap = theme.mode === 'swiss' ? 'butt' : 'round'
    if (highlightStyle === 'border' || theme.mode !== 'swiss') {
      ctx.setLineDash([10, 5])
    }
    const ruleY = baselineY + Math.max(3, fontSize * 0.08)
    ctx.beginPath()
    ctx.moveTo(x - 1, ruleY)
    ctx.lineTo(x + tokenWidth + 1, ruleY)
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    
    ctx.fillStyle = hexToRgba(
      accent,
      Math.max(theme.components.highlightUnderlineAlpha, 0.44),
    )
    const underlineTop = baselineY + Math.max(2, fontSize * 0.06)
    const underlineHeight = Math.max(5, fontSize * 0.14)
    roundRectPath(
      ctx,
      x - 2,
      underlineTop,
      tokenWidth + 5,
      underlineHeight,
      Math.min(4, underlineHeight / 2),
    )
    ctx.fill()
  }

  ctx.restore()
}

function drawQuoteBlock(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
  x: number,
  y: number,
  maxWidth: number,
  blockHeight: number,
  metrics: QuoteBoxMetrics,
): void {
  const treatment = theme.components.quoteTreatment
  
  
  
  const quoteBaseColor =
    !isDarkTheme(theme) && treatment !== 'code'
      ? theme.palette.accent
      : theme.palette.text
  const fillAlpha =
    treatment === 'callout'
      ? Math.max(theme.components.quoteFillAlpha, 0.07)
      : Math.max(theme.components.quoteFillAlpha, 0.03)

  
  ctx.save()
  ctx.fillStyle = hexToRgba(quoteBaseColor, fillAlpha)
  roundRectPath(
    ctx,
    x + metrics.boxOffsetX,
    y,
    maxWidth + metrics.boxWidthOffset,
    blockHeight,
    theme.components.quoteRadius,
  )
  ctx.fill()

  
  ctx.strokeStyle = hexToRgba(
    quoteBaseColor,
    theme.components.quoteStrokeAlpha,
  )
  ctx.lineWidth = treatment === 'code' ? 1.2 : 1
  ctx.stroke()
  ctx.restore()

  
  ctx.save()
  ctx.fillStyle = hexToRgba(
    theme.palette.accent,
    theme.components.quoteBarAlpha,
  )
  roundRectPath(
    ctx,
    x + metrics.barOffsetX,
    y + metrics.barTopInset,
    metrics.barWidth,
    Math.max(24, blockHeight - metrics.barBottomInset),
    metrics.barRadius,
  )
  ctx.fill()
  ctx.restore()
}

function drawDividerBlock(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
  x: number,
  y: number,
  maxWidth: number,
  height: number,
): void {
  ctx.save()
  ctx.globalCompositeOperation = isDarkTheme(theme)
    ? ('screen' as GlobalCompositeOperation)
    : ('multiply' as GlobalCompositeOperation)
  ctx.strokeStyle = hexToRgba(
    theme.palette.accent,
    isDarkTheme(theme) ? 0.34 : 0.26,
  )
  ctx.lineWidth = 1
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x + maxWidth * 0.08, y + height * 0.5)
  ctx.lineTo(x + maxWidth * 0.92, y + height * 0.5)
  ctx.stroke()
  ctx.restore()
}

function getDividerBlockHeight(fontSize: number): number {
  return Math.max(18, fontSize * 0.72)
}




function getOrderedListNumber(index: number, start = 1): string {
  return `${start + index}.`
}


function drawListBlock(
  ctx: CanvasRenderingContext2D,
  block: ListBlock,
  x: number,
  y: number,
  fontSize: number,
  bodyLineHeight: number,
  maxWidth: number,
  theme: ThemeDefinition,
  fontFamily?: string,
  bodyFontWeight?: number,
  
  bodyTextColor?: string | null,
): number {
  const listStyle: ListStyleConfig = theme.editor.list ?? DEFAULT_LIST_STYLE
  const resolvedWeight = bodyFontWeight ?? theme.editor.bodyFontWeight ?? BODY_TEXT_WEIGHT
  const isDark = isDarkTheme(theme)

  const bulletSize = Math.round(fontSize * listStyle.bulletSizeRatio)
  const bulletGap = Math.max(4, Math.round(fontSize * 0.22))

  const { itemHeights, totalHeight } = measureListBlock(
    block, fontSize, bodyLineHeight, maxWidth, theme, fontFamily, resolvedWeight,
  )

  let cursorY = y + 12 

  for (let ii = 0; ii < block.items.length; ii++) {
    const item = block.items[ii]!
    const indent = item.indent * listStyle.indentPerLevel
    
    const isOrdered = block.kind === 'orderedList'
    const effectiveMarkerSize = isOrdered
      ? fontSize
      : Math.max(bulletSize, Math.round(fontSize * 0.9))
    const textWidth = Math.max(60, maxWidth - indent - effectiveMarkerSize - bulletGap)
    const itemX = x + indent
    const markerX = itemX
    const textX = itemX + effectiveMarkerSize + bulletGap

    
    const tokens = parseInlineMarkdown(item.text)
    const lines = wrapInlineTokensByWidth(
      tokens, fontSize, textWidth, fontFamily, bodyFontWeight,
    )

    const itemHeight = itemHeights[ii]!

    
    ctx.save()
    ctx.globalCompositeOperation = isDark
      ? ('screen' as GlobalCompositeOperation)
      : ('multiply' as GlobalCompositeOperation)

    
    const ulMarkerSize = Math.max(bulletSize, Math.round(fontSize * 0.9))
    const markerFont = `500 ${ulMarkerSize}px ${fontFamily ?? BODY_FONT_FAMILY}`
    ctx.font = markerFont
    ctx.fillStyle = theme.palette.accent
    ctx.textBaseline = 'alphabetic'

    
    const markerBaselineY = cursorY + fontSize * 0.84

    if (block.kind === 'orderedList') {
      const numText = getOrderedListNumber(ii, block.start ?? 1)
      
      const olFont = `600 ${fontSize}px ${fontFamily ?? BODY_FONT_FAMILY}`

      if (listStyle.orderedMarkerBox) {
        
        const numClean = numText.replace(/\.$/, '')
        const markerSize = fontSize
        ctx.textAlign = 'center'
        ctx.font = olFont
        const numWidth = ctx.measureText(numClean).width
        
        const pad = Math.round(markerSize * 0.32)
        const boxSide = Math.max(numWidth, markerSize) + pad * 2
        const boxW = boxSide
        const boxH = boxSide
        const boxRadius = Math.round(boxSide / 2) 

        
        const numRight = textX - Math.round(bulletGap * 0.4) - pad * 2
        const numCenterX = numRight - numWidth / 2
        const visualCenterY = markerBaselineY - markerSize * 0.3

        const boxX = numCenterX - boxW / 2
        const boxY = visualCenterY - boxH / 2

        
        ctx.strokeStyle = theme.palette.accent
        ctx.lineWidth = Math.max(1.4, Math.round(markerSize * 0.1))
        roundRectPath(ctx, boxX, boxY, boxW, boxH, boxRadius)
        ctx.stroke()

        
        ctx.fillStyle = theme.palette.accent
        ctx.fillText(numClean, numCenterX, markerBaselineY)
      } else {
        
        ctx.font = olFont
        ctx.textAlign = 'right'
        ctx.fillText(numText, textX - Math.round(bulletGap * 0.4), markerBaselineY)
      }
    } else {
      ctx.textAlign = 'center'
      ctx.fillText(listStyle.bulletChar, markerX + bulletSize / 2, markerBaselineY)
    }

    ctx.restore()

    
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]!
      let cursorX = textX
      const baselineY = cursorY + fontSize * 0.84 + li * bodyLineHeight

      for (const token of line.tokens) {
        const tokenWidth = getBodyTokenWidth(token, fontSize)

        ctx.save()
        ctx.globalCompositeOperation = isDark
          ? ('screen' as GlobalCompositeOperation)
          : ('multiply' as GlobalCompositeOperation)

        const weight = token.bold ? BODY_BOLD_WEIGHT : resolvedWeight
        const fontStyle = token.italic ? 'italic ' : ''
        ctx.font = `${fontStyle}${weight} ${fontSize}px ${fontFamily ?? BODY_FONT_FAMILY}`
        ctx.fillStyle = bodyTextColor ?? theme.palette.text

        ctx.fillText(token.text, cursorX, baselineY)

        
        if (token.underline) {
          const ulineY = baselineY + Math.max(2, fontSize * 0.08)
          ctx.strokeStyle = ctx.fillStyle
          ctx.lineWidth = Math.max(1, fontSize * 0.05)
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(cursorX, ulineY)
          ctx.lineTo(cursorX + tokenWidth, ulineY)
          ctx.stroke()
        }

        ctx.restore()

        cursorX += tokenWidth
      }
    }

    cursorY += itemHeight + listStyle.itemGap
  }

  return totalHeight
}




function drawColumnContainer(
  ctx: CanvasRenderingContext2D,
  colBlock: ColumnContainerBlock,
  x: number,
  y: number,
  metrics: PosterMetrics,
  theme: ThemeDefinition,
  settings: TypographySettings,
  highlightStyle: HighlightStyle,
  headingOverrides?: HeadingStyleOverrides | null,
  highlightColor?: string | null,
  
  bodyTextColor?: string | null,
): number {
  const halfWidth = (CONTENT_WIDTH - COLUMN_GAP) / 2
  const leftX = x
  const rightX = x + halfWidth + COLUMN_GAP

  
  ctx.save()
  drawColumnBlocks(ctx, colBlock.leftBlocks, leftX, y, halfWidth, metrics, theme, settings, highlightStyle, headingOverrides, highlightColor, bodyTextColor)
  const leftHeight = _colDrawnHeight
  ctx.restore()

  ctx.save()
  drawColumnBlocks(ctx, colBlock.rightBlocks, rightX, y, halfWidth, metrics, theme, settings, highlightStyle, headingOverrides, highlightColor, bodyTextColor)
  const rightHeight = _colDrawnHeight
  ctx.restore()

  
  return Math.max(leftHeight, rightHeight) + 12
}


let _colDrawnHeight = 0


function drawColumnBlocks(
  ctx: CanvasRenderingContext2D,
  blocks: Block[],
  x: number,
  y: number,
  maxWidth: number,
  metrics: PosterMetrics,
  theme: ThemeDefinition,
  settings: TypographySettings,
  highlightStyle: HighlightStyle,
  headingOverrides?: HeadingStyleOverrides | null,
  highlightColor?: string | null,
  
  bodyTextColor?: string | null,
): void {
  const colBodyWeight = settings.bodyFontWeight ?? theme.editor.bodyFontWeight ?? BODY_TEXT_WEIGHT
  let cursorY = y
  let prevBlock: ParagraphBlock | null = null

  for (const block of blocks) {
    const gap = prevBlock
      ? getGapBetweenBlocks(prevBlock, { kind: 'body', raw: '' }, metrics, headingOverrides, theme, false) * 0.7
      : 0
    cursorY += gap

    if (block.kind === 'body' || block.kind === 'quote' ||
        block.kind === 'subheading' || block.kind === 'divider') {
      const paraBlock = block
      const { height } = measureParagraphBlock(
        paraBlock, metrics.bodySize, metrics.bodyLineHeight,
        maxWidth, theme, settings.subheadingStyle,
        metrics.bodyFontFamily,
        false, 
        headingOverrides,
        colBodyWeight,
      )
      drawInlineParagraph(
        ctx, paraBlock, x, cursorY,
        metrics.bodySize, metrics.bodyLineHeight, maxWidth,
        theme, highlightStyle, settings.subheadingStyle, metrics.bodyFontFamily,
        false, 
        headingOverrides,
        colBodyWeight,
        highlightColor,
        bodyTextColor,
      )
      cursorY += height
      prevBlock = paraBlock
    } else if (block.kind === 'code') {
      const m = measureCodeBlock(block, metrics.bodySize)
      
      const scaleFactor = Math.min(1, maxWidth / CONTENT_WIDTH)
      ctx.save()
      if (scaleFactor < 1) {
        ctx.scale(scaleFactor, 1)
        drawCodeBlock(ctx, block, x / scaleFactor, cursorY, metrics.bodySize, theme)
      } else {
        drawCodeBlock(ctx, block, x, cursorY, metrics.bodySize, theme)
      }
      ctx.restore()
      cursorY += m.height
      prevBlock = { kind: 'body', raw: '' }
    } else if (block.kind === 'table') {
      const { totalHeight } = measureTableBlock(block, metrics.bodySize, metrics.bodyLineHeight, metrics.bodyFontFamily)
      const scaleFactor = Math.min(1, maxWidth / CONTENT_WIDTH)
      ctx.save()
      if (scaleFactor < 1) {
        ctx.scale(scaleFactor, 1)
        drawTableBlock(ctx, block, x / scaleFactor, cursorY,
          metrics.bodySize, metrics.bodyLineHeight, theme, metrics.bodyFontFamily)
      } else {
        drawTableBlock(ctx, block, x, cursorY,
          metrics.bodySize, metrics.bodyLineHeight, theme, metrics.bodyFontFamily)
      }
      ctx.restore()
      cursorY += totalHeight
      prevBlock = { kind: 'body', raw: '' }
    } else if (block.kind === 'orderedList' || block.kind === 'unorderedList') {
      const listBlock = block as ListBlock
      const scaleFactor = Math.min(1, maxWidth / CONTENT_WIDTH)
      ctx.save()
      if (scaleFactor < 1) {
        ctx.scale(scaleFactor, 1)
        cursorY += drawListBlock(ctx, listBlock, x / scaleFactor, cursorY,
          metrics.bodySize, metrics.bodyLineHeight, maxWidth / scaleFactor,
          theme, metrics.bodyFontFamily, colBodyWeight, bodyTextColor)
      } else {
        cursorY += drawListBlock(ctx, listBlock, x, cursorY,
          metrics.bodySize, metrics.bodyLineHeight, maxWidth,
          theme, metrics.bodyFontFamily, colBodyWeight, bodyTextColor)
      }
      ctx.restore()
      prevBlock = { kind: 'body', raw: '' }
    }
  }

  _colDrawnHeight = cursorY - y
}

function drawInlineParagraph(
  ctx: CanvasRenderingContext2D,
  block: ParagraphBlock,
  x: number,
  y: number,
  fontSize: number,
  lineHeight: number,
  maxWidth: number,
  theme: ThemeDefinition,
  highlightStyle: HighlightStyle,
  subheadingStyle: import('./types').SubheadingStyle,
  fontFamily?: string,
  
  isCover = false,
  headingOverrides?: HeadingStyleOverrides | null,
  bodyFontWeight?: number,
  highlightColor?: string | null,

  bodyTextColor?: string | null,

  /** 截断模式：只绘制前 maxLines 行（跨页保险丝用，正常调用不传）。 */
  maxLines?: number,
): number {
  if (block.kind === 'divider') {
    const h = getDividerBlockHeight(fontSize)
    drawDividerBlock(ctx, theme, x, y, maxWidth, h)
    return 0
  }

  const isQuote = block.kind === 'quote'
  const isSubheading = block.kind === 'subheading'
  
  const headingLevel = (block as any).headingLevel as number | undefined
  const activeFontSize = isSubheading
    ? resolveHeadingSize(headingLevel || 2, fontSize, theme, headingOverrides, isCover && headingLevel === 1)
    : fontSize
  const activeLineHeight = isSubheading
    ? Math.round(activeFontSize * resolveHeadingLineHeight(headingLevel || 2, theme, isCover && headingLevel === 1))
    : lineHeight
  const quoteMetrics = isQuote
    ? getQuoteBoxMetrics(theme, activeFontSize, maxWidth)
    : null
  const quoteInset = quoteMetrics?.textInset ?? 0
  const quoteWidth = quoteMetrics?.textWidth ?? maxWidth

  
  const textColorFallback =
    (block.kind === 'body' || block.kind === 'quote') && bodyTextColor
      ? bodyTextColor
      : theme.palette.text

  
  
  const wrapWeight = isSubheading && headingLevel
    ? resolveHeadingFontWeight(headingLevel, theme)
    : (bodyFontWeight ?? theme.editor.bodyFontWeight)
  // 跨页行切分产生的块自带预切行（prefixedLines）：直接使用，
  // 不对 raw 二次折行 —— 与 layout 测量完全同一批行，杜绝丢字。
  const prefixed = (block as any).prefixedLines as InlineLine[] | undefined
  const wrappedLines = prefixed?.length
    ? prefixed
    : wrapInlineTokensByWidth(
        parseInlineMarkdown(block.raw),
        activeFontSize,
        quoteWidth,
        fontFamily,
        wrapWeight,
      )
  // 截断模式（保险丝）：只绘制放得下的前 maxLines 行
  const lines = maxLines !== undefined ? wrappedLines.slice(0, maxLines) : wrappedLines


  const textHeight = isSubheading
    ? (headingLevel === 1
        ? Math.max(lines.length * activeLineHeight, Math.round(activeFontSize * 1.2))
        : lines.length * activeLineHeight)
    : getParagraphVisualHeight(
        lines.length,
        activeFontSize,
        activeLineHeight,
      )
  const quotePadTop = quoteMetrics?.paddingTop ?? 0
  const quotePadBottom = quoteMetrics?.paddingBottom ?? 0
  const blockHeight = isQuote
    ? quotePadTop + textHeight + quotePadBottom
    : textHeight

  
  if (isQuote && quoteMetrics) {
    drawQuoteBlock(ctx, theme, x, y, maxWidth, blockHeight, quoteMetrics)
  }

  
  const treatment = resolveHighlightTreatment(theme, highlightStyle)

  
  const h1Align = isSubheading && headingLevel === 1
    ? (headingOverrides?.h1Align ?? 'left')
    : 'left'

  
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!
    let cursorX = x + quoteInset
    const textStartY = isQuote ? y + quotePadTop : y
    const baselineY =
      textStartY + activeFontSize * 0.84 + li * activeLineHeight

    
    if (h1Align !== 'left') {
      let totalLineWidth = 0
      for (const token of line.tokens) {
        totalLineWidth += getBodyTokenWidth(token, activeFontSize, fontFamily, wrapWeight)
      }
      if (h1Align === 'center') {
        cursorX = x + (maxWidth - totalLineWidth) / 2
      } else if (h1Align === 'right') {
        cursorX = x + maxWidth - totalLineWidth
      }
    }

    for (const token of line.tokens) {
      const tokenWidth = getBodyTokenWidth(token, activeFontSize, fontFamily, wrapWeight)

      
      if (token.mark) {
        drawHighlightMark(
          ctx,
          theme,
          highlightStyle,
          cursorX,
          baselineY,
          tokenWidth,
          activeFontSize,
          highlightColor,
        )
      }

      ctx.save()
      
      const markBoldAccent = token.mark && treatment === 'boldAccent'
      const headingFontWeight = isSubheading && headingLevel
        ? resolveHeadingFontWeight(headingLevel, theme)
        : SUBHEADING_TEXT_WEIGHT
      const bodyTextWeight = bodyFontWeight ?? theme.editor.bodyFontWeight ?? BODY_TEXT_WEIGHT
      const weight = isSubheading
        ? headingFontWeight
        : (token.bold || markBoldAccent)
          ? BODY_BOLD_WEIGHT
          : isQuote
            ? QUOTE_TEXT_WEIGHT
            : bodyTextWeight

      const fontStyle = token.italic ? 'italic ' : ''

      ctx.globalCompositeOperation = isDarkTheme(theme)
        ? ('screen' as GlobalCompositeOperation)
        : ('multiply' as GlobalCompositeOperation)
      ctx.font = `${fontStyle}${weight} ${activeFontSize}px ${fontFamily ?? BODY_FONT_FAMILY}`

      
      const headingColor = isSubheading && headingLevel
        ? resolveHeadingColor(headingLevel, theme, headingOverrides)
        : undefined
      ctx.fillStyle =
        headingColor
          ? headingColor
          : isSubheading && subheadingStyle === 'accent'
            ? theme.palette.accent
            : markBoldAccent
              ? (highlightColor ?? theme.palette.accent)
              : textColorFallback

      
      if (isSubheading && headingLevel) {
        const headingShadow = resolveHeadingShadow(headingLevel, theme, headingOverrides)
        if (headingShadow) {
          ctx.shadowColor = headingShadow
          ctx.shadowBlur = 4
          ctx.shadowOffsetX = 2
          ctx.shadowOffsetY = 2
        }
      }

      
      if (isSubheading && headingLevel) {
        const headingStroke = resolveHeadingStroke(headingLevel, theme, headingOverrides)
        if (headingStroke) {
          const sw = resolveHeadingStrokeWidth(headingLevel, theme, headingOverrides)
          ctx.strokeStyle = headingStroke
          ctx.lineWidth = sw
          ctx.lineJoin = 'miter'
          ctx.miterLimit = 2
          ctx.strokeText(token.text, cursorX, baselineY)
        }
      }

      ctx.fillText(token.text, cursorX, baselineY)

      
      if (isSubheading && headingLevel) {
        const headingShadow = resolveHeadingShadow(headingLevel, theme, headingOverrides)
        if (headingShadow) {
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
        }
      }

      
      if (token.underline) {
        const ulineY = baselineY + Math.max(2, activeFontSize * 0.08)
        ctx.strokeStyle = ctx.fillStyle
        ctx.lineWidth = Math.max(1, activeFontSize * 0.05)
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(cursorX, ulineY)
        ctx.lineTo(cursorX + tokenWidth, ulineY)
        ctx.stroke()
      }

      ctx.restore()

      cursorX += tokenWidth
    }
  }

  return lines.length
}



function getFooterRightText(
  mode: string,
  index: number,
  totalPages: number,
): string {
  if (mode === 'page')
    return `${String(index + 1).padStart(2, '0')}/${totalPages}`
  if (mode === 'date') {
    const d = new Date()
    const pad = (v: number) => String(v).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return ''
}




function drawInkWashDecor(ctx: CanvasRenderingContext2D): void {
  ctx.save()

  
  function paintMountains(cx: number, cy: number, scale: number, alpha: number): void {
    ctx.save()
    ctx.globalAlpha = alpha
    
    ctx.fillStyle = 'rgba(60,60,60,0.25)'
    ctx.beginPath()
    ctx.moveTo(cx - 120 * scale, cy + 40 * scale)
    ctx.quadraticCurveTo(cx - 60 * scale, cy - 60 * scale, cx - 10 * scale, cy + 10 * scale)
    ctx.quadraticCurveTo(cx + 30 * scale, cy - 30 * scale, cx + 80 * scale, cy + 30 * scale)
    ctx.lineTo(cx + 120 * scale, cy + 50 * scale)
    ctx.lineTo(cx - 120 * scale, cy + 50 * scale)
    ctx.closePath()
    ctx.fill()
    
    ctx.fillStyle = 'rgba(30,30,30,0.35)'
    ctx.beginPath()
    ctx.moveTo(cx - 80 * scale, cy + 50 * scale)
    ctx.quadraticCurveTo(cx - 40 * scale, cy - 40 * scale, cx + 10 * scale, cy + 15 * scale)
    ctx.quadraticCurveTo(cx + 50 * scale, cy - 10 * scale, cx + 90 * scale, cy + 40 * scale)
    ctx.lineTo(cx + 120 * scale, cy + 55 * scale)
    ctx.lineTo(cx - 100 * scale, cy + 55 * scale)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  
  paintMountains(60, 220, 1.0, 0.5)
  
  paintMountains(PAGE_WIDTH - 60, PAGE_HEIGHT - 200, 1.1, 0.5)

  ctx.restore()
}


function drawMatchaZenDecor(ctx: CanvasRenderingContext2D): void {
  ctx.save()

  function ripple(cx: number, cy: number, maxR: number, rings: number, color: string): void {
    for (let i = 1; i <= rings; i++) {
      const r = (maxR / rings) * i
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.lineWidth = 3 - (i / rings) * 1.5
      ctx.globalAlpha = 0.18 + (i / rings) * 0.12
      ctx.stroke()
    }
  }

  
  ripple(PAGE_WIDTH + 40, 40, 260, 8, '#6b8e4e')
  
  ripple(PAGE_WIDTH / 2, PAGE_HEIGHT + 60, 320, 10, '#6b8e4e')
  
  ripple(-20, PAGE_HEIGHT - 40, 140, 6, '#6b8e4e')

  ctx.restore()
}


function drawCaramelDecor(ctx: CanvasRenderingContext2D): void {
  ctx.save()

  // 底色：浅米黄渐变
  const bg = ctx.createLinearGradient(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  bg.addColorStop(0, '#f7e8c8')
  bg.addColorStop(0.5, '#f2dcb0')
  bg.addColorStop(1, '#e8cd9a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)

  // 四角和边缘深棕色水彩晕染
  function washCorner(cx: number, cy: number, r: number, alpha: number): void {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, `rgba(120,70,30,${alpha})`)
    g.addColorStop(0.4, `rgba(150,95,50,${alpha * 0.6})`)
    g.addColorStop(0.75, `rgba(170,120,70,${alpha * 0.25})`)
    g.addColorStop(1, 'rgba(170,120,70,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  }

  washCorner(-50, -50, 600, 0.7)                   // 左上
  washCorner(PAGE_WIDTH + 50, -30, 550, 0.55)      // 右上
  washCorner(-30, PAGE_HEIGHT + 30, 650, 0.65)     // 左下
  washCorner(PAGE_WIDTH + 30, PAGE_HEIGHT + 50, 600, 0.65) // 右下

  // 左侧边缘一条深棕晕染
  const left = ctx.createLinearGradient(0, 0, 150, 0)
  left.addColorStop(0, 'rgba(120,70,30,0.45)')
  left.addColorStop(1, 'rgba(120,70,30,0)')
  ctx.fillStyle = left
  ctx.fillRect(0, 0, 150, PAGE_HEIGHT)

  ctx.restore()
}


function drawPinkChatroomDecor(ctx: CanvasRenderingContext2D): void {
  ctx.save()

  // 整体粉色背景
  ctx.fillStyle = '#ff9eb5'
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)

  // 中间米白文字区
  ctx.fillStyle = '#fff5ee'
  ctx.fillRect(20, 200, PAGE_WIDTH - 40, PAGE_HEIGHT - 380)

  // 顶部标题栏
  ctx.fillStyle = '#e06090'
  ctx.fillRect(0, 0, PAGE_WIDTH, 80)
  // 笑脸图标
  ctx.fillStyle = '#ffd700'
  ctx.fillRect(20, 20, 40, 40)
  ctx.fillStyle = '#000'
  ctx.fillRect(28, 30, 6, 6)
  ctx.fillRect(46, 30, 6, 6)
  ctx.fillRect(30, 44, 16, 4)
  // 标题文字
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('聊天室', 75, 40)
  // 最小化按钮
  ctx.fillStyle = '#fff'
  ctx.fillRect(PAGE_WIDTH - 90, 25, 30, 30)
  ctx.fillStyle = '#000'
  ctx.fillRect(PAGE_WIDTH - 83, 43, 16, 3)
  // 关闭按钮
  ctx.fillStyle = '#ff4444'
  ctx.fillRect(PAGE_WIDTH - 50, 25, 30, 30)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 18px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('×', PAGE_WIDTH - 35, 41)

  // 菜单栏
  ctx.fillStyle = '#ffb6c1'
  ctx.fillRect(0, 80, PAGE_WIDTH, 50)
  ctx.fillStyle = '#4a2c2a'
  ctx.font = '18px monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('File   Edit   View   Help', 25, 105)

  // 底部按钮栏
  const by = PAGE_HEIGHT - 160
  ctx.fillStyle = '#ffb6c1'
  ctx.fillRect(0, by, PAGE_WIDTH, 60)
  // 4个按钮
  const btnColors = ['#fff', '#87ceeb', '#ff6b6b', '#ffd700']
  const btnLabels = ['A', '🖼', '♥', '★']
  for (let i = 0; i < 4; i++) {
    const bx = 25 + i * 60
    ctx.fillStyle = '#fff'
    ctx.fillRect(bx, by + 10, 40, 40)
    ctx.strokeStyle = '#4a2c2a'
    ctx.lineWidth = 2
    ctx.strokeRect(bx, by + 10, 40, 40)
    ctx.fillStyle = btnColors[i]
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(btnLabels[i], bx + 20, by + 30)
  }

  // 底部输入框
  const iy = PAGE_HEIGHT - 80
  ctx.fillStyle = '#fff'
  ctx.fillRect(70, iy, PAGE_WIDTH - 90, 50)
  ctx.strokeStyle = '#4a2c2a'
  ctx.lineWidth = 2
  ctx.strokeRect(70, iy, PAGE_WIDTH - 90, 50)
  // 箭头
  ctx.fillStyle = '#4a2c2a'
  ctx.beginPath()
  ctx.moveTo(40, iy + 25)
  ctx.lineTo(55, iy + 15)
  ctx.lineTo(55, iy + 35)
  ctx.closePath()
  ctx.fill()
  // 头像
  ctx.fillStyle = '#87ceeb'
  ctx.fillRect(10, iy - 5, 50, 60)
  ctx.fillStyle = '#4a2c2a'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('👤', 35, iy + 25)

  ctx.restore()
}

function drawStarryDecor(ctx: CanvasRenderingContext2D): void {
  ctx.save()

  
  const bg = ctx.createLinearGradient(0, 0, 0, PAGE_HEIGHT)
  bg.addColorStop(0, '#0a1628')
  bg.addColorStop(0.5, '#0f2540')
  bg.addColorStop(1, '#1a3a5c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)

  
  ctx.save()
  ctx.translate(PAGE_WIDTH / 2, PAGE_HEIGHT / 2)
  ctx.rotate(-Math.PI / 6)
  const galaxy = ctx.createLinearGradient(0, -120, 0, 120)
  galaxy.addColorStop(0, 'rgba(80,200,200,0)')
  galaxy.addColorStop(0.45, 'rgba(80,220,200,0.18)')
  galaxy.addColorStop(0.55, 'rgba(100,230,210,0.25)')
  galaxy.addColorStop(0.7, 'rgba(80,200,200,0.12)')
  galaxy.addColorStop(1, 'rgba(80,200,200,0)')
  ctx.fillStyle = galaxy
  ctx.fillRect(-PAGE_WIDTH, -120, PAGE_WIDTH * 2, 240)
  ctx.restore()

  
  let seed = 42
  function rand(): number {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < 220; i++) {
    const x = rand() * PAGE_WIDTH
    const y = rand() * PAGE_HEIGHT
    const r = rand() * 1.2 + 0.3
    const alpha = 0.3 + rand() * 0.6
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.fill()
  }

  
  const brightStars: [number, number, number][] = [
    [120, 180, 4], [580, 120, 3], [400, 480, 3.5],
    [620, 700, 3], [200, 850, 3], [450, 300, 2.5],
  ]
  for (const [x, y, r] of brightStars) {
    
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x - r * 3, y); ctx.lineTo(x + r * 3, y)
    ctx.moveTo(x, y - r * 3); ctx.lineTo(x, y + r * 3)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  }

  ctx.restore()
}


function drawChineseTradDecor(ctx: CanvasRenderingContext2D): void {
  ctx.save()

  
  ctx.fillStyle = '#c8291a'
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)

  const gold = 'rgba(212,175,55,0.85)'
  ctx.strokeStyle = gold
  ctx.lineWidth = 1.5
  ctx.lineCap = 'round'

  
  const bandH = 36
  function huiwen(x0: number, y: number, w: number): void {
    const step = 24
    for (let x = x0; x < x0 + w; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + step - 6, y)
      ctx.lineTo(x + step - 6, y + 10)
      ctx.lineTo(x + 6, y + 10)
      ctx.lineTo(x + 6, y + 18)
      ctx.lineTo(x + step - 6, y + 18)
      ctx.stroke()
    }
  }
  huiwen(0, 0, PAGE_WIDTH)
  huiwen(0, PAGE_HEIGHT - bandH, PAGE_WIDTH)

  
  function peony(cx: number, cy: number, s: number): void {
    
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      ctx.beginPath()
      ctx.ellipse(
        cx + Math.cos(a) * 12 * s,
        cy + Math.sin(a) * 12 * s,
        10 * s, 6 * s, a, 0, Math.PI * 2,
      )
      ctx.stroke()
    }
    
    ctx.beginPath()
    ctx.arc(cx, cy, 4 * s, 0, Math.PI * 2)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.arc(cx + 25 * s, cy + 5 * s, 8 * s, Math.PI * 0.5, Math.PI * 2)
    ctx.stroke()
  }

  peony(50, 80, 1.2)
  peony(PAGE_WIDTH - 60, 70, 1.3)
  peony(60, PAGE_HEIGHT - 90, 1.2)
  peony(PAGE_WIDTH - 70, PAGE_HEIGHT - 80, 1.2)

  ctx.restore()
}

function drawOuterFrame(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
  cornerMode: string,
): void {
  const f = theme.outerFrame
  if (!f || f.kind === 'none') return

  ctx.save()
  ctx.globalAlpha = f.opacity ?? 1

  if (f.kind === 'thin') {
    
    const w = f.width ?? 1.5
    const r = f.radius ?? 36
    traceCardShape(ctx, w / 2, w / 2, PAGE_WIDTH - w, PAGE_HEIGHT - w, cornerMode as never, r)
    ctx.strokeStyle = f.color ?? '#000'
    ctx.lineWidth = w
    ctx.stroke()
  } else if (f.kind === 'thick') {
    
    const pad = f.padding ?? 6
    const r = f.radius ?? 36
    
    traceCardShape(ctx, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, cornerMode as never, r)
    ctx.fillStyle = f.color ?? '#000'
    ctx.fill()
    
    traceCardShape(ctx, pad, pad, PAGE_WIDTH - pad * 2, PAGE_HEIGHT - pad * 2, cornerMode as never, Math.max(0, r - pad))
    ctx.fillStyle = theme.palette.page
    ctx.fill()
  } else if (f.kind === 'corner') {
    
    const len = f.cornerLength ?? 30
    const pad = 14
    ctx.strokeStyle = f.color ?? '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    
    ctx.beginPath()
    ctx.moveTo(pad, pad + len); ctx.lineTo(pad, pad); ctx.lineTo(pad + len, pad)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(PAGE_WIDTH - pad - len, pad); ctx.lineTo(PAGE_WIDTH - pad, pad); ctx.lineTo(PAGE_WIDTH - pad, pad + len)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(pad, PAGE_HEIGHT - pad - len); ctx.lineTo(pad, PAGE_HEIGHT - pad); ctx.lineTo(pad + len, PAGE_HEIGHT - pad)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(PAGE_WIDTH - pad - len, PAGE_HEIGHT - pad); ctx.lineTo(PAGE_WIDTH - pad, PAGE_HEIGHT - pad); ctx.lineTo(PAGE_WIDTH - pad, PAGE_HEIGHT - pad - len)
    ctx.stroke()
  }

  ctx.restore()
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  theme: ThemeDefinition,
  index: number,
  totalPages: number,
  footerLeft: string,
  footerRightMode: string,
): void {
  const leftText = footerLeft.trim()
  const rightText = getFooterRightText(footerRightMode, index, totalPages)
  const textAlpha = Math.max(0.52, theme.surface.footerTextAlpha * 0.74)

  
  ctx.strokeStyle = hexToRgba(
    theme.palette.text,
    theme.surface.footerLineAlpha * 0.72,
  )
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(FOOTER_LINE_LEFT, FOOTER_LINE_Y)
  ctx.lineTo(FOOTER_LINE_RIGHT, FOOTER_LINE_Y)
  ctx.stroke()

  
  ctx.fillStyle = hexToRgba(theme.palette.text, textAlpha)
  ctx.font = `500 13px ${FOOTER_FONT_FAMILY}`
  ctx.textBaseline = 'alphabetic'
  if (leftText) ctx.fillText(leftText, CONTENT_LEFT, FOOTER_TEXT_Y)

  
  if (rightText) {
    ctx.save()
    ctx.textAlign = 'right'
    ctx.font = `500 13px ${FOOTER_FONT_FAMILY}`
    ctx.fillStyle = hexToRgba(theme.palette.text, textAlpha)
    ctx.fillText(rightText, CONTENT_RIGHT, FOOTER_TEXT_Y)
    ctx.restore()
  }
}






export function renderCard(opts: RenderOptions): HTMLCanvasElement {
  const {
    page,
    theme,
    settings,
    highlightStyle,
    pageIndex,
    totalPages,
    footerLeft,
    footerRightMode,
    footerEnabled,
    cardCornerMode,
    highlightColor,
    bodyTextColor,
  } = opts

  const canvas = document.createElement('canvas')
  canvas.width = PAGE_WIDTH * CANVAS_SCALE
  canvas.height = PAGE_HEIGHT * CANVAS_SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to create canvas context')
  ctx.scale(CANVAS_SCALE, CANVAS_SCALE)

  const metrics = getPosterMetrics(page, settings, footerEnabled, theme)
  const bodyFontWeight = settings.bodyFontWeight ?? theme.editor.bodyFontWeight ?? BODY_TEXT_WEIGHT

  
  if (isBrutalTheme(theme)) {
    
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
  } else if (isGlassTheme(theme)) {
    
    ctx.shadowColor = theme.palette.shadow
    ctx.shadowBlur = 32
    ctx.shadowOffsetY = 16
  } else {
    ctx.shadowColor = theme.palette.shadow
    ctx.shadowBlur = theme.mode === 'swiss' ? 18 : 40
    ctx.shadowOffsetY = theme.mode === 'swiss' ? 12 : 24
  }

  traceCardShape(ctx, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, cardCornerMode,
    isBrutalTheme(theme) ? 0 : 36)
  drawBackground(ctx, theme)

  
  if (theme.id === 'ink-wash') {
    drawInkWashDecor(ctx)
  }
  
  if (theme.id === 'matcha-zen') {
    drawMatchaZenDecor(ctx)
  }
  
  if (theme.id === 'caramel') {
    drawCaramelDecor(ctx)
  }

  if (theme.id === 'pink-chatroom') {
    drawPinkChatroomDecor(ctx)
  }
  
  if (theme.id === 'starry') {
    drawStarryDecor(ctx)
  }
  
  if (theme.id === 'chinese-trad') {
    drawChineseTradDecor(ctx)
  }

  
  drawOuterFrame(ctx, theme, cardCornerMode)

  
  if (isBrutalTheme(theme)) {
    ctx.save()
    traceCardShape(ctx, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, cardCornerMode, 0)
    ctx.strokeStyle = theme.palette.border
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.restore()
  }

  ctx.save()
  traceCardShape(ctx, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, cardCornerMode,
    isBrutalTheme(theme) ? 0 : 36)
  ctx.clip()
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  
  paintAtmosphere(ctx, theme)

  
  applyNoiseTexture(ctx, theme)

  
  if (opts.gradientConfig?.enabled) {
    drawGradientOverlay(ctx, opts.gradientConfig.color1, opts.gradientConfig.color2, opts.gradientConfig.angle)
  }

  
  drawDecor(ctx, theme)

  ctx.restore()

  
  let paragraphY = metrics.bodyTopY
  let previousBlock: ParagraphBlock | null = null
  for (let bi = 0; bi < page.blocks.length; bi++) {
    const paragraph = page.blocks[bi]!
    const blockTopWithGap = paragraphY + (previousBlock
      ? getGapBetweenBlocks(previousBlock, paragraph as ParagraphBlock, metrics, opts.headingOverrides, theme, page.kind === 'cover')
      : 0)

    
    if (paragraph.kind === 'body' || paragraph.kind === 'quote' ||
        paragraph.kind === 'subheading' || paragraph.kind === 'divider') {
      const block: ParagraphBlock = paragraph
      paragraphY = blockTopWithGap
      const isCover = page.kind === 'cover'
      const { height } = measureParagraphBlock(
        block,
        metrics.bodySize,
        metrics.bodyLineHeight,
        metrics.bodyWidth,
        theme,
        settings.subheadingStyle,
        metrics.bodyFontFamily,
        isCover,
        opts.headingOverrides,
        bodyFontWeight,
      )
      const blockBottom = paragraphY + height
      // 保险丝：layout 已保证块能放下，超高只可能来自测量/绘制的微小差异。
      // 不再整块丢弃（旧逻辑 return canvas 会静默丢掉本块及之后所有内容、
      // 连页脚都不画），而是截断到剩余空间放得下的行数；后续块必然也放不下，
      // 画完截断块即结束本页正文绘制，页脚照常。
      let maxLinesToDraw: number | undefined
      if (blockBottom > metrics.bodyBottomY) {
        maxLinesToDraw = getParagraphMaxLines(
          block, metrics.bodyBottomY - paragraphY,
          metrics.bodySize, metrics.bodyLineHeight,
          theme, settings.subheadingStyle,
          isCover, opts.headingOverrides,
        )
        if (maxLinesToDraw <= 0) break
      }

      drawInlineParagraph(
        ctx, block, CONTENT_LEFT, paragraphY,
        metrics.bodySize, metrics.bodyLineHeight, metrics.bodyWidth,
        theme, highlightStyle, settings.subheadingStyle, metrics.bodyFontFamily,
        isCover,
        opts.headingOverrides,
        bodyFontWeight,
        highlightColor,
        bodyTextColor,
        maxLinesToDraw,
      )

      if (maxLinesToDraw !== undefined) break

      paragraphY = blockBottom
      previousBlock = block
      continue
    }

    
    if (paragraph.kind === 'code') {
      const { height } = measureCodeBlock(paragraph, metrics.bodySize)
      const blockBottom = blockTopWithGap + height
      if (blockBottom > metrics.bodyBottomY && page.blocks.indexOf(paragraph) > 0) break
      paragraphY = blockTopWithGap
      const drawnH = drawCodeBlock(ctx, paragraph, CONTENT_LEFT, paragraphY, metrics.bodySize, theme)
      paragraphY += drawnH
      previousBlock = { kind: 'body', raw: '' }
      continue
    }

    
    if (paragraph.kind === 'table') {
      const { totalHeight } = measureTableBlock(paragraph, metrics.bodySize, metrics.bodyLineHeight, metrics.bodyFontFamily)
      const blockBottom = blockTopWithGap + totalHeight
      if (blockBottom > metrics.bodyBottomY && page.blocks.indexOf(paragraph) > 0) break
      paragraphY = blockTopWithGap
      const drawnH = drawTableBlock(ctx, paragraph, CONTENT_LEFT, paragraphY,
        metrics.bodySize, metrics.bodyLineHeight, theme, metrics.bodyFontFamily)
      paragraphY += drawnH
      previousBlock = { kind: 'body', raw: '' }
      continue
    }

    
    if (paragraph.kind === 'orderedList' || paragraph.kind === 'unorderedList') {
      const listBlock = paragraph as ListBlock
      const { totalHeight } = measureListBlock(
        listBlock, metrics.bodySize, metrics.bodyLineHeight,
        metrics.bodyWidth, theme, metrics.bodyFontFamily,
        bodyFontWeight,
      )
      const blockBottom = blockTopWithGap + totalHeight
      if (blockBottom > metrics.bodyBottomY && page.blocks.indexOf(paragraph) > 0) break
      paragraphY = blockTopWithGap
      const drawnH = drawListBlock(
        ctx, listBlock,
        CONTENT_LEFT, paragraphY,
        metrics.bodySize, metrics.bodyLineHeight, metrics.bodyWidth,
        theme, metrics.bodyFontFamily,
        bodyFontWeight,
        bodyTextColor,
      )
      paragraphY += drawnH
      previousBlock = { kind: 'body', raw: '' }
      continue
    }

    
    if (paragraph.kind === 'columnContainer') {
      const colBlock = paragraph
      if (colBlock.leftBlocks.length === 0 && colBlock.rightBlocks.length === 0) {
        continue
      }
      paragraphY = blockTopWithGap
      const drawnH = drawColumnContainer(
        ctx, colBlock,
        CONTENT_LEFT, paragraphY,
        metrics, theme, settings, highlightStyle,
        opts.headingOverrides,
        highlightColor,
        bodyTextColor,
      )
      paragraphY += drawnH
      previousBlock = { kind: 'body', raw: '' }
      continue
    }
  }

  
  if (footerEnabled) {
    drawFooter(
      ctx,
      theme,
      pageIndex,
      totalPages,
      footerLeft,
      footerRightMode,
    )
  }

  
  return canvas
}