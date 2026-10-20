<template>
  <div class="flex flex-wrap items-center gap-0.5 px-2 py-1 bg-base-200 border-b border-base-300 select-none">
    
    <button
      class="btn btn-ghost btn-sm btn-square h-7 w-7 min-h-0 tooltip tooltip-bottom"
      data-tip="撤回 (Ctrl+Z)"
      aria-label="撤回 (Ctrl+Z)"
      :disabled="canUndo === false"
      @mousedown.prevent
      @click="emit('command', 'undo')"
    >
      <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="1 4 1 10 7 10"/>
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
      </svg>
    </button>

    
    <button
      class="btn btn-ghost btn-sm btn-square h-7 w-7 min-h-0 tooltip tooltip-bottom"
      data-tip="重做 (Ctrl+Y)"
      aria-label="重做 (Ctrl+Y)"
      :disabled="canRedo === false"
      @mousedown.prevent
      @click="emit('command', 'redo')"
    >
      <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/>
      </svg>
    </button>

    
    <span class="w-px h-5 bg-base-300/60 mx-0.5"></span>

    
    <div
      v-for="item in toolbarItems"
      :key="item.id"
      class="tooltip tooltip-bottom"
      :data-tip="item.label"
    >
      <button
        class="btn btn-ghost btn-sm btn-square h-7 w-7 min-h-0"
        :aria-label="item.label"
        @mousedown.prevent
        @click="item.id === 'image' ? emit('select-image') : emit('insert', item)"
      >
        
        <svg v-if="item.id === 'highlight'" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        
        <svg v-else-if="item.id === 'link'" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        
        <svg v-else-if="item.id === 'image'" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
        
        <svg v-else-if="item.id === 'code'" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
        </svg>
        
        <svg v-else-if="item.id === 'quote'" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="4" x2="4" y2="20"/><path d="M8 6h12"/><path d="M8 11h9"/><path d="M8 16h10"/>
        </svg>
        
        <svg v-else-if="item.id === 'table'" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>
        </svg>
        
        <svg v-else-if="item.id === 'divider'" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="4" y1="12" x2="20" y2="12"/>
        </svg>
        
        <svg v-else-if="item.id === 'left-column'" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="18" rx="1"/><rect x="13" y="3" width="8" height="18" rx="1"/><line x1="10" y1="3" x2="10" y2="21" stroke-width="1" stroke-dasharray="2 2"/>
        </svg>
        
        <svg v-else-if="item.id === 'right-column'" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="8" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/><line x1="11" y1="3" x2="11" y2="21" stroke-width="1" stroke-dasharray="2 2"/>
        </svg>
        
        <svg v-else-if="item.id === 'unordered-list'" class="w-[20px] h-[20px]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="4" cy="5" r="3" fill="currentColor"/>
          <line x1="10" y1="5" x2="22" y2="5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="4" cy="12" r="3" fill="currentColor"/>
          <line x1="10" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="4" cy="19" r="3" fill="currentColor"/>
          <line x1="10" y1="19" x2="22" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        
        <svg v-else-if="item.id === 'ordered-list'" class="w-[20px] h-[20px]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <line x1="11" y1="5" x2="22" y2="5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="11" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="11" y1="19" x2="22" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <text x="4" y="9.5" font-size="12" font-weight="bold" fill="currentColor" text-anchor="middle">1</text>
          <text x="4" y="16.5" font-size="12" font-weight="bold" fill="currentColor" text-anchor="middle">2</text>
          <text x="4" y="23" font-size="12" font-weight="bold" fill="currentColor" text-anchor="middle">3</text>
        </svg>
        
        <span v-else class="inline-flex items-center justify-center w-full h-full text-[13px] leading-none pointer-events-none" v-html="item.icon"></span>
      </button>
    </div>

    
    <span class="w-px h-5 bg-base-300/60 mx-0.5"></span>

    
    <button
      v-for="level in 6"
      :key="'h' + level"
      class="btn btn-ghost btn-sm h-7 min-h-0 px-1.5 tooltip tooltip-bottom"
      :data-tip="'标题 (H' + level + ')'"
      :aria-label="'H' + level"
      @mousedown.prevent
      @click="emit('insert', makeHeadingItem(level))"
    >
      <span class="text-xs font-bold leading-none">H{{ level }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">




export interface ToolbarItem {
  
  id: string
  
  icon: string
  
  label: string
  
  template: string
  
  wrap?: {
    
    prefix: string
    
    suffix: string
    
    placeholder: string
  }
}



defineProps<{
  
  currentHeadingLevel?: number
  
  canUndo?: boolean
  
  canRedo?: boolean
}>()

const emit = defineEmits<{
  (e: 'insert', item: ToolbarItem): void
  (e: 'command', action: 'undo' | 'redo'): void
  (e: 'select-image'): void
}>()




function makeHeadingItem(level: number): ToolbarItem {
  const prefix = '#'.repeat(level) + ' '
  return {
    id: 'heading',
    icon: `<strong>H${level}</strong>`,
    label: `标题 (H${level})`,
    template: prefix,
    wrap: { prefix, suffix: '', placeholder: '' },
    headingLevel: level,
  } as ToolbarItem & { headingLevel: number }
}




const toolbarItems: readonly ToolbarItem[] = [
  
  { id: 'highlight',   icon: '🖍',                   label: '高亮', template: '==高亮文本==',
    wrap: { prefix: '==', suffix: '==', placeholder: '高亮文本' } },

  
  { id: 'link',        icon: '🔗',                   label: '链接', template: '[链接文本](url)' },
  { id: 'image',       icon: '🖼',                   label: '图片', template: '![图片描述](url)' },

  
  { id: 'code',        icon: '⟨⟩',                   label: '代码块', template: '```\n代码\n```' },
  { id: 'quote',       icon: '❝',                   label: '引用块', template: '> 引用内容', wrap: { prefix: '> ', suffix: '', placeholder: '引用内容' } },

  
  { id: 'table',       icon: '⊞',                    label: '表格', template: '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |' },

  
  { id: 'divider',     icon: '—',                    label: '分割线', template: '\n---\n' },

  
  { id: 'unordered-list', icon: '•',                 label: '无序列表', template: '- 列表项', wrap: { prefix: '- ', suffix: '', placeholder: '列表项' } },
  { id: 'ordered-list',   icon: '1.',                label: '有序列表', template: '1. 列表项', wrap: { prefix: '1. ', suffix: '', placeholder: '列表项' } },

  
  { id: 'left-column',  icon: '◧',                   label: '左分栏', template: ':::left\n左栏内容\n:::' },
  { id: 'right-column', icon: '◨',                   label: '右分栏', template: ':::right\n右栏内容\n:::' },
]
</script>
