<script setup lang="ts">
import type { Faq, Language, SectionName, VideoContent } from '@/types'
import { mediaUrl } from '@/services/api'
defineProps<{ section: SectionName; language: Language; video: VideoContent | null; loading: boolean; faqs: Faq[] }>()
</script>

<template>
  <section class="content-panel" aria-live="polite">
    <div v-if="loading" class="state-block"><q-spinner color="primary" size="42px" /><p>Chargement en cours</p></div>
    <template v-else>
      <video v-if="video?.video_url" class="content-video" controls playsinline preload="metadata" :src="mediaUrl(video.video_url)" />
      <div v-else class="editorial-card">
        <span class="editorial-kicker">{{ section }}</span>
        <h2>{{ section === 'Accueil' ? 'L’élégance d’une maison, le soin d’un hôtel.' : section }}</h2>
        <p>{{ video?.description || 'Découvrez les espaces, les services et les attentions qui rendent votre séjour unique.' }}</p>
      </div>
      <p v-if="video?.description && video?.video_url" class="video-description">{{ video.description }}</p>
      <div v-if="section === 'FAQs' && faqs.length" class="faq-list">
        <q-expansion-item v-for="faq in faqs" :key="faq.id" :label="faq.question" class="faq-item">
          <q-card-section>{{ faq.reponse }}</q-card-section>
        </q-expansion-item>
      </div>
    </template>
  </section>
</template>
