<script setup lang="ts">
import { shallowRef } from 'vue'
import type { Language } from '@/types'

defineProps<{ language: Language }>()
const visible = shallowRef(!sessionStorage.getItem('villa-next-welcome'))
function enter() { sessionStorage.setItem('villa-next-welcome', '1'); visible.value = false }
</script>

<template>
  <Transition name="gate">
    <div v-if="visible" class="welcome-gate">
      <div class="welcome-card">
        <div class="welcome-mark">VSJ</div>
        <p class="welcome-kicker">Maison d’hôtes · Cotonou</p>
        <h2>La Villa Saint-Jean</h2>
        <p>{{ language === 'En' ? 'A refined stay, designed around you.' : 'Un séjour d’exception, pensé autour de vous.' }}</p>
        <q-btn unelevated rounded color="secondary" text-color="dark" size="lg" :label="language === 'En' ? 'Enter' : 'Découvrir'" @click="enter" />
      </div>
    </div>
  </Transition>
</template>
