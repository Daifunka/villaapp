<script setup lang="ts">
import BaseIcon from '@/components/ui/BaseIcon.vue'
import type { Language } from '@/types'

defineProps<{ scrolled: boolean; language: Language; room: string; guestName: string; cartCount: number; hasAnnouncement: boolean }>()
const emit = defineEmits<{ settings: []; info: []; orders: []; cart: []; language: [value: Language] }>()
</script>

<template>
  <section class="hero">
    <div class="hero-shade" />
    <nav class="hero-nav" :class="{ 'hero-nav--scrolled': scrolled }" aria-label="Actions principales">
      <div class="hero-actions">
        <button v-if="!room" class="icon-button" aria-label="Configurer la chambre" @click="emit('settings')"><BaseIcon name="user" /></button>
        <button v-if="hasAnnouncement" class="icon-button" aria-label="Informations" @click="emit('info')"><BaseIcon name="info" /></button>
        <button class="icon-button" aria-label="Commandes" @click="emit('orders')"><BaseIcon name="orders" /></button>
        <button class="icon-button cart-button" aria-label="Panier" @click="emit('cart')">
          <BaseIcon name="cart" /><span v-if="cartCount" class="cart-count">{{ cartCount }}</span>
        </button>
      </div>
      <div class="language-switch" aria-label="Langue">
        <button :class="{ active: language === 'Fr' }" @click="emit('language', 'Fr')">FR</button>
        <button :class="{ active: language === 'En' }" @click="emit('language', 'En')">EN</button>
      </div>
    </nav>
    <div class="hero-copy">
      <p>{{ guestName ? `Bonjour ${guestName}, bienvenue à` : 'Bonjour, bienvenue à' }}</p>
      <h1>LA VILLA SAINT-JEAN</h1>
      <span v-if="room" class="room-pill"><BaseIcon name="room" :size="15" />{{ room }}</span>
    </div>
  </section>
</template>
