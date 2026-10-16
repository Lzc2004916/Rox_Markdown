<template>
  <div class="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none items-center">
    <TransitionGroup name="toast">
      <div
        v-for="item in list"
        :key="item.id"
        class="px-6 py-3 rounded-full shadow-xl text-sm font-medium backdrop-blur-md border pointer-events-auto min-w-[200px] text-center"
        :class="{
          'bg-success/90 text-success-content border-success/30': item.type === 'success',
          'bg-error/90 text-error-content border-error/30': item.type === 'error',
          'bg-info/90 text-info-content border-info/30': item.type === 'info',
        }"
      >
        {{ item.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { _subscribeToast } from '@/utils/toast'

const list = ref<{ id: number; type: string; message: string }[]>([])
let unsubscribe: (() => void) | null = null

onMounted(() => {
  unsubscribe = _subscribeToast((l) => {
    list.value = l
  })
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
</style>
