<script setup lang="ts">
import BaseIcon from '@/components/ui/BaseIcon.vue'
import type { CartItem, Language } from '@/types'
defineProps<{ items: readonly CartItem[]; total: number; language: Language; submitting: boolean }>()
const emit = defineEmits<{ quantity: [id: CartItem['id'], value: number]; clear: []; submit: [] }>()
</script>

<template>
  <section class="cart-panel">
    <header class="panel-title"><div><span>Votre sélection</span><h2>Mon panier</h2></div><button v-if="items.length" class="text-button" @click="emit('clear')"><BaseIcon name="trash" :size="18" /> Vider</button></header>
    <div v-if="!items.length" class="state-block"><div class="empty-icon"><BaseIcon name="cart" :size="34" /></div><p>{{ language === 'En' ? 'Your cart is empty' : 'Votre panier est vide' }}</p></div>
    <div v-else class="cart-list">
      <article v-for="item in items" :key="item.id" class="cart-row">
        <div><h3>{{ item.nom }}</h3><strong>{{ Number(item.prix).toLocaleString('fr-FR') }} F</strong></div>
        <div class="quantity"><button @click="emit('quantity', item.id, item.quantite - 1)"><BaseIcon name="minus" :size="16" /></button><span>{{ item.quantite }}</span><button @click="emit('quantity', item.id, item.quantite + 1)"><BaseIcon name="plus" :size="16" /></button></div>
      </article>
      <div class="cart-total"><span>Total</span><strong>{{ total.toLocaleString('fr-FR') }} F</strong></div>
      <q-btn unelevated rounded color="primary" size="lg" class="full-width" :loading="submitting" :label="language === 'En' ? 'Place order' : 'Commander'" @click="emit('submit')" />
    </div>
  </section>
</template>
