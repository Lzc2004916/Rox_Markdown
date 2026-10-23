import { describe, expect, it } from 'vitest'
import { parseInputBlocks, serializeInlineToken } from '../layout'
import { parseInlineMarkdown } from '../measure'
import type { HeadingLevel, TableDisplayBlock, TextBlock } from '../types'

function expectStyles(text: string, expected: Partial<Record<'text' | 'bold' | 'italic' | 'underline' | 'strike', string | boolean>> & { script?: 'sup' | 'sub' }): void {
  const [token] = parseInlineMarkdown(text)
  expect(token).toMatchObject(expected)
}

describe('Markdown combination support', () => {
  it('supports every inline style in H1 through H6', () => {
    const source = Array.from({ length: 6 }, (_, index) => `${'#'.repeat(index + 1)} **^标题${index + 1}^**`).join('\n')
    const headings = parseInputBlocks(source) as TextBlock[]

    expect(headings).toHaveLength(6)
    headings.forEach((heading, index) => {
      expect(heading).toMatchObject({ kind: 'subheading', headingLevel: index + 1 as HeadingLevel })
      expectStyles(heading.raw, { text: `标题${index + 1}`, bold: true, underline: true })
    })
  })

  it('supports nested styles in body text, quotes, lists, tables, and columns', () => {
    const source = [
      '**~~粗体删除线~~** *^斜体下划线^* <sup>^上标下划线^</sup>',
      '> **~~引用组合~~**',
      '- **^列表组合^**',
      '| 名称 | 内容 |',
      '| --- | --- |',
      '| 单元格 | **~~表格组合~~** |',
      ':::left',
      '*^左栏组合^*',
      ':::',
      ':::right',
      '**~~右栏组合~~**',
      ':::',
    ].join('\n')
    const blocks = parseInputBlocks(source)
    const body = blocks[0] as TextBlock
    const quote = blocks[1] as TextBlock
    const list = blocks[2] as import('../types').ListBlock
    const table = blocks[3] as TableDisplayBlock
    const columns = blocks[4] as import('../types').ColumnContainerBlock

    expectStyles(body.raw.slice(0, '**~~粗体删除线~~**'.length), { text: '粗体删除线', bold: true, strike: true })
    expectStyles(quote.raw, { text: '引用组合', bold: true, strike: true })
    expectStyles(list.items[0]!.text, { text: '列表组合', bold: true, underline: true })
    expectStyles(table.rows[0]![1]!, { text: '表格组合', bold: true, strike: true })
    expectStyles((columns.leftBlocks[0] as TextBlock).raw, { text: '左栏组合', italic: true, underline: true })
    expectStyles((columns.rightBlocks[0] as TextBlock).raw, { text: '右栏组合', bold: true, strike: true })
  })

  it('keeps fenced code block content literal rather than applying inline styles', () => {
    const [code] = parseInputBlocks('```ts\nconst text = "~~不是删除线~~"\n```')

    expect(code).toMatchObject({
      kind: 'code',
      code: 'const text = "~~不是删除线~~"',
    })
  })

  it('preserves every active style while serializing a split table token', () => {
    const [token] = parseInlineMarkdown('**^~~组合内容~~^**')
    const restored = serializeInlineToken(token!, '组合')
    const [reparsed] = parseInlineMarkdown(restored)

    expect(restored).toBe('**^~~组合~~^**')
    expect(reparsed).toMatchObject({ text: '组合', bold: true, underline: true, strike: true })
  })
})
