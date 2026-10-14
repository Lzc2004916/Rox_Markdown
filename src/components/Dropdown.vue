<template>
  <div ref="rootRef" class="relative inline-block w-full">
    <div class="w-full" @click="toggle">
      <slot name="trigger" :open="open" />
    </div>

    <Transition name="dropdown-fade">
      <div
        v-if="open"
        ref="panelRef"
        class="absolute z-50 mt-1 left-0 w-full rounded-lg shadow-xl bg-base-100 border border-base-300 overflow-hidden"
      >
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

function toggle(): void { open.value = !open.value }
function close(): void { open.value = false }

function onClickOutside(e: MouseEvent): void {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) open.value = false
}
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 100ms cubic-bezier(0.4, 0, 0.2, 1), transform 100ms cubic-bezier(0.4, 0, 0.2, 1);
}
.dropdown-fade-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
