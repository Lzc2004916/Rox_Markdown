<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
    <TransitionGroup name="toast">
      <div
        v-for="item in list"
        :key="item.id"
        class="px-4 py-2 rounded-lg shadow-lg text-sm backdrop-blur-md bg-base-100/90 border border-base-300/50 pointer-events-auto flex items-center gap-3"
        :class="{
          'border-l-4 border-l-success': item.type === 'success',
          'border-l-4 border-l-error': item.type === 'error',
          'border-l-4 border-l-info': item.type === 'info',
        }"
      >
        <span>{{ item.message }}</span>
        <button
          v-if="item.actionText"
          class="text-primary font-medium hover:underline"
          @click="item.actionCallback?.()"
        >
          {{ item.actionText }}
        </button>
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
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
