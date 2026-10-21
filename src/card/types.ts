





export interface GradientConfig {
  enabled: boolean
  color1: string
  color2: string
  
  angle: number
}



export type ThemeMode = 'paper' | 'sage' | 'vintage' | 'obsidian' | 'archive' | 'swiss' | 'cyber' | 'glass' | 'brutal' | 'luxe' | 'frost'



export type SubheadingStyle = 'large' | 'accent'



export type HighlightStyle = 'underline' | 'border' | 'highlight'

export type HighlightTreatment =
  | 'softUnderline'
  | 'swissRule'
  | 'boldAccent'



export type QuoteTreatment = 'paper' | 'callout' | 'code'



export type CardCornerMode = 'rounded' | 'square'



export type FooterRightMode = 'blank' | 'page' | 'date'



export interface ThemePalette {
  
  page: string
  
  pageAlt: string
  
  text: string
  
  muted: string
  
  accent: string
  
  accentSoft: string
  
  border: string
  
  shadow: string
  
  glow: string
}

export interface ThemeSurface {
  
  grainAlpha: number
  
  vignetteAlpha: number
  
  washStrength: number
  
  innerFrameAlpha: number
  
  innerFrameInset: number
  
  titleAccentMix: number
  
  footerLineAlpha: number
  
  footerTextAlpha: number
  
  previewShadow: string
}

export interface ThemeComponents {
  
  quoteFillAlpha: number
  
  quoteStrokeAlpha: number
  
  quoteBarAlpha: number
  
  quoteRadius: number
  
  quoteTreatment: QuoteTreatment
  
  highlightTreatment: HighlightTreatment
  
  highlightUnderlineAlpha: number
  
  highlightMarkerAlpha: number
  
  highlightDashAlpha: number
}




export interface HeadingTypography {
  
  h1Scale?: number
  h2Scale?: number
  h3Scale?: number
  h4Scale?: number
  h5Scale?: number
  h6Scale?: number

  
  h1LineHeight?: number
  h2LineHeight?: number
  h3LineHeight?: number
  h4LineHeight?: number
  h5LineHeight?: number
  h6LineHeight?: number

  
  h1MarginTop?: number
  h2MarginTop?: number
  h3MarginTop?: number

  
  h1MarginBottom?: number
  h2MarginBottom?: number
  h3MarginBottom?: number

  
  h1FontWeight?: number
  h2FontWeight?: number
  h3FontWeight?: number

  
  h1Color?: string
  h2Color?: string
  h3Color?: string
  h4Color?: string
  h5Color?: string
  h6Color?: string

  
  h1Shadow?: string
  h2Shadow?: string
  h3Shadow?: string
  h4Shadow?: string
  h5Shadow?: string
  h6Shadow?: string

  
  h1Stroke?: string
  h2Stroke?: string
  h3Stroke?: string
  h4Stroke?: string
  h5Stroke?: string
  h6Stroke?: string

  
  h1StrokeWidth?: number
  h2StrokeWidth?: number
  h3StrokeWidth?: number
  h4StrokeWidth?: number
  h5StrokeWidth?: number
  h6StrokeWidth?: number
}


export interface CoverHeadingConfig {
  
  h1Scale?: number
  
  h1LineHeight?: number
  
  centered?: boolean
  
  topOffset?: number
}




export interface ListStyleConfig {
  
  bulletChar: string
  
  bulletSizeRatio: number
  
  indentPerLevel: number
  
  itemGap: number
  
  orderedMarkerBox?: boolean
  
  orderedNumberDot?: boolean
}


export const DEFAULT_LIST_STYLE: ListStyleConfig = {
  bulletChar: '•', 
  bulletSizeRatio: 0.85,
  indentPerLevel: 28,
  itemGap: 8,
  orderedMarkerBox: false,
}

export interface ThemeEditor {
  
  bodySize: number
  
  lineHeight: number
  
  bodyFontMode?: BodyFontMode
  
  bodyFontWeight?: number
  
  subheadingStyle?: SubheadingStyle
  
  highlightStyle: HighlightStyle
  
  heading?: HeadingTypography
  
  list?: ListStyleConfig
}



export type DecorKind = 'none' | 'cornerBracket' | 'topRule' | 'watermark' | 'geometricPattern' | 'leafMotif' | 'circuitTrace' | 'goldFoil' | 'auroraGlow' | 'fanBurst' | 'macosWindow' | 'desertSun' | 'sakuraPetal' | 'coralBranch' | 'crystalFacet' | 'sketchHatch' | 'iosNotesNav'

export interface ThemeDecor {
  
  kind: DecorKind
  
  opacity: number
  
  color?: string
  
  scale?: number
}

export interface ThemeOuterFrame {
  
  kind: 'none' | 'thin' | 'thick' | 'corner'
  
  color?: string
  
  width?: number
  
  padding?: number
  
  radius?: number
  
  cornerLength?: number
  
  opacity?: number
}

export interface ThemeDefinition {
  id: string
  name: string
  mood: string
  preset: string
  description: string
  tags: string[]
  mode: ThemeMode
  palette: ThemePalette
  surface: ThemeSurface
  components: ThemeComponents
  editor: ThemeEditor
  
  colorTag?: 'red' | 'orange' | 'yellow' | 'brown' | 'green' | 'blue' | 'pink' | 'dark' | 'neutral'
  
  decor?: ThemeDecor
  
  outerFrame?: ThemeOuterFrame

  contentInset?: {
    top?: number
    bottom?: number
    left?: number
    right?: number
  }

  coverHeading?: CoverHeadingConfig
  
  gradient?: {
    enabled: boolean
    color1: string
    color2: string
    
    angle?: number
  }

  backgroundImage?: string
}



export interface CardPage {
  id: string
  kind: 'cover' | 'body'
  title: string
  blocks: Block[]
}



export interface TypographySettings {
  bodySize: number
  lineHeight: number
  bodyFontMode: BodyFontMode
  subheadingStyle: SubheadingStyle
  
  bodyFontWeight?: number
}



export interface InlineToken {
  text: string
  bold: boolean
  italic: boolean
  mark: boolean
  underline: boolean
}



export interface InlineLine {
  tokens: InlineToken[]
}



export interface ParagraphBlock {
  kind: 'body' | 'quote' | 'subheading' | 'divider'
  raw: string
}



export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6



export interface TextBlock {
  kind: 'body' | 'quote' | 'subheading' | 'divider'
  raw: string
  headingLevel?: HeadingLevel
  /**
   * 跨页行切分时由 layout 预切好的行（治本防丢字）。
   * 仅当块文本是由"行片段"拼出来时挂载：渲染/测量直接使用这些行，
   * 不再对 raw 二次折行，避免序列化 → 重折行不一致导致行尾字符丢失。
   * 普通块（整段文本）不挂载，走常规折行。
   */
  prefixedLines?: InlineLine[]
}

export interface CodeBlock {
  kind: 'code'
  language: string       
  code: string           
  lineCount?: number
  /** 分页片段以换行结尾时，忽略 split 产生的末尾空视觉行。 */
  suppressTrailingEmptyLine?: boolean
}

export interface TableDisplayBlock {
  kind: 'table'
  headers: string[]
  alignments: ('left' | 'center' | 'right')[]
  rows: string[][]
  colWidths?: number[]
  rowHeights?: number[]
  totalWidth?: number
}

export interface ColumnContainerBlock {
  kind: 'columnContainer'
  leftBlocks: Block[]
  rightBlocks: Block[]
  totalHeight?: number
}



export type ListKind = 'orderedList' | 'unorderedList'

export interface ListItem {
  
  text: string
  
  indent: number
}

export interface ListBlock {
  kind: ListKind
  items: ListItem[]
  
  start?: number
}

// 图片块
export interface ImageBlock {
  kind: 'image'
  src: string
  alt: string
  height: number
  /** 图片唯一标识（markdown 里写作 {#img1}），无则为 undefined（老图） */
  key?: string
  /** 排版时记录的块顶 Y 坐标（布局元数据，供动态高度上限计算） */
  blockTop?: number
}

export type Block =
  | TextBlock
  | CodeBlock
  | TableDisplayBlock
  | ColumnContainerBlock
  | ListBlock
  | ImageBlock



export interface TextRange {
  start: number
  end: number
}



export interface PosterMetrics {
  bodySize: number
  bodyLineHeight: number
  bodyParagraphGap: number
  bodyFontFamily: string
  separatorY: number
  bodyTopY: number
  bodyBottomY: number
  bodyLeftX: number
  bodyRightX: number
  bodyWidth: number
  bodyHeight: number
}



export interface QuoteBoxMetrics {
  textInset: number
  textWidth: number
  paddingTop: number
  paddingBottom: number
  boxOffsetX: number
  boxWidthOffset: number
  barOffsetX: number
  barTopInset: number
  barBottomInset: number
  barWidth: number
  barRadius: number
}



export interface RenderOptions {
  page: CardPage
  theme: ThemeDefinition
  settings: TypographySettings
  highlightStyle: HighlightStyle
  pageIndex: number
  totalPages: number
  footerLeft: string
  footerRightMode: FooterRightMode
  footerEnabled: boolean
  cardCornerMode: CardCornerMode
  
  gradientConfig?: GradientConfig
  
  headingOverrides?: HeadingStyleOverrides | null
  
  highlightColor?: string | null

  bodyTextColor?: string | null
}



export interface LayoutOptions {
  source: string
  settings: TypographySettings
  theme: ThemeDefinition
  footerEnabled: boolean
  
  headingOverrides?: HeadingStyleOverrides | null
}


export interface LayoutResult {
  pages: CardPage[]
  truncated: boolean
}




export const PAGE_WIDTH = 720


export const PAGE_HEIGHT = 960


export const CONTENT_LEFT = 40


export const CONTENT_RIGHT = 680


export const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT


export const CANVAS_SCALE = 2


export const BODY_BOTTOM_WITH_FOOTER = 886


export const BODY_BOTTOM_WITHOUT_FOOTER = 940


export const FOOTER_LINE_Y = 892


export const FOOTER_TEXT_Y = 918


export const FOOTER_LINE_LEFT = 56


export const FOOTER_LINE_RIGHT = 664



export const BODY_TEXT_WEIGHT = 400
export const BODY_BOLD_WEIGHT = 600
export const QUOTE_TEXT_WEIGHT = 400
export const SUBHEADING_TEXT_WEIGHT = 600



export const BODY_FONT_FAMILY =
  '"LXGW WenKai","Noto Serif SC","Songti SC","SimSun",serif'



export type BodyFontMode =
  | 'wenkai' | 'simsun' | 'fangsong' | 'kaiti' | 'notoserif'
  | 'yahei' | 'simhei' | 'notosans'
  | 'mashanzheng' | 'longcang' | 'zcoolxiaowei' | 'zcoolqingke' | 'youyuan'
  | 'inter' | 'spacegrotesk' | 'playfair' | 'garamond'
  | 'jetbrains' | 'consolas'

export interface BodyFontDefinition {
  family: string
  label: string
  category: string
  description: string
  sample: string
}

export const BODY_FONT_CATEGORIES = [
  '中文衬线',
  '中文无衬线',
  '书法手写',
  '展示装饰',
  '等宽字体',
  '西文字体',
] as const

export const BODY_FONT_MODES: Record<BodyFontMode, BodyFontDefinition> = {
  wenkai:       { family: '"LXGW WenKai","KaiTi","STKaiti",serif',                     label: '霞鹜文楷',       category: '中文衬线',   description: '温润自然，适合长文阅读', sample: '山川入墨' },
  simsun:       { family: '"SimSun","Songti SC","Noto Serif SC",serif',                label: '宋体',           category: '中文衬线',   description: '横细竖粗，传统书刊质感', sample: '山川入墨' },
  fangsong:     { family: '"FangSong","STFangsong","Noto Serif SC",serif',             label: '仿宋',           category: '中文衬线',   description: '清秀挺拔，公文与诗文气质', sample: '山川入墨' },
  kaiti:        { family: '"KaiTi","STKaiti","LXGW WenKai",serif',                     label: '楷体',           category: '中文衬线',   description: '笔画舒展，接近规范手写', sample: '山川入墨' },
  notoserif:    { family: '"Noto Serif SC","Songti SC","SimSun",serif',                label: '思源宋体',       category: '中文衬线',   description: '现代宋体，端正且层次清楚', sample: '山川入墨' },

  yahei:        { family: '"Microsoft YaHei","PingFang SC","Helvetica Neue",sans-serif', label: '微软雅黑',       category: '中文无衬线', description: '清晰稳健，适合信息型内容', sample: '清晰有序' },
  simhei:       { family: '"SimHei","Microsoft YaHei","PingFang SC",sans-serif',         label: '黑体',           category: '中文无衬线', description: '笔画厚重，标题感更强', sample: '清晰有序' },
  notosans:     { family: '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif',   label: '思源黑体',       category: '中文无衬线', description: '中性现代，屏幕阅读稳定', sample: '清晰有序' },

  mashanzheng:  { family: '"Ma Shan Zheng","STKaiti","KaiTi",cursive',                  label: '马善政毛笔体',   category: '书法手写',   description: '飞白明显，强烈毛笔书法感', sample: '笔墨生风' },
  longcang:     { family: '"Long Cang","STKaiti","KaiTi",cursive',                      label: '龙藏体',         category: '书法手写',   description: '洒脱连笔，适合短句与题签', sample: '笔墨生风' },

  zcoolxiaowei: { family: '"ZCOOL XiaoWei","Noto Serif SC","SimSun",serif',             label: '站酷小薇体',     category: '展示装饰',   description: '尖角纤细，文艺海报气质', sample: '风格标题' },
  zcoolqingke:  { family: '"ZCOOL QingKe HuangYou","Noto Sans SC","SimHei",sans-serif', label: '站酷庆科黄油体', category: '展示装饰',   description: '方正几何，醒目的标题字体', sample: '风格标题' },
  youyuan:      { family: '"YouYuan","Microsoft YaHei","PingFang SC",sans-serif',        label: '幼圆',           category: '展示装饰',   description: '圆润轻松，亲和力明显', sample: '风格标题' },

  jetbrains:    { family: '"JetBrains Mono",Consolas,Menlo,monospace',                     label: 'JetBrains Mono', category: '等宽字体',   description: '字面紧凑，代码与技术内容', sample: 'Aa 0123' },
  consolas:     { family: 'Consolas,"JetBrains Mono",Menlo,monospace',                     label: 'Consolas',       category: '等宽字体',   description: '经典 Windows 等宽字形', sample: 'Aa 0123' },

  inter:        { family: 'Inter,"Helvetica Neue",Arial,sans-serif',                       label: 'Inter',          category: '西文字体',   description: '高可读性的现代西文无衬线', sample: 'Editorial' },
  spacegrotesk: { family: '"Space Grotesk",Inter,sans-serif',                              label: 'Space Grotesk',  category: '西文字体',   description: '几何感鲜明的展示无衬线', sample: 'Editorial' },
  playfair:     { family: '"Playfair Display",Georgia,serif',                              label: 'Playfair Display', category: '西文字体', description: '高反差衬线，杂志标题气质', sample: 'Editorial' },
  garamond:     { family: '"EB Garamond",Garamond,"Times New Roman",serif',                label: 'EB Garamond',    category: '西文字体',   description: '古典优雅，适合文学正文', sample: 'Editorial' },
}

const LEGACY_BODY_FONT_MODES: Record<string, BodyFontMode> = {
  roboto: 'inter',
  manrope: 'spacegrotesk',
  dmsans: 'inter',
  fira: 'jetbrains',
  times: 'garamond',
  dengxian: 'notosans',
}

export const DEFAULT_BODY_FONT_MODE: BodyFontMode = 'wenkai'

export function normalizeBodyFontMode(mode: string | null | undefined): BodyFontMode {
  if (mode && mode in BODY_FONT_MODES) return mode as BodyFontMode
  return (mode && LEGACY_BODY_FONT_MODES[mode]) || DEFAULT_BODY_FONT_MODE
}

export function getBodyFontFamily(mode: BodyFontMode | string): string {
  return BODY_FONT_MODES[normalizeBodyFontMode(mode)].family
}

export const FOOTER_FONT_FAMILY =
  '"LXGW WenKai","Noto Serif SC","PingFang SC","Microsoft YaHei",sans-serif'



export const LEADING_PUNCTUATION = new Set([
  '，', '。', '！', '？', '；', '：', '」', '』', '）', '》', '、',
  ',', '.', '!', '?', ';', ':', ')', ']', '}',
])



export const CODE_FONT_FAMILY =
  '"JetBrains Mono","Cascadia Code","SF Mono","Fira Code","Consolas",monospace'


export const CODE_FONT_SIZE_RATIO = 0.92


export const CODE_BG_ALPHA = 0.06



export const HEADING_SIZE_RATIOS: Record<number, number> = {
  1: 3.20,
  2: 1.65,
  3: 1.35,
  4: 1.15,
  5: 1.04,
  6: 0.98,
}


export const DEFAULT_HEADING_LINE_HEIGHTS: Record<number, number> = {
  1: 1.25,
  2: 1.35,
  3: 1.45,
  4: 1.55,
  5: 1.55,
  6: 1.55,
}


export const DEFAULT_HEADING_MARGIN_TOP: Record<number, number> = {
  1: 16,
  2: 12,
  3: 8,
  4: 6,
  5: 4,
  6: 4,
}


export const DEFAULT_HEADING_MARGIN_BOTTOM: Record<number, number> = {
  1: 8,
  2: 6,
  3: 4,
  4: 3,
  5: 2,
  6: 2,
}


export function computeHeadingMarginBottom(fontSize: number, level: number): number {
  if (level === 1) {
    const margin = Math.round(fontSize * 0.45)
    return fontSize >= 60 ? Math.max(30, margin) : Math.max(14, margin)
  }
  return Math.max(14, Math.round(fontSize * 0.35))
}


export function computeHeadingMarginTop(fontSize: number): number {
  return Math.max(16, Math.round(fontSize * 0.3))
}


export const DEFAULT_COVER_H1_SCALE = 4.0




export interface HeadingStyleOverrides {
  
  h1Size: number | null
  h2Size: number | null
  h3Size: number | null
  h4Size: number | null
  h5Size: number | null
  h6Size: number | null
  
  h1Align: 'left' | 'center' | 'right'
  
  h1Color: string | null
  h2Color: string | null
  h3Color: string | null
  h4Color: string | null
  h5Color: string | null
  h6Color: string | null
  
  h1Stroke: string | null
  h2Stroke: string | null
  h3Stroke: string | null
  h4Stroke: string | null
  h5Stroke: string | null
  h6Stroke: string | null
  
  h1StrokeWidth: number | null
  h2StrokeWidth: number | null
  h3StrokeWidth: number | null
  h4StrokeWidth: number | null
  h5StrokeWidth: number | null
  h6StrokeWidth: number | null
}


export const DEFAULT_HEADING_OVERRIDES: HeadingStyleOverrides = {
  h1Size: null,
  h2Size: null,
  h3Size: null,
  h4Size: null,
  h5Size: null,
  h6Size: null,
  h1Align: 'left',
  h1Color: null,
  h2Color: null,
  h3Color: null,
  h4Color: null,
  h5Color: null,
  h6Color: null,
  h1Stroke: null,
  h2Stroke: null,
  h3Stroke: null,
  h4Stroke: null,
  h5Stroke: null,
  h6Stroke: null,
  h1StrokeWidth: null,
  h2StrokeWidth: null,
  h3StrokeWidth: null,
  h4StrokeWidth: null,
  h5StrokeWidth: null,
  h6StrokeWidth: null,
}


export const HEADING_SIZE_RANGES: Record<number, { min: number; max: number; default: number }> = {
  1: { min: 16, max: 120, default: 32 },
  2: { min: 14, max: 60, default: 24 },
  3: { min: 12, max: 60, default: 20 },
  4: { min: 11, max: 60, default: 18 },
  5: { min: 10, max: 60, default: 16 },
  6: { min: 9,  max: 60, default: 15 },
}


export function resolveHeadingSize(
  level: number,
  bodySize: number,
  
  theme?: any,
  overrides?: HeadingStyleOverrides | null,
  isCover?: boolean,
): number {
  
  if (overrides) {
    const key = `h${level}Size` as keyof HeadingStyleOverrides
    const val = overrides[key]
    if (typeof val === 'number' && val > 0) return val
  }
  
  const scale = resolveHeadingScale(level, theme, isCover && level === 1)
  return Math.round(bodySize * scale)
}


export function resolveHeadingScale(level: number, theme?: { editor?: { heading?: { h1Scale?: number; h2Scale?: number; h3Scale?: number; h4Scale?: number; h5Scale?: number; h6Scale?: number } } }, isCover = false): number {
  const headingCfg = theme?.editor?.heading
  const key = `h${level}Scale` as keyof typeof headingCfg
  if (headingCfg && headingCfg[key] !== undefined) {
    return headingCfg[key] as number
  }
  if (level === 1 && isCover) return DEFAULT_COVER_H1_SCALE
  return HEADING_SIZE_RATIOS[level] ?? 1
}


export function resolveHeadingLineHeight(level: number, theme?: { editor?: { heading?: { h1LineHeight?: number; h2LineHeight?: number; h3LineHeight?: number; h4LineHeight?: number; h5LineHeight?: number; h6LineHeight?: number } } }, isCover = false): number {
  const headingCfg = theme?.editor?.heading
  const key = `h${level}LineHeight` as keyof typeof headingCfg
  if (headingCfg && headingCfg[key] !== undefined) {
    return headingCfg[key] as number
  }
  if (level === 1 && isCover) return 1.15 
  return DEFAULT_HEADING_LINE_HEIGHTS[level] ?? 1.55
}


export function resolveHeadingMarginTop(level: number, theme?: { editor?: { heading?: { h1MarginTop?: number; h2MarginTop?: number; h3MarginTop?: number } } }): number {
  const headingCfg = theme?.editor?.heading
  const key = `h${level}MarginTop` as keyof typeof headingCfg
  if (headingCfg && headingCfg[key] !== undefined) {
    return headingCfg[key] as number
  }
  return DEFAULT_HEADING_MARGIN_TOP[level] ?? 4
}


export function resolveHeadingMarginBottom(level: number, theme?: { editor?: { heading?: { h1MarginBottom?: number; h2MarginBottom?: number; h3MarginBottom?: number } } }): number {
  const headingCfg = theme?.editor?.heading
  const key = `h${level}MarginBottom` as keyof typeof headingCfg
  if (headingCfg && headingCfg[key] !== undefined) {
    return headingCfg[key] as number
  }
  return DEFAULT_HEADING_MARGIN_BOTTOM[level] ?? 2
}


export function resolveHeadingFontWeight(level: number, theme?: { editor?: { heading?: { h1FontWeight?: number; h2FontWeight?: number; h3FontWeight?: number } } }): number {
  const headingCfg = theme?.editor?.heading
  const key = `h${level}FontWeight` as keyof typeof headingCfg
  if (headingCfg && headingCfg[key] !== undefined) {
    return headingCfg[key] as number
  }
  return SUBHEADING_TEXT_WEIGHT
}


export function resolveHeadingColor(
  level: number,
  theme?: { editor?: { heading?: HeadingTypography } },
  overrides?: HeadingStyleOverrides | null,
): string | undefined {
  
  if (overrides) {
    const overrideKey = `h${level}Color` as keyof HeadingStyleOverrides
    const val = overrides[overrideKey]
    if (typeof val === 'string' && val.length > 0) return val
  }
  
  const headingCfg = theme?.editor?.heading
  const cfgKey = `h${level}Color` as keyof HeadingTypography
  if (headingCfg && typeof headingCfg[cfgKey] === 'string' && (headingCfg[cfgKey] as string).length > 0) {
    return headingCfg[cfgKey] as string
  }
  return undefined
}


export function resolveHeadingShadow(
  level: number,
  theme?: { editor?: { heading?: HeadingTypography } },
  overrides?: HeadingStyleOverrides | null,
): string | undefined {
  
  if (overrides) {
    const key = `h${level}Shadow` as keyof HeadingStyleOverrides
    const val = overrides[key]
    if (typeof val === 'string' && val.length > 0) return val
  }
  
  const headingCfg = theme?.editor?.heading
  const cfgKey = `h${level}Shadow` as keyof HeadingTypography
  if (headingCfg && typeof headingCfg[cfgKey] === 'string' && (headingCfg[cfgKey] as string).length > 0) {
    return headingCfg[cfgKey] as string
  }
  return undefined
}


export function resolveHeadingStroke(
  level: number,
  theme?: { editor?: { heading?: HeadingTypography } },
  overrides?: HeadingStyleOverrides | null,
): string | undefined {
  
  if (overrides) {
    const key = `h${level}Stroke` as keyof HeadingStyleOverrides
    const val = overrides[key]
    if (typeof val === 'string' && val.length > 0) return val
  }
  
  const headingCfg = theme?.editor?.heading
  const cfgKey = `h${level}Stroke` as keyof HeadingTypography
  if (headingCfg && typeof headingCfg[cfgKey] === 'string' && (headingCfg[cfgKey] as string).length > 0) {
    return headingCfg[cfgKey] as string
  }
  return undefined
}


export const DEFAULT_STROKE_WIDTH = 1


export function resolveHeadingStrokeWidth(
  level: number,
  theme?: { editor?: { heading?: HeadingTypography } },
  overrides?: HeadingStyleOverrides | null,
): number {
  
  if (overrides) {
    const key = `h${level}StrokeWidth` as keyof HeadingStyleOverrides
    const val = overrides[key]
    if (typeof val === 'number' && val > 0) return val
  }
  
  const headingCfg = theme?.editor?.heading
  const cfgKey = `h${level}StrokeWidth` as keyof HeadingTypography
  if (headingCfg && typeof headingCfg[cfgKey] === 'number' && (headingCfg[cfgKey] as number) > 0) {
    return headingCfg[cfgKey] as number
  }
  return DEFAULT_STROKE_WIDTH
}




export const COLUMN_GAP = 20
