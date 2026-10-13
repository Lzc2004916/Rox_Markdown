


import type {
  CardPage,
  CardDecorConfig,
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
  
  decor?: CardDecorConfig | null
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
      decor: opts.decor,
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
        decor: opts.decor,
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