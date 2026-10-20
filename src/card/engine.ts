


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
import { getTheme } from './themes'
import { clearMeasureCaches } from './measure'
import { preloadImages, collectImageSrcs } from './image-loader'
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
 * 鎺掔増鍓嶇‘淇濇鏂囧瓧浣撳凡鍔犺浇瀹屾垚銆?
 *
 * 璺ㄩ〉涓㈠瓧鐨勬牴鍥犱箣涓€锛歸ebfont锛堝 LXGW WenKai锛夋湭鍔犺浇瀹屾垚鏃讹紝
 * canvas measureText 杩斿洖 fallback 瀛椾綋瀹藉害锛岀敤閿欒瀹藉害绠楀嚭鐨勬姌琛岀粨鏋?
 * 浼氳 _wrapCache 缂撳瓨锛涙覆鏌撴椂瀛椾綋宸插姞杞姐€佸疄闄呭瓧瀹芥洿澶э紝琛屽熬瀛楃琚帹鍑?
 * 鍐呭鍖洪伃 clip 瑁佹帀锛岃€屼笅涓€椤典粠涓嬩竴琛屽紑濮嬫帓鐗?鈫?璇ュ瓧涓ら〉閮戒笉鍑虹幇銆?
 *
 * 杩欓噷鍦ㄩ娆℃帓鐗堝墠鏄惧紡鍔犺浇姝ｆ枃甯哥敤瀛楅噸骞剁瓑寰?fonts.ready锛岄殢鍚庢竻绌?
 * 娴嬮噺缂撳瓨锛屼繚璇佺紦瀛橀噷鐨勬姌琛岀粨鏋滃叏閮ㄥ熀浜庣湡瀹炲瓧瀹姐€?
 * 鎸夊瓧浣撴棌缂撳瓨 Promise锛屽悓涓€瀛椾綋鏃忓彧绛夊緟涓€娆°€?
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
    // 2 秒超时，字体加载慢就先渲染，不等了
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2000))
    cached = Promise.race([
      Promise.allSettled(loads).then(() => {
        clearMeasureCaches()
      }),
      timeout,
    ])
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

  // 瀛椾綋鍔犺浇瀹屽啀鎺掔増锛岄伩鍏嶇敤 fallback 瀛楀鎶樿瀵艰嚧璺ㄩ〉涓㈠瓧
  await ensureFontsReady(getBodyFontFamily(settings.bodyFontMode), settings.bodySize)
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const { pages, truncated } = layoutPages({
    source: opts.source,
    settings,
    theme,
    footerEnabled: opts.footerEnabled ?? true,
    headingOverrides: opts.headingOverrides,
  })

  // 渲染前预加载全部图片块，保证 renderCard 同步绘制时图片已就绪；
  // 否则图片只能 onload 后画在源 canvas 上，显示 canvas 的拷贝早已完成。
  await preloadImages(collectImageSrcs(pages))
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const canvases: HTMLCanvasElement[] = []

  for (let i = 0; i < pages.length; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    canvases.push(
      await renderCard({
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

