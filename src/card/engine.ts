


import type {
  CardPage,
  GradientConfig,
  HighlightStyle,
  FooterRightMode,
  CardCornerMode,
  ThemeDefinition,
  TypographySettings,
  HeadingStyleOverrides,
} from './types'
import { layoutPages } from './layout'
import { renderCard } from './renderer'
import { getTheme } from './theme-registry'
import { clearMeasureCaches } from './measure'
import { getBodyFontFamily, BODY_TEXT_WEIGHT, BODY_BOLD_WEIGHT } from './types'



export interface EngineOptions {
  
  source: string
  
  themeId: string
  
  typography: TypographySettings
  
  highlightStyle: HighlightStyle
  
  footerLeft?: string
  
  footerRightMode?: FooterRightMode
  
  footerEnabled?: boolean
  
  cardCornerMode?: CardCornerMode
  
  gradientConfig?: GradientConfig
  
  headingOverrides?: HeadingStyleOverrides | null
  
  highlightColor?: string | null
  
  bodyTextColor?: string | null
}




const _fontLoadPromises = new Map<string, Promise<void>>()

/**
 * 排版前确保正文字体已加载完成。
 *
 * 跨页丢字的根因之一：webfont（如 LXGW WenKai）未加载完成时，
 * canvas measureText 返回 fallback 字体宽度，用错误宽度算出的折行结果
 * 会被 _wrapCache 缓存；渲染时字体已加载、实际字宽更大，行尾字符被推出
 * 内容区遭 clip 裁掉，而下一页从下一行开始排版 → 该字两页都不出现。
 *
 * 这里在首次排版前显式加载正文常用字重并等待 fonts.ready，随后清空
 * 测量缓存，保证缓存里的折行结果全部基于真实字宽。
 * 按字体族缓存 Promise，同一字体族只等待一次。
 */
function ensureFontsReady(fontFamilyStack: string, fontSize: number): Promise<void> {
  let cached = _fontLoadPromises.get(fontFamilyStack)
  if (!cached) {
    const loads: Promise<unknown>[] = []
    if (typeof document !== 'undefined' && document.fonts) {
      const generic = new Set(['serif', 'sans-serif', 'monospace', 'system-ui'])
      for (const fam of fontFamilyStack.split(',')) {
        const name = fam.trim()
        if (!name || generic.has(name.toLowerCase())) continue
        for (const weight of [BODY_TEXT_WEIGHT, BODY_BOLD_WEIGHT]) {
          loads.push(document.fonts.load(`${weight} ${fontSize}px ${name}`).catch(() => false))
        }
      }
      loads.push(document.fonts.ready.then(() => undefined).catch(() => undefined))
    }
    cached = Promise.allSettled(loads).then(() => {
      // 字体状态已变化：清掉可能用 fallback 字宽写入的折行/解析缓存
      clearMeasureCaches()
    })
    _fontLoadPromises.set(fontFamilyStack, cached)
  }
  return cached
}


export function renderAllPages(
  opts: EngineOptions,
): { pages: CardPage[]; canvases: HTMLCanvasElement[]; truncated: boolean } {
  const theme: ThemeDefinition = getTheme(opts.themeId)
  const settings: TypographySettings = opts.typography

  const { pages, truncated } = layoutPages({
    source: opts.source,
    settings,
    theme,
    footerEnabled: opts.footerEnabled ?? true,
    headingOverrides: opts.headingOverrides,
  })

  const canvases = pages.map((page, index) =>
    renderCard({
      page,
      theme,
      settings,
      highlightStyle: opts.highlightStyle ?? theme.editor.highlightStyle,
      pageIndex: index,
      totalPages: pages.length,
      footerLeft: opts.footerLeft ?? '',
      footerRightMode: opts.footerRightMode ?? 'page',
      footerEnabled: opts.footerEnabled ?? true,
      cardCornerMode: opts.cardCornerMode ?? 'square',
      gradientConfig: opts.gradientConfig,
      headingOverrides: opts.headingOverrides,
      highlightColor: opts.highlightColor ?? null,
      bodyTextColor: opts.bodyTextColor ?? null,
    }),
  )

  return { pages, canvases, truncated }
}


export async function renderAllPagesAsync(
  opts: EngineOptions,
  signal?: AbortSignal,
): Promise<{ pages: CardPage[]; canvases: HTMLCanvasElement[]; truncated: boolean }> {
  const theme: ThemeDefinition = getTheme(opts.themeId)
  const settings: TypographySettings = opts.typography

  // 字体加载完再排版，避免用 fallback 字宽折行导致跨页丢字
  await ensureFontsReady(getBodyFontFamily(settings.bodyFontMode), settings.bodySize)
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const { pages, truncated } = layoutPages({
    source: opts.source,
    settings,
    theme,
    footerEnabled: opts.footerEnabled ?? true,
    headingOverrides: opts.headingOverrides,
  })

  const canvases: HTMLCanvasElement[] = []

  for (let i = 0; i < pages.length; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    canvases.push(
      renderCard({
        page: pages[i]!,
        theme,
        settings,
        highlightStyle: opts.highlightStyle ?? theme.editor.highlightStyle,
        pageIndex: i,
        totalPages: pages.length,
        footerLeft: opts.footerLeft ?? '',
        footerRightMode: opts.footerRightMode ?? 'page',
        footerEnabled: opts.footerEnabled ?? true,
        cardCornerMode: opts.cardCornerMode ?? 'square',
        gradientConfig: opts.gradientConfig,
        headingOverrides: opts.headingOverrides,
        highlightColor: opts.highlightColor ?? null,
        bodyTextColor: opts.bodyTextColor ?? null,
      }),
    )

    
    if (i < pages.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  return { pages, canvases, truncated }
}


export function canvasToPreviewUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png')
}


export function canvasToExportUrl(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpg' = 'png',
): string {
  if (format === 'jpg') return canvas.toDataURL('image/jpeg', 0.95)
  return canvas.toDataURL('image/png')
}