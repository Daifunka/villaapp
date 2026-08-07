<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import MenuCard from './MenuCard.vue'
import type { MenuItem } from '@/types'

const props = defineProps<{ items: readonly MenuItem[] }>()
const emit = defineEmits<{ add: [item: MenuItem] }>()
const category = shallowRef<'Restaurant' | 'Bar'>('Restaurant')
const limit = shallowRef(12)
const filtered = computed(() => props.items.filter((item) => item.source === category.value))
const visible = computed(() => filtered.value.slice(0, limit.value))
function setCategory(value: 'Restaurant' | 'Bar') { category.value = value; limit.value = 12 }
</script>

<template>
  <section class="menu-panel">
    <div class="segment">
      <button :class="{ active: category === 'Restaurant' }" @click="setCategory('Restaurant')">Repas</button>
      <button :class="{ active: category === 'Bar' }" @click="setCategory('Bar')">Boissons</button>
    </div>
    <div v-if="visible.length" class="menu-grid">
      <MenuCard v-for="item in visible" :key="item.id" :item="item" @add="emit('add', $event)" />
    </div>
    <div v-else class="state-block"><p>Le menu est momentanément indisponible.</p></div>
    <q-btn v-if="limit < filtered.length" outline rounded color="primary" label="Voir plus" class="load-more" @click="limit += 12" />
  </section>
</template>
