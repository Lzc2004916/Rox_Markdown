/**
 * 列表解析回归测试。
 *
 * 历史 bug：list 解析分支用 isListItemLine（同时匹配 `-`/`*`/`+` 和 `1.`）
 * 无差别吞掉连续列表项，但 isOrdered 只按第一行判定，导致「无序 + 有序」
 * 相邻时被合并成单一列表，另一种标记（圆点或序号）丢失。
 *
 * 修复：按类型逐段拆分，无序/有序切换时切块；顺带解析有序列表起始序号。
 */
import { describe, it, expect } from 'vitest'
import { parseInputBlocks } from '../layout'
import type { ListBlock } from '../types'

describe('列表解析：无序/有序正确分隔', () => {
  it('- * + 开头识别为无序列表，三项合并为一个无序块', () => {
    const blocks = parseInputBlocks('- a\n* b\n+ c')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.kind).toBe('unorderedList')
    expect((blocks[0] as ListBlock).items.map((i) => i.text)).toEqual(['a', 'b', 'c'])
  })

  it('无序列表 + 有序列表 → 拆分为两个独立块', () => {
    const blocks = parseInputBlocks('- a\n- b\n1. c\n2. d')
    expect(blocks.map((b) => b.kind)).toEqual(['unorderedList', 'orderedList'])
    expect((blocks[0] as ListBlock).items.map((i) => i.text)).toEqual(['a', 'b'])
    expect((blocks[1] as ListBlock).items.map((i) => i.text)).toEqual(['c', 'd'])
  })

  it('有序列表 + 无序列表 → 拆分为两个独立块', () => {
    const blocks = parseInputBlocks('1. a\n2. b\n- c\n- d')
    expect(blocks.map((b) => b.kind)).toEqual(['orderedList', 'unorderedList'])
  })

  it('类型交替多次切换 → 每段独立块，不合并', () => {
    const blocks = parseInputBlocks('- a\n1. b\n- c\n2. d')
    expect(blocks.map((b) => b.kind)).toEqual([
      'unorderedList', 'orderedList', 'unorderedList', 'orderedList',
    ])
  })

  it('有序列表解析起始序号（3. 开始）', () => {
    const blocks = parseInputBlocks('3. a\n4. b')
    expect(blocks[0]!.kind).toBe('orderedList')
    expect((blocks[0] as ListBlock).start).toBe(3)
  })

  it('列表项保留缩进（多级列表）', () => {
    const blocks = parseInputBlocks('- 父项\n    - 子项')
    expect(blocks).toHaveLength(1)
    const items = (blocks[0] as ListBlock).items
    expect(items[0]!.indent).toBe(0)
    expect(items[1]!.indent).toBe(2) // 4 空格 = 2 级
  })
})
