/**
 * 列表跨页丢项回归测试。
 *
 * 历史 bug：list 块按「项」拆分跨页时，剩余项经 carryBlock 携带，
 * 但拆分后 `continue` 让当前页继续处理 carryBlock，且 `count===0` 保护
 * 分支不区分空页/非空页，把放不下的剩余项强制塞进当前页；渲染阶段该
 * 超界 list 块被 `break` 整块丢弃，导致列表项文本凭空消失。
 *
 * 修复：非空页放不下时 `break` 到下一页；有剩余项时 `break` 而非 `continue`。
 * 本测试断言：跨页后所有列表项一项不丢、顺序不变。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { layoutPages } from '../layout'
import { getTheme } from '../themes'
import type { TypographySettings, BodyFontMode, SubheadingStyle, ListBlock } from '../types'

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

describe('列表跨页不丢项', () => {
  it('无序列表跨页后所有项完整保留、顺序一致', () => {
    const total = 40
    const source = Array.from({ length: total }, (_, i) => `- 列表项${i + 1}`).join('\n')
    const { pages } = layoutPages({
      source, settings, theme: getTheme('warm-editor'),
      footerEnabled: true, headingOverrides: null,
    })

    const collected: string[] = []
    for (const page of pages) {
      for (const block of page.blocks) {
        if (block.kind === 'unorderedList' || block.kind === 'orderedList') {
          for (const item of (block as ListBlock).items) collected.push(item.text)
        }
      }
    }

    expect(pages.length).toBeGreaterThan(1) // 确实发生了跨页
    expect(collected).toEqual(Array.from({ length: total }, (_, i) => `列表项${i + 1}`))
  })

  it('有序列表跨页后所有项完整保留、顺序一致', () => {
    const total = 40
    const source = Array.from({ length: total }, (_, i) => `${i + 1}. 列表项${i + 1}`).join('\n')
    const { pages } = layoutPages({
      source, settings, theme: getTheme('warm-editor'),
      footerEnabled: true, headingOverrides: null,
    })

    const collected: string[] = []
    for (const page of pages) {
      for (const block of page.blocks) {
        if (block.kind === 'unorderedList' || block.kind === 'orderedList') {
          for (const item of (block as ListBlock).items) collected.push(item.text)
        }
      }
    }

    expect(pages.length).toBeGreaterThan(1)
    expect(collected).toEqual(Array.from({ length: total }, (_, i) => `列表项${i + 1}`))
  })

  it('有序列表跨页后编号连续、不重置、不跳号', () => {
    const total = 40
    const source = Array.from({ length: total }, (_, i) => `${i + 1}. 列表项${i + 1}`).join('\n')
    const { pages } = layoutPages({
      source, settings, theme: getTheme('warm-editor'),
      footerEnabled: true, headingOverrides: null,
    })

    // 收集各页有序列表块的 (start, 项数)，还原真实编号序列
    const numbers: number[] = []
    for (const page of pages) {
      for (const block of page.blocks) {
        if (block.kind === 'orderedList') {
          const lb = block as ListBlock
          const start = lb.start ?? 1
          for (let i = 0; i < lb.items.length; i++) numbers.push(start + i)
        }
      }
    }

    expect(pages.length).toBeGreaterThan(1)
    // 编号严格等于 1..40，无重复、无跳号、不从 1 重置
    expect(numbers).toEqual(Array.from({ length: total }, (_, i) => i + 1))
  })
})

