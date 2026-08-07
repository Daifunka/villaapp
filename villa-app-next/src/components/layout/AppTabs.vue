<script setup lang="ts">
import type { AppTab, SectionName } from '@/types'
defineProps<{ tabs: AppTab[]; active: SectionName }>()
const emit = defineEmits<{ select: [name: SectionName] }>()
</script>

<template>
  <div class="tabs" role="tablist" aria-label="Navigation">
    <button v-for="tab in tabs" :key="`${tab.id}-${tab.name}`" class="tab" :class="{ active: active === tab.name }" role="tab" :aria-selected="active === tab.name" @click="emit('select', tab.name)">
      {{ tab.label }}
    </button>
  </div>
</template>
