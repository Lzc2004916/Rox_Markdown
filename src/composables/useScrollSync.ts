import { ref, watch, onBeforeUnmount, type Ref } from 'vue'

/**
 * 横向滚动容器的页码同步逻辑
 * 负责：滚轮翻页、点击圆点跳页、滚动到正确位置、页码状态同步
 */
export function useScrollSync(options: {
  scrollRef: Ref<HTMLDivElement | null>
  canvasesLength: Ref<number>
  currentPage: Ref<number>
  getCardWidth: () => number
}) {
  const { scrollRef, canvasesLength, currentPage, getCardWidth } = options

  const activeIdx = ref(0)
  const CARD_GAP = 24

  let targetLeft = 0
  let rafId: number | null = null
  let inertiaRaf: number | null = null
  let scrollTimer: ReturnType<typeof setTimeout> | null = null
  let isProgrammaticScroll = false

  /** 平滑滚动动画循环，用 requestAnimationFrame 逐步到位 */
  function smoothLoop(): void {
    const container = scrollRef.value
    if (!container) return
    const diff = targetLeft - container.scrollLeft
    if (Math.abs(diff) < 0.5) {
      container.scrollLeft = targetLeft
      rafId = null
      return
    }
    container.scrollLeft += diff * 0.12
    rafId = requestAnimationFrame(smoothLoop)
  }

  /** 滚动到指定位置，带平滑动画 */
  function animateTo(left: number): void {
    const container = scrollRef.value
    if (!container) return
    // 先停掉惯性滑行，避免惯性动画与平滑滚动同时写 scrollLeft（抖动根因）
    if (inertiaRaf !== null) {
      cancelAnimationFrame(inertiaRaf)
      inertiaRaf = null
    }
    const max = container.scrollWidth - container.clientWidth
    targetLeft = Math.max(0, Math.min(max, left))
    if (rafId === null) rafId = requestAnimationFrame(smoothLoop)
  }

  /** 鼠标滚轮横向翻页 */
  function onWheel(e: WheelEvent): void {
    if (e.ctrlKey || e.metaKey) return
    const container = scrollRef.value
    if (!container) return

    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
    const deltaY = e.deltaY * unit
    const deltaX = e.deltaX * unit

    if (Math.abs(deltaX) > Math.abs(deltaY)) return
    if (deltaY === 0) return

    const max = container.scrollWidth - container.clientWidth
    if ((targetLeft <= 0 && deltaY < 0) || (targetLeft >= max && deltaY > 0)) return

    e.preventDefault()
    animateTo(targetLeft + deltaY)
  }

  /** 滚动结束后，计算当前是第几页，同步 activeIdx */
  function onScroll(): void {
    if (isProgrammaticScroll) return

    if (rafId === null && scrollRef.value) {
      targetLeft = scrollRef.value.scrollLeft
    }
    if (scrollTimer) clearTimeout(scrollTimer)
    scrollTimer = setTimeout(() => {
      const container = scrollRef.value
      if (!container) return
      const cardW = getCardWidth()
      if (cardW <= 0) return
      const pageW = cardW + CARD_GAP
      const idx = Math.round(container.scrollLeft / pageW)
      const clamped = Math.max(0, Math.min(canvasesLength.value - 1, idx))
      if (clamped !== activeIdx.value) {
        activeIdx.value = clamped
      }
    }, 120)
  }

  /** 监听外部 currentPage 变化（比如点圆点指示器），滚动到对应页 */
  watch(currentPage, (page) => {
    const container = scrollRef.value
    if (!container) return
    if (page === activeIdx.value) return
    const cardW = getCardWidth()
    const pageW = cardW + CARD_GAP
    animateTo(page * pageW)
    activeIdx.value = page
  })

  /** 渲染完成后，重置位置到当前页 */
  function resetToCurrentPage(): void {
    if (!scrollRef.value) return
    activeIdx.value = Math.min(currentPage.value, canvasesLength.value - 1)
    const cardW = getCardWidth()
    const pageW = cardW + CARD_GAP
    targetLeft = activeIdx.value * pageW
    scrollRef.value.scrollLeft = targetLeft
  }

  // ── 鼠标自由拖拽（跟手+有限惯性，无吸附）──────────────────────────
  let isDragging = false
  let dragStartX = 0
  let dragStartScrollLeft = 0
  let dragLastX = 0
  let dragLastTime = 0
  let dragVelocity = 0
  let dragMoved = false

  function onMouseDown(e: MouseEvent): void {
    const container = scrollRef.value
    if (!container || canvasesLength.value <= 1) return
    if (e.button !== 0) return
    isDragging = true
    dragMoved = false
    dragStartX = e.pageX
    dragStartScrollLeft = container.scrollLeft
    dragLastX = e.pageX
    dragLastTime = performance.now()
    dragVelocity = 0
    // 停止正在进行的惯性动画
    if (inertiaRaf !== null) {
      cancelAnimationFrame(inertiaRaf)
      inertiaRaf = null
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    container.style.cursor = 'grabbing'
  }

  function onMouseMove(e: MouseEvent): void {
    const container = scrollRef.value
    if (!container || !isDragging) return
    const dx = e.pageX - dragStartX
    if (Math.abs(dx) > 3) {
      dragMoved = true
      e.preventDefault()
    }
    // 硬边界限制
    const maxScroll = container.scrollWidth - container.clientWidth
    let newScrollLeft = dragStartScrollLeft - dx
    newScrollLeft = Math.max(0, Math.min(maxScroll, newScrollLeft))
    container.scrollLeft = newScrollLeft
    // 计算拖拽速度
    const now = performance.now()
    const dt = now - dragLastTime
    if (dt > 0) {
      dragVelocity = (e.pageX - dragLastX) / dt
    }
    dragLastX = e.pageX
    dragLastTime = now
  }

  function onMouseUp(): void {
    const container = scrollRef.value
    if (!container || !isDragging) return
    isDragging = false
    container.style.cursor = 'grab'
    if (!dragMoved) return

    // 惯性滑行：速度换算成位移，限制最大滑行距离为半个卡片宽度，更柔更短
    const cardW = getCardWidth()
    const maxInertiaOffset = cardW * 0.5
    let inertiaOffset = dragVelocity * 120
    // 限制最大滑行距离
    inertiaOffset = Math.max(-maxInertiaOffset, Math.min(maxInertiaOffset, inertiaOffset))

    let currentX = container.scrollLeft
    const targetX = Math.max(0, Math.min(container.scrollWidth - container.clientWidth, currentX - inertiaOffset))

    function inertiaLoop(): void {
      if (!container) return
      const diff = targetX - currentX
      // 更柔的减速，动画更平滑
      if (Math.abs(diff) < 0.3) {
        inertiaRaf = null
        return
      }
      currentX += diff * 0.08
      container.scrollLeft = currentX
      inertiaRaf = requestAnimationFrame(inertiaLoop)
    }
    inertiaRaf = requestAnimationFrame(inertiaLoop)
  }

  function onMouseLeave(): void {
    if (isDragging) onMouseUp()
  }

  // 组件卸载时清理所有动画与定时器，避免残留 raf/timeout 继续执行
  onBeforeUnmount(() => {
    if (inertiaRaf !== null) {
      cancelAnimationFrame(inertiaRaf)
      inertiaRaf = null
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (scrollTimer) {
      clearTimeout(scrollTimer)
      scrollTimer = null
    }
  })

  return {
    activeIdx,
    onWheel,
    onScroll,
    animateTo,
    resetToCurrentPage,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
  }
}
