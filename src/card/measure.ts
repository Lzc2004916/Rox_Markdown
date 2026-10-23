


import type {
  InlineToken,
  InlineLine,
  ParagraphBlock,
  PosterMetrics,
  QuoteBoxMetrics,
  ThemeDefinition,
  SubheadingStyle,
  TypographySettings,
  CardPage,
  ListBlock,
  ListStyleConfig,
} from './types'
import {
  BODY_TEXT_WEIGHT,
  BODY_BOLD_WEIGHT,
  BODY_FONT_FAMILY,
  LEADING_PUNCTUATION,
  CONTENT_WIDTH,
  CONTENT_LEFT,
  BODY_BOTTOM_WITH_FOOTER,
  BODY_BOTTOM_WITHOUT_FOOTER,
  PAGE_HEIGHT,
  getBodyFontFamily,
  resolveHeadingLineHeight,
  resolveHeadingSize,
  resolveHeadingFontWeight,
  computeHeadingMarginBottom,
  computeHeadingMarginTop,
  DEFAULT_LIST_STYLE,
} from './types'
import type { HeadingStyleOverrides } from './types'
import { getFormulaAsset } from './formula-loader'




let _measureCtx: CanvasRenderingContext2D | null = null
let _measureCtxFont = ''

function getMeasureCtx(font: string): CanvasRenderingContext2D {
  if (_measureCtx && _measureCtxFont === font) {
    return _measureCtx
  }
  if (!_measureCtx) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to create measure canvas')
    _measureCtx = ctx
  }
  _measureCtx.font = font
  _measureCtxFont = font
  return _measureCtx
}



const MAX_CACHE_SIZE = 256


const _parseCache = new Map<string, InlineToken[]>()


const _wrapCache = new Map<string, InlineLine[]>()
const _cacheInvalidationListeners = new Set<() => void>()

export function onMeasureCacheInvalidated(listener: () => void): () => void {
  _cacheInvalidationListeners.add(listener)
  return () => _cacheInvalidationListeners.delete(listener)
}

/**
 * 清空内联解析 / 折行缓存。
 * 字体加载完成后必须调用：此前若用 fallback 字体宽度测量过，
 * 错误的折行结果会永久留在缓存里，导致渲染端（字体已加载）行宽超限被裁。
 */
export function clearMeasureCaches(): void {
  _wrapCache.clear()
  _parseCache.clear()
  for (const listener of _cacheInvalidationListeners) listener()
}


export function splitGraphemes(text: string): string[] {
  const Segmenter = (Intl as typeof Intl & {
    Segmenter?: new (locale?: string, options?: { granularity: 'grapheme' }) => {
      segment(input: string): Iterable<{ segment: string }>
    }
  }).Segmenter
  if (Segmenter) {
    return Array.from(
      new Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
      part => part.segment,
    )
  }
  return Array.from(text)
}

export function splitTextForWrapping(text: string): string[] {
  const words = /[A-Za-z0-9]+(?:[._'’&/+:-][A-Za-z0-9]+)*|[ \t]+|\n/gy
  const result: string[] = []
  let cursor = 0
  while (cursor < text.length) {
    words.lastIndex = cursor
    const match = words.exec(text)
    if (match) {
      result.push(match[0])
      cursor = words.lastIndex
      continue
    }
    const grapheme = splitGraphemes(text.slice(cursor))[0]
    if (!grapheme) break
    result.push(grapheme)
    cursor += grapheme.length
  }
  return result
}


function explodeInlineTokens(tokens: InlineToken[]): InlineToken[] {
  return tokens.flatMap((token) =>
    token.formula ? [token] :
    splitTextForWrapping(token.text).map((unit) => ({
      ...token,
      text: unit,
    })),
  )
}


export function getBodyTokenWidth(token: InlineToken, fontSize: number, fontFamily?: string, bodyFontWeight?: number): number {
  if (token.text === '\n') return 0
  if (token.formula) {
    const asset = getFormulaAsset(token.formula.latex, token.formula.display)
    const height = fontSize * (token.formula.display ? 1.75 : 1.1)
    return asset ? asset.aspectRatio * height : Math.max(fontSize, token.formula.latex.length * fontSize * 0.55)
  }
  const baseWeight = bodyFontWeight ?? BODY_TEXT_WEIGHT
  const weight = token.bold ? BODY_BOLD_WEIGHT : baseWeight
  const family = fontFamily ?? BODY_FONT_FAMILY
  const fontStyle = token.italic ? 'italic ' : ''
  const effectiveSize = token.script ? Math.round(fontSize * 0.7) : fontSize
  const font = `${fontStyle}${weight} ${effectiveSize}px ${family}`
  return getMeasureCtx(font).measureText(token.text).width
}

function isWhitespaceToken(text: string): boolean {
  return /^[ \t]+$/.test(text)
}

function isLeadingPunctuation(text: string): boolean {
  return LEADING_PUNCTUATION.has(text)
}


function splitOversizedUnit(
  token: InlineToken,
  fontSize: number,
  maxWidth: number,
  fontFamily?: string,
  bodyFontWeight?: number,
): InlineToken[] {
  // Formula SVGs are atomic; splitting a LaTeX source string would corrupt it.
  if (token.formula) return [token]
  if (token.text.length <= 1 || getBodyTokenWidth(token, fontSize, fontFamily, bodyFontWeight) <= maxWidth)
    return [token]
  return splitGraphemes(token.text).map((char) => ({ ...token, text: char }))
}


function wrapCacheKey(tokens: InlineToken[], fontSize: number, maxWidth: number, fontFamily?: string, bodyFontWeight?: number): string {
  
  
  
  
  
  let sig = ''
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!
    sig += JSON.stringify([t.bold ? 1 : 0, t.italic ? 1 : 0, t.underline ? 1 : 0, t.strike ? 1 : 0, t.script ?? '', t.formula?.latex ?? '', t.formula?.display ? 1 : 0, t.text])
  }
  return `${fontSize}|${Math.round(maxWidth)}|${fontFamily ?? ''}|${bodyFontWeight ?? BODY_TEXT_WEIGHT}|${sig}`
}


export function wrapInlineTokensByWidth(
  tokens: InlineToken[],
  fontSize: number,
  maxWidth: number,
	  fontFamily?: string,
	  bodyFontWeight?: number,
	): InlineLine[] {
  const key = wrapCacheKey(tokens, fontSize, maxWidth, fontFamily, bodyFontWeight)
  const cached = _wrapCache.get(key)
  if (cached) return cached

  const charTokens = explodeInlineTokens(tokens)
  const lines: InlineLine[] = []
  let currentLine: InlineToken[] = []
  let currentWidth = 0

  const pushLine = () => {
    if (currentLine.length > 0) {
      lines.push({ tokens: currentLine })
      currentLine = []
      currentWidth = 0
    }
  }

  for (const sourceToken of charTokens) {
    const splitTokens = splitOversizedUnit(sourceToken, fontSize, maxWidth, fontFamily, bodyFontWeight)
    for (const token of splitTokens) {
      if (token.text === '\n') {
        pushLine()
        continue
      }
      
      if (currentLine.length === 0 && isWhitespaceToken(token.text)) continue

      const tokenWidth = getBodyTokenWidth(token, fontSize, fontFamily, bodyFontWeight)

      if (currentLine.length > 0 && currentWidth + tokenWidth > maxWidth) {
        if (!isLeadingPunctuation(token.text)) {
          pushLine()
          if (isWhitespaceToken(token.text)) continue
        }
      }

      
      currentLine.push({ ...token })
      currentWidth += tokenWidth
    }
  }

  pushLine()

  
  if (_wrapCache.size >= MAX_CACHE_SIZE) {
    const firstKey = _wrapCache.keys().next().value
    if (firstKey !== undefined) _wrapCache.delete(firstKey)
  }
  _wrapCache.set(key, lines)
  return lines
}




export function parseInlineMarkdown(
  text: string,
): InlineToken[] {
  const cached = _parseCache.get(text)
  if (cached) return cached

  const tokens: InlineToken[] = []
  

  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\*\*[\s\S]+?\*\*|~~[\s\S]+?~~|<sup>[\s\S]+?<\/sup>|<sub>[\s\S]+?<\/sub>|\^[\s\S]+?\^|(?<!\*)\*[\s\S]+?\*(?!\*))/g
  const parts = text.split(pattern).filter(Boolean)

  const applyStyle = (
    content: string,
    style: Partial<Pick<InlineToken, 'bold' | 'italic' | 'underline' | 'strike' | 'script'>>,
  ): InlineToken[] => parseInlineMarkdown(content).map((token) => ({ ...token, ...style }))

  for (const part of parts) {
    const boldMatch = part.match(/^\*\*([\s\S]+)\*\*$/)
    if (boldMatch) {
      tokens.push(...applyStyle(boldMatch[1]!, { bold: true }))
      continue
    }
    const formulaMatch = part.match(/^\$\$([\s\S]+)\$\$$/) ?? part.match(/^\$([^$\n]+)\$$/)
    if (formulaMatch) {
      const display = part.startsWith('$$')
      tokens.push({ text: formulaMatch[1]!, bold: false, italic: false, underline: false, formula: { latex: formulaMatch[1]!, display } })
      continue
    }
    const strikeMatch = part.match(/^~~([\s\S]+)~~$/)
    if (strikeMatch) {
      tokens.push(...applyStyle(strikeMatch[1]!, { strike: true }))
      continue
    }
    
    const underlineMatch = part.match(/^\^([\s\S]+)\^$/)
    if (underlineMatch) {
      tokens.push(...applyStyle(underlineMatch[1]!, { underline: true }))
      continue
    }
    const supMatch = part.match(/^<sup>([\s\S]+)<\/sup>$/)
    if (supMatch) {
      tokens.push(...applyStyle(supMatch[1]!, { script: 'sup' }))
      continue
    }
    const subMatch = part.match(/^<sub>([\s\S]+)<\/sub>$/)
    if (subMatch) {
      tokens.push(...applyStyle(subMatch[1]!, { script: 'sub' }))
      continue
    }
    
    const italicMatch = part.match(/^\*([\s\S]+)\*$/)
    if (italicMatch) {
      tokens.push(...applyStyle(italicMatch[1]!, { italic: true }))
      continue
    }
    tokens.push({ text: part, bold: false, italic: false, underline: false })
  }

  
  if (_parseCache.size >= MAX_CACHE_SIZE) {
    const firstKey = _parseCache.keys().next().value
    if (firstKey !== undefined) _parseCache.delete(firstKey)
  }
  _parseCache.set(text, tokens)

  return tokens
}



function getSubheadingFontSize(fontSize: number, headingLevel?: number, theme?: ThemeDefinition, isCover = false, headingOverrides?: HeadingStyleOverrides | null): number {
  
  if (headingLevel && headingLevel >= 1 && headingLevel <= 6) {
    return resolveHeadingSize(headingLevel, fontSize, theme, headingOverrides, isCover && headingLevel === 1)
  }
  
  return Math.round(fontSize * 1.08)
}


function getHeadingLineHeightRatio(headingLevel?: number, theme?: ThemeDefinition, isCover = false): number {
  if (headingLevel && headingLevel >= 1 && headingLevel <= 6) {
    return resolveHeadingLineHeight(headingLevel, theme, isCover && headingLevel === 1)
  }
  return 1.55
}

function getSubheadingLineHeight(fontSize: number, lineHeight: number, style: SubheadingStyle, headingLevel?: number, theme?: ThemeDefinition, isCover = false, headingOverrides?: HeadingStyleOverrides | null): number {
  if (headingLevel && headingLevel >= 1 && headingLevel <= 6) {
    const headingFontSize = getSubheadingFontSize(fontSize, headingLevel, theme, isCover, headingOverrides)
    return Math.round(headingFontSize * getHeadingLineHeightRatio(headingLevel, theme, isCover))
  }
  return style === 'large' ? lineHeight * 1.02 : lineHeight
}

function getDividerBlockHeight(fontSize: number): number {
  return Math.max(18, fontSize * 0.72)
}


export function getParagraphVisualHeight(
  lineCount: number,
  fontSize: number,
  lineHeight: number,
): number {
  if (lineCount <= 0) return 0
  return fontSize + Math.max(0, lineCount - 1) * lineHeight
}

export function getQuoteBoxMetrics(
  theme: ThemeDefinition,
  fontSize: number,
  maxWidth: number,
): QuoteBoxMetrics {
  const treatment = theme.components.quoteTreatment

  if (treatment === 'callout') {
    const padding = Math.max(20, fontSize * 0.58)
    return {
      textInset: 42,
      textWidth: maxWidth - 72,
      paddingTop: padding,
      paddingBottom: padding,
      boxOffsetX: -14,
      boxWidthOffset: 14,
      barOffsetX: -8,
      barTopInset: 12,
      barBottomInset: 24,
      barWidth: 5,
      barRadius: 5,
    }
  }

  if (treatment === 'code') {
    const padding = Math.max(18, fontSize * 0.52)
    return {
      textInset: 40,
      textWidth: maxWidth - 68,
      paddingTop: padding,
      paddingBottom: padding,
      boxOffsetX: -12,
      boxWidthOffset: 12,
      barOffsetX: -7,
      barTopInset: 10,
      barBottomInset: 20,
      barWidth: 4,
      barRadius: 4,
    }
  }

  const padding = Math.max(22, fontSize * 0.62)
  return {
    textInset: theme.mode === 'swiss' ? 44 : 38,
    textWidth: maxWidth - 72,
    paddingTop: padding,
    paddingBottom: padding,
    boxOffsetX: -18,
    boxWidthOffset: 18,
    barOffsetX: -12,
    barTopInset: 14,
    barBottomInset: 28,
    barWidth: 5,
    barRadius: 5,
  }
}


export function measureParagraphBlock(
  block: ParagraphBlock,
  fontSize: number,
  lineHeight: number,
  maxWidth: number,
  theme: ThemeDefinition,
  subheadingStyle: SubheadingStyle,
  fontFamily?: string,
  isCover = false,
  headingOverrides?: HeadingStyleOverrides | null,
  bodyFontWeight?: number,
): { lines: InlineLine[]; height: number } {
  if (block.kind === 'divider') {
    return { lines: [], height: getDividerBlockHeight(fontSize) }
  }

  const headingLevel = (block as any).headingLevel as number | undefined
  const activeFontSize =
    block.kind === 'subheading'
      ? getSubheadingFontSize(fontSize, headingLevel, theme, isCover, headingOverrides)
      : fontSize
  const activeLineHeight =
    block.kind === 'subheading'
      ? getSubheadingLineHeight(fontSize, lineHeight, subheadingStyle, headingLevel, theme, isCover, headingOverrides)
      : lineHeight
  const quoteMetrics =
    block.kind === 'quote'
      ? getQuoteBoxMetrics(theme, activeFontSize, maxWidth)
      : null
  const quoteWidth = quoteMetrics?.textWidth ?? maxWidth
	  const bodyWeight = bodyFontWeight ?? theme.editor.bodyFontWeight
  
  
  const wrapWeight =
    block.kind === 'subheading' && headingLevel
      ? resolveHeadingFontWeight(headingLevel, theme)
      : bodyWeight
  // 跨页行切分产生的块自带预切行（prefixedLines）：直接使用，
  // 不对 raw 二次折行，从根上消除"序列化 → 重折行"不一致导致的丢字。
  const prefixed = (block as any).prefixedLines as InlineLine[] | undefined
  const lines = prefixed?.length
    ? prefixed
    : wrapInlineTokensByWidth(
        parseInlineMarkdown(block.raw),
        activeFontSize,
        quoteWidth,
        fontFamily,
        wrapWeight,
      )
  
  
  
  
  
  const textHeight =
    block.kind === 'subheading'
      ? (headingLevel === 1
          ? Math.max(lines.length * activeLineHeight, Math.round(activeFontSize * 1.2))
          : lines.length * activeLineHeight)
      : getParagraphVisualHeight(lines.length, activeFontSize, activeLineHeight)
  const quotePadTop = quoteMetrics?.paddingTop ?? 0
  const quotePadBottom = quoteMetrics?.paddingBottom ?? 0
  return {
    lines,
    height:
      block.kind === 'quote'
        ? quotePadTop + textHeight + quotePadBottom
        : textHeight,
  }
}




export function measureListItem(
  text: string,
  fontSize: number,
  lineHeight: number,
  maxTextWidth: number,
  fontFamily?: string,
  bodyFontWeight?: number,
): { lines: InlineLine[]; height: number } {
  const tokens = parseInlineMarkdown(text)
  const lines = wrapInlineTokensByWidth(tokens, fontSize, maxTextWidth, fontFamily, bodyFontWeight)
  const height = lines.length * lineHeight
  return { lines, height }
}


export function measureListBlock(
  block: ListBlock,
  fontSize: number,
  bodyLineHeight: number,
  maxWidth: number,
  theme: ThemeDefinition,
  fontFamily?: string,
  bodyFontWeight?: number,
): { itemHeights: number[]; totalHeight: number } {
  const listStyle: ListStyleConfig = theme.editor.list ?? DEFAULT_LIST_STYLE
  const resolvedWeight = bodyFontWeight ?? theme.editor.bodyFontWeight ?? BODY_TEXT_WEIGHT

  const bulletSize = Math.round(fontSize * listStyle.bulletSizeRatio)
  const bulletGap = Math.max(4, Math.round(fontSize * 0.22))
  const isOrdered = block.kind === 'orderedList'
  
  const effectiveMarkerSize = isOrdered
    ? fontSize
    : Math.max(bulletSize, Math.round(fontSize * 0.9))

  let totalHeight = 12 
  const itemHeights: number[] = []

  for (const item of block.items) {
    const indent = item.indent * listStyle.indentPerLevel
    const textWidth = Math.max(60, maxWidth - indent - effectiveMarkerSize - bulletGap)
    const { height } = measureListItem(item.text, fontSize, bodyLineHeight, textWidth, fontFamily, resolvedWeight)
    const itemHeight = Math.max(height, bodyLineHeight)
    itemHeights.push(itemHeight)
    totalHeight += itemHeight + listStyle.itemGap
  }

  totalHeight += 12 - listStyle.itemGap 
  return { itemHeights, totalHeight }
}


export function getParagraphMaxLines(
  block: ParagraphBlock,
  availableHeight: number,
  fontSize: number,
  lineHeight: number,
  theme: ThemeDefinition,
  subheadingStyle: SubheadingStyle,
  isCover = false,
  headingOverrides?: HeadingStyleOverrides | null,
): number {
  if (block.kind === 'divider') {
    return availableHeight >= getDividerBlockHeight(fontSize) ? 1 : 0
  }

  const headingLevel = (block as any).headingLevel as number | undefined
  const activeFontSize =
    block.kind === 'subheading'
      ? getSubheadingFontSize(fontSize, headingLevel, theme, isCover, headingOverrides)
      : fontSize
  const activeLineHeight =
    block.kind === 'subheading'
      ? getSubheadingLineHeight(fontSize, lineHeight, subheadingStyle, headingLevel, theme, isCover, headingOverrides)
      : lineHeight
  const quoteMetrics =
    block.kind === 'quote'
      ? getQuoteBoxMetrics(theme, activeFontSize, CONTENT_WIDTH)
      : null
  const padTop = quoteMetrics?.paddingTop ?? 0
  const padBottom = quoteMetrics?.paddingBottom ?? 0
  const textRoom = availableHeight - padTop - padBottom

  
  
  if (block.kind === 'subheading') {
    if (textRoom < activeLineHeight) return 0
    return Math.floor(textRoom / activeLineHeight)
  }

  if (textRoom < activeFontSize) return 0
  return 1 + Math.floor((textRoom - activeFontSize) / activeLineHeight)
}




export function getGapBetweenBlocks(
  prev: ParagraphBlock | null,
  curr: ParagraphBlock,
  metrics: PosterMetrics,
  headingOverrides?: HeadingStyleOverrides | null,
  theme?: ThemeDefinition,
  isCover?: boolean,
): number {
  if (!prev) return 0
  const baseGap = metrics.bodyParagraphGap
  const quoteGap = baseGap * 1.08 + 4
  
  const bodyTopBuffer = Math.max(16, Math.round(baseGap * 0.55))

  
  const getHeadingFontSize = (block: ParagraphBlock): number => {
    const level = (block as any).headingLevel as number | undefined
    if (!level || !theme) return 0
    return resolveHeadingSize(level, metrics.bodySize, theme, headingOverrides, isCover && level === 1)
  }

  const prevIsHeading = prev.kind === 'subheading'
  const currIsHeading = curr.kind === 'subheading'

  
  if (prevIsHeading && currIsHeading) {
    const prevSize = getHeadingFontSize(prev)
    const prevLevel = (prev as any).headingLevel as number | undefined || 1
    const prevBottom = computeHeadingMarginBottom(prevSize, prevLevel)
    const currSize = getHeadingFontSize(curr)
    const currTop = computeHeadingMarginTop(currSize)
    return Math.max(prevBottom, currTop) + bodyTopBuffer
  }

  
  if (prevIsHeading) {
    const prevSize = getHeadingFontSize(prev)
    const prevLevel = (prev as any).headingLevel as number | undefined || 1
    if (prevSize > 0) return computeHeadingMarginBottom(prevSize, prevLevel) + bodyTopBuffer
    
    return baseGap + bodyTopBuffer
  }

  
  if (currIsHeading) {
    const currSize = getHeadingFontSize(curr)
    if (currSize > 0) return computeHeadingMarginTop(currSize) + bodyTopBuffer
    return baseGap * 1.2
  }

  
  if (prev.kind === 'quote' || curr.kind === 'quote') return quoteGap + bodyTopBuffer

  
  return baseGap + bodyTopBuffer
}




const DEFAULT_INNER_FRAME_INSET = 20

export interface ResolvedContentInsets {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Resolve the theme's content-safe area in one place.
 * innerFrameInset is relative to the project's 20px baseline so existing
 * themes keep their current layout. Insets below the baseline do not subtract
 * from an explicit contentInset; larger frames only tighten the safe area.
 */
export function resolveContentInsets(theme?: ThemeDefinition): ResolvedContentInsets {
  const frameInset = Math.max(0, theme?.surface.innerFrameInset ?? DEFAULT_INNER_FRAME_INSET)
  const frameAdjustment = Math.max(0, frameInset - DEFAULT_INNER_FRAME_INSET)
  const contentInset = theme?.contentInset ?? {}

  return {
    top: Math.max(0, frameAdjustment + (contentInset.top ?? 0)),
    right: Math.max(0, frameAdjustment + (contentInset.right ?? 0)),
    bottom: Math.max(0, frameAdjustment + (contentInset.bottom ?? 0)),
    left: Math.max(0, frameAdjustment + (contentInset.left ?? 0)),
  }
}

export function getPosterMetrics(
  _page: CardPage,
  settings: TypographySettings,
  footerEnabled: boolean,
  theme?: ThemeDefinition,
): PosterMetrics {
  const bodySize = Math.max(21, settings.bodySize - 4)
  const bodyLineHeight = bodySize * Math.max(1.58, settings.lineHeight - 0.06)
  const bodyParagraphGap = Math.max(30, bodySize * 1.25)
  const inset = resolveContentInsets(theme)

  const separatorY = 110 + inset.top
  const bodyTopY = separatorY + 10
  const frameBottomLimit = theme?.surface.innerFrameAlpha
    ? PAGE_HEIGHT - Math.max(0, theme.surface.innerFrameInset) - 10
    : Number.POSITIVE_INFINITY
  const configuredBottom = (footerEnabled ? BODY_BOTTOM_WITH_FOOTER : BODY_BOTTOM_WITHOUT_FOOTER) - inset.bottom
  const bodyBottomY = Math.min(configuredBottom, frameBottomLimit)
  const bodyLeftX = CONTENT_LEFT + inset.left
  const bodyRightX = CONTENT_LEFT + CONTENT_WIDTH - inset.right
  const bodyWidth = Math.max(1, bodyRightX - bodyLeftX)

  return {
    bodySize,
    bodyLineHeight,
    bodyParagraphGap,
    bodyFontFamily: getBodyFontFamily(settings.bodyFontMode),
    separatorY,
    bodyTopY,
    bodyBottomY,
    bodyLeftX,
    bodyRightX,
    bodyWidth,
    bodyHeight: Math.max(0, bodyBottomY - bodyTopY),
  }
}
