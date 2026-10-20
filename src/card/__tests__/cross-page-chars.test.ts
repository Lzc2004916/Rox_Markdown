/**
 * 跨页丢字回归测试。
 *
 * 历史 bug：段落跨页切分时，layout 把"行片段"序列化成文本塞进 page.blocks，
 * 渲染端再对这段文本二次折行；两次折行只要有细微差异（行尾空格丢失、
 * 格式标记重新注入等），被分到当前页的行尾字符就既没画出来、也不在下一页——
 * 整段文字凭空少字。
 *
 * 治本方案：行切分产生的块挂 prefixedLines（layout 预切好的行），
 * 测量与渲染共用同一批行。本测试断言：把各页所有行的 token 文本拼起来，
 * 必须与源文本逐字一致（忽略空白与 markdown 标记差异）。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { layoutPages } from '../layout'
import { parseInlineMarkdown, wrapInlineTokensByWidth } from '../measure'
import { getTheme } from '../themes'
import type { BodyFontMode, SubheadingStyle, TypographySettings } from '../types'
import type { InlineLine, TextBlock } from '../types'


/**
 * happy-dom 不提供 canvas 2d 上下文，这里桩一个测量实现：
 * CJK 按 1em、ASCII 按 0.5em 计算宽度。widthScale 用于模拟"字体加载前后
 * 字宽不同"（真实场景：webfont 未就绪时 measureText 走 fallback 字体）。
 */
let widthScale = 1

class FakeMeasureCtx {
  font = ''
  measureText(text: string): { width: number } {
    const m = /(\d+(?:\.\d+)?)px/.exec(this.font)
    const size = m ? parseFloat(m[1]!) : 16
    let width = 0
    for (const ch of text) {
      if (ch === '\n') continue
      width += /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(ch) ? size : size * 0.5
    }
    return { width: width * widthScale }
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

const BODY_WIDTH = 622


/** 取出块在页面上实际绘制的行：有 prefixedLines 用它，否则按 raw 重新折行（与渲染端同口径）。 */
function linesOfBlock(block: TextBlock): InlineLine[] {
  if (block.prefixedLines?.length) return block.prefixedLines
  return wrapInlineTokensByWidth(
    parseInlineMarkdown(block.raw), 21, BODY_WIDTH, undefined, 400,
  )
}


function normalize(text: string): string {
  return text.replace(/\s+/g, '')
}


/** 模拟渲染端逐页绘制，返回实际画出的文字（列表/表格/代码块不在本测试范围）。 */
function collectDrawnText(source: string): string {
  const { pages } = layoutPages({
    source,
    settings,
    theme: getTheme('warm-editor'),
    footerEnabled: true,
  })
  const parts: string[] = []
  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.kind !== 'body' && block.kind !== 'quote' && block.kind !== 'subheading') continue
      const tb = block as TextBlock
      for (const line of linesOfBlock(tb)) {
        parts.push(line.tokens.map((t) => t.text).join(''))
      }
    }
  }
  return parts.join('')
}


describe('跨页切分不得丢字（行切分预切行 prefixedLines）', () => {
  it('长段落跨页：所有页绘制的文字拼起来与原文逐字一致', () => {
    const sentence =
      '很多家长问我，孩子把手机锁在抽屉里三天不说话，我到底该不该砸开那扇门。'
    const source = sentence.repeat(40)
    const { pages } = layoutPages({
      source,
      settings,
      theme: getTheme('warm-editor'),
      footerEnabled: true,
    })
    expect(pages.length).toBeGreaterThan(1)
    expect(normalize(collectDrawnText(source))).toBe(normalize(source))
  })

  it('含内联格式的长段落跨页不丢字', () => {
    const unit =
      '他说**我讨厌我自己**，然后把纸条折起来塞进**手机里**，那天之后他再没提过这件事。'
    const source = unit.repeat(30)
    expect(normalize(collectDrawnText(source))).toBe(
      normalize(source.replace(/\*\*/g, '')),
    )
  })

  it('标题 + 引用 + 长正文混排跨页不丢字', () => {
    const body = '正文段落。'.repeat(400)
    const source = [
      '## 那些被误会成叛逆的安静',
      '',
      '> 引用块也要跨页：这是一段很长的引用，用来验证引用块在行切分时的字符完整性。',
      '',
      body,
    ].join('\n')
    const drawn = normalize(collectDrawnText(source))
    expect(drawn).toContain(normalize('那些被误会成叛逆的安静'))
    expect(drawn).toContain(normalize('引用块也要跨页'))
    // 正文完整（60 次重复一次不少）
    expect(drawn.endsWith(normalize(body))).toBe(true)
  })

  it('无句号的长段落靠行级切分跨页：切出的块挂 prefixedLines', () => {
    // 关键：整段没有句号/分号，按句子切分失效 → 必然走行级切分路径
    const source =
      '这是一段没有任何句号的长正文内容用来触发行级切分从而挂载预切行字段'.repeat(80)
    const { pages } = layoutPages({
      source,
      settings,
      theme: getTheme('warm-editor'),
      footerEnabled: true,
    })
    const splitBlocks = pages
      .flatMap((p) => p.blocks)
      .filter((b) => (b as TextBlock).kind === 'body' && (b as TextBlock).prefixedLines?.length)
    expect(splitBlocks.length).toBeGreaterThan(0)
    // 预切行的 token 拼起来必须等于该块 raw 去掉 markdown 标记后的文本
    for (const b of splitBlocks) {
      const tb = b as TextBlock
      const drawn = tb.prefixedLines!.map((l) => l.tokens.map((t) => t.text).join('')).join('')
      const rawText = tb.raw.replace(/[*=^]/g, '')
      expect(normalize(drawn)).toBe(normalize(rawText))
    }
  })

  it('字体宽度漂移（webfont 加载前后字宽不同）也不丢字', () => {
    const source = '很多家长问我，孩子把手机锁在抽屉里三天不说话。'.repeat(20)
    // 模拟：排版时字体尚未就绪（宽度偏窄），随后真实字体就绪（宽度偏宽）
    widthScale = 0.92
    const { pages } = layoutPages({
      source,
      settings,
      theme: getTheme('warm-editor'),
      footerEnabled: true,
    })
    widthScale = 1.06
    // 逐页按"渲染端口径"取行：有 prefixedLines 直接用，否则按新字宽重新折行
    const drawn: string[] = []
    for (const page of pages) {
      for (const block of page.blocks) {
        if (block.kind !== 'body' && block.kind !== 'quote' && block.kind !== 'subheading') continue
        const tb = block as TextBlock
        const lines = tb.prefixedLines?.length
          ? tb.prefixedLines
          : wrapInlineTokensByWidth(parseInlineMarkdown(tb.raw), 21, BODY_WIDTH, undefined, 400)
        for (const line of lines) drawn.push(line.tokens.map((t) => t.text).join(''))
      }
    }
    expect(normalize(drawn.join(''))).toBe(normalize(source))
    widthScale = 1
  })
})
