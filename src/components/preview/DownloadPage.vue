<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center p-6">
    <div class="max-w-md w-full">
      <div class="bg-base-100 rounded-2xl shadow-xl p-8 text-center">
        <!-- Logo -->
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
        </div>

        <h1 class="text-xl font-bold mb-2">Rox-Markdown</h1>
        <p class="text-sm text-base-content/60 mb-6">访问官网了解更多功能，下载最新版本</p>

        <!-- 主按钮 -->
        <button
          class="btn btn-primary w-full h-11"
          @click="openOfficialSite"
        >
          <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"></path>
          </svg>
          访问官网
        </button>

        <!-- 次按钮 -->
        <button
          class="btn btn-ghost w-full h-10 mt-3"
          @click="$emit('back')"
        >
          返回
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'back'): void
}>()

function openOfficialSite() {
  // 在浏览器打开下载页，用生产环境后端地址拼
  const apiBase = import.meta.env.VITE_API_BASE || '/api'
  // 把 /api 去掉，拼 download.html
  const baseUrl = apiBase.replace(/\/api$/, '')
  window.open(`${baseUrl}/download.html`, '_blank')
}
</script>

