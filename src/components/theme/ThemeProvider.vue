<template>
  <div
    class="theme-provider-root"
    :class="{ 'theme-transitioning': isTransitioning }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, provide, onMounted } from 'vue'
import type { ThemeDefinition } from '@/card'
import { getTheme, THEMES, resolveHeadingScale, resolveHeadingLineHeight, resolveHeadingMarginTop, resolveHeadingMarginBottom, resolveHeadingFontWeight, resolveHeadingColor, resolveHeadingShadow, resolveHeadingStroke, resolveHeadingStrokeWidth, DEFAULT_COVER_H1_SCALE, getBodyFontFamily, DEFAULT_BODY_FONT_MODE } from '@/card'
import { type ThemeContext, THEME_CONTEXT_KEY } from '@/composables/themeContext'



const props = withDefaults(
  defineProps<{
    
    themeId?: string
    
    highlightColor?: string | null
  }>(),
  {
    themeId: 'moss-paper',
    highlightColor: null,
  },
)



const emit = defineEmits<{
  (e: 'theme-change', themeId: string): void
}>()



const activeThemeId = ref<string>(props.themeId)
const activeTheme = ref<ThemeDefinition>(getTheme(props.themeId))
const isTransitioning = ref(false)
const availableThemes = ref<ThemeDefinition[]>(THEMES)




const appliedThemeVars = new Map<string, string>()

/** Update only changed variables; deleting is reserved for variables that became absent. */
function setThemeVar(name: string, value: string | null): void {
  const previous = appliedThemeVars.get(name)
  if (value === null) {
    if (previous === undefined) return
    document.documentElement.style.removeProperty(name)
    appliedThemeVars.delete(name)
    return
  }
  if (previous === value) return
  document.documentElement.style.setProperty(name, value)
  appliedThemeVars.set(name, value)
}

function applyThemeToDOM(theme: ThemeDefinition): void {
  setThemeVar('--card-page', theme.palette.page)
  setThemeVar('--card-page-alt', theme.palette.pageAlt)
  setThemeVar('--card-text', theme.palette.text)
  setThemeVar('--card-text-muted', theme.palette.muted)
  setThemeVar('--card-accent', theme.palette.accent)
  setThemeVar('--card-accent-soft', theme.palette.accentSoft)
  setThemeVar('--card-border', theme.palette.border)
  setThemeVar('--card-shadow', theme.palette.shadow)
  setThemeVar('--card-glow', theme.palette.glow)

  
  setThemeVar('--card-grain-opacity', String(theme.surface.grainAlpha))
  setThemeVar('--card-inner-frame-opacity', String(theme.surface.innerFrameAlpha))
  setThemeVar('--card-preview-shadow', theme.surface.previewShadow)

  
  setThemeVar('--body-size', `${theme.editor.bodySize}px`)
  setThemeVar('--body-line-height', String(theme.editor.lineHeight))
  setThemeVar('--font-body', getBodyFontFamily(theme.editor.bodyFontMode ?? DEFAULT_BODY_FONT_MODE))

  
  setThemeVar('--theme-transition-duration', '0.35s')
  setThemeVar('--theme-transition-easing', 'cubic-bezier(0.4, 0, 0.2, 1)')

  
  
  for (let level = 1; level <= 6; level++) {
    const scale = resolveHeadingScale(level, theme)
    const lineH = resolveHeadingLineHeight(level, theme)
    const marginTop = resolveHeadingMarginTop(level, theme)
    const marginBottom = resolveHeadingMarginBottom(level, theme)
    const fontWeight = resolveHeadingFontWeight(level, theme)
    const color = resolveHeadingColor(level, theme)
    const shadow = resolveHeadingShadow(level, theme)
    const stroke = resolveHeadingStroke(level, theme)
    const strokeWidth = resolveHeadingStrokeWidth(level, theme)

    setThemeVar(`--card-heading-scale-h${level}`, String(scale))
    setThemeVar(`--card-heading-line-height-h${level}`, String(lineH))
    setThemeVar(`--card-heading-margin-top-h${level}`, `${marginTop}px`)
    setThemeVar(`--card-heading-margin-bottom-h${level}`, `${marginBottom}px`)
    setThemeVar(`--card-heading-font-weight-h${level}`, String(fontWeight))
    if (color) {
      setThemeVar(`--card-heading-color-h${level}`, color)
    } else {
      setThemeVar(`--card-heading-color-h${level}`, null)
    }
    if (shadow) {
      setThemeVar(`--card-heading-shadow-h${level}`, shadow)
    } else {
      setThemeVar(`--card-heading-shadow-h${level}`, null)
    }
    if (stroke) {
      setThemeVar(`--card-heading-stroke-h${level}`, stroke)
    } else {
      setThemeVar(`--card-heading-stroke-h${level}`, null)
    }
    setThemeVar(`--card-heading-stroke-width-h${level}`, `${strokeWidth}px`)
  }

  
  const coverCfg = theme.coverHeading
  setThemeVar('--card-cover-h1-scale', String(coverCfg?.h1Scale ?? DEFAULT_COVER_H1_SCALE))
  setThemeVar('--card-cover-h1-line-height', String(coverCfg?.h1LineHeight ?? 1.15))
  setThemeVar('--card-cover-h1-centered', coverCfg?.centered ? '1' : '0')
  setThemeVar('--card-cover-h1-top-offset', `${coverCfg?.topOffset ?? 0}px`)

  
  const codeBg = `rgba(${parseInt(theme.palette.text.slice(1,3),16)},${parseInt(theme.palette.text.slice(3,5),16)},${parseInt(theme.palette.text.slice(5,7),16)},0.06)`
  setThemeVar('--card-code-bg', codeBg)
  setThemeVar('--card-code-text', theme.palette.text)
  setThemeVar('--card-code-radius', theme.mode === 'brutal' ? '0px' : '8px')
  setThemeVar('--card-code-border', theme.palette.border)
  setThemeVar('--card-code-line-color', theme.palette.muted)

  
  const [qr, qg, qb] = [parseInt(theme.palette.accent.slice(1,3),16), parseInt(theme.palette.accent.slice(3,5),16), parseInt(theme.palette.accent.slice(5,7),16)]
  setThemeVar('--card-quote-bg', `rgba(${qr},${qg},${qb},${theme.components.quoteFillAlpha})`)
  setThemeVar('--card-quote-bar-color', `rgba(${qr},${qg},${qb},${theme.components.quoteBarAlpha})`)
  setThemeVar('--card-quote-bar-width', theme.components.quoteTreatment === 'code' ? '4px' : '5px')
  setThemeVar('--card-quote-radius', `${theme.components.quoteRadius}px`)

  
  setThemeVar('--card-table-border-color', theme.palette.border)
  setThemeVar('--card-table-header-bg', theme.palette.accentSoft)
  setThemeVar('--card-table-radius', theme.mode === 'brutal' ? '0px' : '8px')

  
  setThemeVar('--card-divider-color', theme.palette.border)

  
  applyHighlightVars(theme, props.highlightColor ?? null)

  
  setThemeVar('--card-list-marker-color', theme.palette.accent)
  setThemeVar('--card-link-color', theme.palette.accent)
}


function applyHighlightVars(theme: ThemeDefinition, customColor: string | null): void {
  const color = customColor ?? theme.palette.accent
  const [r, g, b] = [parseInt(color.slice(1,3),16), parseInt(color.slice(3,5),16), parseInt(color.slice(5,7),16)]

  setThemeVar('--card-highlight-underline-color', `rgba(${r},${g},${b},${theme.components.highlightUnderlineAlpha})`)
  setThemeVar('--card-highlight-marker-bg', `rgba(${r},${g},${b},${theme.components.highlightMarkerAlpha})`)
  setThemeVar('--card-highlight-border-color', `rgba(${r},${g},${b},${theme.components.highlightDashAlpha})`)
  setThemeVar('--card-highlight-bold-accent-color', color)
}



let transitionTimer: ReturnType<typeof setTimeout> | null = null

function setTheme(id: string): void {
  const theme = getTheme(id)
  if (!theme || theme.id === activeThemeId.value) return

  
  isTransitioning.value = true

  activeThemeId.value = id
  activeTheme.value = theme
  applyThemeToDOM(theme)
  emit('theme-change', id)

  
  if (transitionTimer) clearTimeout(transitionTimer)
  transitionTimer = setTimeout(() => {
    isTransitioning.value = false
  }, 400)
}



const context: ThemeContext = {
  theme: activeTheme,
  themeId: activeThemeId,
  setTheme,
  themes: availableThemes,
  isTransitioning,
}

provide(THEME_CONTEXT_KEY, context)



onMounted(() => {
  
  applyThemeToDOM(activeTheme.value)
})


watch(
  () => props.themeId,
  (newId) => {
    if (newId !== activeThemeId.value) {
      setTheme(newId)
    }
  },
)


watch(
  () => props.highlightColor,
  (newColor) => {
    applyHighlightVars(activeTheme.value, newColor ?? null)
  },
)
</script>

<style scoped>
.theme-provider-root {
  min-height: 100%;
}
</style>
