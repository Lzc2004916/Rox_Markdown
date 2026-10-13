<template>
  <div class="relative inline-block w-full" ref="rootRef">
    <button
      type="button"
      class="w-full flex items-center justify-between gap-2 px-2 h-7 rounded border border-base-300 bg-base-100 hover:border-base-content/30 transition-colors text-xs"
      @click="open = !open"
    >
      <span :style="{ fontFamily: selectedFont?.family ?? 'inherit' }" class="truncate">
        {{ selectedFont?.label ?? '选择字体' }}
      </span>
      <svg class="w-3 h-3 opacity-40 shrink-0" :class="open ? 'rotate-180' : ''" viewBox="0 0 12 12" fill="none">
        <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute z-50 mt-1 left-0 w-64 rounded-lg shadow-xl bg-base-100 border border-base-300 overflow-hidden"
    >
      
      <div class="p-2 border-b border-base-200">
        <input
          ref="searchRef"
          v-model="keyword"
          type="text"
          placeholder="搜索字体…"
          class="w-full input input-xs input-bordered bg-base-200"
        />
      </div>

      
      <div class="max-h-72 overflow-y-auto py-1" @wheel="onPanelWheel" ref="listRef">
        <template v-for="cat in categories" :key="cat">
          <div v-if="filteredByCat[cat].length" class="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-base-content/40">
            {{ cat }}
          </div>
          <button
            v-for="font in filteredByCat[cat]"
            :key="font.id"
            type="button"
            class="w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-base-200 transition-colors text-left"
            :class="modelValue === font.id ? 'bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent'"
            @click="select(font.id)"
          >
            <span :style="{ fontFamily: font.family }" class="truncate">{{ font.label }}</span>
            <span :style="{ fontFamily: font.family }" class="text-[11px] text-base-content/40 shrink-0 ml-2">Aa</span>
          </button>
        </template>
        <div v-if="allFiltered.length === 0" class="px-3 py-6 text-center text-xs text-base-content/40">
          无匹配字体
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'

export interface FontOption {
  id: string
  label: string
  family: string
  category?: string
}

const props = defineProps<{
  modelValue: string
  fonts: FontOption[]
  label?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', id: string): void
}>()

const open = ref(false)
const keyword = ref('')
const rootRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)

const selectedFont = computed(() => props.fonts.find(f => f.id === props.modelValue))

const categories = ['宋体衬线', '黑体无衬线', '等宽', '圆体装饰', '西文']

const allFiltered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return props.fonts
  return props.fonts.filter(f => f.label.toLowerCase().includes(kw) || f.id.toLowerCase().includes(kw))
})

const filteredByCat = computed(() => {
  const out: Record<string, FontOption[]> = {}
  for (const cat of categories) out[cat] = []
  for (const f of allFiltered.value) {
    const cat = f.category ?? '其他'
    if (!out[cat]) out[cat] = []
    out[cat].push(f)
  }
  return out
})

function select(id: string) {
  emit('update:modelValue', id)
  open.value = false
  keyword.value = ''
}

function onPanelWheel(e: WheelEvent) {
  const el = listRef.value
  if (!el) return
  const atTop = el.scrollTop <= 0 && e.deltaY < 0
  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && e.deltaY > 0
  if (atTop || atBottom) {
    e.preventDefault()
    e.stopPropagation()
  }
}

function onClickOutside(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

onMounted(async () => {
  document.addEventListener('mousedown', onClickOutside)
  document.addEventListener('keydown', onKeydown)
  if (open.value) await nextTick()
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
})
</script>
