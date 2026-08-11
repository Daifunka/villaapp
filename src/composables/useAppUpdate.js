import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { checkSelfHostedUpdates, openNativeUpdate } from '@/utils/updater'

const REMIND_AFTER_KEY = 'update.nativeRemindAfter'
const ONE_DAY = 24 * 60 * 60 * 1000

export function useAppUpdate() {
  const nativeUpdate = ref(null)
  const isDialogOpen = shallowRef(false)
  const isOpeningDownload = shallowRef(false)
  const errorMessage = shallowRef('')
  const language = shallowRef('Fr')
  let appStateListener
  let initialCheckTimer
  let checkInProgress = false

  const isMandatory = computed(() => Boolean(nativeUpdate.value?.mandatory))

  function refreshLanguage() {
    language.value = localStorage.getItem('langue') === 'En' ? 'En' : 'Fr'
  }

  async function shouldShowUpdate(update) {
    if (update.mandatory) return true

    const { value } = await Preferences.get({ key: REMIND_AFTER_KEY })
    return !value || Number(value) <= Date.now()
  }

  async function checkForUpdates() {
    if (!Capacitor.isNativePlatform() || checkInProgress) return

    checkInProgress = true
    refreshLanguage()

    try {
      const result = await checkSelfHostedUpdates()
      nativeUpdate.value = result.nativeUpdate

      if (result.nativeUpdate && (await shouldShowUpdate(result.nativeUpdate))) {
        isDialogOpen.value = true
      }
    } finally {
      checkInProgress = false
    }
  }

  async function remindLater() {
    if (isMandatory.value) return

    await Preferences.set({
      key: REMIND_AFTER_KEY,
      value: String(Date.now() + ONE_DAY),
    })
    isDialogOpen.value = false
  }

  async function downloadNativeUpdate() {
    if (!nativeUpdate.value?.apkUrl || isOpeningDownload.value) return

    isOpeningDownload.value = true
    errorMessage.value = ''

    try {
      if (!isMandatory.value) {
        await Preferences.set({
          key: REMIND_AFTER_KEY,
          value: String(Date.now() + ONE_DAY),
        })
      }
      await openNativeUpdate(nativeUpdate.value.apkUrl)
    } catch (error) {
      errorMessage.value =
        language.value === 'En'
          ? 'Unable to open the APK download. Please try again.'
          : "Impossible d’ouvrir le téléchargement de l’APK. Veuillez réessayer."
      console.error('[Updater] Ouverture de l’APK impossible :', error)
    } finally {
      isOpeningDownload.value = false
    }
  }

  onMounted(async () => {
    if (!Capacitor.isNativePlatform()) return

    initialCheckTimer = window.setTimeout(() => checkForUpdates(), 1500)
    appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void checkForUpdates()
    })
  })

  onBeforeUnmount(() => {
    if (initialCheckTimer) window.clearTimeout(initialCheckTimer)
    void appStateListener?.remove()
  })

  return {
    nativeUpdate,
    isDialogOpen,
    isOpeningDownload,
    isMandatory,
    errorMessage,
    language,
    remindLater,
    downloadNativeUpdate,
  }
}
