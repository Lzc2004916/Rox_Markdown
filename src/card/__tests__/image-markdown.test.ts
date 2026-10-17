import { describe, it, expect } from 'vitest'
import {
  parseImageAttrs,
  parseImages,
  setImageHeight,
  nextImageKey,
  DEFAULT_IMAGE_HEIGHT,
} from '../imageMarkdown'
import { computeImageMaxHeights, IMAGE_HEIGHT_MIN, IMAGE_HEIGHT_MAX } from '../layout'
import type { CardPage } from '../types'

describe('图片 markdown 工具', () => {
  it('parseImageAttrs 解析 key 与 height，顺序无关', () => {
    expect(parseImageAttrs('{#img1}{height=200}')).toEqual({ key: 'img1', height: 200 })
    expect(parseImageAttrs('{height=300}{#img7}')).toEqual({ key: 'img7', height: 300 })
    expect(parseImageAttrs('{#img2}')).toEqual({ key: 'img2' })
    expect(parseImageAttrs('{height=150}')).toEqual({ height: 150 })
    expect(parseImageAttrs('')).toEqual({})
  })

  it('parseImages 只收集带 key 的图片', () => {
    const src = [
      '标题',
      '![a](a.png){#img1}{height=200}',
      '![b](b.png){height=150}',
      '![c](c.png){#img2}{height=333}',
    ].join('\n')
    const items = parseImages(src)
    expect(items.map((i) => i.key)).toEqual(['img1', 'img2'])
    expect(items[0]).toMatchObject({ alt: 'a', src: 'a.png', height: 200 })
    expect(items[1]!.height).toBe(333)
  })

  it('setImageHeight 改写指定 key 的高度并保留缩进，找不到则原样返回', () => {
    const src = '  ![a](a.png){#img1}{height=200}\n![b](b.png){#img2}{height=200}'
    const out = setImageHeight(src, 'img2', 480)
    expect(out).toContain('![b](b.png){#img2}{height=480}')
    expect(out).toContain('  ![a](a.png){#img1}{height=200}')
    expect(setImageHeight(src, 'img99', 1)).toBe(src)
  })

  it('nextImageKey 按现有最大编号 +1 生成', () => {
    expect(nextImageKey('')).toBe('img1')
    expect(nextImageKey('![a](a){#img1}{height=200}')).toBe('img2')
    expect(nextImageKey('![a](a){#img1}\n![b](b){#img12}{height=1}')).toBe('img13')
  })

  it('DEFAULT_IMAGE_HEIGHT 与 layout 默认一致', () => {
    expect(DEFAULT_IMAGE_HEIGHT).toBe(200)
  })
})

describe('computeImageMaxHeights 动态上限', () => {
  function page(blocks: CardPage['blocks']): CardPage[] {
    return [{ id: 'p1', kind: 'body', title: '', blocks }]
  }

  it('上限 = clamp(50, bodyBottomY - blockTop - 10, 600)，忽略无 key / 无 blockTop 的图', () => {
    const pages = page([
      { kind: 'image', src: 'a', alt: '', height: 200, key: 'img1', blockTop: 120 },
      { kind: 'image', src: 'b', alt: '', height: 200, key: 'img2', blockTop: 700 },
      { kind: 'image', src: 'c', alt: '', height: 200 },
      { kind: 'image', src: 'd', alt: '', height: 200, key: 'img4' },
    ])
    // 无主题、开页脚：bodyBottomY = 886
    const m = computeImageMaxHeights(pages, undefined, true)
    expect(m['img1']).toBe(IMAGE_HEIGHT_MAX) // 886-120-10=756 -> 600
    expect(m['img2']).toBe(176) // 886-700-10
    expect(m['img3']).toBeUndefined()
    expect(m['img4']).toBeUndefined()
  })

  it('关页脚时 bodyBottomY 更大，上限随之放宽', () => {
    const pages = page([
      { kind: 'image', src: 'a', alt: '', height: 200, key: 'img1', blockTop: 700 },
    ])
    expect(computeImageMaxHeights(pages, undefined, false)['img1']).toBe(230) // 940-700-10
  })

  it('下限不低于 50（图片块顶贴底时）', () => {
    const pages = page([
      { kind: 'image', src: 'a', alt: '', height: 200, key: 'img1', blockTop: 870 },
    ])
    expect(computeImageMaxHeights(pages, undefined, true)['img1']).toBe(IMAGE_HEIGHT_MIN) // 886-870-10=6 -> 50
  })
})
