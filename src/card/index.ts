



export type {
  ThemeDefinition,
  ThemePalette,
  ThemeSurface,
  ThemeComponents,
  ThemeEditor,
  ThemeMode,
  ThemeDecor,
  DecorKind,
  CardPage,
  TypographySettings,
  GradientConfig,
  InlineToken,
  InlineLine,
  ParagraphBlock,
  TextBlock,
  CodeBlock,
  TableDisplayBlock,
  ColumnContainerBlock,
  ListBlock,
  ListItem,
  ListKind,
  ListStyleConfig,
  Block,
  HeadingLevel,
  TextRange,
  PosterMetrics,
  QuoteBoxMetrics,
  RenderOptions,
  LayoutOptions,
  BodyFontMode,
  SubheadingStyle,
  HighlightStyle,
  HighlightTreatment,
  QuoteTreatment,
  CardCornerMode,
  FooterRightMode,
  HeadingTypography,
  CoverHeadingConfig,
  HeadingStyleOverrides,
} from './types'

export { BODY_FONT_MODES, DEFAULT_BODY_FONT_MODE, getBodyFontFamily } from './types'

export {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  CONTENT_LEFT,
  CONTENT_RIGHT,
  CONTENT_WIDTH,
  CANVAS_SCALE,
  CODE_FONT_FAMILY,
  CODE_FONT_SIZE_RATIO,
  CODE_BG_ALPHA,
  HEADING_SIZE_RATIOS,
  COLUMN_GAP,
  DEFAULT_HEADING_LINE_HEIGHTS,
  DEFAULT_HEADING_MARGIN_TOP,
  DEFAULT_HEADING_MARGIN_BOTTOM,
  DEFAULT_COVER_H1_SCALE,
  HEADING_SIZE_RANGES,
  DEFAULT_HEADING_OVERRIDES,
  DEFAULT_LIST_STYLE,
  resolveHeadingScale,
  resolveHeadingLineHeight,
  resolveHeadingMarginTop,
  resolveHeadingMarginBottom,
  resolveHeadingFontWeight,
  resolveHeadingColor,
  resolveHeadingSize,
  resolveHeadingShadow,
  resolveHeadingStroke,
  resolveHeadingStrokeWidth,
  DEFAULT_STROKE_WIDTH,
  computeHeadingMarginBottom,
  computeHeadingMarginTop,
} from './types'


export { hexToRgba, hexToRgb, mixHexColors, gradientAngleToPoints } from './color-utils'


export { extractTokens, applyTokensToElement, tokensToJSON, tokensFromJSON, TOKEN_CSS_VAR_MAP } from './design-tokens'
export type { CardDesignTokens } from './design-tokens'


export { THEMES, DEFAULT_THEME_ID, getTheme } from './themes'


export {
  registerTheme,
  unregisterTheme,
  getTheme as getThemeFromRegistry,
  getAllThemes,
  hasTheme,
  getThemeCount,
  onRegistryChange,
  resetRegistry,
} from './theme-registry'


export {
  validateThemeConfig,
  loadThemeFromJSON,
  loadThemesFromJSON,
  themeToJSON,
} from './theme-config'
export type { ValidationResult, ThemeConfigJSON } from './theme-config'


export { renderAllPages, renderAllPagesAsync, canvasToPreviewUrl, canvasToExportUrl } from './engine'
export type { EngineOptions } from './engine'


export { layoutPages, getParagraphBlock, parseInputBlocks } from './layout'


export { renderCard } from './renderer'


export { drawCodeBlock, measureCodeBlock, tokenizeCode } from './code-renderer'
export { drawTableBlock, measureTableBlock } from './table-renderer'


export {
  splitTextForWrapping,
  getBodyTokenWidth,
  wrapInlineTokensByWidth,
  parseInlineMarkdown,
  getPosterMetrics,
  getParagraphVisualHeight,
  getQuoteBoxMetrics,
  measureParagraphBlock,
  getParagraphMaxLines,
  getGapBetweenBlocks,
  measureListBlock,
} from './measure'


