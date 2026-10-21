import { beforeAll, describe, expect, it } from 'vitest'
import { layoutPages } from '../layout'
import { getPosterMetrics, parseInlineMarkdown, splitGraphemes } from '../measure'
import { measureCodeBlock } from '../code-renderer'
import { measureTableBlock } from '../table-renderer'
import { getTheme } from '../themes'
import type {
  BodyFontMode,
  CodeBlock,
  ImageBlock,
  ColumnContainerBlock,
  SubheadingStyle,
  TableDisplayBlock,
  ThemeDefinition,
  TypographySettings,
} from '../types'

class FakeMeasureCtx {
  font = ''

  measureText(text: string): { width: number } {
    const match = /(\d+(?:\.\d+)?)px/.exec(this.font)
    const size = match ? Number.parseFloat(match[1]!) : 16
    let width = 0
    for (const char of text) {
      width += /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(char) ? size : size * 0.55
    }
    return { width }
  }
}

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function () {
    return new FakeMeasureCtx() as unknown as CanvasRenderingContext2D
  } as never
})

const settings: TypographySettings = {
  bodySize: 24,
  lineHeight: 1.72,
  bodyFontMode: 'wenkai' as BodyFontMode,
  subheadingStyle: 'accent' as SubheadingStyle,
  bodyFontWeight: 400,
}

function withFrameInset(theme: ThemeDefinition, innerFrameInset: number): ThemeDefinition {
  return {
    ...theme,
    surface: { ...theme.surface, innerFrameInset },
    contentInset: undefined,
  }
}

describe('卡片安全区与分页边界', () => {
  it('innerFrameInset 以 20px 为兼容基准调整正文四边边界', () => {
    const base = withFrameInset(getTheme('warm-editor'), 20)
    const tighter = withFrameInset(getTheme('warm-editor'), 32)
    const page = { id: 'page-1', kind: 'body' as const, title: '', blocks: [] }

    const baseMetrics = getPosterMetrics(page, settings, true, base)
    const tightMetrics = getPosterMetrics(page, settings, true, tighter)

    expect(tightMetrics.bodyLeftX - baseMetrics.bodyLeftX).toBe(12)
    expect(baseMetrics.bodyRightX - tightMetrics.bodyRightX).toBe(12)
    expect(tightMetrics.bodyTopY - baseMetrics.bodyTopY).toBe(12)
    expect(baseMetrics.bodyBottomY - tightMetrics.bodyBottomY).toBe(12)
    expect(tightMetrics.bodyWidth).toBe(baseMetrics.bodyWidth - 24)
  })

  it('代码块与表格严格使用传入的正文宽度', () => {
    const width = 420
    const code: CodeBlock = {
      kind: 'code',
      language: 'ts',
      code: 'const value = "这是一段需要在窄安全区内自动折行的代码";'.repeat(5),
    }
    const table: TableDisplayBlock = {
      kind: 'table',
      headers: ['名称', '说明'],
      alignments: ['left', 'left'],
      rows: [['安全区', '这一列包含较长文本并应在指定宽度内折行']],
    }

    expect(measureCodeBlock(code, 20, width).codeWidth).toBe(width)
    expect(measureTableBlock(table, 20, 32, undefined, width).totalWidth).toBeCloseTo(width, 5)
  })

  it('超高代码块拆页后源码完整且顺序不变', () => {
    const sourceCode = Array.from({ length: 120 }, (_, index) => `const line${index} = "value-${index}";`).join('\n')
    const { pages } = layoutPages({
      source: `\`\`\`ts\n${sourceCode}\n\`\`\``,
      settings,
      theme: getTheme('warm-editor'),
      footerEnabled: true,
      headingOverrides: null,
    })
    const blocks = pages.flatMap(page => page.blocks).filter((block): block is CodeBlock => block.kind === 'code')

    expect(blocks.length).toBeGreaterThan(1)
    expect(blocks.map(block => block.code).join('')).toBe(sourceCode)
  })

  it('超高表格按行拆页，续页重复表头且数据不丢失', () => {
    const rows = Array.from({ length: 50 }, (_, index) => `| 第${index + 1}行 | 内容${index + 1} |`).join('\n')
    const source = `| 序号 | 内容 |\n| --- | --- |\n${rows}`
    const { pages } = layoutPages({
      source,
      settings,
      theme: getTheme('warm-editor'),
      footerEnabled: true,
      headingOverrides: null,
    })
    const blocks = pages.flatMap(page => page.blocks).filter((block): block is TableDisplayBlock => block.kind === 'table')

    expect(blocks.length).toBeGreaterThan(1)
    expect(blocks.every(block => block.headers.join('|') === '序号|内容')).toBe(true)
    expect(blocks.flatMap(block => block.rows)).toEqual(
      Array.from({ length: 50 }, (_, index) => [`第${index + 1}行`, `内容${index + 1}`]),
    )
  })

  it('代码分页保留 Unicode 字素且不为分页换行额外计高', () => {
    const sourceCode = Array.from(
      { length: 90 },
      (_, index) => `const value${index} = "👨‍👩‍👧‍👦é-${index}";`,
    ).join('\n')
    const { pages } = layoutPages({
      source: `\`\`\`ts\n${sourceCode}\n\`\`\``,
      settings,
      theme: getTheme('warm-editor'),
      footerEnabled: true,
      headingOverrides: null,
    })
    const blocks = pages.flatMap(page => page.blocks).filter((block): block is CodeBlock => block.kind === 'code')

    expect(blocks.map(block => block.code).join('')).toBe(sourceCode)
    for (const block of blocks.filter(item => item.suppressTrailingEmptyLine)) {
      const withoutFlag = measureCodeBlock({ ...block, suppressTrailingEmptyLine: false }, 20, 420)
      const withFlag = measureCodeBlock(block, 20, 420)
      expect(withFlag.lineCount).toBe(withoutFlag.lineCount - 1)
    }
  })

  it('单个超高表格行按单元格内容续页且字素不丢失', () => {
    const longCell = '👨‍👩‍👧‍👦é安全区内容'.repeat(180)
    const source = `| 名称 | 说明 |\n| --- | --- |\n| 单行 | ${longCell} |`
    const { pages } = layoutPages({
      source,
      settings,
      theme: getTheme('warm-editor'),
      footerEnabled: true,
      headingOverrides: null,
    })
    const blocks = pages.flatMap(page => page.blocks).filter((block): block is TableDisplayBlock => block.kind === 'table')

    expect(blocks.length).toBeGreaterThan(1)
    expect(blocks.map(block => block.rows[0]?.[0] ?? '').join('')).toBe('单行')
    expect(blocks.map(block => block.rows[0]?.[1] ?? '').join('')).toBe(longCell)
  })

  it('表格单元格跨页后保持内联文本与样式语义', () => {
    const richCell = '**加粗👨‍👩‍👧‍👦**==高亮é==^下划线^'.repeat(150)
    const source = `| 名称 | 说明 |\n| --- | --- |\n| 单行 | ${richCell} |`
    const { pages } = layoutPages({
      source,
      settings,
      theme: getTheme('warm-editor'),
      footerEnabled: true,
      headingOverrides: null,
    })
    const blocks = pages.flatMap(page => page.blocks).filter((block): block is TableDisplayBlock => block.kind === 'table')
    const toAtoms = (text: string) => parseInlineMarkdown(text).flatMap(token =>
      splitGraphemes(token.text).map(grapheme => ({
        grapheme,
        bold: Boolean(token.bold),
        italic: Boolean(token.italic),
        mark: Boolean(token.mark),
        underline: Boolean(token.underline),
      })),
    )

    expect(blocks.length).toBeGreaterThan(1)
    expect(blocks.flatMap(block => toAtoms(block.rows[0]?.[1] ?? ''))).toEqual(toAtoms(richCell))
  })

  it('双栏中的超高文本子块可跨页续绘且内容完整', () => {
    const leftText = '左栏👨‍👩‍👧‍👦内容'.repeat(260)
    const rightText = '右栏内容'.repeat(180)
    const source = `:::left\n${leftText}\n:::\n:::right\n${rightText}\n:::`
    const { pages } = layoutPages({
      source,
      settings,
      theme: getTheme('warm-editor'),
      footerEnabled: true,
      headingOverrides: null,
    })
    const columns = pages.flatMap(page => page.blocks)
      .filter((block): block is ColumnContainerBlock => block.kind === 'columnContainer')
    const leftOutput = columns.flatMap(block => block.leftBlocks)
      .filter((block): block is import('../types').TextBlock => block.kind === 'body')
      .map(block => block.raw).join('')
    const rightOutput = columns.flatMap(block => block.rightBlocks)
      .filter((block): block is import('../types').TextBlock => block.kind === 'body')
      .map(block => block.raw).join('')

    expect(columns.length).toBeGreaterThan(1)
    expect(columns[0]!.rightBlocks.length).toBeGreaterThan(0)
    expect(leftOutput).toBe(leftText)
    expect(rightOutput).toBe(rightText)
  })

  it('关闭页脚时正文底边与内框保留安全距离', () => {
    const theme = getTheme('warm-editor')
    const page = { id: 'page-1', kind: 'body' as const, title: '', blocks: [] }
    const metrics = getPosterMetrics(page, settings, false, theme)
    const frameBottom = 960 - theme.surface.innerFrameInset

    expect(frameBottom - metrics.bodyBottomY).toBeGreaterThanOrEqual(10)
  })

  it('超高图片在空页约束到正文可用高度且不修改源配置', () => {
    const source = '![示例](https://example.com/image.png){#img1}{height=2000}'
    const theme = getTheme('warm-editor')
    const { pages } = layoutPages({
      source,
      settings,
      theme,
      footerEnabled: true,
      headingOverrides: null,
    })
    const image = pages[0]!.blocks.find((block): block is ImageBlock => block.kind === 'image')
    const metrics = getPosterMetrics(pages[0]!, settings, true, theme)

    expect(image).toBeDefined()
    expect(image!.height + 10).toBeLessThanOrEqual(metrics.bodyHeight)
    expect(source).toContain('height=2000')
  })
})
