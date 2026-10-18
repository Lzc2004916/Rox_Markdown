<template>
  <div
    ref="containerRef"
    class="flex flex-col w-full h-full rounded-xl bg-transparent relative"
  >
    
    <div
      v-if="useScroll"
      ref="scrollRef"
      tabindex="0"
      class="flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-6 flex items-center gap-6 outline-none"
      style="cursor: grab; user-select: none;"
      @scroll="onScroll"
      @wheel="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseLeave"
    >
      <canvas
        v-for="(_, idx) in canvases"
        :key="idx"
        :ref="(el: unknown) => setCanvasRef(el, idx)"
        class="card-canvas block w-auto shrink-0 shadow-lg rounded-md"
        :style="canvasDisplayStyle"
      ></canvas>
    </div>

    
    <div
      v-else-if="canvases.length > 0"
      class="flex-1 min-h-0 flex items-center justify-center px-6 py-6 overflow-auto"
    >
      <canvas
        ref="singleCanvasRef"
        class="card-canvas block h-auto shrink-0 shadow-lg rounded-md"
        :style="canvasDisplayStyle"
      ></canvas>
    </div>

    
    <div
      v-else
      class="flex items-center justify-center border-1.5 border-dashed border-base-content/12 shrink-0 text-base-content/50 text-sm rounded-lg"
      :style="canvasDisplayStyle"
    >
      <LoadingSpinner
        variant="spinner"
        size="lg"
        text="渲染中…"
      />
    </div>

    <!-- 渲染中遮罩：禁用交互 -->
    <div
      v-if="rendering && canvases.length > 0"
      class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-base-100/70 backdrop-blur-sm"
    >
      <div class="flex items-center gap-1.5 mb-3">
        <div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 0ms"></div>
        <div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 150ms"></div>
        <div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 300ms"></div>
      </div>
      <span class="text-xs text-base-content/60">正在加载预览</span>
    </div>

    
    <div v-if="canvases.length > 1" class="shrink-0 h-10 flex items-center justify-center gap-1.5 bg-base-100/60 border-t border-base-300/40">
      <button
        v-for="n in canvases.length"
        :key="n - 1"
        class="rounded-full transition-all duration-200"
        :class="activeIdx === n - 1 ? 'w-5 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-base-content/20 hover:bg-base-content/40'"
        :aria-label="`第 ${n} 页`"
        @click="emit('update:currentPage', n - 1)"
      ></button>
      <span class="ml-2 text-[11px] tabular-nums text-base-content/50">{{ activeIdx + 1 }} / {{ canvases.length }}</span>
    </div>

    
    <div
      v-if="truncated"
      class="shrink-0 flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border-t border-amber-500/20 px-3 py-1.5"
    >
      <span aria-hidden="true">⚠️</span>
      <span>内容过长，仅渲染前 {{ canvases.length }} 页。</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { renderAllPagesAsync, renderAllPages, renderCard, preloadImages, collectImageSrcs, PAGE_WIDTH, getTheme, extractTokens, applyTokensToElement, computeImageMaxHeights } from '@/card'
import type { HighlightStyle, FooterRightMode, CardCornerMode, TypographySettings, GradientConfig, CardPage, HeadingStyleOverrides } from '@/card'
import LoadingSpinner from '@/components/preview/LoadingSpinner.vue'
import { useScrollSync } from '@/composables/useScrollSync'



interface Props {
  
  source: string
  
  currentPage?: number
  
  themeId?: string
  
  typography?: TypographySettings
  
  gradientConfig?: GradientConfig
  
  highlightStyle?: HighlightStyle
  
  footerLeft?: string
  
  footerRightMode?: FooterRightMode
  
  footerEnabled?: boolean
  
  cardCornerMode?: CardCornerMode
  
  previewScale?: number
  
  headingOverrides?: HeadingStyleOverrides | null
  
  highlightColor?: string | null
  
  bodyTextColor?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  currentPage: 0,
  themeId: 'moss-paper',
  typography: () => ({
    bodySize: 30,
    lineHeight: 1.84,
    bodyFontMode: 'wenkai' as const,
    subheadingStyle: 'large' as const,
  }),
  highlightColor: null,
  highlightStyle: 'underline' as HighlightStyle,
  footerLeft: '',
  footerRightMode: 'page' as FooterRightMode,
  footerEnabled: false,
  cardCornerMode: 'square' as CardCornerMode,
  previewScale: 1.0,
  gradientConfig: () => ({ enabled: false, color1: '#6c5ce7', color2: '#a29bfe', angle: 135 }),
  headingOverrides: null,
  bodyTextColor: null,
})



const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void
  (e: 'update:imageMaxHeights', maxHeights: Record<string, number>): void
}>()




const MIN_CARD_WIDTH = 180

const CARD_GAP = 24



const canvases = ref<HTMLCanvasElement[]>([])

const truncated = ref(false)

const rendering = ref(false)

const containerRef = ref<HTMLDivElement | null>(null)
const scrollRef = ref<HTMLDivElement | null>(null)
const singleCanvasRef = ref<HTMLCanvasElement | null>(null)
const canvasRefs = ref<Record<number, HTMLCanvasElement | null>>({})




const displayScale = computed(() => {
  const floor = MIN_CARD_WIDTH / PAGE_WIDTH
  return Math.max(floor, props.previewScale)
})


const canvasDisplayStyle = computed(() => {
  const scale = displayScale.value
  const w = Math.round(PAGE_WIDTH * scale)
  return { width: `${w}px` }
})



const useScroll = computed(() => canvases.value.length > 1)



function getRenderedCardWidth(): number {
  const container = scrollRef.value
  if (container) {
    const firstCanvas = container.querySelector('canvas')
    if (firstCanvas) return firstCanvas.offsetWidth
  }
  if (singleCanvasRef.value) {
    return singleCanvasRef.value.offsetWidth
  }
  return Math.round(PAGE_WIDTH * displayScale.value)
}



// 渲染节流：前缘立即渲染 + 尾部补偿，替代纯防抖，让删除操作立即跟手
const RENDER_THROTTLE_MS = 300
let throttleTimer: ReturnType<typeof setTimeout> | null = null
let lastRenderAt = 0


let abortController: AbortController | null = null


let lastLayoutKey = ''
let cachedLayoutPages: CardPage[] = []


/**
 * 生成排版缓存 key
 * 排版只和内容、字号、行距、字体有关，和主题颜色无关
 * 切主题时 key 不变，只重画不重新分页，速度快很多
 */
function buildLayoutKey(): string {
  const t = props.typography
  return JSON.stringify({
    source: props.source,
    bodySize: t?.bodySize,
    lineHeight: t?.lineHeight,
    bodyFontMode: t?.bodyFontMode,
    bodyFontWeight: t?.bodyFontWeight,
    subheadingStyle: t?.subheadingStyle,
    footerEnabled: props.footerEnabled,
    headingOverrides: props.headingOverrides,
  })
}

function scheduleRender(): void {
  
  if (abortController) {
    abortController.abort()
    abortController = null
  }

  const now = performance.now()
  const remaining = RENDER_THROTTLE_MS - (now - lastRenderAt)

  if (remaining <= 0) {
    // 前缘：距上次渲染已超过节流窗口，立即渲染（删除等离散操作即时响应）
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
    lastRenderAt = now
    rendering.value = true
    doRender()
  } else {
    // 尾部：窗口内连续变更只记一次，窗口结束后补渲染，保证最终结果落地
    if (throttleTimer) clearTimeout(throttleTimer)
    rendering.value = true
    throttleTimer = setTimeout(() => {
      throttleTimer = null
      lastRenderAt = performance.now()
      doRender()
    }, remaining)
  }
}

async function doRender(): Promise<void> {
  // 先让出当前同步执行栈：setup 阶段 immediate watch 触发首帧渲染时，
  // activeIdx（来自 useScrollSync）尚未初始化，同步访问会 TDZ。
  // 延后到微任务后，setup 已完成，变量均已就绪。
  await Promise.resolve()

  abortController = new AbortController()
  const signal = abortController.signal

  // 渲染前记住当前在第几页，渲染完尽量回到这里
  const pageBeforeRender = activeIdx.value

  try {
    const layoutKey = buildLayoutKey()
    const layoutChanged = layoutKey !== lastLayoutKey

    if (layoutChanged) {
      
      const result = await renderAllPagesAsync({
        source: props.source,
        themeId: props.themeId,
        typography: props.typography,
        highlightStyle: props.highlightStyle,
        footerLeft: props.footerLeft,
        footerRightMode: props.footerRightMode,
        footerEnabled: props.footerEnabled,
        cardCornerMode: props.cardCornerMode,
        gradientConfig: props.gradientConfig,
        headingOverrides: props.headingOverrides,
        highlightColor: props.highlightColor,
        bodyTextColor: props.bodyTextColor,
      }, signal)
      // 释放旧 canvas 引用，帮助 GC
      canvases.value.forEach(c => { c.width = 0; c.height = 0 })
      canvases.value = result.canvases
      cachedLayoutPages = result.pages
      truncated.value = result.truncated
      lastLayoutKey = layoutKey
    } else {
      
      if (cachedLayoutPages.length === 0) {
        
        const result = await renderAllPagesAsync({
          source: props.source,
          themeId: props.themeId,
          typography: props.typography,
          highlightStyle: props.highlightStyle,
          footerLeft: props.footerLeft,
          footerRightMode: props.footerRightMode,
          footerEnabled: props.footerEnabled,
          cardCornerMode: props.cardCornerMode,
          gradientConfig: props.gradientConfig,
          headingOverrides: props.headingOverrides,
          highlightColor: props.highlightColor,
          bodyTextColor: props.bodyTextColor,
        }, signal)
        canvases.value = result.canvases
        cachedLayoutPages = result.pages
        truncated.value = result.truncated
      } else {
        const theme = getTheme(props.themeId ?? 'moss-paper')
        // 复用排版结果的重渲染分支（仅主题/样式变化）：
        // renderAllPagesAsync 内部会预加载图片，这里绕过它直接 renderCard，
        // 需要手动预加载一次（缓存命中时几乎无开销）
        await preloadImages(collectImageSrcs(cachedLayoutPages))
        if (signal.aborted) return
        const canvasesList: HTMLCanvasElement[] = []
        for (let i = 0; i < cachedLayoutPages.length; i++) {
          if (signal.aborted) return
          canvasesList.push(
            await renderCard({
              page: cachedLayoutPages[i]!,
              theme,
              settings: props.typography,
              highlightStyle: props.highlightStyle ?? theme.editor.highlightStyle,
              pageIndex: i,
              totalPages: cachedLayoutPages.length,
              footerLeft: props.footerLeft ?? '',
              footerRightMode: props.footerRightMode ?? 'page',
              footerEnabled: props.footerEnabled ?? true,
              cardCornerMode: props.cardCornerMode ?? 'square',
              gradientConfig: props.gradientConfig,
              headingOverrides: props.headingOverrides,
              highlightColor: props.highlightColor,
              bodyTextColor: props.bodyTextColor,
            }),
          )
          
          if (i < cachedLayoutPages.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 0))
          }
        }
        canvases.value = canvasesList
      }
    }

    
    if (props.currentPage >= canvases.value.length && canvases.value.length > 0) {
      emit('update:currentPage', Math.max(0, canvases.value.length - 1))
    }
  } catch (e: unknown) {
    
    if (e instanceof DOMException && e.name === 'AbortError') return
    
    if (signal.aborted) return

    console.warn('[CardPreview] Render failed:', e)
    try {
      const result = await renderAllPagesAsync({
        source: props.source,
        themeId: props.themeId,
        typography: props.typography,
        highlightStyle: props.highlightStyle,
        footerLeft: props.footerLeft,
        footerRightMode: props.footerRightMode,
        footerEnabled: props.footerEnabled,
        cardCornerMode: props.cardCornerMode,
        gradientConfig: props.gradientConfig,
        headingOverrides: props.headingOverrides,
        highlightColor: props.highlightColor,
        bodyTextColor: props.bodyTextColor,
      })
      canvases.value = result.canvases
      cachedLayoutPages = result.pages
      truncated.value = result.truncated
      lastLayoutKey = buildLayoutKey()
    } catch {  }
  } finally {
    rendering.value = false
    // 回填每张图片的动态高度上限（key → maxHeight）。
    // 上限依赖主题安全区与页脚，主题切换时即使排版缓存命中也要重算，故放在 finally 统一处理。
    const maxHeights = computeImageMaxHeights(
      cachedLayoutPages,
      getTheme(props.themeId ?? 'moss-paper'),
      props.footerEnabled ?? true,
    )
    emit('update:imageMaxHeights', maxHeights)
    // 渲染完成后 nextTick，等 DOM 重建完再同步位置
    await nextTick()
    if (useScroll.value) {
      // 尽量回到渲染前看的那一页，而不是跳回第一页
      const targetPage = Math.min(pageBeforeRender, canvases.value.length - 1)
      activeIdx.value = targetPage
      const cardW = getRenderedCardWidth()
      const pageW = cardW + CARD_GAP
      const container = scrollRef.value
      if (container) {
        container.scrollLeft = targetPage * pageW
      }
    }
  }
}


watch(
  () => [
    props.source,
    props.themeId,
    props.typography,
    props.highlightStyle,
    props.footerLeft,
    props.footerRightMode,
    props.footerEnabled,
    props.cardCornerMode,
    props.gradientConfig,
    props.headingOverrides,
    props.highlightColor,
    props.bodyTextColor,
  ] as const,
  scheduleRender,
  { immediate: true },
)


watch(
  () => canvases.value,
  async () => {
    await nextTick()

    if (!useScroll.value && singleCanvasRef.value && canvases.value.length > 0) {
      const src = canvases.value[0]!
      const dest = singleCanvasRef.value
      dest.width = src.width
      dest.height = src.height
      const dCtx = dest.getContext('2d')
      if (dCtx) dCtx.drawImage(src, 0, 0)
    }

    if (useScroll.value) {
      const refs = Object.values(canvasRefs.value).filter(Boolean) as HTMLCanvasElement[]
      for (let i = 0; i < Math.min(refs.length, canvases.value.length); i++) {
        const src = canvases.value[i]!
        const dest = refs[i]!
        dest.width = src.width
        dest.height = src.height
        const dCtx = dest.getContext('2d')
        if (dCtx) dCtx.drawImage(src, 0, 0)
      }
    }
  },
  { immediate: true },
)



function setCanvasRef(el: unknown, idx: number): void {
  if (el) {
    canvasRefs.value[idx] = el as HTMLCanvasElement
  } else {
    
    delete canvasRefs.value[idx]
  }
}

/** 初始化滚动页码同步逻辑 */
const {
  activeIdx,
  onWheel,
  onScroll,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
} = useScrollSync({
  scrollRef,
  canvasesLength: computed(() => canvases.value.length),
  currentPage: computed(() => props.currentPage),
  getCardWidth: getRenderedCardWidth,
})




watch(
  () => [props.themeId, props.gradientConfig] as const,
  () => {
    const theme = getTheme(props.themeId ?? 'moss-paper')
    const tokens = extractTokens(
      theme,
      props.gradientConfig,
    )
    if (containerRef.value) {
      applyTokensToElement(containerRef.value, tokens)
    }
  },
  { immediate: true },
)



onMounted(() => {
  
})

onBeforeUnmount(() => {
  if (abortController) abortController.abort()
  if (throttleTimer) clearTimeout(throttleTimer)
})



defineExpose({
  
  getActiveCanvas: (): HTMLCanvasElement | null => {
    return canvases.value[props.currentPage] ?? null
  },
  
  getAllCanvases: (): HTMLCanvasElement[] => {
    return canvases.value
  },
  
  getPageCount: (): number => {
    return canvases.value.length
  },
  
  forceRender: () => {
    doRender()
  },
})
</script>

<style scoped>


.preview-root {
  container-type: inline-size;
  container-name: preview;
}

@container preview (max-width: 400px) {
  .card-canvas {
    box-shadow: 0 1px 2px oklch(0 0 0 / 0.04), 0 2px 6px oklch(0 0 0 / 0.05);
  }
}

@container preview (max-width: 300px) {
  .page-indicator {
    font-size: 0.75rem;
  }
}



@media print {
  .preview-root {
    background: none;
    padding: 0;
  }

  .card-canvas {
    box-shadow: none;
    border-radius: 0;
    max-width: 100%;
    page-break-after: always;
  }

  .page-indicator {
    display: none;
  }
}
</style>