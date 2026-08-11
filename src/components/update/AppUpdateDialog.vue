<script setup>
import { computed } from 'vue'

const props = defineProps({
  update: {
    type: Object,
    default: null,
  },
  mandatory: Boolean,
  loading: Boolean,
  errorMessage: {
    type: String,
    default: '',
  },
  language: {
    type: String,
    default: 'Fr',
  },
})

const isOpen = defineModel({ type: Boolean, required: true })
const emit = defineEmits(['update', 'later'])

const isEnglish = computed(() => props.language === 'En')
const title = computed(() =>
  isEnglish.value ? 'A new version is available' : 'Une nouvelle version est disponible',
)
const releaseNotes = computed(() => {
  const notes = props.update?.releaseNotes ?? {}
  return isEnglish.value ? notes.en || notes.fr : notes.fr || notes.en
})
</script>

<template>
  <q-dialog v-model="isOpen" :persistent="mandatory">
    <q-card class="app-update-card notranslate" translate="no">
      <q-card-section class="app-update-card__header">
        <div class="app-update-card__icon">
          <q-icon name="system_update" size="34px" />
        </div>
        <div>
          <div class="app-update-card__eyebrow">Villa Saint Jean</div>
          <h2>{{ title }}</h2>
        </div>
      </q-card-section>

      <q-card-section class="app-update-card__content">
        <p>
          {{
            isEnglish
              ? `Version ${update?.versionName} is ready to install.`
              : `La version ${update?.versionName} est prête à être installée.`
          }}
        </p>

        <div v-if="releaseNotes" class="app-update-card__notes">
          <strong>{{ isEnglish ? 'What’s new' : 'Nouveautés' }}</strong>
          <p>{{ releaseNotes }}</p>
        </div>

        <p class="app-update-card__hint">
          {{
            isEnglish
              ? 'Android will ask you to confirm the installation after the download.'
              : 'Android vous demandera de confirmer l’installation après le téléchargement.'
          }}
        </p>

        <p v-if="errorMessage" class="app-update-card__error" role="alert">
          {{ errorMessage }}
        </p>
      </q-card-section>

      <q-card-actions class="app-update-card__actions">
        <q-btn
          v-if="!mandatory"
          flat
          no-caps
          :disable="loading"
          :label="isEnglish ? 'Later' : 'Plus tard'"
          @click="emit('later')"
        />
        <q-btn
          unelevated
          no-caps
          color="negative"
          icon="download"
          :loading="loading"
          :label="isEnglish ? 'Download' : 'Télécharger'"
          @click="emit('update')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.app-update-card {
  width: min(92vw, 520px);
  border-radius: 24px;
  overflow: hidden;
}

.app-update-card__header {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 24px 24px 18px;
  color: #fff;
  background: linear-gradient(135deg, #8d162f, #b52242);
}

.app-update-card__icon {
  display: grid;
  flex: 0 0 58px;
  height: 58px;
  place-items: center;
  border-radius: 18px;
  background: rgb(255 255 255 / 16%);
}

.app-update-card__eyebrow {
  margin-bottom: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.78;
}

.app-update-card h2 {
  margin: 0;
  font-size: clamp(1.25rem, 4vw, 1.55rem);
  font-weight: 700;
  line-height: 1.2;
}

.app-update-card__content {
  padding: 22px 24px 12px;
  color: #303030;
}

.app-update-card__content > p:first-child {
  margin-top: 0;
  font-size: 1rem;
}

.app-update-card__notes {
  padding: 14px 16px;
  margin: 18px 0;
  border-left: 4px solid #8d162f;
  border-radius: 4px 12px 12px 4px;
  background: #faf3f5;
}

.app-update-card__notes p {
  margin: 6px 0 0;
  white-space: pre-line;
}

.app-update-card__hint {
  margin-bottom: 0;
  color: #6d6d6d;
  font-size: 0.875rem;
}

.app-update-card__error {
  color: #c10015;
  font-weight: 600;
}

.app-update-card__actions {
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 24px 24px;
}

.app-update-card__actions .q-btn {
  min-height: 44px;
  padding-inline: 18px;
  border-radius: 12px;
}
</style>
