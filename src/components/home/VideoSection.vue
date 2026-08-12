<script setup>
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { useVideoCache } from '@/composables/useVideoCache'

const CACHE_DOWNLOAD_DELAY_SECONDS = 45

const props = defineProps({
  baseUrl: { type: String, required: true },
  language: { type: String, required: true },
  section: { type: String, required: true },
  video: { type: [Object, String], default: null },
})

const { sourceUrl, isCached, cache, resolve } = useVideoCache()
const videoElement = useTemplateRef('videoElement')
const hasPlaybackStarted = shallowRef(false)
let requestedCacheKey = ''

function handlePlaybackStarted() {
  hasPlaybackStarted.value = true
}

function togglePlayback(event) {
  const target = event.target
  if (target instanceof Element && target.closest('.plyr__controls, .plyr__control')) {
    return
  }

  event.stopPropagation()
  const video = videoElement.value
  if (!video) return

  if (video.paused || video.ended) {
    void video.play().catch(() => undefined)
    return
  }

  video.pause()
}

function handlePlaybackProgress(event) {
  const video = event.currentTarget
  if (!video || isCached.value || !Number.isFinite(video.duration) || video.duration <= 0) return
  if (video.currentTime < CACHE_DOWNLOAD_DELAY_SECONDS) return

  const cacheKey = `${remoteUrl.value}::${cacheVersion.value}`
  if (!remoteUrl.value || requestedCacheKey === cacheKey) return

  requestedCacheKey = cacheKey
  void cache(remoteUrl.value, cacheVersion.value).catch(() => undefined)
}

const remoteUrl = computed(() => {
  if (!props.video || !props.video.video_url) return ''
  if (/^https?:\/\//i.test(props.video.video_url)) return props.video.video_url
  return `${props.baseUrl.replace(/\/$/, '')}/${props.video.video_url.replace(/^\//, '')}`
})

const cacheVersion = computed(() => {
  if (!props.video || typeof props.video !== 'object') return ''
  return props.video.updated_at || props.video.created_at || ''
})

const defaultDescriptions = {
  Accueil: {
    Fr: 'Découvrez La Villa Saint-Jean et l’expérience imaginée pour rendre votre séjour unique.',
    En: 'Discover La Villa Saint-Jean and the experience designed to make your stay unique.',
  },
  Chambres: {
    Fr: 'Explorez nos chambres, leurs équipements et les attentions prévues pour votre confort.',
    En: 'Explore our rooms, amenities, and the thoughtful details provided for your comfort.',
  },
  Services: {
    Fr: 'Découvrez les services disponibles et les informations utiles pendant votre séjour.',
    En: 'Discover the services available and useful information for your stay.',
  },
  FAQs: {
    Fr: 'Retrouvez dans cette vidéo les réponses aux questions les plus fréquentes.',
    En: 'This video answers the questions our guests ask most often.',
  },
}

const description = computed(() => {
  if (props.video && props.video.description?.trim()) return props.video.description.trim()
  const sectionCopy = defaultDescriptions[props.section] ?? defaultDescriptions.Accueil
  return sectionCopy[props.language]
})

watch(
  [remoteUrl, cacheVersion],
  ([url, version]) => {
    requestedCacheKey = ''
    hasPlaybackStarted.value = false
    void resolve(url, version)
  },
  { immediate: true },
)
</script>

<template>
  <section class="video-section" aria-live="polite">
    <div v-if="video === ''" class="video-state">
      <q-spinner color="primary" size="3em" />
      <p>Chargement en cours…</p>
    </div>

    <div v-else-if="video === null || !remoteUrl" class="video-state video-state--empty">
      <q-icon name="sym_o_videocam_off" size="48px" aria-hidden="true" />
      <p>{{ language === 'En' ? 'This video is currently unavailable.' : 'Cette vidéo est momentanément indisponible.' }}</p>
    </div>

    <template v-else>
      <div class="video-frame" @click.capture="togglePlayback">
        <div
          v-show="!hasPlaybackStarted"
          class="video-preview-placeholder"
          aria-hidden="true"
        >
          <q-icon class="video-preview-icon" name="play_arrow" size="42px" />
        </div>
        <vue-plyr v-if="sourceUrl" :key="sourceUrl" class="video-player">
          <video
            ref="videoElement"
            playsinline
            controls
            preload="metadata"
            :src="sourceUrl"
            @playing="handlePlaybackStarted"
            @timeupdate="handlePlaybackProgress"
          />
        </vue-plyr>
      </div>

      <div class="video-context notranslate" translate="no">
        <q-icon name="sym_o_info" size="20px" aria-hidden="true" />
        <p>{{ description }}</p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.video-section {
  margin-bottom: 24px;
}

.video-frame {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #000;
  border: 1px solid rgba(141, 22, 47, 0.1);
  border-radius: 24px;
  box-shadow: 0 12px 30px rgba(34, 9, 15, 0.1);
}

.video-preview-placeholder {
  position: absolute;
  z-index: 3;
  inset: 0;
  display: grid;
  background: #000;
  place-items: center;
  pointer-events: none;
}

.video-preview-icon {
  width: 66px;
  height: 66px;
  color: #fff;
  background: #a40f31;
  border-radius: 50%;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
}

.video-player {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  object-fit: contain;
}

.video-frame :deep(.plyr),
.video-frame :deep(.plyr__video-wrapper) {
  width: 100%;
  height: 100%;
}

.video-frame :deep(.plyr) {
  position: absolute;
  inset: 0;
}

.video-frame :deep(.plyr__video-wrapper) {
  aspect-ratio: auto !important;
}

.video-frame :deep(video) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.video-context {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  max-width: 780px;
  margin: 14px auto 0;
  padding: 14px 16px;
  color: #5f5053;
  background: #f8f3f1;
  border: 1px solid rgba(141, 22, 47, 0.09);
  border-radius: 14px;
}

.video-context p,
.video-state p {
  margin: 0;
  line-height: 1.6;
  white-space: pre-line;
}

.video-state {
  display: grid;
  min-height: 220px;
  color: #8d162f;
  place-content: center;
  place-items: center;
  gap: 12px;
  text-align: center;
}

.video-state--empty {
  color: #74666a;
  background: #faf7f6;
  border: 1px dashed rgba(141, 22, 47, 0.2);
  border-radius: 20px;
}
</style>
