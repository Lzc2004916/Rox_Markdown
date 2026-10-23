import { describe, expect, it } from 'vitest'
import { parseInlineMarkdown, wrapInlineTokensByWidth } from '../measure'
import { extractFormulaRequests } from '../formula-loader'

describe('extended inline formatting', () => {
  it('parses all toolbar text styles', () => {
    const tokens = parseInlineMarkdown(
      '**粗体** *斜体* ^下划线^ ~~删除~~ <sup>上标</sup> <sub>下标</sub>',
    )

    expect(tokens.find((token) => token.text === '粗体')?.bold).toBe(true)
    expect(tokens.find((token) => token.text === '斜体')?.italic).toBe(true)
    expect(tokens.find((token) => token.text === '下划线')?.underline).toBe(true)
    expect(tokens.find((token) => token.text === '删除')?.strike).toBe(true)
    expect(tokens.find((token) => token.text === '上标')?.script).toBe('sup')
    expect(tokens.find((token) => token.text === '下标')?.script).toBe('sub')
  })

  it('treats ==文本== as ordinary text', () => {
    expect(parseInlineMarkdown('==普通文本==')).toEqual([
      { text: '==普通文本==', bold: false, italic: false, underline: false },
    ])
  })

  it('recognizes inline and block LaTeX as indivisible formula tokens', () => {
    const inline = parseInlineMarkdown('能量 $E = mc^2$ 守恒')
    const display = parseInlineMarkdown('$$\\frac{a}{b}$$')

    expect(inline.find((token) => token.formula)?.formula).toEqual({ latex: 'E = mc^2', display: false })
    expect(display).toHaveLength(1)
    expect(display[0]?.formula).toEqual({ latex: '\\frac{a}{b}', display: true })

    const lines = wrapInlineTokensByWidth(display, 30, 10)
    expect(lines).toHaveLength(1)
    expect(lines[0]?.tokens).toHaveLength(1)
  })

  it('collects both formula forms before the Canvas layout pass', () => {
    expect(extractFormulaRequests('面积 $\\pi r^2$\n$$\\frac{a}{b}$$')).toEqual([
      { latex: '\\pi r^2', display: false },
      { latex: '\\frac{a}{b}', display: true },
    ])
  })
})
