

import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('@/card', () => {
  const PW = 720

  const fakeCanvas = (): HTMLCanvasElement => {
    const c = document.createElement('canvas')
    c.width = PW
    c.height = 960
    return c
  }

  
  const makeResult = (opts: { source?: string }) => {
    const n = (opts?.source ?? '').includes('MULTI') ? 3 : 1
    return {
      pages: Array.from({ length: n }, (_, i) => ({ index: i })),
      canvases: Array.from({ length: n }, () => fakeCanvas()),
      truncated: false,
    }
  }

  return {
    PAGE_WIDTH: PW,
    renderAllPagesAsync: async (opts: { source?: string }) => makeResult(opts),
    renderAllPages: (opts: { source?: string }) => makeResult(opts),
    renderCard: () => fakeCanvas(),
    getTheme: () => ({ editor: { highlightStyle: 'underline' } }),
    extractTokens: () => ({}),
    applyTokensToElement: () => {},
    preloadImages: async () => {},
    collectImageSrcs: () => [],
    computeImageMaxHeights: () => ({}),
  }
})

import CardPreview from '../preview/CardPreview.vue'

const RENDER_WAIT = 420

const ANIM_WAIT = 150

let wrapper: VueWrapper<InstanceType<typeof CardPreview>> | null = null

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

async function mountPreview(source: string): Promise<VueWrapper<InstanceType<typeof CardPreview>>> {
  wrapper = mount(CardPreview, {
    props: { source },
    attachTo: document.body,
  })
  await new Promise((r) => setTimeout(r, RENDER_WAIT))
  await nextTick()
  return wrapper
}

function findScrollEl(w: VueWrapper<InstanceType<typeof CardPreview>>): HTMLElement | null {
  const found = w.find('.overflow-x-auto')
  return found.exists() ? (found.element as HTMLElement) : null
}

function requireScrollEl(w: VueWrapper<InstanceType<typeof CardPreview>>): HTMLElement {
  const el = findScrollEl(w)
  if (!el) throw new Error('未找到横向滚动容器（多页模式未生效）')
  return el
}

function stubMetrics(
  el: HTMLElement,
  clientWidth = 800,
  scrollWidth = 2400,
): { left: () => number } {
  let scrollLeft = 0
  Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true })
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true })
  Object.defineProperty(el, 'scrollLeft', {
    get: () => scrollLeft,
    set: (v: number) => { scrollLeft = v },
    configurable: true,
  })
  return { left: () => scrollLeft }
}

function dispatchWheel(el: HTMLElement, init: WheelEventInit = {}): WheelEvent {
  const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init })
  el.dispatchEvent(ev)
  return ev
}

const waitAnim = () => new Promise((r) => setTimeout(r, ANIM_WAIT))

describe('CardPreview 滚轮横滑翻页', () => {
  it('非边界滚轮：拦截默认行为并驱动横向滚动（主用例）', async () => {
    const w = await mountPreview('# MULTI\n\n多页内容')
    const el = requireScrollEl(w)
    expect(w.findAll('canvas').length).toBe(3)

    const metrics = stubMetrics(el)
    const ev = dispatchWheel(el, { deltaY: 120 })

    expect(ev.defaultPrevented).toBe(true)
    await waitAnim()
    expect(metrics.left()).toBe(120)
  })

  it('deltaMode 归一化：行模式 ×16、页模式 ×400、像素模式透传（Firefox 修复）', async () => {
    const w = await mountPreview('# MULTI\n\n多页内容')
    const el = requireScrollEl(w)
    const metrics = stubMetrics(el)

    
    dispatchWheel(el, { deltaY: 3, deltaMode: 1 })
    await waitAnim()
    expect(metrics.left()).toBe(48)

    
    dispatchWheel(el, { deltaY: 50, deltaMode: 0 })
    await waitAnim()
    expect(metrics.left()).toBe(98)

    
    dispatchWheel(el, { deltaY: 1, deltaMode: 2 })
    await waitAnim()
    expect(metrics.left()).toBe(498)
  })

  it('左边界放行：已在首页继续上滚 → 不拦截，交外层容器纵向兜底', async () => {
    const w = await mountPreview('# MULTI\n\n多页内容')
    const el = requireScrollEl(w)
    const metrics = stubMetrics(el)

    const ev = dispatchWheel(el, { deltaY: -120 })
    expect(ev.defaultPrevented).toBe(false)
    await waitAnim()
    expect(metrics.left()).toBe(0)
  })

  it('右边界放行：滚到末页后继续下滚 → 不再拦截（正向对照：滚动途中是拦截的）', async () => {
    const w = await mountPreview('# MULTI\n\n多页内容')
    const el = requireScrollEl(w)
    const metrics = stubMetrics(el, 800, 2400) 

    
    const evMid = dispatchWheel(el, { deltaY: 1600 })
    expect(evMid.defaultPrevented).toBe(true)
    await waitAnim()
    expect(metrics.left()).toBe(1600)

    
    const evEnd = dispatchWheel(el, { deltaY: 120 })
    expect(evEnd.defaultPrevented).toBe(false)
    await waitAnim()
    expect(metrics.left()).toBe(1600)
  })

  it('横向占优手势（触控板横滑）放行给原生 overflow-x，不拦截', async () => {
    const w = await mountPreview('# MULTI\n\n多页内容')
    const el = requireScrollEl(w)
    stubMetrics(el)

    const evHoriz = dispatchWheel(el, { deltaX: 80, deltaY: 10 })
    expect(evHoriz.defaultPrevented).toBe(false)

    
    const evVert = dispatchWheel(el, { deltaX: 10, deltaY: 100 })
    expect(evVert.defaultPrevented).toBe(true)
  })

  it('原生滚动（拖滚动条/触控板）后，滚轮应从当前位置继续而不是瞬移回起点', async () => {
    const w = await mountPreview('# MULTI\n\n多页内容')
    const el = requireScrollEl(w)
    const metrics = stubMetrics(el, 800, 2400)

    
    el.scrollLeft = 500
    el.dispatchEvent(new Event('scroll'))

    
    dispatchWheel(el, { deltaY: -100 })
    await waitAnim()
    expect(metrics.left()).toBe(400)
  })

  it('单页模式无横向容器，滚轮不介入', async () => {
    const w = await mountPreview('单页内容')
    expect(findScrollEl(w)).toBeNull()
  })

  it('单页 → 多页 切换后，容器重建，滚轮监听随模板绑定自动生效', async () => {
    const w = await mountPreview('单页内容')
    expect(findScrollEl(w)).toBeNull()

    await w.setProps({ source: '# MULTI\n\n多页内容' })
    await new Promise((r) => setTimeout(r, RENDER_WAIT))
    await nextTick()

    const el = requireScrollEl(w)
    const metrics = stubMetrics(el)
    const ev = dispatchWheel(el, { deltaY: 90 })
    expect(ev.defaultPrevented).toBe(true)
    await waitAnim()
    expect(metrics.left()).toBe(90)
  })
})
