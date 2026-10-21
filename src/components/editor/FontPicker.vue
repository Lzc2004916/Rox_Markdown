<template>
  <Dropdown>
    <template #trigger="{ open }">
      <button
        type="button"
        class="w-full flex items-center justify-between gap-2 px-2 h-8 rounded border border-base-300 bg-base-100 hover:border-base-content/30 transition-colors text-left"
        :aria-expanded="open"
        aria-label="选择正文字体"
      >
        <span class="min-w-0 flex items-baseline gap-2">
          <span :style="{ fontFamily: selectedFont?.family ?? 'inherit' }" class="truncate text-sm">
            {{ selectedFont?.label ?? '选择字体' }}
          </span>
          <span v-if="selectedFont" class="truncate text-[10px] text-base-content/45">
            {{ selectedFont.description }}
          </span>
        </span>
        <svg class="w-3 h-3 opacity-40 shrink-0 transition-transform duration-100" :class="open ? 'rotate-180' : ''" viewBox="0 0 12 12" fill="none">
          <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </template>

    <template #default="{ close }">
      <div class="w-[360px] max-w-[calc(100vw-24px)]">
        <div class="p-2 border-b border-base-200">
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索字体或风格…"
            class="w-full input input-sm input-bordered bg-base-200"
          />
        </div>

        <div class="max-h-[420px] overflow-y-auto py-1">
          <template v-for="cat in categories" :key="cat">
            <div v-if="filteredByCat[cat]?.length" class="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-base-content/45">
              {{ cat }}
            </div>
            <button
              v-for="font in filteredByCat[cat]"
              :key="font.id"
              type="button"
              class="w-full grid grid-cols-[minmax(0,1fr)_110px] items-center gap-3 px-3 py-2 text-left hover:bg-base-200 transition-colors"
              :class="modelValue === font.id ? 'bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent'"
              @click="select(font.id, close)"
            >
              <span class="min-w-0">
                <span class="flex items-center gap-2">
                  <span class="text-xs font-medium truncate">{{ font.label }}</span>
                  <span v-if="modelValue === font.id" class="text-[10px] text-primary shrink-0">已选</span>
                </span>
                <span class="block mt-0.5 text-[10px] text-base-content/45 truncate">{{ font.description }}</span>
              </span>
              <span
                :style="{ fontFamily: font.family }"
                class="text-base text-right text-base-content/80 truncate"
              >{{ font.sample }}</span>
            </button>
          </template>
          <div v-if="allFiltered.length === 0" class="px-3 py-8 text-center text-xs text-base-content/40">
            无匹配字体
          </div>
        </div>
      </div>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Dropdown from '@/components/Dropdown.vue'
import { BODY_FONT_CATEGORIES } from '@/card/types'

export interface FontOption {
  id: string
  label: string
  family: string
  category: string
  description: string
  sample: string
}

const props = defineProps<{
  modelValue: string
  fonts: FontOption[]
  label?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', id: string): void
}>()

const keyword = ref('')
const selectedFont = computed(() => props.fonts.find(f => f.id === props.modelValue))
const categories = computed(() => {
  const known = BODY_FONT_CATEGORIES.filter(cat => props.fonts.some(font => font.category === cat))
  const extra = props.fonts
    .map(font => font.category)
    .filter(cat => !BODY_FONT_CATEGORIES.includes(cat as typeof BODY_FONT_CATEGORIES[number]))
  return [...known, ...new Set(extra)]
})

const allFiltered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return props.fonts
  return props.fonts.filter(font =>
    font.label.toLowerCase().includes(kw) ||
    font.id.toLowerCase().includes(kw) ||
    font.category.toLowerCase().includes(kw) ||
    font.description.toLowerCase().includes(kw),
  )
})

const filteredByCat = computed(() => {
  const out: Record<string, FontOption[]> = {}
  for (const cat of categories.value) out[cat] = []
  for (const font of allFiltered.value) {
    if (!out[font.category]) out[font.category] = []
    out[font.category].push(font)
  }
  return out
})

function select(id: string, close: () => void): void {
  emit('update:modelValue', id)
  keyword.value = ''
  close()
}
</script>

