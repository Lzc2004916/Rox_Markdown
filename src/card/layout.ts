


import type {
  CardPage,
  InlineLine,
  ParagraphBlock,
  InlineToken,
  LayoutOptions,
  Block,
  TextBlock,
  CodeBlock,
  TableDisplayBlock,
  ColumnContainerBlock,
  ListBlock,
  ListItem,
  HeadingLevel,
  LayoutResult,
  ImageBlock,
} from './types'
import {
  getPosterMetrics,
  getGapBetweenBlocks,
  measureParagraphBlock,
  getParagraphMaxLines,
  measureListBlock,
  measureListItem,
  resolveContentInsets,
  parseInlineMarkdown,
  splitGraphemes,
} from './measure'
import { measureCodeBlock } from './code-renderer'
import { measureTableBlock } from './table-renderer'
import {
  getBodyFontFamily,
  BODY_TEXT_WEIGHT,
  BODY_BOTTOM_WITH_FOOTER,
  BODY_BOTTOM_WITHOUT_FOOTER,
  DEFAULT_LIST_STYLE,
  COLUMN_GAP,
} from './types'
import type { ThemeDefinition } from './types'
import { parseImageAttrs, DEFAULT_IMAGE_HEIGHT } from './imageMarkdown'



function isMarkdownDividerLine(line: string): boolean {
  return /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())
}


function isHeadingLine(line: string): boolean {
  return /^#{1,6}\s+\S/.test(line.trim())
}


function isQuoteLine(line: string): boolean {
  return /^>\s?(.*)$/.test(line.trim())
}


export function getParagraphBlock(text: string): TextBlock {
  const trimmed = text.trim()
  if (isMarkdownDividerLine(trimmed)) {
    return { kind: 'divider', raw: '' }
  }
  const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
  if (headingMatch) {
    return {
      kind: 'subheading',
      raw: headingMatch[2]!.trim(),
      headingLevel: headingMatch[1]!.length as HeadingLevel,
    }
  }
  const quoteMatch = trimmed.match(/^>\s?(.*)$/)
  if (quoteMatch) {
    return { kind: 'quote', raw: quoteMatch[1]!.trim() }
  }
  return { kind: 'body', raw: trimmed }
}




const UNORDERED_LIST_RE = /^(\s*)([-*+])\s+(.+)$/


const ORDERED_LIST_RE = /^(\s*)(\d+)([.)])\s+(.+)$/


function isListItemLine(line: string): boolean {
  return UNORDERED_LIST_RE.test(line) || ORDERED_LIST_RE.test(line)
}


function isUnorderedListItem(line: string): boolean {
  return UNORDERED_LIST_RE.test(line)
}


function getListItemIndent(line: string): number {
  const match = line.match(/^(\s*)/)
  const spaces = match ? match[1]!.length : 0
  return Math.floor(spaces / 2)
}


function getListItemText(line: string): string {
  const uMatch = line.match(UNORDERED_LIST_RE)
  if (uMatch) return uMatch[3]!.trim()
  const oMatch = line.match(ORDERED_LIST_RE)
  if (oMatch) return oMatch[4]!.trim()
  return line.trim()
}






function isFenceOpen(line: string): boolean {
  return /^```\S*$/.test(line.trim()) || /^~~~\S*$/.test(line.trim())
}

/** 检测关闭围栏代码块的行。 */
function isFenceClose(line: string): boolean {
  const t = line.trim()
  return t === '```' || t === '~~~'
}

/** 从围栏起始符中提取语言标识符（例如 "```js" → "js"）。 */
function getFenceLang(line: string): string {
  const m = line.trim().match(/^```(\S+)$/)
  return m ? m[1]! : ''
}

/** 检测管道表格行（以 | 开头和结尾）。 */
function isTableLine(line: string): boolean {
  return /^\|.*\|$/.test(line.trim())
}

/** 解析表格分隔行以提取对齐方式。 */
function parseTableAlignments(line: string): ('left' | 'center' | 'right')[] {
  return line
    .trim()
    .split('|')
    .filter(Boolean)
    .map((cell) => {
      const t = cell.trim()
      if (t.startsWith(':') && t.endsWith(':')) return 'center'
      if (t.endsWith(':')) return 'right'
      return 'left'
    })
}

/** 将管道表格单元格行分割为单个单元格。 */
function splitTableCells(line: string): string[] {
  return line
    .trim()
    .split('|')
    .filter((_, i, arr) => i > 0 && i < arr.length - 1) // skip outer empty
    .map((c) => c.trim())
}

/**
 * 状态机解析器，将原始 markdown 源文本转换为 Block[]。
 *
 * 处理多行结构：
 * - 围栏代码块 (``` ... ```)
 * - 表格 (连续的 |...| 行)
 * - 列容器 (:::left / :::right ... :::)
 * - 普通文本（按空行分割，通过 getParagraphBlock 分类）
 */
export function parseInputBlocks(raw: string): Block[] {
  const lines = raw.split('\n')
  const blocks: Block[] = []
  let i = 0


  /** Push buffered text as TextBlock(s) using blank-line splitting.
   *  Also splits on heading and blockquote (`>`) boundaries within
   *  multi-line text so that headings / quotes mixed with body text
   *  (without a blank-line separator) are still correctly identified
   *  as their own blocks.
   *
   *  关键修复：此前引用行（`>` 开头）不是块边界，当引用块紧跟正文、
   *  仅以单个换行分隔（无空行）时，会被合并进正文块而丢失引用样式——
   *  表现为「引用效果必须手动换行（加空行）才出现」。现在 `>` 行与
   *  标题一样会成为独立块边界，且连续 `>` 行合并为同一多行引用块。 */
  function flushTextBuffer(buf: string): void {
    const trimmed = buf.trim()
    if (!trimmed) return
    // 首先按空行分割（标准段落分隔）
    const paragraphs = trimmed.split(/\n{2,}/)
    for (const para of paragraphs) {
      if (!para.trim()) continue

      const lines = para.split('\n')
      let bodyBuffer = ''
      let quoteBuffer = ''
      const flushBody = () => {
        if (bodyBuffer.trim()) {
          blocks.push(getParagraphBlock(bodyBuffer.trim()))
          bodyBuffer = ''
        }
      }
      const flushQuote = () => {
        if (quoteBuffer.trim()) {
          blocks.push({ kind: 'quote', raw: quoteBuffer.trim() })
          quoteBuffer = ''
        }
      }

      for (let li = 0; li < lines.length; li++) {
        const line = lines[li]!
        if (isHeadingLine(line)) {
          // 标题前先刷新已累积的引用与正文
          flushQuote()
          flushBody()
          // 将标题本身作为独立块推送，以便
          // getParagraphBlock 能正确匹配标题正则表达式。
          blocks.push(getParagraphBlock(line.trim()))
        } else if (isQuoteLine(line)) {
          // 进入 / 继续引用块：先刷新正文，再把去前缀后的内容并入引用
          flushBody()
          const m = line.trim().match(/^>\s?(.*)$/)
          const content = m ? m[1]! : ''
          quoteBuffer += (quoteBuffer ? '\n' : '') + content
        } else {
          // 普通行：若正在累积引用，先刷新引用块
          flushQuote()
          bodyBuffer += (bodyBuffer ? '\n' : '') + line
        }
      }
      flushQuote()
      flushBody()
    }
  }

  let textBuffer = ''

  while (i < lines.length) {
    const line = lines[i]!

    // ── Fenced code block ──────────────────────────────────────
    if (isFenceOpen(line)) {
      flushTextBuffer(textBuffer)
      textBuffer = ''
      const lang = getFenceLang(line)
      const codeLines: string[] = []
      i++
      while (i < lines.length && !isFenceClose(lines[i]!)) {
        codeLines.push(lines[i]!)
        i++
      }
      const code = codeLines.join('\n')
      if (lang.toLowerCase() === 'mermaid') {
        blocks.push({
          kind: 'code',
          language: 'mermaid',
          code,
        } as CodeBlock)
      } else {
        blocks.push({
          kind: 'code',
          language: lang,
          code,
        } as CodeBlock)
      }
      i++ // skip closing fence
      continue
    }


    // ── Image (整行或跨行的 ![alt](src){#img1}{height=xxx}) ──────────────────
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)((?:\s*\{[^{}]*\})*)$/)
    const imgStartMatch = line.trim().match(/^!\[([^\]]*)\]$/)
    if (imgMatch || imgStartMatch) {
      flushTextBuffer(textBuffer)
      textBuffer = ''
      let alt = ''
      let src = ''
      let height = DEFAULT_IMAGE_HEIGHT
      let key: string | undefined
      if (imgMatch) {
        alt = imgMatch[1] || ''
        src = imgMatch[2] || ''
        const attrs = parseImageAttrs(imgMatch[3] ?? '')
        if (attrs.height != null) height = attrs.height
        key = attrs.key
        i++
      } else {
        // 跨行：alt 在这一行，url 在下一行
        alt = imgStartMatch![1] || ''
        i++
        // 跳过空行，找下一行的 (src)
        while (i < lines.length && !lines[i]!.trim()) i++
        if (i < lines.length) {
          const urlMatch = lines[i]!.trim().match(/^\(\s*([^)]+)\s*\)((?:\s*\{[^{}]*\})*)$/)
          if (urlMatch) {
            src = urlMatch[1]
            const attrs = parseImageAttrs(urlMatch[2] ?? '')
            if (attrs.height != null) height = attrs.height
            key = attrs.key
            i++
          }
        }
      }
      blocks.push({
        kind: 'image',
        alt,
        src,
        height,
        key,
      })
      continue
    }

    // ── Table (consecutive |...| lines) ────────────────────────
    if (isTableLine(line)) {
      flushTextBuffer(textBuffer)
      textBuffer = ''
      const tableLines: string[] = [line]
      i++
      while (i < lines.length && isTableLine(lines[i]!)) {
        tableLines.push(lines[i]!)
        i++
      }
      if (tableLines.length >= 2) {
        const headers = splitTableCells(tableLines[0]!)
        const alignments = parseTableAlignments(tableLines[1]!)
        const rows = tableLines.slice(2).map(splitTableCells)
        blocks.push({
          kind: 'table',
          headers,
          alignments,
          rows,
        } as TableDisplayBlock)
      } else {
        // 单个 |行| — 作为正文文本处理
        blocks.push(getParagraphBlock(line))
      }
      continue
    }

    // ── Column container (:::left / :::right / :::center ... :::) ──
    const colMatch = line.trim().match(/^:::(left|right|center)\s*$/)
    if (colMatch) {
      flushTextBuffer(textBuffer)
      textBuffer = ''
      const colType = colMatch[1]!
      const colLines: string[] = []
      i++
      while (i < lines.length && lines[i]!.trim() !== ':::') {
        colLines.push(lines[i]!)
        i++
      }
      i++ // skip closing :::

      if (colType === 'center') {
        // 居中列：解析内容并将每个块居中
        const innerBlocks = parseInputBlocks(colLines.join('\n'))
        for (const b of innerBlocks) blocks.push(b)
      } else if (colType === 'left') {
        // 向前查找 :::right 配对
        const rightLines: string[] = []
        if (i < lines.length && lines[i]!.trim() === ':::right') {
          i++
          while (i < lines.length && lines[i]!.trim() !== ':::') {
            rightLines.push(lines[i]!)
            i++
          }
          i++ // skip closing :::
        }
        const leftBlocks = parseInputBlocks(colLines.join('\n'))
        const rightBlocks = rightLines.length > 0
          ? parseInputBlocks(rightLines.join('\n'))
          : []
        blocks.push({
          kind: 'columnContainer',
          leftBlocks,
          rightBlocks,
        } as ColumnContainerBlock)
      } else {
        // :::right without preceding :::left — treat as single column
        const innerBlocks = parseInputBlocks(colLines.join('\n'))
        for (const b of innerBlocks) blocks.push(b)
      }
      continue
    }

    // ── List block (consecutive list items of the SAME type) ──
    if (isListItemLine(line)) {
      flushTextBuffer(textBuffer)
      textBuffer = ''

      // 逐段处理：连续「同类型」的列表项合并为一个块；无序/有序切换时拆分为新块，
      // 避免「- 项」和「1. 项」被合并成单一列表、导致某一种标记丢失。
      while (i < lines.length && isListItemLine(lines[i]!)) {
        const firstLine = lines[i]!
        const isOrdered = !isUnorderedListItem(firstLine)

        // 有序列表：解析起始序号（如 "3. xxx" 的 3），切块/跨页后编号仍连续
        const start = isOrdered
          ? Number(firstLine.match(ORDERED_LIST_RE)?.[2] ?? 1)
          : undefined

        const listItems: ListItem[] = []
        while (i < lines.length && isListItemLine(lines[i]!)) {
          const curLine = lines[i]!
          const curIsOrdered = !isUnorderedListItem(curLine)
          if (curIsOrdered !== isOrdered) break // 类型切换，拆分为新块
          listItems.push({
            text: getListItemText(curLine),
            indent: getListItemIndent(curLine),
          })
          i++
        }

        blocks.push({
          kind: isOrdered ? 'orderedList' : 'unorderedList',
          items: listItems,
          start,
        } as ListBlock)
      }
      continue
    }

    // ── Regular text ───────────────────────────────────────────
    // 如果该行是标题且缓冲区已有内容，
// 先刷新缓冲区，使标题从自己的块开始。
    if (isHeadingLine(line) && textBuffer.trim()) {
      flushTextBuffer(textBuffer)
      textBuffer = ''
    }
    textBuffer += (textBuffer ? '\n' : '') + line
    i++
  }

  // 刷新剩余文本
  flushTextBuffer(textBuffer)
  return blocks
}

// ═══════════════════════════════════════════════════════════════════════════
// 段落序列化
// ═══════════════════════════════════════════════════════════════════════════

function serializeParagraphBlock(raw: string, kind: ParagraphBlock['kind'], headingLevel?: number): string {
  const trimmed = raw.trim()
  if (kind === 'divider') return '---'
  if (!trimmed) return ''
  if (kind === 'quote') return `> ${trimmed}`
  if (kind === 'subheading') return `${'#'.repeat(headingLevel || 1)} ${trimmed}`
  return trimmed
}

function serializeInlineTokens(tokens: InlineToken[]): string {
  return tokens
    .map((t) => {
      // 顺序很重要：粗体 (**) 在斜体 (*) 之前，避免歧义
      if (t.bold) return `**${t.text}**`
      if (t.italic) return `*${t.text}*`
      if (t.mark) return `==${t.text}==`
      if (t.underline) return `^${t.text}^`
      return t.text
    })
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim()
}

// ═══════════════════════════════════════════════════════════════════════════
// 段落分割
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 检测文本中是否包含内联 markdown 格式化标记。
 * 用于防止分割操作意外截断 **bold**、*italic*、==highlight== 或 ^underline^。
 */
function hasInlineMarkdownMarkers(text: string): boolean {
  return /(\*\*|(?<!\*)\*(?!\*)|==|\^)/.test(text)
}

/** 将长段落分割为约 chunkSize 个字符的块。 */
function splitLongParagraph(raw: string, chunkSize: number): string[] {
  const text = raw.trim()
  if (text.length <= chunkSize + 40) return [text]

  // 首先尝试按手动换行符分割
  const manualLines = text.split('\n')
  if (manualLines.length > 1) {
    // 如果包含格式化标记，则需要更保守地进行分割：
    // 逐行累积，但在遇到格式化标记跨行时保持完整。
    const hasFormatting = hasInlineMarkdownMarkers(text)
    const chunks: string[] = []
    let current = ''
    for (const line of manualLines) {
      const candidate = current ? `${current}\n${line}` : line
      if (candidate.length > chunkSize && current) {
        // 如果当前 chunk 已有格式化标记，确保分割点不在标记内部
        if (hasFormatting && hasInlineMarkdownMarkers(current)) {
          // 检查 candidate 中是否还有未闭合的标记（即标记跨越了换行符）
          const openBold = (current.match(/\*\*/g) || []).length % 2 !== 0
          const openMark = (current.match(/==/g) || []).length % 2 !== 0
          const openUnderline = (current.match(/\^/g) || []).length % 2 !== 0
          // 计算单 * 数量（排除 ** 中的 *）
          const singleStars = current.match(/(?<!\*)\*(?!\*)/g) || []
          const openItalic = singleStars.length % 2 !== 0
          if (openBold || openItalic || openMark || openUnderline) {
            // 标记未闭合 — 暂不分块，继续累积直到标记闭合
            current = candidate
            continue
          }
        }
        chunks.push(current.trim())
        current = line
      } else {
        current = candidate
      }
    }
    if (current.trim()) chunks.push(current.trim())
    return chunks
  }

  // 按句子边界分割
  const sentences = text
    .split(/(?<=[。！？!?；;])/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (sentences.length <= 1) {
    // 如果包含格式化标记，禁止按字符位置切分，避免截断标记
    if (hasInlineMarkdownMarkers(text)) return [text]
    const slices: string[] = []
    let cursor = 0
    while (cursor < text.length) {
      slices.push(text.slice(cursor, cursor + chunkSize).trim())
      cursor += chunkSize
    }
    return slices.filter(Boolean)
  }

  // 按句子累积，遇到格式化标记的句子时保持完整
  const chunks: string[] = []
  let current = ''
  for (const sentence of sentences) {
    const candidate = `${current}${sentence}`
    if (candidate.length > chunkSize && current) {
      // 在格式化文本边界保持句子完整
      if (hasInlineMarkdownMarkers(sentence) && current.length < chunkSize * 0.5) {
        // 当前积累较少，将格式化句子附加到当前块以避免拆分
        current = candidate
        continue
      }
      chunks.push(current.trim())
      current = sentence
    } else {
      current = candidate
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

function splitInlineLines(
  lines: InlineLine[],
  count: number,
): {
  takenLines: InlineLine[]
  restLines: InlineLine[]
  takenRaw: (kind: ParagraphBlock['kind'], headingLevel?: number) => string
  restRaw: (kind: ParagraphBlock['kind'], headingLevel?: number) => string
} {
  const taken = lines.slice(0, count)
  const rest = lines.slice(count)
  return {
    takenLines: taken,
    restLines: rest,
    takenRaw: (kind, headingLevel) =>
      serializeParagraphBlock(
        serializeInlineTokens(taken.flatMap((l) => l.tokens)),
        kind,
        headingLevel,
      ),
    restRaw: (kind, headingLevel) =>
      serializeParagraphBlock(
        serializeInlineTokens(rest.flatMap((l) => l.tokens)),
        kind,
        headingLevel,
      ),
  }
}

/**
 * 由行片段构建文本块（跨页行切分的治本防丢字）。
 * raw 保留序列化文本（保真/调试/后续再切分用），prefixedLines 挂载预切行：
 * 渲染端与测量端直接使用这些行，不再对 raw 二次折行——
 * 从根上避免"序列化 → 重折行"不一致导致行尾字符两页都不出现。
 */
function makeLineSplitBlock(
  lines: InlineLine[],
  kind: ParagraphBlock['kind'],
  headingLevel?: number,
): TextBlock {
  const raw = serializeParagraphBlock(
    serializeInlineTokens(lines.flatMap((l) => l.tokens)),
    kind,
    headingLevel,
  )
  const block = getParagraphBlock(raw) as TextBlock
  block.prefixedLines = lines
  return block
}

// ═══════════════════════════════════════════════════════════════════════════
// 块高度估算（非文本块）
// ═══════════════════════════════════════════════════════════════════════════

/** 估计非文本块用于布局目的的渲染高度。 */
function estimateBlockHeight(
  block: Block,
  bodySize: number,
  bodyLineHeight?: number,
  maxWidth?: number,
  theme?: ThemeDefinition,
  fontFamily?: string,
  settings?: LayoutOptions['settings'],
  headingOverrides?: LayoutOptions['headingOverrides'],
  bodyFontWeight?: number,
): number {
  switch (block.kind) {
    case 'code': {
      const cb = block as CodeBlock
      // 使用 measureCodeBlock，它现在会考虑行换行。
// 这确保布局引擎和渲染器对高度达成一致。
      try {
        const { height } = measureCodeBlock(cb, bodySize, maxWidth)
        return height
      } catch {
        // 回退：测量失败时的粗略估算
        const lineCount = cb.code.split('\n').length
        const monoSize = bodySize * 0.92
        const monoLineHeight = monoSize * 1.5
        return 32 + lineCount * monoLineHeight
      }
    }
    case 'table': {
      const tb = block as TableDisplayBlock
      // 使用 measureTableBlock 精确计算行高（按列宽逐单元格折行），
      // 与渲染器 drawTableBlock 保持同一口径，避免低估导致溢出截断。
      // 测量值缓存到 block 上，渲染器可直接复用。
      try {
        const { totalHeight } = measureTableBlock(
          tb, bodySize, bodyLineHeight ?? bodySize * 1.8, fontFamily, maxWidth,
        )
        return totalHeight
      } catch {
        // 回退：测量失败时的粗略估算
        return 20 + (tb.rows.length + 1) * (bodySize * 1.8)
      }
    }
    case 'columnContainer': {
      if (!theme || !settings || bodyLineHeight === undefined || maxWidth === undefined) return 40
      const cc = block as ColumnContainerBlock
      const columnWidth = Math.max(1, (maxWidth - COLUMN_GAP) / 2)
      const measureColumn = (blocks: Block[]): number => {
        let height = 0
        let previous: ParagraphBlock | null = null
        for (const child of blocks) {
          const gap = previous
            ? getGapBetweenBlocks(
                previous, { kind: 'body', raw: '' },
                {
                  bodySize,
                  bodyLineHeight,
                  bodyParagraphGap: Math.max(30, bodySize * 1.25),
                  bodyFontFamily: fontFamily ?? getBodyFontFamily(settings.bodyFontMode),
                  separatorY: 0,
                  bodyTopY: 0,
                  bodyBottomY: Number.POSITIVE_INFINITY,
                  bodyLeftX: 0,
                  bodyRightX: columnWidth,
                  bodyWidth: columnWidth,
                  bodyHeight: Number.POSITIVE_INFINITY,
                },
                headingOverrides, theme, false,
              ) * 0.7
            : 0
          height += gap

          if (child.kind === 'body' || child.kind === 'quote' || child.kind === 'subheading' || child.kind === 'divider') {
            height += measureParagraphBlock(
              child, bodySize, bodyLineHeight, columnWidth, theme,
              settings.subheadingStyle, fontFamily, false, headingOverrides, bodyFontWeight,
            ).height
            previous = child
          } else {
            height += estimateBlockHeight(
              child, bodySize, bodyLineHeight, columnWidth, theme, fontFamily,
              settings, headingOverrides, bodyFontWeight,
            )
            previous = { kind: 'body', raw: '' }
          }
        }
        return height
      }
      return Math.max(measureColumn(cc.leftBlocks), measureColumn(cc.rightBlocks)) + 12
    }
    case 'orderedList':
    case 'unorderedList': {
      const lb = block as ListBlock
      // Use measureListBlock when theme metrics are available for
      // accurate height accounting (indentation, wrapping, item gaps).
      if (theme && bodyLineHeight !== undefined && maxWidth !== undefined) {
        try {
          const { totalHeight } = measureListBlock(
            lb, bodySize, bodyLineHeight, maxWidth, theme, fontFamily, bodyFontWeight,
          )
          return totalHeight
        } catch {
          // Fall through to simple estimate
        }
      }
      // Simple fallback estimate
      const lineH = bodySize * 1.55
      return 14 + lb.items.length * (lineH + 10) + 14
    }
    case 'image': {
      const imgBlock = block as ImageBlock
      // 用图片自己设置的高度 + 10px 间距
      return imgBlock.height + 10
    }
    default:
      return 40
  }
}

interface BlockSplitResult {
  head: Block
  tail: Block | null
}

function clearTableMeasurements(block: TableDisplayBlock): TableDisplayBlock {
  const { colWidths: _colWidths, rowHeights: _rowHeights, totalWidth: _totalWidth, ...source } = block
  return source
}

function getGraphemeBoundaries(text: string): number[] {
  const boundaries = [0]
  let offset = 0
  for (const grapheme of splitGraphemes(text)) {
    offset += grapheme.length
    boundaries.push(offset)
  }
  return boundaries
}

function splitCodeBlockToFit(
  block: CodeBlock,
  availableHeight: number,
  bodySize: number,
  availableWidth: number,
): BlockSplitResult | null {
  const boundaries = getGraphemeBoundaries(block.code)
  if (availableHeight <= 0 || boundaries.length < 3) return null

  let low = 1
  let high = boundaries.length - 2
  let bestBoundary = 0
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const splitAt = boundaries[mid]!
    const candidate: CodeBlock = {
      ...block,
      code: block.code.slice(0, splitAt),
      lineCount: undefined,
      suppressTrailingEmptyLine: block.code[splitAt - 1] === '\n',
    }
    if (measureCodeBlock(candidate, bodySize, availableWidth).height <= availableHeight) {
      bestBoundary = splitAt
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  if (bestBoundary === 0) return null

  const newline = block.code.lastIndexOf('\n', bestBoundary - 1)
  const splitAt = newline >= 0 ? newline + 1 : bestBoundary
  return {
    head: {
      ...block,
      code: block.code.slice(0, splitAt),
      lineCount: undefined,
      suppressTrailingEmptyLine: block.code[splitAt - 1] === '\n',
    },
    tail: splitAt < block.code.length
      ? {
          ...block,
          code: block.code.slice(splitAt),
          lineCount: undefined,
          suppressTrailingEmptyLine: false,
        }
      : null,
  }
}

function serializeInlineToken(token: InlineToken, text: string): string {
  if (token.bold) return `**${text}**`
  if (token.mark) return `==${text}==`
  if (token.underline) return `^${text}^`
  if (token.italic) return `*${text}*`
  return text
}

function splitInlineCell(text: string, count: number): { head: string; tail: string } {
  let remaining = count
  const head: string[] = []
  const tail: string[] = []
  for (const token of parseInlineMarkdown(text)) {
    const graphemes = splitGraphemes(token.text)
    const taken = graphemes.slice(0, remaining).join('')
    const rest = graphemes.slice(remaining).join('')
    if (taken) head.push(serializeInlineToken(token, taken))
    if (rest) tail.push(serializeInlineToken(token, rest))
    remaining = Math.max(0, remaining - graphemes.length)
  }
  return { head: head.join(''), tail: tail.join('') }
}

function splitTableRowToFit(
  block: TableDisplayBlock,
  row: string[],
  availableHeight: number,
  bodySize: number,
  bodyLineHeight: number,
  fontFamily: string,
  availableWidth: number,
): { head: string[]; tail: string[] } | null {
  const graphemeCounts = row.map(cell =>
    parseInlineMarkdown(cell).reduce((total, token) => total + splitGraphemes(token.text).length, 0),
  )
  const maxParts = Math.max(0, ...graphemeCounts)
  if (maxParts < 2) return null

  const makeParts = (count: number): { head: string[]; tail: string[] } => {
    const head: string[] = []
    const tail: string[] = []
    for (const cell of row) {
      const parts = splitInlineCell(cell ?? '', count)
      head.push(parts.head)
      tail.push(parts.tail)
    }
    return { head, tail }
  }

  let low = 1
  let high = maxParts - 1
  let best = 0
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const parts = makeParts(mid)
    const candidate = clearTableMeasurements({ ...block, rows: [parts.head] })
    if (measureTableBlock(candidate, bodySize, bodyLineHeight, fontFamily, availableWidth).totalHeight <= availableHeight) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  if (best === 0) return null
  const parts = makeParts(best)
  if (parts.tail.every(cell => cell.length === 0)) return null
  return parts
}

function splitTableBlockToFit(
  block: TableDisplayBlock,
  availableHeight: number,
  bodySize: number,
  bodyLineHeight: number,
  fontFamily: string,
  availableWidth: number,
): BlockSplitResult | null {
  if (availableHeight <= 0 || block.rows.length === 0) return null

  let low = 1
  let high = block.rows.length
  let best = 0
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const candidate = clearTableMeasurements({ ...block, rows: block.rows.slice(0, mid) })
    if (measureTableBlock(candidate, bodySize, bodyLineHeight, fontFamily, availableWidth).totalHeight <= availableHeight) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  if (best > 0) {
    if (best >= block.rows.length) return null
    return {
      head: clearTableMeasurements({ ...block, rows: block.rows.slice(0, best) }),
      tail: clearTableMeasurements({ ...block, rows: block.rows.slice(best) }),
    }
  }

  const splitRow = splitTableRowToFit(
    block, block.rows[0]!, availableHeight,
    bodySize, bodyLineHeight, fontFamily, availableWidth,
  )
  if (!splitRow) return null

  return {
    head: clearTableMeasurements({ ...block, rows: [splitRow.head] }),
    tail: clearTableMeasurements({ ...block, rows: [splitRow.tail, ...block.rows.slice(1)] }),
  }
}

function splitColumnContainerToFit(
  block: ColumnContainerBlock,
  availableHeight: number,
  measure: (candidate: ColumnContainerBlock) => number,
  measureSide: (side: 'leftBlocks' | 'rightBlocks', blocks: Block[]) => number,
  splitChild: (child: Block, childAvailableHeight: number) => BlockSplitResult | null,
): BlockSplitResult | null {
  const head: ColumnContainerBlock = { kind: 'columnContainer', leftBlocks: [], rightBlocks: [] }
  const leftBlocks = [...block.leftBlocks]
  const rightBlocks = [...block.rightBlocks]
  let leftIndex = 0
  let rightIndex = 0

  const appendOrSplit = (side: 'leftBlocks' | 'rightBlocks', index: number): { nextIndex: number; progressed: boolean } => {
    const source = side === 'leftBlocks' ? leftBlocks : rightBlocks
    const child = source[index]
    if (!child) return { nextIndex: index, progressed: false }

    const candidate = { ...head, [side]: [...head[side], child] }
    if (measure(candidate) <= availableHeight) {
      head[side] = candidate[side]
      return { nextIndex: index + 1, progressed: true }
    }

    const usedHeight = measureSide(side, head[side])
    const childSplit = splitChild(child, Math.max(0, availableHeight - usedHeight))
    if (!childSplit) return { nextIndex: index, progressed: false }

    const splitCandidate = { ...head, [side]: [...head[side], childSplit.head] }
    if (measure(splitCandidate) > availableHeight) return { nextIndex: index, progressed: false }

    head[side] = splitCandidate[side]
    source[index] = childSplit.tail ?? child
    return { nextIndex: childSplit.tail ? index : index + 1, progressed: true }
  }

  while (leftIndex < leftBlocks.length || rightIndex < rightBlocks.length) {
    let progressed = false
    if (leftIndex < leftBlocks.length) {
      const result = appendOrSplit('leftBlocks', leftIndex)
      leftIndex = result.nextIndex
      progressed ||= result.progressed
    }
    if (rightIndex < rightBlocks.length) {
      const result = appendOrSplit('rightBlocks', rightIndex)
      rightIndex = result.nextIndex
      progressed ||= result.progressed
    }
    if (!progressed) break
  }

  if (head.leftBlocks.length === 0 && head.rightBlocks.length === 0) return null
  if (leftIndex === leftBlocks.length && rightIndex === rightBlocks.length) return null
  return {
    head,
    tail: {
      kind: 'columnContainer',
      leftBlocks: leftBlocks.slice(leftIndex),
      rightBlocks: rightBlocks.slice(rightIndex),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 主分页引擎
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 将 markdown 源文本布局为卡片页面。
 *
 * 算法：
 * 1. 将 markdown 源文本解析为段落块
 * 2. 预分割长段落（>180 个字符）
 * 3. 通过测量高度在每个页面上累积段落
 * 4. 溢出时：尝试句子分割 → 尝试行分割 → 续到下一页
 */
export function layoutPages(opts: LayoutOptions): LayoutResult {
  const { source, settings, theme, footerEnabled, headingOverrides } = opts
  const bodyFontFamily = getBodyFontFamily(settings.bodyFontMode)
  const bodyFontWeight = settings.bodyFontWeight ?? theme.editor.bodyFontWeight ?? BODY_TEXT_WEIGHT

  const allBlocks = parseInputBlocks(source)
  const title = ''

  if (allBlocks.length === 0) {
    return {
      pages: [
        {
          id: 'page-1',
          kind: 'body',
          title: '',
          blocks: [{ kind: 'body', raw: '在左侧输入内容后，这里会生成卡片。' }],
        },
      ],
      truncated: false,
    }
  }

  // 预分割长文本段落
  const expandedParagraphs: Block[] = []
  for (const block of allBlocks) {
    if (block.kind === 'body' || block.kind === 'quote' || block.kind === 'subheading') {
      const chunkSize = 180
      const tb = block as TextBlock
      if (tb.raw.length <= chunkSize + 40) {
        expandedParagraphs.push(block)
      } else {
        const chunks = splitLongParagraph(tb.raw, chunkSize)
        for (const chunk of chunks) {
          expandedParagraphs.push(getParagraphBlock(serializeParagraphBlock(chunk, tb.kind, (tb as any).headingLevel)))
        }
      }
    } else {
      // 非文本块（代码、表格、列）— 保持原样
      expandedParagraphs.push(block)
    }
  }

  const pages: CardPage[] = []
  let truncated = false
  let currentParagraph = 0
  let carryParagraph: string | null = null
  let carryBlock: Block | null = null
  /** 跟踪携带的块是否来自扩展段落分割。 */
  let carryPendingWasSplit = false
  const pendingCarries: string[] = []
  const pendingWasSplits: boolean[] = []

  while (
    currentParagraph < expandedParagraphs.length ||
    carryParagraph ||
    carryBlock
  ) {
    const isCarriedBlock = Boolean(carryBlock)
    const currentBlock: Block | null = isCarriedBlock
      ? carryBlock!
      : carryParagraph
        ? getParagraphBlock(carryParagraph)
        : (expandedParagraphs[currentParagraph] ?? null)
    if (!currentBlock) break

    const pageKind =
      pages.length === 0 && title ? 'cover' : 'body'
    const page: CardPage = {
      id: `page-${pages.length + 1}`,
      kind: pageKind,
      title: pageKind === 'cover' ? title : '',
      blocks: [],
    }

    const metrics = getPosterMetrics(page, settings, footerEnabled, theme)
    let cursorY = metrics.bodyTopY
    let previousBlock: ParagraphBlock | null = null

    // ── Inner loop: fill current page ──────────────────────────

    while (true) {
      // 确定下一步要处理的内容
      let nextBlock: Block | null = null
      let nextIsCarried = false

      if (carryBlock) {
        nextBlock = carryBlock
        nextIsCarried = true
      } else if (carryParagraph) {
        nextBlock = getParagraphBlock(carryParagraph)
        nextIsCarried = true
      } else if (currentParagraph < expandedParagraphs.length) {
        nextBlock = expandedParagraphs[currentParagraph]!
        nextIsCarried = false
      } else {
        break // no more blocks
      }

      const block = nextBlock

      // ── For non-text blocks: measure and fit atomically ─────
      // 代码块、表格、多列：整块放置，不拆分
      if (block.kind === 'code' ||
          block.kind === 'table' ||
          block.kind === 'columnContainer' ||
          block.kind === 'image') {
        // 估算非文本块的高度（传入完整尺寸参数以获得准确列表高度）
        const estHeight = estimateBlockHeight(
          block, metrics.bodySize, metrics.bodyLineHeight,
          metrics.bodyWidth, theme, bodyFontFamily,
          settings, headingOverrides, bodyFontWeight,
        )
        const blockTop = cursorY + getGapBetweenBlocks(previousBlock, { kind: 'body', raw: '' }, metrics, headingOverrides, theme, pageKind === 'cover')
        const blockBottom = blockTop + estHeight

        // 记录图片块顶坐标，供动态高度上限计算（computeImageMaxHeights）
        if (block.kind === 'image') (block as ImageBlock).blockTop = blockTop

        if (blockBottom <= metrics.bodyBottomY) {
          page.blocks.push(block)
          cursorY = blockBottom
          previousBlock = { kind: 'body', raw: '' }
          if (nextIsCarried) {
            carryBlock = null
            carryParagraph = null
          } else {
            currentParagraph++
          }
          continue
        }

        const availableHeight = Math.max(0, metrics.bodyBottomY - blockTop)
        let split: BlockSplitResult | null = null
        if (block.kind === 'code') {
          split = splitCodeBlockToFit(block, availableHeight, metrics.bodySize, metrics.bodyWidth)
        } else if (block.kind === 'table') {
          split = splitTableBlockToFit(
            block, availableHeight, metrics.bodySize, metrics.bodyLineHeight,
            bodyFontFamily, metrics.bodyWidth,
          )
        } else if (block.kind === 'columnContainer') {
          const columnWidth = Math.max(1, (metrics.bodyWidth - COLUMN_GAP) / 2)
          const measureColumnCandidate = (candidate: ColumnContainerBlock): number =>
            estimateBlockHeight(
              candidate, metrics.bodySize, metrics.bodyLineHeight,
              metrics.bodyWidth, theme, bodyFontFamily,
              settings, headingOverrides, bodyFontWeight,
            )
          const measureColumnSide = (
            side: 'leftBlocks' | 'rightBlocks',
            blocks: Block[],
          ): number => measureColumnCandidate({
            kind: 'columnContainer',
            leftBlocks: side === 'leftBlocks' ? blocks : [],
            rightBlocks: side === 'rightBlocks' ? blocks : [],
          })
          const splitColumnChild = (child: Block, childAvailableHeight: number): BlockSplitResult | null => {
            if (child.kind === 'code') {
              return splitCodeBlockToFit(child, childAvailableHeight, metrics.bodySize, columnWidth)
            }
            if (child.kind === 'table') {
              return splitTableBlockToFit(
                child, childAvailableHeight, metrics.bodySize, metrics.bodyLineHeight,
                bodyFontFamily, columnWidth,
              )
            }
            if (child.kind === 'image') {
              if (childAvailableHeight <= 10 || child.height + 10 <= childAvailableHeight) return null
              return {
                head: { ...child, height: Math.max(1, childAvailableHeight - 10) },
                tail: null,
              }
            }
            if (child.kind === 'orderedList' || child.kind === 'unorderedList') {
              let low = 1
              let high = child.items.length - 1
              let best = 0
              while (low <= high) {
                const mid = Math.floor((low + high) / 2)
                const candidate: ListBlock = { ...child, items: child.items.slice(0, mid) }
                const height = measureListBlock(
                  candidate, metrics.bodySize, metrics.bodyLineHeight,
                  columnWidth, theme, bodyFontFamily, bodyFontWeight,
                ).totalHeight
                if (height <= childAvailableHeight) {
                  best = mid
                  low = mid + 1
                } else {
                  high = mid - 1
                }
              }
              if (best === 0 || best >= child.items.length) return null
              return {
                head: { ...child, items: child.items.slice(0, best) },
                tail: {
                  ...child,
                  items: child.items.slice(best),
                  start: (child.start ?? 1) + best,
                },
              }
            }
            if (child.kind === 'body' || child.kind === 'quote' || child.kind === 'subheading') {
              const measured = measureParagraphBlock(
                child, metrics.bodySize, metrics.bodyLineHeight, columnWidth,
                theme, settings.subheadingStyle, bodyFontFamily,
                false, headingOverrides, bodyFontWeight,
              )
              const maxLines = getParagraphMaxLines(
                child, childAvailableHeight, metrics.bodySize, metrics.bodyLineHeight,
                theme, settings.subheadingStyle, false, headingOverrides,
              )
              if (maxLines <= 0 || maxLines >= measured.lines.length) return null
              const parts = splitInlineLines(measured.lines, maxLines)
              const head = makeLineSplitBlock(parts.takenLines, child.kind, child.headingLevel)
              const tailLines = measured.lines.slice(maxLines)
              const tail = makeLineSplitBlock(tailLines, child.kind, child.headingLevel)
              return head.raw && tail.raw ? { head, tail } : null
            }
            return null
          }
          split = splitColumnContainerToFit(
            block, availableHeight, measureColumnCandidate, measureColumnSide, splitColumnChild,
          )
        }

        if (split) {
          page.blocks.push(split.head)
          carryBlock = split.tail
          carryParagraph = null
          if (!nextIsCarried) currentParagraph++
          break
        }

        // 不可拆分的图片仅在空页约束到正文高度；非空页先移动到下一页。
        if (block.kind === 'image' && page.blocks.length === 0) {
          const fittedHeight = Math.max(1, availableHeight - 10)
          const fittedImage: ImageBlock = { ...block, height: Math.min(block.height, fittedHeight), blockTop }
          page.blocks.push(fittedImage)
          cursorY = blockTop + fittedImage.height + 10
          if (nextIsCarried) carryBlock = null
          else currentParagraph++
          continue
        }

        if (page.blocks.length > 0) break

        // 单个子块本身超过整页且无法再拆时，保留该块并由渲染裁剪兜底，确保分页能继续推进。
        page.blocks.push(block)
        cursorY = blockBottom
        if (nextIsCarried) carryBlock = null
        else currentParagraph++
        continue
      }

      // ── 列表块：按项拆分，一页放几项算几项，剩下的带到下一页 ──
      if (block.kind === 'orderedList' || block.kind === 'unorderedList') {
        const listBlock = block as any
        const listStyle = theme.editor.list ?? DEFAULT_LIST_STYLE
        const bodyLineHeight = metrics.bodyLineHeight
        const fontSize = metrics.bodySize

        // 计算每一项的高度
        const itemHeights: number[] = []
        for (const item of listBlock.items) {
          const indent = item.indent * listStyle.indentPerLevel
          const effectiveMarkerSize = listBlock.kind === 'orderedList' ? fontSize : Math.round(fontSize * 0.9)
          const textWidth = Math.max(60, metrics.bodyWidth - indent - effectiveMarkerSize - 8)
          const { height } = measureListItem(item.text, fontSize, bodyLineHeight, textWidth, bodyFontFamily, bodyFontWeight)
          itemHeights.push(Math.max(height, bodyLineHeight))
        }

        const leadingGap = getGapBetweenBlocks(previousBlock, { kind: 'body', raw: '' } as any, metrics, headingOverrides, theme, pageKind === 'cover')
        const listPadding = 12
        let y = cursorY + leadingGap + listPadding
        let count = 0

        // 与 measureListBlock 使用相同盒模型：上下各 12px，项间使用 itemGap。
        for (let i = 0; i < listBlock.items.length; i++) {
          const itemBottom = y + itemHeights[i]! + (i > 0 ? listStyle.itemGap : 0)
          if (itemBottom + listPadding > metrics.bodyBottomY) break
          y = itemBottom
          count++
        }

        // 保护：空页且第一项特别高时至少放一项；非空页放不下则整块留到下一页
        if (count === 0) {
          if (page.blocks.length === 0) {
            count = 1
            y = cursorY + leadingGap + listPadding + itemHeights[0]!
          } else {
            break
          }
        }

        if (count > 0) {
          // 把这几项放进当前页
          page.blocks.push({
            ...listBlock,
            items: listBlock.items.slice(0, count),
          })
          cursorY = y + listPadding
          previousBlock = { kind: 'body', raw: '' } as any

          // 剩下的项带到下一页：结束当前页，由外层开新页继续排剩余项
          if (count < listBlock.items.length) {
            carryBlock = {
              ...listBlock,
              items: listBlock.items.slice(count),
              // 剩余项从「上一页已放完的下一号」继续编号，避免跨页后从 1 重新开始
              start: (listBlock.start ?? 1) + count,
            }
            if (!nextIsCarried) currentParagraph++
            break
          } else {
            carryBlock = null
            carryParagraph = null
            if (!nextIsCarried) currentParagraph++
            continue
          }
        }
      }

      // ── For text blocks: existing measurement + splitting ──
      // 如果块来自 expandedParagraphs（非 carry），直接使用它
      // to preserve headingLevel and block kind.  Carry text is re-serialized
      // with kind prefixes so getParagraphBlock has already correctly classified
      // it — don't re-parse from .raw (which lacks the prefix), use the block as-is.
      const blockRaw = (block as TextBlock).raw
      const paraBlock: TextBlock = nextIsCarried
        ? (block as TextBlock)
        : (block as TextBlock).kind === 'body'
          ? getParagraphBlock(blockRaw)
          : (block as TextBlock)
      const leadingGap = getGapBetweenBlocks(previousBlock, paraBlock, metrics, headingOverrides, theme, pageKind === 'cover')
      const { lines, height } = measureParagraphBlock(
        paraBlock,
        metrics.bodySize,
        metrics.bodyLineHeight,
        metrics.bodyWidth,
        theme,
        settings.subheadingStyle,
        bodyFontFamily,
        false,
        headingOverrides,
        bodyFontWeight,
      )
      const blockTop = cursorY + leadingGap
      const blockBottom = blockTop + height

      
      if (blockBottom <= metrics.bodyBottomY) {
        page.blocks.push(paraBlock)
        cursorY = blockBottom
        previousBlock = paraBlock
        if (nextIsCarried) {
          carryParagraph = null
          carryBlock = null
          if (!carryPendingWasSplit) {
            
          }
          carryPendingWasSplit = false
        } else {
          currentParagraph++
        }
        continue
      }

      
      // 句子切分已移除：长段落一律走行级切分（prefixedLines），避免大段空白和丢字
      if (page.blocks.length > 0) {
        const fillHeight = metrics.bodyBottomY - blockTop
        if (fillHeight > 0) {
          const fillMaxLines = getParagraphMaxLines(
            paraBlock, fillHeight, metrics.bodySize, metrics.bodyLineHeight,
            theme, settings.subheadingStyle,
            false, headingOverrides,
          )
          if (fillMaxLines > 0) {
            const fillSplit = splitInlineLines(lines, fillMaxLines)
            const fillTakenBlock = makeLineSplitBlock(
              fillSplit.takenLines, paraBlock.kind, (paraBlock as any).headingLevel,
            )
            if (fillTakenBlock.raw) {
              page.blocks.push(fillTakenBlock)
              cursorY = blockTop + (measureParagraphBlock(
                fillTakenBlock, metrics.bodySize, metrics.bodyLineHeight,
                metrics.bodyWidth, theme, settings.subheadingStyle, bodyFontFamily,
                false, headingOverrides,
                bodyFontWeight,
              )).height
              previousBlock = fillTakenBlock
              const fillRest = fillSplit.restRaw(paraBlock.kind, (paraBlock as any).headingLevel)
              if (fillRest) {
                pendingCarries.push(fillRest)
                pendingWasSplits.push(!nextIsCarried)
              }
              if (nextIsCarried) {
                carryParagraph = null
                carryBlock = null
              } else {
                currentParagraph++
              }
              continue
            }
          }
        }
        break
      }

      
      const remainingHeight = metrics.bodyBottomY - blockTop
      const maxLines = getParagraphMaxLines(
        paraBlock, remainingHeight, metrics.bodySize, metrics.bodyLineHeight,
        theme, settings.subheadingStyle,
        false, headingOverrides,
      )
      if (maxLines <= 0) break
      const headSplit = splitInlineLines(lines, maxLines)
      const rest = headSplit.restRaw(paraBlock.kind, (paraBlock as any).headingLevel)
      const takenBlock = makeLineSplitBlock(
        headSplit.takenLines, paraBlock.kind, (paraBlock as any).headingLevel,
      )
      if (takenBlock.raw) {
        page.blocks.push(takenBlock)
        cursorY = blockTop + (measureParagraphBlock(
          takenBlock, metrics.bodySize, metrics.bodyLineHeight,
          metrics.bodyWidth, theme, settings.subheadingStyle, bodyFontFamily,
          false, headingOverrides,
          bodyFontWeight,
        )).height
        previousBlock = takenBlock
      }
      if (rest) {
        pendingCarries.push(rest)
        pendingWasSplits.push(!nextIsCarried)
      }
      if (nextIsCarried) {
        carryParagraph = null
        carryBlock = null
      } else {
        currentParagraph++
      }
      continue
    }

    
    if (pendingCarries.length > 0) {
      carryParagraph = pendingCarries.shift()!
      carryBlock = null
      carryPendingWasSplit = pendingWasSplits.shift()!
    } else {
      carryParagraph = null
      // 不要清空 carryBlock：列表拆分会把剩余项放在 carryBlock，内层循环 break 后
      // 需原样带到下一页。若此处无条件清空，列表剩余项会丢失（历史 bug）。
    }

    
    
    
    if (page.blocks.length === 0) {
      truncated = true
      break
    }

    pages.push(page)
    if (pages.length > 500) {
      truncated = true
      break
    }
  }

  return { pages, truncated }
}

// ═══════════════════════════════════════════════════════════════════════════
// 图片动态高度上限
// ═══════════════════════════════════════════════════════════════════════════

/** 图片高度下限（px） */
export const IMAGE_HEIGHT_MIN = 50
/** 图片高度硬上限（px） */
export const IMAGE_HEIGHT_MAX = 600
/** 图片块底部间距（px），与 estimateBlockHeight 的 `height + 10` 保持一致 */
const IMAGE_BLOCK_GAP = 10

/**
 * 计算每张图片的动态高度上限（key → maxHeight）。
 * 公式：clamp(50, 所在页 bodyBottomY − 图片块顶 blockTop − 底部间距, 600)。
 * bodyBottomY 只受主题安全区(bottom)与页脚开关影响，全页一致；blockTop 由
 * 排版阶段记录在图片块上。无 key / 未排版（blockTop 缺失）的图片不出现在结果里。
 */
export function computeImageMaxHeights(
  pages: CardPage[],
  theme: ThemeDefinition | undefined,
  footerEnabled: boolean,
): Record<string, number> {
  const bottomPad = resolveContentInsets(theme).bottom
  const bodyBottomY = (footerEnabled ? BODY_BOTTOM_WITH_FOOTER : BODY_BOTTOM_WITHOUT_FOOTER) - bottomPad
  const map: Record<string, number> = {}
  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.kind !== 'image') continue
      const img = block as ImageBlock
      if (!img.key || img.blockTop == null) continue
      const available = bodyBottomY - img.blockTop - IMAGE_BLOCK_GAP
      // floor 保证结果为整数：既避免把小数高度写进 markdown，也保证"高度<=上限"收敛不震荡
      map[img.key] = Math.floor(Math.min(IMAGE_HEIGHT_MAX, Math.max(IMAGE_HEIGHT_MIN, available)))
    }
  }
  return map
}
