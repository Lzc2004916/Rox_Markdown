<template>
  <div class="flex flex-col h-full bg-base-100">

    <div class="px-4 py-3 border-b border-base-200 shrink-0">
      <div class="flex items-center gap-2 flex-wrap">
        <button
          v-if="!auth.isVip"
          class="btn btn-sm btn-primary h-8 min-h-0 gap-1.5 px-2.5 text-xs font-medium"
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

        <Dropdown class="w-auto">
          <template #trigger>
            <button class="btn btn-sm btn-outline h-8 min-h-0 gap-1 px-2.5 text-xs font-medium">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              导出
              <svg class="w-2.5 h-2.5 opacity-50" viewBox="0 0 10 6"><path d="M0 0l5 6 5-6z" fill="currentColor"/></svg>
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
      </div>
    </div>

    
    <SettingSection title="排版">
      <SettingRow label="正文字体">
        <FontPicker :model-value="bodyFontMode" :fonts="fontOptions" :label="undefined" @update:model-value="(v: string) => emit('update:bodyFontMode', v)" />
      </SettingRow>
      <SettingRow label="正文字号" :value="bodyFontSize">
        <input :value="bodyFontSize" type="range" min="20" max="40" step="1" class="range range-xs range-primary flex-1" @input="emit('update:bodyFontSize', Number(($event.target as HTMLInputElement).value))" />
      </SettingRow>
      <SettingRow label="正文字重" :value="bodyFontWeight">
        <input :value="bodyFontWeight" type="range" min="100" max="900" step="100" class="range range-xs range-primary flex-1" @input="emit('update:bodyFontWeight', Number(($event.target as HTMLInputElement).value))" />
      </SettingRow>
      <SettingRow label="高亮样式">
        <div class="join">
          <button v-for="opt in HIGHLIGHT_STYLE_OPTIONS" :key="opt.value"
            class="btn btn-xs join-item h-6 min-h-0 px-2 text-xs font-medium"
            :class="highlightStyle === opt.value ? 'btn-primary' : 'btn-ghost text-base-content/60'"
            @click="emit('update:highlightStyle', opt.value)">{{ opt.short }}</button>
        </div>
      </SettingRow>
      <SettingRow label="高亮颜色">
        <input type="color" :value="highlightColor ?? '#000000'" class="w-7 h-7 rounded cursor-pointer border border-base-300" @input="emit('update:highlightColor', ($event.target as HTMLInputElement).value)" />
        <button v-if="highlightColor" class="btn btn-xs btn-ghost h-5 min-h-0 px-1 text-base-content/40" @click="emit('update:highlightColor', null)">✕</button>
      </SettingRow>
      <SettingRow label="文字颜色">
        <input type="color" :value="bodyTextColor ?? '#000000'" class="w-7 h-7 rounded cursor-pointer border border-base-300" @input="emit('update:bodyTextColor', ($event.target as HTMLInputElement).value)" />
        <button v-if="bodyTextColor" class="btn btn-xs btn-ghost h-5 min-h-0 px-1 text-base-content/40" @click="emit('update:bodyTextColor', null)">✕</button>
      </SettingRow>
    </SettingSection>

    
    <SettingSection title="位置">
      <SettingRow label="页脚">
        <label class="flex items-center gap-2 cursor-pointer">
          <input :checked="footerEnabled" type="checkbox" class="checkbox checkbox-xs checkbox-primary" @change="emit('update:footerEnabled', ($event.target as HTMLInputElement).checked)" />
          <span class="text-xs text-base-content/60">显示页脚</span>
        </label>
      </SettingRow>
      <SettingRow label="预览缩放" :value="previewScale + 'x'">
        <input :value="previewScale" type="range" min="0.25" max="2.5" step="0.05" class="range range-xs range-primary flex-1" @input="emit('update:previewScale', Number(($event.target as HTMLInputElement).value))" />
      </SettingRow>
    </SettingSection>

    
    <SettingSection title="卡片 UI">
      <ThemeSelector v-model="themeId" :themes="THEMES" @need-activate="emit('need-activate')" />
      <div class="pt-2 border-t border-base-200">
        <GradientPicker :model-value="gradientConfig" @update:model-value="(v: GradientConfig) => emit('update:gradientConfig', v)" />
      </div>
    </SettingSection>


    <SettingSection title="标题样式">
      <HeadingStylePanel />
    </SettingSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ThemeSelector from '@/components/ThemeSelector.vue'
import { useAuthStore } from '@/stores/auth'
import Dropdown from '@/components/Dropdown.vue'
import FontPicker from '@/components/FontPicker.vue'
import GradientPicker from '@/components/GradientPicker.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import HeadingStylePanel from '@/components/editor/HeadingStylePanel.vue'
import SettingSection from '@/components/settings/SettingSection.vue'
import SettingRow from '@/components/settings/SettingRow.vue'
import { THEMES } from '@/card'
import type { GradientConfig } from '@/card'

const HIGHLIGHT_STYLE_OPTIONS = [
  { value: 'underline', label: '下划线', short: 'U̲' },
  { value: 'border', label: '边框', short: '◧' },
  { value: 'highlight', label: '加粗着色', short: 'B' },
] as const

export interface FontOption {
  id: string
  label: string
  family: string
}

interface Props {
  appTheme: 'light' | 'dark'
  cardTheme: string
  bodyFontMode: string
  bodyFontSize: number
  bodyFontWeight: number
  highlightStyle: string
  highlightColor: string | null
  footerEnabled: boolean
  gradientConfig: GradientConfig
  previewScale: number
  fontOptions: FontOption[]
  isExporting: boolean
  progress: number
  bodyTextColor: string | null
}

const props = defineProps<Props>()
const auth = useAuthStore()

const emit = defineEmits<{
  (e: 'update:appTheme', value: 'light' | 'dark'): void
  (e: 'update:cardTheme', value: string): void
  (e: 'update:bodyFontMode', value: string): void
  (e: 'update:bodyFontSize', value: number): void
  (e: 'update:bodyFontWeight', value: number): void
  (e: 'update:highlightStyle', value: string): void
  (e: 'update:highlightColor', value: string | null): void
  (e: 'update:footerEnabled', value: boolean): void
  (e: 'update:gradientConfig', value: GradientConfig): void
  (e: 'update:previewScale', value: number): void
  (e: 'update:bodyTextColor', value: string | null): void
  (e: 'export-png'): void
  (e: 'export-jpg'): void
  (e: 'export-pdf'): void
  (e: 'need-activate'): void
}>()

const themeId = computed({
  get: () => props.cardTheme,
  set: (v: string) => emit('update:cardTheme', v),
})
</script>
