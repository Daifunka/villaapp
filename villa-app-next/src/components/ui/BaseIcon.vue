<script setup lang="ts">
const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 22 })
const paths: Record<string, string> = {
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v6m0-10h.01',
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6',
  cart: 'M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 7H6m4 13h.01M18 20h.01',
  room: 'M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M8 21V8h8v13m-2-7h.01',
  wifi: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
  trash: 'M4 7h16m-10 4v6m4-6v6M9 7V4h6v3m-9 0 1 14h10l1-14',
  up: 'm6 15 6-6 6 6', close: 'm6 6 12 12M18 6 6 18', check: 'm5 12 4 4L19 6',
}
</script>

<template>
  <svg :width="props.size" :height="props.size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="paths[props.name] ?? paths.info" />
  </svg>
</template>
