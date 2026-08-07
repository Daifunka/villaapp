<script setup lang="ts">
import { useRouter } from 'vue-router'
import { usePreferences } from '@/composables/usePreferences'
import BaseIcon from '@/components/ui/BaseIcon.vue'
const router = useRouter()
const preferences = usePreferences()
</script>

<template>
  <q-page class="profile-page">
    <header><button class="icon-button" aria-label="Retour" @click="router.back()"><BaseIcon name="up" /></button><span>Mon séjour</span></header>
    <main><span class="eyebrow">Profil</span><h1>Votre séjour à la Villa</h1><q-card flat bordered class="profile-card"><q-card-section><span>Chambre</span><h2>{{ preferences.settings.chambre || 'Non renseignée' }}</h2><p>Bloc {{ preferences.settings.bloc || '—' }}</p></q-card-section></q-card></main>
  </q-page>
</template>
