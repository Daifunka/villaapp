import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { canInstallNativeApk, downloadNativeApk, installNativeApk } from '@/utils/nativeUpdate'
import { checkSelfHostedUpdates } from '@/utils/updater'

const REMIND_AFTER_KEY = 'update.nativeRemindAfter'
const ONE_DAY = 24 * 60 * 60 * 1000
const BUSY_PHASES = ['downloading', 'preparing', 'permission', 'installing']

export function useAppUpdate() {
  const nativeUpdate = ref(null)
  const isDialogOpen = shallowRef(false)
  const updatePhase = shallowRef('idle')
  const downloadProgress = shallowRef(null)
  const errorMessage = shallowRef('')
  const language = shallowRef('Fr')
  let downloadedApkPath = ''
  let appStateListener
  let initialCheckTimer
  let checkInProgress = false

  const isMandatory = computed(() => Boolean(nativeUpdate.value?.mandatory))
  const isUpdateBusy = computed(() => BUSY_PHASES.includes(updatePhase.value))

  function refreshLanguage() {
    language.value = localStorage.getItem('langue') === 'En' ? 'En' : 'Fr'
  }

  function localizedError(frenchMessage, englishMessage) {
    return language.value === 'En' ? englishMessage : frenchMessage
  }

  async function shouldShowUpdate(update) {
    if (update.mandatory) return true

    const { value } = await Preferences.get({ key: REMIND_AFTER_KEY })
    return !value || Number(value) <= Date.now()
  }

  async function checkForUpdates() {
    if (!Capacitor.isNativePlatform() || checkInProgress || isUpdateBusy.value) return

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
    if (isMandatory.value || isUpdateBusy.value) return

    await Preferences.set({
      key: REMIND_AFTER_KEY,
      value: String(Date.now() + ONE_DAY),
    })
    isDialogOpen.value = false
  }

  async function startInstaller() {
    if (!downloadedApkPath || !nativeUpdate.value?.sha256) return

    updatePhase.value = 'preparing'
    errorMessage.value = ''

    try {
      const result = await installNativeApk(downloadedApkPath, nativeUpdate.value.sha256)
      if (result.permissionRequired) {
        updatePhase.value = 'permission'
        return
      }

      updatePhase.value = 'installing'
    } catch (error) {
      errorMessage.value =
        error?.message ||
        localizedError(
          "Impossible de préparer l'installation. Veuillez réessayer.",
          'Unable to prepare the installation. Please try again.',
        )
      updatePhase.value = 'ready'
      console.error("[Updater] Préparation de l'installation impossible :", error)
    }
  }

  async function downloadNativeUpdate() {
    if (!nativeUpdate.value?.apkUrl || isUpdateBusy.value) return

    errorMessage.value = ''
    isDialogOpen.value = true

    if (downloadedApkPath) {
      await startInstaller()
      return
    }

    updatePhase.value = 'downloading'
    downloadProgress.value = 0

    try {
      downloadedApkPath = await downloadNativeApk(nativeUpdate.value, (progress) => {
        downloadProgress.value = progress
      })
      downloadProgress.value = 1
      await startInstaller()
    } catch (error) {
      downloadedApkPath = ''
      updatePhase.value = 'idle'
      downloadProgress.value = null
      errorMessage.value = localizedError(
        "Le téléchargement de l'APK a échoué. Vérifiez la connexion puis réessayez.",
        'The APK download failed. Check the connection and try again.',
      )
      console.error('[Updater] Téléchargement intégré de l’APK impossible :', error)
    }
  }

  async function handleAppActive() {
    if (updatePhase.value === 'permission' && downloadedApkPath) {
      const { granted } = await canInstallNativeApk()
      if (granted) {
        await startInstaller()
      } else {
        updatePhase.value = 'ready'
        errorMessage.value = localizedError(
          "L'autorisation d'installer les mises à jour est nécessaire.",
          'Permission to install updates is required.',
        )
      }
      return
    }

    if (updatePhase.value === 'installing') {
      updatePhase.value = 'ready'
      errorMessage.value = localizedError(
        "L'installation n'a pas été terminée. Appuyez sur Installer pour réessayer.",
        'The installation was not completed. Tap Install to try again.',
      )
      return
    }

    await checkForUpdates()
  }

  onMounted(async () => {
    if (!Capacitor.isNativePlatform()) return

    initialCheckTimer = window.setTimeout(() => checkForUpdates(), 1500)
    appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void handleAppActive()
    })
  })

  onBeforeUnmount(() => {
    if (initialCheckTimer) window.clearTimeout(initialCheckTimer)
    void appStateListener?.remove()
  })

  return {
    nativeUpdate,
    isDialogOpen,
    updatePhase,
    downloadProgress,
    isUpdateBusy,
    isMandatory,
    errorMessage,
    language,
    remindLater,
    downloadNativeUpdate,
  }
}
