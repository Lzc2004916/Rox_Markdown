<template>
  <div class="flex flex-col h-full bg-base-100">

    <div class="sticky top-0 z-10 px-4 py-2.5 border-b border-base-200 bg-base-100/95 backdrop-blur shrink-0 shadow-sm">
      <div class="flex items-center gap-2 flex-wrap">
        <Dropdown class="w-auto">
          <template #trigger>
            <button class="btn btn-sm btn-primary h-8 min-h-0 gap-1.5 px-3 text-xs font-semibold shadow-sm">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              导出
              <svg class="w-2.5 h-2.5 opacity-70" viewBox="0 0 10 6"><path d="M0 0l5 6 5-6z" fill="currentColor"/></svg>
            </button>
          </template>
          <div class="w-40 p-1.5">
            <button class="w-full text-left px-2 py-1.5 rounded hover:bg-base-200 text-xs" @click="emit('export-png')">批量导出 PNG</button>
            <button class="w-full text-left px-2 py-1.5 rounded hover:bg-base-200 text-xs" @click="emit('export-jpg')">批量导出 JPG</button>
            <div class="my-1 border-t border-base-200"></div>
            <button class="w-full text-left px-2 py-1.5 rounded hover:bg-base-200 text-xs" @click="emit('export-pdf')">PDF 文档</button>
          </div>
        </Dropdown>

        <span v-if="isExporting" class="inline-flex items-center gap-1">
          <LoadingSpinner variant="progress" size="sm" :progress="progress" :show-progress-label="true" inline />
        </span>

        <button
          v-if="!auth.isVip"
          class="btn btn-sm btn-outline h-8 min-h-0 gap-1.5 px-2.5 text-xs font-medium"
          @click="emit('need-activate')"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          激活会员
        </button>
        <div
          v-else
          class="badge badge-primary badge-sm gap-1 px-2.5"
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg>
          VIP 已激活
        </div>

        <button
          class="btn btn-sm btn-outline h-8 min-h-0 gap-1.5 px-2.5 text-xs font-medium"
          @click="emit('update:appTheme', appTheme === 'dark' ? 'light' : 'dark')"
        >
          <svg v-if="appTheme === 'dark'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <span>{{ appTheme === 'dark' ? '亮色' : '暗色' }}</span>
        </button>

      </div>
    </div>

    <SettingSection title="主题外观" :default-open="true">
      <div class="flex items-center justify-between -mb-1">
        <span class="text-xs text-base-content/60">当前主题</span>
        <span class="text-xs font-semibold text-base-content">{{ selectedThemeName }}</span>
      </div>
      <ThemeSelector v-model="themeId" :themes="THEMES" :paid-themes="auth.paidThemes" :is-vip="auth.isVip" @need-activate="emit('need-activate')" />
      <div class="pt-2 border-t border-base-200">
        <div class="text-xs font-medium text-base-content/70 mb-2">背景效果</div>
        <GradientPicker :model-value="gradientConfig" @update:model-value="(v: GradientConfig) => emit('update:gradientConfig', v)" />
      </div>
      <SettingRow label="卡片圆角">
        <div class="join">
          <button class="btn btn-xs join-item h-6 min-h-0 px-3 text-xs" :class="cardCornerMode === 'square' ? 'btn-primary' : 'btn-ghost text-base-content/60'" @click="emit('update:cardCornerMode', 'square')">直角</button>
          <button class="btn btn-xs join-item h-6 min-h-0 px-3 text-xs" :class="cardCornerMode === 'rounded' ? 'btn-primary' : 'btn-ghost text-base-content/60'" @click="emit('update:cardCornerMode', 'rounded')">圆角</button>
        </div>
      </SettingRow>
    </SettingSection>

    <SettingSection title="文字排版" :default-open="true">
      <SettingRow label="正文字体">
        <FontPicker :model-value="bodyFontMode" :fonts="fontOptions" :label="undefined" @update:model-value="(v: string) => emit('update:bodyFontMode', v)" />
      </SettingRow>
      <SettingRow label="正文字号" :value="bodyFontSize">
        <input :value="bodyFontSize" type="range" min="20" max="40" step="1" class="range range-xs range-primary flex-1" @input="emit('update:bodyFontSize', Number(($event.target as HTMLInputElement).value))" />
      </SettingRow>
      <SettingRow label="正文字重" :value="bodyFontWeight === 700 ? '粗体' : '常规'">
        <div class="join">
          <button
            class="btn btn-xs join-item h-6 min-h-0 px-3 text-xs"
            :class="bodyFontWeight !== 700 ? 'btn-primary' : 'btn-ghost text-base-content/60'"
            @click="emit('update:bodyFontWeight', 400)"
          >常规</button>
          <button
            class="btn btn-xs join-item h-6 min-h-0 px-3 text-xs"
            :class="bodyFontWeight === 700 ? 'btn-primary' : 'btn-ghost text-base-content/60'"
            @click="emit('update:bodyFontWeight', 700)"
          >粗体</button>
        </div>
      </SettingRow>
      <SettingRow label="文字颜色">
        <input type="color" :value="bodyTextColor ?? '#000000'" class="w-7 h-7 rounded cursor-pointer border border-base-300" @input="emit('update:bodyTextColor', ($event.target as HTMLInputElement).value)" />
        <button v-if="bodyTextColor" class="btn btn-xs btn-ghost h-5 min-h-0 px-1 text-base-content/40" @click="emit('update:bodyTextColor', null)">✕</button>
      </SettingRow>
      <details class="group rounded-lg border border-base-200 bg-base-200/25">
        <summary class="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold text-base-content/75">
          标题样式（H1–H6）
          <svg class="h-3.5 w-3.5 transition-transform group-open:rotate-180" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </summary>
        <div class="border-t border-base-200">
          <HeadingStylePanel />
        </div>
      </details>
    </SettingSection>

    <SettingSection title="内容元素" :default-open="imageList.length > 0">
      <SettingRow label="页脚">
        <label class="flex items-center gap-2 cursor-pointer">
          <input :checked="footerEnabled" type="checkbox" class="checkbox checkbox-xs checkbox-primary" @change="emit('update:footerEnabled', ($event.target as HTMLInputElement).checked)" />
          <span class="text-xs text-base-content/60">显示页脚</span>
        </label>
      </SettingRow>
      <div v-if="footerEnabled" class="space-y-2 border-t border-base-200 pt-2">
        <label class="flex flex-col gap-1">
          <span class="text-xs text-base-content/60">自定义页脚文字</span>
          <input :value="footerLeft" type="text" maxlength="80" placeholder="输入左侧页脚文字" class="input input-xs h-7 w-full text-xs" @input="emit('update:footerLeft', ($event.target as HTMLInputElement).value)" />
        </label>
        <SettingRow label="页脚背景">
          <label class="flex items-center gap-2 cursor-pointer">
            <input :checked="footerBackgroundEnabled" type="checkbox" class="checkbox checkbox-xs checkbox-primary" @change="emit('update:footerBackgroundEnabled', ($event.target as HTMLInputElement).checked)" />
            <span class="text-xs text-base-content/60">显示色带</span>
          </label>
        </SettingRow>
        <SettingRow label="页脚字号" :value="`${footerFontSize}px`">
          <input :value="footerFontSize" type="range" min="10" max="32" step="1" class="range range-xs range-primary flex-1" @input="emit('update:footerFontSize', Number(($event.target as HTMLInputElement).value))" />
        </SettingRow>
        <SettingRow label="页脚字重" :value="String(footerFontWeight)">
          <select :value="footerFontWeight" class="select select-xs h-7 min-h-0 text-xs" @change="emit('update:footerFontWeight', Number(($event.target as HTMLSelectElement).value))">
            <option v-for="weight in [400, 500, 600, 700, 800]" :key="weight" :value="weight">{{ weight }}</option>
          </select>
        </SettingRow>
        <SettingRow label="页脚背景色">
          <input :value="footerBackgroundColor ?? '#000000'" type="color" class="w-7 h-7 rounded cursor-pointer border border-base-300" @input="emit('update:footerBackgroundColor', ($event.target as HTMLInputElement).value)" />
          <button v-if="footerBackgroundColor" class="btn btn-xs btn-ghost h-5 min-h-0 px-1 text-base-content/40" title="恢复主题默认色" @click="emit('update:footerBackgroundColor', null)">✕</button>
        </SettingRow>
        <SettingRow label="页脚文字色">
          <input :value="footerTextColor ?? '#ffffff'" type="color" class="w-7 h-7 rounded cursor-pointer border border-base-300" @input="emit('update:footerTextColor', ($event.target as HTMLInputElement).value)" />
          <button v-if="footerTextColor" class="btn btn-xs btn-ghost h-5 min-h-0 px-1 text-base-content/40" title="恢复自动对比色" @click="emit('update:footerTextColor', null)">✕</button>
        </SettingRow>
      </div>
      <div class="border-t border-base-200 pt-2 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-base-content/70">图片</span>
          <span v-if="imageList.length" class="badge badge-ghost badge-xs">{{ imageList.length }}</span>
        </div>
      <template v-if="imageList.length > 0">
        <div v-for="img in imageList" :key="img.key" class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-semibold text-base-content/80 truncate min-w-0">
              {{ img.label }}
              <span v-if="img.filename" class="text-base-content/45 font-normal">{{ img.filename }}</span>
            </span>
            <span
              class="text-[11px] font-medium tabular-nums shrink-0"
              :class="isOverLimit(img) ? 'text-error' : 'text-base-content/65'"
            >{{ img.height }}px</span>
          </div>
          <input
            type="range"
            :min="IMAGE_HEIGHT_MIN"
            :max="sliderMax(img)"
            step="1"
            :value="sliderValue(img)"
            class="range range-xs range-primary"
            @input="onImageInput(img.key, $event)"
          />
          <div v-if="isOverLimit(img)" class="text-[11px] text-error">
            已超出该页可用高度，自动限制为 {{ Math.round(img.maxHeight) }}px
          </div>
        </div>
      </template>
      <div v-else class="text-xs text-base-content/40 py-1">
        暂无图片，插入图片后可在此调整高度
      </div>
      </div>
    </SettingSection>

    <SettingSection title="预览与视图" :default-open="false">
      <SettingRow label="预览缩放" :value="previewScale + 'x'">
        <input :value="previewScale" type="range" min="0.25" max="2.5" step="0.05" class="range range-xs range-primary flex-1" @input="emit('update:previewScale', Number(($event.target as HTMLInputElement).value))" />
      </SettingRow>
    </SettingSection>

    <SettingSection title="高级格式" :default-open="false">
      <div class="flex items-start justify-between gap-3 -mb-1">
        <div>
          <div class="text-xs font-medium text-base-content/75">格式颜色（当前文档）</div>
          <p class="text-[11px] leading-4 text-base-content/50">下划线与删除线只改变线条颜色。</p>
        </div>
        <button v-if="hasFormatColorOverrides" class="btn btn-ghost btn-xs h-6 min-h-0 px-2 text-xs" @click="resetFormatColors">恢复默认</button>
      </div>
      <div class="space-y-1.5">
        <div class="text-[11px] font-semibold uppercase tracking-wide text-base-content/45">文字与公式</div>
        <SettingRow v-for="item in TEXT_FORMAT_COLOR_ITEMS" :key="item.key" :label="item.label">
          <input :value="formatColors[item.key] ?? '#000000'" type="color" class="w-7 h-7 rounded cursor-pointer border border-base-300" @input="setFormatColor(item.key, ($event.target as HTMLInputElement).value)" />
          <button v-if="formatColors[item.key]" class="btn btn-xs btn-ghost h-5 min-h-0 px-1 text-base-content/40" title="恢复主题默认色" @click="setFormatColor(item.key, null)">✕</button>
        </SettingRow>
      </div>
      <div class="space-y-1.5 border-t border-base-200 pt-2">
        <div class="text-[11px] font-semibold uppercase tracking-wide text-base-content/45">装饰线</div>
        <SettingRow v-for="item in DECORATION_COLOR_ITEMS" :key="item.key" :label="item.label">
          <input :value="formatColors[item.key] ?? '#000000'" type="color" class="w-7 h-7 rounded cursor-pointer border border-base-300" @input="setFormatColor(item.key, ($event.target as HTMLInputElement).value)" />
          <button v-if="formatColors[item.key]" class="btn btn-xs btn-ghost h-5 min-h-0 px-1 text-base-content/40" title="恢复主题默认色" @click="setFormatColor(item.key, null)">✕</button>
        </SettingRow>
      </div>
    </SettingSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ThemeSelector from '@/components/theme/ThemeSelector.vue'
import { useAuthStore } from '@/stores/auth'
import Dropdown from '@/components/Dropdown.vue'
import FontPicker from '@/components/editor/FontPicker.vue'
import GradientPicker from '@/components/editor/GradientPicker.vue'
import LoadingSpinner from '@/components/preview/LoadingSpinner.vue'
import HeadingStylePanel from '@/components/editor/HeadingStylePanel.vue'
import SettingSection from '@/components/settings/SettingSection.vue'
import SettingRow from '@/components/settings/SettingRow.vue'
import { THEMES, IMAGE_HEIGHT_MIN } from '@/card'
import type { CardCornerMode, GradientConfig, InlineFormatColors } from '@/card'

const TEXT_FORMAT_COLOR_ITEMS: { key: keyof InlineFormatColors; label: string }[] = [
  { key: 'bold', label: '加粗颜色' },
  { key: 'italic', label: '斜体颜色' },
  { key: 'superscript', label: '上标颜色' },
  { key: 'subscript', label: '下标颜色' },
  { key: 'formula', label: '公式颜色' },
]

const DECORATION_COLOR_ITEMS: { key: keyof InlineFormatColors; label: string }[] = [
  { key: 'underline', label: '下划线颜色' },
  { key: 'strike', label: '删除线颜色' },
]

export interface FontOption {
  id: string
  label: string
  family: string
  category: string
  description: string
  sample: string
}

/** 单张图片的高度滑块数据 */
export interface ImageItem {
  key: string
  label: string
  filename: string
  height: number
  maxHeight: number
}

interface Props {
  appTheme: 'light' | 'dark'
  cardTheme: string
  bodyFontMode: string
  bodyFontSize: number
  bodyFontWeight: number
  formatColors: InlineFormatColors
  footerEnabled: boolean
  footerLeft: string
  footerBackgroundEnabled: boolean
  footerBackgroundColor: string | null
  footerTextColor: string | null
  footerFontSize: number
  footerFontWeight: number
  gradientConfig: GradientConfig
  cardCornerMode: CardCornerMode
  previewScale: number
  fontOptions: FontOption[]
  isExporting: boolean
  progress: number
  bodyTextColor: string | null
  images?: ImageItem[]
}

const props = defineProps<Props>()
const auth = useAuthStore()

const emit = defineEmits<{
  (e: 'update:appTheme', value: 'light' | 'dark'): void
  (e: 'update:cardTheme', value: string): void
  (e: 'update:bodyFontMode', value: string): void
  (e: 'update:bodyFontSize', value: number): void
  (e: 'update:bodyFontWeight', value: number): void
  (e: 'update:formatColors', value: InlineFormatColors): void
  (e: 'update:footerEnabled', value: boolean): void
  (e: 'update:footerLeft', value: string): void
  (e: 'update:footerBackgroundEnabled', value: boolean): void
  (e: 'update:footerBackgroundColor', value: string | null): void
  (e: 'update:footerTextColor', value: string | null): void
  (e: 'update:footerFontSize', value: number): void
  (e: 'update:footerFontWeight', value: number): void
  (e: 'update:gradientConfig', value: GradientConfig): void
  (e: 'update:cardCornerMode', value: CardCornerMode): void
  (e: 'update:previewScale', value: number): void
  (e: 'update:bodyTextColor', value: string | null): void
  (e: 'update:imageHeight', key: string, height: number): void
  (e: 'export-png'): void
  (e: 'export-jpg'): void
  (e: 'export-pdf'): void
  (e: 'need-activate'): void
}>()

const themeId = computed({
  get: () => props.cardTheme,
  set: (v: string) => emit('update:cardTheme', v),
})

const imageList = computed(() => props.images ?? [])
const selectedThemeName = computed(() => THEMES.find((theme) => theme.id === props.cardTheme)?.name ?? '默认主题')
const hasFormatColorOverrides = computed(() => Object.values(props.formatColors).some(Boolean))

function setFormatColor(key: keyof InlineFormatColors, color: string | null): void {
  emit('update:formatColors', { ...props.formatColors, [key]: color })
}

function resetFormatColors(): void {
  emit('update:formatColors', {})
}

function sliderMax(img: ImageItem): number {
  return Math.max(IMAGE_HEIGHT_MIN, Math.round(img.maxHeight))
}

function sliderValue(img: ImageItem): number {
  return Math.min(img.height, sliderMax(img))
}

function isOverLimit(img: ImageItem): boolean {
  return img.height > img.maxHeight
}

function onImageInput(key: string, e: Event): void {
  emit('update:imageHeight', key, Number((e.target as HTMLInputElement).value))
}
</script>
