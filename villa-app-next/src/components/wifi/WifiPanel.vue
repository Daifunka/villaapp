<script setup lang="ts">
import { useQuasar } from 'quasar'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import type { Announcement, Language } from '@/types'
const props = defineProps<{ announcement: Announcement | null; language: Language }>()
const $q = useQuasar()
async function copyPassword() {
  if (!props.announcement?.motdepasseWifi) return
  await navigator.clipboard.writeText(props.announcement.motdepasseWifi)
  $q.notify({ color: 'positive', textColor: 'white', message: props.language === 'En' ? 'Password copied' : 'Mot de passe copié' })
}
</script>

<template>
  <section class="wifi-panel">
    <div class="wifi-symbol"><BaseIcon name="wifi" :size="40" /></div>
    <span>Connexion privée</span><h2>Wi-Fi de la Villa</h2>
    <p>{{ announcement?.texte || 'Profitez gratuitement de notre connexion haut débit pendant votre séjour.' }}</p>
    <button v-if="announcement?.motdepasseWifi" class="password-card" @click="copyPassword"><span>Mot de passe</span><strong>{{ announcement.motdepasseWifi }}</strong><small>Toucher pour copier</small></button>
  </section>
</template>
