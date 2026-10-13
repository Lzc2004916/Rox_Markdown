<template>
  <div
    ref="containerRef"
    class="flex flex-col w-full h-full rounded-xl bg-transparent"
  >
    
    <div
      v-if="useScroll"
      ref="scrollRef"
      tabindex="0"
      class="flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-6 flex items-center gap-6 outline-none"
      @scroll="onScroll"
      @wheel="onWheel"
      @keydown="onKeydown"
    >
      <canvas
        v-for="(_, idx) in canvases"
        :key="idx"
        :ref="(el: unknown) => setCanvasRef(el, idx)"
        class="card-canvas block w-auto shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_8px_28px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)]"
        :style="canvasDisplayStyle"
      ></canvas>
    </div>

    
    <canvas
      v-else-if="canvases.length > 0"
      ref="singleCanvasRef"
      class="card-canvas block h-auto shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_8px_28px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)]"
      :style="canvasDisplayStyle"
    ></canvas>

    
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
import { renderAllPagesAsync, renderAllPages, renderCard, PAGE_WIDTH, getTheme, extractTokens, applyTokensToElement } from '@/card'
import type { HighlightStyle, FooterRightMode, CardCornerMode, TypographySettings, GradientConfig, CardPage, HeadingStyleOverrides } from '@/card'
import LoadingSpinner from '@/components/LoadingSpinner.vue'



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
  
  decor?: import('@/card').CardDecorConfig | null
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
  footerEnabled: true,
  cardCornerMode: 'square' as CardCornerMode,
  previewScale: 1.0,
  gradientConfig: () => ({ enabled: false, color1: '#6c5ce7', color2: '#a29bfe', angle: 135 }),
  headingOverrides: null,
  bodyTextColor: null,
  decor: null,
})



const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void
}>()




const MIN_CARD_WIDTH = 180

const CARD_GAP = 24



const canvases = ref<HTMLCanvasElement[]>([])

const truncated = ref(false)

const containerRef = ref<HTMLDivElement | null>(null)
const scrollRef = ref<HTMLDivElement | null>(null)
const singleCanvasRef = ref<HTMLCanvasElement | null>(null)
const canvasRefs = ref<Record<number, HTMLCanvasElement | null>>({})
const activeIdx = ref(props.currentPage)




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



let debounceTimer: ReturnType<typeof setTimeout> | null = null


let abortController: AbortController | null = null


let lastLayoutKey = ''
let cachedLayoutPages: CardPage[] = []


function buildLayoutKey(): string {
  const t = props.typography
  return JSON.stringify({
    source: props.source,
    themeId: props.themeId,
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
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(doRender, 300)
}

async function doRender(): Promise<void> {
  
  abortController = new AbortController()
  const signal = abortController.signal

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
        decor: props.decor,
      }, signal)
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
        decor: props.decor,
        }, signal)
        canvases.value = result.canvases
        cachedLayoutPages = result.pages
        truncated.value = result.truncated
      } else {
        const theme = getTheme(props.themeId ?? 'moss-paper')
        const canvasesList: HTMLCanvasElement[] = []
        for (let i = 0; i < cachedLayoutPages.length; i++) {
          if (signal.aborted) return
          canvasesList.push(
            renderCard({
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
        decor: props.decor,
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
      const result = renderAllPages({
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
        decor: props.decor,
      })
      canvases.value = result.canvases
      cachedLayoutPages = result.pages
      truncated.value = result.truncated
      lastLayoutKey = buildLayoutKey()
    } catch {  }
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
    props.decor,
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

let isProgrammaticScroll = false
let scrollTimer: ReturnType<typeof setTimeout> | null = null


let targetLeft = 0
let rafId: number | null = null

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

function animateTo(left: number): void {
  const container = scrollRef.value
  if (!container) return
  const max = container.scrollWidth - container.clientWidth
  targetLeft = Math.max(0, Math.min(max, left))
  if (rafId === null) rafId = requestAnimationFrame(smoothLoop)
}

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

function onKeydown(e: KeyboardEvent): void {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  e.preventDefault()
  const cardW = getRenderedCardWidth()
  const pageW = cardW + CARD_GAP
  const dir = e.key === 'ArrowRight' ? 1 : -1
  animateTo(targetLeft + dir * pageW)
}

function onScroll(): void {
  if (isProgrammaticScroll) return
  
  
  if (rafId === null && scrollRef.value) {
    targetLeft = scrollRef.value.scrollLeft
  }
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    const container = scrollRef.value
    if (!container) return
    const cardW = getRenderedCardWidth()
    if (cardW <= 0) return
    const pageW = cardW + CARD_GAP
    const idx = Math.round(container.scrollLeft / pageW)
    const clamped = Math.max(0, Math.min(canvases.value.length - 1, idx))
    if (clamped !== activeIdx.value) {
      activeIdx.value = clamped
      emit('update:currentPage', clamped)
    }
  }, 120)
}

watch(
  () => props.currentPage,
  (page) => {
    const container = scrollRef.value
    if (!container || !useScroll.value) return
    if (page === activeIdx.value) return
    const cardW = getRenderedCardWidth()
    const pageW = cardW + CARD_GAP
    animateTo(page * pageW)
    activeIdx.value = page
  },
)




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
  if (debounceTimer) clearTimeout(debounceTimer)
  if (scrollTimer) clearTimeout(scrollTimer)
  if (rafId) cancelAnimationFrame(rafId)
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