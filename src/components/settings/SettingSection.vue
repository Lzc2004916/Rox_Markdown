<template>
  <section class="border-b border-base-200">
    <button
      type="button"
      class="w-full flex items-center justify-between px-4 h-10 hover:bg-base-200/50 transition-colors"
      @click="open = !open"
      :aria-expanded="open"
    >
      <span class="text-xs font-bold uppercase tracking-wider text-base-content/70">
        {{ title }}
      </span>
      <svg
        class="w-3.5 h-3.5 text-base-content/55 transition-transform duration-200"
        :class="open ? 'rotate-180' : ''"
        viewBox="0 0 12 12" fill="none"
      >
        <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div v-show="open" class="px-4 pb-4 pt-1 flex flex-col gap-3">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ title: string; defaultOpen?: boolean }>()
const open = ref(true)
</script>
