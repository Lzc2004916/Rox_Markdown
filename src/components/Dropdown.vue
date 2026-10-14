<template>
  <div ref="rootRef" class="relative inline-block w-full">
    <div class="w-full" @click="toggle">
      <slot name="trigger" :open="open" />
    </div>

    <Transition name="dropdown-fade">
      <div
        v-if="open"
        ref="panelRef"
        class="fixed z-[9999] w-64 rounded-lg shadow-xl bg-base-100 border border-base-300 overflow-hidden"
        :style="panelStyle"
      >
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })

function toggle(): void {
  if (open.value) {
    close()
  } else {
    open.value = true
    nextTick(updatePosition)
  }
}
function close(): void { open.value = false }

function updatePosition(): void {
  if (!rootRef.value) return
  const rect = rootRef.value.getBoundingClientRect()
  panelStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
  }
}

function onClickOutside(e: MouseEvent): void {
  if (rootRef.value && !rootRef.value.contains(e.target as Node) &&
      panelRef.value && !panelRef.value.contains(e.target as Node)) {
    open.value = false
  }
}
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') open.value = false
}
function onScroll(): void { if (open.value) updatePosition() }

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onScroll, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', onScroll, true)
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
