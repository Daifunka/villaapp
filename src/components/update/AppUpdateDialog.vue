<script setup>
import { computed } from 'vue'

const props = defineProps({
  update: {
    type: Object,
    default: null,
  },
  mandatory: Boolean,
  loading: Boolean,
  phase: {
    type: String,
    default: 'idle',
  },
  progress: {
    type: Number,
    default: null,
  },
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
const showProgress = computed(() =>
  ['downloading', 'preparing', 'permission', 'installing'].includes(props.phase),
)
const progressValue = computed(() =>
  Number.isFinite(props.progress) ? Math.min(1, Math.max(0, props.progress)) : 0,
)
const progressPercentage = computed(() => Math.round(progressValue.value * 100))
const isProgressIndeterminate = computed(
  () => props.phase !== 'downloading' || !Number.isFinite(props.progress),
)
const statusLabel = computed(() => {
  const messages = {
    downloading: isEnglish.value
      ? `Downloading… ${progressPercentage.value}%`
      : `Téléchargement… ${progressPercentage.value} %`,
    preparing: isEnglish.value
      ? 'Checking the APK and preparing installation…'
      : "Vérification de l'APK et préparation de l'installation…",
    permission: isEnglish.value
      ? 'Allow VillaApp to install updates, then return to the app.'
      : "Autorisez VillaApp à installer les mises à jour, puis revenez dans l'application.",
    installing: isEnglish.value
      ? 'Opening the Android installer…'
      : "Ouverture de l'installateur Android…",
  }
  return messages[props.phase] ?? ''
})
const actionLabel = computed(() => {
  if (props.phase === 'ready') return isEnglish.value ? 'Install' : 'Installer'
  return isEnglish.value ? 'Download' : 'Télécharger'
})
const actionIcon = computed(() => (props.phase === 'ready' ? 'system_update_alt' : 'download'))
</script>

<template>
  <q-dialog v-model="isOpen" :persistent="mandatory || loading">
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

        <div v-if="showProgress" class="app-update-card__progress" role="status" aria-live="polite">
          <div class="app-update-card__progress-label">
            {{ statusLabel }}
          </div>
          <q-linear-progress
            rounded
            size="10px"
            color="negative"
            track-color="grey-3"
            :value="progressValue"
            :indeterminate="isProgressIndeterminate"
          />
        </div>

        <p class="app-update-card__hint">
          {{
            isEnglish
              ? 'The download stays inside VillaApp. Android may ask you to confirm the installation.'
              : 'Le téléchargement reste dans VillaApp. Android peut vous demander de confirmer l’installation.'
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
          :icon="actionIcon"
          :loading="loading"
          :label="actionLabel"
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

.app-update-card__progress {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  margin: 18px 0;
  border-radius: 12px;
  background: #f7f7f7;
}

.app-update-card__progress-label {
  color: #3b3b3b;
  font-size: 0.875rem;
  font-weight: 600;
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
