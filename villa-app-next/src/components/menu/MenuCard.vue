<script setup lang="ts">
import BaseIcon from '@/components/ui/BaseIcon.vue'
import { mediaUrl } from '@/services/api'
import type { MenuItem } from '@/types'
defineProps<{ item: MenuItem }>()
const emit = defineEmits<{ add: [item: MenuItem] }>()
</script>

<template>
  <article class="menu-card">
    <div class="menu-visual">
      <img v-if="item.imageMenu || item.image" :src="mediaUrl(item.imageMenu || item.image)" :alt="item.nom" loading="lazy" decoding="async" />
      <span v-else>{{ item.source === 'Bar' ? '🥂' : '🍽️' }}</span>
    </div>
    <div class="menu-copy"><h3>{{ item.nom }}</h3><strong>{{ Number(item.prix).toLocaleString('fr-FR') }} F</strong></div>
    <button class="add-button" :aria-label="`Ajouter ${item.nom}`" @click="emit('add', item)"><BaseIcon name="plus" :size="19" /></button>
  </article>
</template>
