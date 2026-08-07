<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue'
import { useQuasar } from 'quasar'
import HeroHeader from '@/components/layout/HeroHeader.vue'
import AppTabs from '@/components/layout/AppTabs.vue'
import WelcomeGate from '@/components/home/WelcomeGate.vue'
import ContentPanel from '@/components/home/ContentPanel.vue'
import MenuPanel from '@/components/menu/MenuPanel.vue'
import CartPanel from '@/components/cart/CartPanel.vue'
import WifiPanel from '@/components/wifi/WifiPanel.vue'
import OrdersPanel from '@/components/orders/OrdersPanel.vue'
import RoomSettingsDialog from '@/components/settings/RoomSettingsDialog.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import { useAppData } from '@/composables/useAppData'
import { useCart } from '@/composables/useCart'
import { usePreferences } from '@/composables/usePreferences'
import { useScrollState } from '@/composables/useScrollState'
import type { MenuItem, SectionName } from '@/types'

const $q = useQuasar()
const section = shallowRef<SectionName>('Accueil')
const showSettings = shallowRef(false)
const showInfo = shallowRef(false)
const { menus, faqs, announcement, video, tabs, loading, videoLoading, loadInitial, loadVideo } = useAppData()
const cart = useCart()
const preferences = usePreferences()
const { scrolled, showBackToTop, scrollToTop } = useScrollState()
const rooms = computed(() => menus.value.filter((item) => item.source === 'Guesthouse').map((item) => item.nom))

function selectSection(value: SectionName) { section.value = value; window.scrollTo({ top: 315, behavior: 'smooth' }) }
function addToCart(item: MenuItem) { cart.add(item); $q.notify({ color: 'positive', textColor: 'white', message: `${item.nom} ajouté au panier` }) }
async function submitOrder() {
  if (!preferences.settings.chambre) { showSettings.value = true; return }
  try { await cart.submit(preferences.settings); section.value = 'Commandes'; $q.notify({ color: 'positive', textColor: 'white', message: 'Commande enregistrée' }) }
  catch { $q.notify({ color: 'negative', textColor: 'white', message: 'La commande n’a pas pu être envoyée' }) }
}

onMounted(async () => { await loadInitial(); await loadVideo(section.value, preferences.language.value) })
watch([section, preferences.language], ([nextSection, nextLanguage]) => loadVideo(nextSection, nextLanguage))
</script>

<template>
  <q-page class="home-page">
    <WelcomeGate :language="preferences.language.value" />
    <HeroHeader :scrolled="scrolled" :language="preferences.language.value" :room="preferences.settings.chambre" :guest-name="preferences.guestName.value" :cart-count="cart.count.value" :has-announcement="Boolean(announcement)" @settings="showSettings = true" @info="showInfo = true" @orders="selectSection('Commandes')" @cart="selectSection('Cart')" @language="preferences.setLanguage" />
    <main class="main-sheet">
      <div class="sheet-handle"><span /></div>
      <AppTabs :tabs="tabs" :active="section" @select="selectSection" />
      <q-banner v-if="!preferences.hasRoom.value" class="room-warning"><BaseIcon name="info" :size="18" /> <button @click="showSettings = true">Renseignez votre chambre pour accéder à tous les services.</button></q-banner>
      <ContentPanel v-if="['Accueil', 'Chambres', 'Services', 'FAQs'].includes(section)" :section="section" :language="preferences.language.value" :video="video" :loading="loading || videoLoading" :faqs="faqs" />
      <MenuPanel v-else-if="section === 'Menu'" :items="menus" @add="addToCart" />
      <WifiPanel v-else-if="section === 'Wifi'" :announcement="announcement" :language="preferences.language.value" />
      <CartPanel v-else-if="section === 'Cart'" :items="cart.items.value" :total="cart.total.value" :language="preferences.language.value" :submitting="cart.submitting.value" @quantity="cart.setQuantity" @clear="cart.clear" @submit="submitOrder" />
      <OrdersPanel v-else :orders="cart.orders.value" />
    </main>
    <Transition name="fade"><button v-if="showBackToTop" class="back-to-top" aria-label="Retour en haut" @click="scrollToTop"><BaseIcon name="up" /></button></Transition>
    <div v-if="section === 'Accueil'" class="welcome-banner">Bienvenue à <strong>La Villa Saint-Jean</strong>, bienvenue chez vous.</div>
    <RoomSettingsDialog v-model="showSettings" :rooms="rooms" :current-room="preferences.settings.chambre" @save="preferences.saveRoom" />
    <q-dialog v-model="showInfo"><q-card class="info-dialog"><q-card-section><span class="eyebrow">Information</span><h2>{{ announcement?.titre || 'La Villa Saint-Jean' }}</h2><p>{{ announcement?.texte }}</p></q-card-section><q-card-actions align="right"><q-btn flat rounded color="primary" label="Fermer" v-close-popup /></q-card-actions></q-card></q-dialog>
  </q-page>
</template>
