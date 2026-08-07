<script setup lang="ts">
import BaseIcon from '@/components/ui/BaseIcon.vue'
import type { SessionOrder } from '@/types'
defineProps<{ orders: readonly SessionOrder[] }>()
</script>

<template>
  <section class="orders-panel">
    <header class="panel-title"><div><span>Suivi</span><h2>Mes commandes</h2></div></header>
    <div v-if="!orders.length" class="state-block"><div class="empty-icon"><BaseIcon name="orders" :size="34" /></div><p>Aucune commande pour le moment.</p></div>
    <article v-for="order in orders" :key="order.id" class="order-card">
      <div><strong>{{ new Date(order.date).toLocaleString('fr-FR') }}</strong><span>{{ order.status }}</span></div>
      <ul><li v-for="item in order.items" :key="item.id">{{ item.quantite }} × {{ item.nom }}</li></ul>
      <strong>{{ order.total.toLocaleString('fr-FR') }} F</strong>
    </article>
  </section>
</template>
