<template>
  <div class="flex items-center gap-2">
    <span class="text-xs font-semibold text-base-content/80 w-16 shrink-0">{{ label }}</span>
    <div class="flex-1 min-w-0 flex items-center gap-2">
      <slot />
    </div>
    <span v-if="value" class="text-[11px] font-medium tabular-nums text-base-content/65 shrink-0">{{ value }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value?: string | number }>()
</script>
