


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
  BODY_BOTTOM_WITH_FOOTER,
  BODY_BOTTOM_WITHOUT_FOOTER,
  getBodyFontFamily,
  resolveHeadingLineHeight,
  resolveHeadingSize,
  resolveHeadingFontWeight,
  computeHeadingMarginBottom,
  computeHeadingMarginTop,
  DEFAULT_LIST_STYLE,
} from './types'
import type { HeadingStyleOverrides } from './types'




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


/**
 * 清空内联解析 / 折行缓存。
 * 字体加载完成后必须调用：此前若用 fallback 字体宽度测量过，
 * 错误的折行结果会永久留在缓存里，导致渲染端（字体已加载）行宽超限被裁。
 */
export function clearMeasureCaches(): void {
  _wrapCache.clear()
  _parseCache.clear()
}


export function splitTextForWrapping(text: string): string[] {
  return (
    text.match(/[A-Za-z0-9]+(?:[._'’&/+:-][A-Za-z0-9]+)*|[ \t]+|\n|./gu) ?? []
  )
}


function explodeInlineTokens(tokens: InlineToken[]): InlineToken[] {
  return tokens.flatMap((token) =>
    splitTextForWrapping(token.text).map((unit) => ({
      text: unit,
      bold: token.bold,
      italic: token.italic,
      mark: token.mark,
      underline: token.underline,
    })),
  )
}


export function getBodyTokenWidth(token: InlineToken, fontSize: number, fontFamily?: string, bodyFontWeight?: number): number {
  if (token.text === '\n') return 0
  const baseWeight = bodyFontWeight ?? BODY_TEXT_WEIGHT
  const weight = token.bold ? BODY_BOLD_WEIGHT : baseWeight
  const family = fontFamily ?? BODY_FONT_FAMILY
  const fontStyle = token.italic ? 'italic ' : ''
  const font = `${fontStyle}${weight} ${fontSize}px ${family}`
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
  if (token.text.length <= 1 || getBodyTokenWidth(token, fontSize, fontFamily, bodyFontWeight) <= maxWidth)
    return [token]
  return Array.from(token.text).map((char) => ({ ...token, text: char }))
}


function wrapCacheKey(tokens: InlineToken[], fontSize: number, maxWidth: number, fontFamily?: string, bodyFontWeight?: number): string {
  
  
  
  
  
  let sig = ''
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!
    sig += JSON.stringify([t.bold ? 1 : 0, t.italic ? 1 : 0, t.mark ? 1 : 0, t.underline ? 1 : 0, t.text])
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
  

  const pattern = /(\*\*[\s\S]+?\*\*|==[\s\S]+?==|\^[\s\S]+?\^|(?<!\*)\*[\s\S]+?\*(?!\*))/g
  const parts = text.split(pattern).filter(Boolean)

  for (const part of parts) {
    
    const boldMatch = part.match(/^\*\*([\s\S]+)\*\*$/)
    if (boldMatch) {
      tokens.push({ text: boldMatch[1]!, bold: true, italic: false, mark: false, underline: false })
      continue
    }
    
    const markMatch = part.match(/^==([\s\S]+)==$/)
    if (markMatch) {
      tokens.push({ text: markMatch[1]!, bold: false, italic: false, mark: true, underline: false })
      continue
    }
    
    const underlineMatch = part.match(/^\^([\s\S]+)\^$/)
    if (underlineMatch) {
      tokens.push({ text: underlineMatch[1]!, bold: false, italic: false, mark: false, underline: true })
      continue
    }
    
    const italicMatch = part.match(/^\*([\s\S]+)\*$/)
    if (italicMatch) {
      tokens.push({ text: italicMatch[1]!, bold: false, italic: true, mark: false, underline: false })
      continue
    }
    tokens.push({ text: part, bold: false, italic: false, mark: false, underline: false })
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




export function getPosterMetrics(
  _page: CardPage,
  settings: TypographySettings,
  footerEnabled: boolean,
  theme?: ThemeDefinition,
): PosterMetrics {
  const bodySize = Math.max(21, settings.bodySize - 4)
  const bodyLineHeight = bodySize * Math.max(1.58, settings.lineHeight - 0.06)
  const bodyParagraphGap = Math.max(30, bodySize * 1.25)

  const inset = theme?.contentInset ?? {}
  const topPad = inset.top ?? 0
  const bottomPad = inset.bottom ?? 0
  const leftPad = inset.left ?? 0
  const rightPad = inset.right ?? 0

  const separatorY = 110 + topPad
  const bodyTopY = separatorY + 10
  const bodyBottomY = (footerEnabled ? BODY_BOTTOM_WITH_FOOTER : BODY_BOTTOM_WITHOUT_FOOTER) - bottomPad

  return {
    bodySize,
    bodyLineHeight,
    bodyParagraphGap,
    bodyFontFamily: getBodyFontFamily(settings.bodyFontMode),
    separatorY,
    bodyTopY,
    bodyBottomY,
    bodyWidth: CONTENT_WIDTH - leftPad - rightPad,
  }
}