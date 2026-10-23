


import type { InlineFormatColors, ThemeDefinition, TableDisplayBlock } from './types'
import { CONTENT_WIDTH, BODY_FONT_FAMILY, BODY_TEXT_WEIGHT, BODY_BOLD_WEIGHT } from './types'
import { parseInlineMarkdown, wrapInlineTokensByWidth, getBodyTokenWidth } from './measure'
import { getFormulaAsset } from './formula-loader'
import { resolveInlineDecorationColor, resolveInlineTextColor } from './inline-format-colors'



const CELL_PADDING_X = 10
const CELL_PADDING_Y = 8
const MIN_COL_WIDTH = 60
const HEADER_SEP_HEIGHT = 3
const BORDER_WIDTH = 0.8
const OUTER_BORDER_WIDTH = 1.2




export function measureTableBlock(
  block: TableDisplayBlock,
  fontSize: number,
  lineHeight: number,
  fontFamily?: string,
  availableWidth = CONTENT_WIDTH,
): { colWidths: number[]; rowHeights: number[]; totalWidth: number; totalHeight: number } {
  const tableWidth = Math.max(1, availableWidth)
  const numCols = block.headers.length
  if (numCols === 0) {
    return { colWidths: [], rowHeights: [], totalWidth: tableWidth, totalHeight: 40 }
  }

  
  const allRows = [block.headers, ...block.rows]
  const colTextWidths: number[][] = Array.from({ length: numCols }, () => [])

  for (const row of allRows) {
    for (let ci = 0; ci < Math.min(numCols, row.length); ci++) {
      const cellText = row[ci] ?? ''
      
      const font = `${BODY_BOLD_WEIGHT} ${fontSize}px ${fontFamily ?? BODY_FONT_FAMILY}`
      const ctx = document.createElement('canvas').getContext('2d')
      if (ctx) {
        ctx.font = font
        colTextWidths[ci]!.push(ctx.measureText(cellText).width + CELL_PADDING_X * 2)
      } else {
        colTextWidths[ci]!.push(cellText.length * fontSize * 0.6 + CELL_PADDING_X * 2)
      }
    }
  }

  
  const minColumnWidth = Math.max(CELL_PADDING_X * 2 + 1, Math.min(MIN_COL_WIDTH, tableWidth / numCols))
  const naturalWidths = colTextWidths.map((widths) => Math.max(minColumnWidth, ...widths))
  const totalNatural = naturalWidths.reduce((a, b) => a + b, 0)

  let colWidths: number[]
  if (totalNatural <= tableWidth) {
    const extra = tableWidth - totalNatural
    colWidths = naturalWidths.map((w) => w + extra / numCols)
  } else {
    const scale = tableWidth / totalNatural
    colWidths = naturalWidths.map((w) => w * scale)
  }

  
  const rowHeights: number[] = []
  for (let ri = 0; ri < allRows.length; ri++) {
    const row = allRows[ri]!
    let maxLines = 1
    for (let ci = 0; ci < Math.min(numCols, row.length); ci++) {
      const cellText = row[ci] ?? ''
      const colWidth = colWidths[ci]!
      const availableWidth = colWidth - CELL_PADDING_X * 2
      if (availableWidth <= 0) continue
      
      try {
        const tokens = parseInlineMarkdown(cellText)
        const lines = wrapInlineTokensByWidth(
          tokens, fontSize, availableWidth, fontFamily ?? BODY_FONT_FAMILY,
          ri === 0 ? BODY_BOLD_WEIGHT : BODY_TEXT_WEIGHT,
        )
        if (lines.length > maxLines) maxLines = lines.length
      } catch {
        
        const estLines = Math.ceil(cellText.length * fontSize * 0.6 / availableWidth)
        if (estLines > maxLines) maxLines = estLines
      }
    }
    rowHeights.push(maxLines * lineHeight + CELL_PADDING_Y * 2)
  }

  const totalWidth = colWidths.reduce((a, b) => a + b, 0)
  const totalHeight = rowHeights.reduce((a, b) => a + b, 0) + HEADER_SEP_HEIGHT

  
  block.colWidths = colWidths
  block.rowHeights = rowHeights
  block.totalWidth = totalWidth

  return { colWidths, rowHeights, totalWidth, totalHeight }
}




export function drawTableBlock(
  ctx: CanvasRenderingContext2D,
  block: TableDisplayBlock,
  x: number,
  y: number,
  fontSize: number,
  lineHeight: number,
  theme: ThemeDefinition,
  fontFamily?: string,
  availableWidth = CONTENT_WIDTH,
  bodyTextColor?: string | null,
  formatColors?: InlineFormatColors,
): number {
  const numCols = block.headers.length
  if (numCols === 0) return 0

  
  const measured = measureTableBlock(block, fontSize, lineHeight, fontFamily, availableWidth)
  const colWidths = measured.colWidths
  const rowHeights = measured.rowHeights
  const totalWidth = colWidths.reduce((a: number, b: number) => a + b, 0)
  const totalHeight = rowHeights.reduce((a: number, b: number) => a + b, 0) + HEADER_SEP_HEIGHT
  const allRows = [block.headers, ...block.rows]

  let cursorY = y

  
  function drawCellText(
    text: string,
    cx: number,
    cy: number,
    cw: number,
    cellHeight: number,
    isBold: boolean,
    _alignment: 'left' | 'center' | 'right',
  ): void {
    const availableWidth = cw - CELL_PADDING_X * 2
    if (availableWidth <= 0) return

    const tokens = parseInlineMarkdown(text)
    const fontWeight = isBold ? BODY_BOLD_WEIGHT : BODY_TEXT_WEIGHT
    const activeFontFamily = fontFamily ?? BODY_FONT_FAMILY
    const lines = wrapInlineTokensByWidth(tokens, fontSize, availableWidth, activeFontFamily, fontWeight)

    ctx.save()
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily ?? BODY_FONT_FAMILY}`
    ctx.fillStyle = bodyTextColor ?? theme.palette.text
    ctx.textBaseline = 'alphabetic'

    // 垂直居中：计算文字总高度，整体往下偏移
    const totalTextHeight = lines.length * lineHeight
    const startYOffset = (cellHeight - totalTextHeight) / 2

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]!
      let lineWidth = 0
      for (const token of line.tokens) {
        lineWidth += getBodyTokenWidth(token, fontSize, activeFontFamily, fontWeight)
      }

      
      let startX: number
      // 强制居中对齐
      const align: 'left' | 'center' | 'right' = 'center'
      if (align === 'center') {
        startX = cx + (cw - lineWidth) / 2
      } else if (align === 'right') {
        startX = cx + cw - lineWidth - CELL_PADDING_X
      } else {
        startX = cx + CELL_PADDING_X
      }

      let cursorX = startX
      for (const token of line.tokens) {
        const tw = getBodyTokenWidth(token, fontSize, activeFontFamily, fontWeight)
        const tokenWeight = token.bold ? BODY_BOLD_WEIGHT : fontWeight
        const tokenFontSize = token.script ? Math.round(fontSize * 0.7) : fontSize
        const baseline = cy + startYOffset + fontSize * 0.84 + li * lineHeight
          + (token.script === 'sup' ? -fontSize * 0.32 : token.script === 'sub' ? fontSize * 0.18 : 0)
        ctx.font = `${token.italic ? 'italic ' : ''}${tokenWeight} ${tokenFontSize}px ${activeFontFamily}`
        ctx.fillStyle = resolveInlineTextColor(token, formatColors) ?? bodyTextColor ?? theme.palette.text

        if (token.formula) {
          const asset = getFormulaAsset(token.formula.latex, token.formula.display)
          const formulaHeight = fontSize * (token.formula.display ? 1.75 : 1.1)
          if (asset) ctx.drawImage(asset.image, cursorX, baseline - formulaHeight * 0.8, tw, formulaHeight)
          else ctx.fillText(token.text, cursorX, baseline)
        } else {
          ctx.fillText(token.text, cursorX, baseline)
        }

        if (token.underline) {
          const underlineY = baseline + Math.max(2, fontSize * 0.08)
          ctx.globalCompositeOperation = 'source-over'
          ctx.strokeStyle = resolveInlineDecorationColor(token, formatColors) ?? ctx.fillStyle
          ctx.lineWidth = Math.max(1, fontSize * 0.05)
          ctx.beginPath()
          ctx.moveTo(cursorX, underlineY)
          ctx.lineTo(cursorX + tw, underlineY)
          ctx.stroke()
        }
        if (token.strike) {
          const strikeY = baseline - tokenFontSize * 0.32
          ctx.globalCompositeOperation = 'source-over'
          ctx.strokeStyle = resolveInlineDecorationColor(token, formatColors) ?? ctx.fillStyle
          ctx.lineWidth = Math.max(1, fontSize * 0.05)
          ctx.beginPath()
          ctx.moveTo(cursorX, strikeY)
          ctx.lineTo(cursorX + tw, strikeY)
          ctx.stroke()
        }
        cursorX += tw
      }
    }
    ctx.restore()
  }

  
  for (let ri = 0; ri < allRows.length; ri++) {
    const row = allRows[ri]!
    const rowH = rowHeights[ri]!
    let cx = x

    
    ctx.save()
    if (ri === 0) {
      
      ctx.fillStyle = `rgba(0,0,0,0.04)`
    } else if (ri % 2 === 1) {
      
      ctx.fillStyle = `rgba(0,0,0,0.02)`
    }
    if (ri <= 1 || ri % 2 === 1) {
      ctx.fillRect(cx, cursorY, totalWidth, rowH)
    }
    ctx.restore()

    
    for (let ci = 0; ci < numCols; ci++) {
      const cw = colWidths[ci]!
      const cellText = ci < row.length ? (row[ci] ?? '') : ''
      // 默认居中对齐
      const align: 'left' | 'center' | 'right' = 'center'
      drawCellText(cellText, cx, cursorY, cw, rowH, ri === 0, align)
      cx += cw
    }

    cursorY += rowH

    
    if (ri === 0) {
      ctx.save()
      ctx.strokeStyle = theme.palette.border
      ctx.lineWidth = HEADER_SEP_HEIGHT
      ctx.beginPath()
      ctx.moveTo(x, cursorY)
      ctx.lineTo(x + totalWidth, cursorY)
      ctx.stroke()
      ctx.restore()
      cursorY += HEADER_SEP_HEIGHT
    }
  }

  
  // 表格整体浅背景，看起来是独立区域
  ctx.save()
  ctx.fillStyle = `rgba(0,0,0,0.03)`
  ctx.beginPath()
  ctx.roundRect(x - 4, y - 4, totalWidth + 8, totalHeight + 8, 6)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = theme.palette.border
  ctx.lineWidth = OUTER_BORDER_WIDTH
  ctx.strokeRect(x, y, totalWidth, totalHeight)

  
  ctx.lineWidth = BORDER_WIDTH
  let sepX = x
  for (let ci = 0; ci < numCols - 1; ci++) {
    sepX += colWidths[ci]!
    ctx.beginPath()
    ctx.moveTo(sepX, y)
    ctx.lineTo(sepX, y + totalHeight)
    ctx.stroke()
  }

  
  let rowY = y + rowHeights[0]! + HEADER_SEP_HEIGHT
  for (let ri = 1; ri < allRows.length; ri++) {
    ctx.beginPath()
    ctx.moveTo(x, rowY)
    ctx.lineTo(x + totalWidth, rowY)
    ctx.stroke()
    rowY += rowHeights[ri]!
  }

  ctx.restore()
  return totalHeight
}
