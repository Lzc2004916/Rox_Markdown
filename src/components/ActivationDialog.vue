<template>
  <dialog ref="dialogRef" class="modal">
    <div class="modal-box max-w-md bg-base-100">
      <h3 class="text-lg font-bold mb-4">解锁全部主题</h3>

      <div class="mb-5 space-y-2.5 text-sm text-base-content/70">
        <div class="flex items-start gap-2">
          <span class="text-primary mt-0.5">✦</span>
          <span>48 款精选主题：赛博霓虹、鎏金奢、水墨丹青、樱吹雪…</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-primary mt-0.5">✦</span>
          <span>持续更新新主题，一次激活永久使用</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-primary mt-0.5">✦</span>
          <span>导出高清图文卡片，发小红书/朋友圈更出彩</span>
        </div>
      </div>

      <div class="divider my-4"></div>

      <label class="label">
        <span class="label-text text-sm">输入激活码</span>
      </label>
      <input
        v-model="rawToken"
        type="text"
        placeholder="例如 WEEK-TEST001"
        class="input input-bordered w-full font-mono"
        :disabled="loading"
        @keyup.enter="onSubmit"
      />

      <p v-if="errorMsg" class="text-error text-xs mt-2">{{ errorMsg }}</p>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="onClose" :disabled="loading">
          先用免费主题
        </button>
        <button class="btn btn-primary" @click="onSubmit" :disabled="loading || !rawToken.trim()">
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          激活
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="onClose">关闭</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>()

const auth = useAuthStore()
const dialogRef = ref<HTMLDialogElement | null>(null)
const rawToken = ref('')
const errorMsg = ref('')

watch(() => props.visible, (v) => {
  if (v) {
    rawToken.value = ''
    errorMsg.value = ''
    dialogRef.value?.showModal()
  } else {
    dialogRef.value?.close()
  }
})

async function onSubmit() {
  errorMsg.value = ''
  try {
    await auth.activate(rawToken.value)
    emit('success')
    emit('close')
  } catch (e: any) {
    errorMsg.value = e.message || '激活失败，请检查激活码'
  }
}

function onClose() {
  emit('close')
}
</script>
