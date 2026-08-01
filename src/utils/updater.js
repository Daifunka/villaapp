import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import { App } from '@capacitor/app'
import { Preferences } from '@capacitor/preferences'

// Register background resume listener on native platforms
if (Capacitor.isNativePlatform()) {
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      console.log('[Updater] App returned to foreground. Checking for updates...')
      checkSelfHostedUpdates()
    }
  })
}

/**
 * Declares the application as successfully loaded to Capgo.
 * This commits the downloaded bundle and prevents automatic rollback to built-in.
 */
export async function notifyAppReady() {
  if (Capacitor.isNativePlatform()) {
    try {
      await CapacitorUpdater.notifyAppReady()
      console.log('[Updater] App successfully loaded and declared ready to CapacitorUpdater.')
    } catch (error) {
      console.error('[Updater] Failed to declare app ready:', error)
    }
  }
}

/**
 * Checks, downloads and applies updates from the hotel's self-hosted server dashboard.
 * Implements a rollback-safeguard using Preferences to avoid infinite reload loops when ZIP files are invalid.
 */
export async function checkSelfHostedUpdates() {
  // Only execute on native platforms (iOS/Android) to prevent errors in browser debug mode
  if (!Capacitor.isNativePlatform()) {
    console.log('[Updater] Skipping update check: Not running on a native platform.')
    return
  }

  try {
    // 1. Get currently active version on the app
    const currentInfo = await CapacitorUpdater.current()
    
    // Support multiple Capgo version schemas (direct id, bundle.id, or version field)
    let currentVersion = currentInfo.native || '1.0'
    if (currentInfo.id && currentInfo.id !== 'builtin') {
      currentVersion = currentInfo.id
    } else if (currentInfo.bundle && currentInfo.bundle.id && currentInfo.bundle.id !== 'builtin') {
      currentVersion = currentInfo.bundle.id
    } else if (currentInfo.version && currentInfo.version !== 'builtin') {
      currentVersion = currentInfo.version
    }

    // 2. Check if the previous attempt failed and triggered a plugin rollback
    const { value: attemptedVersion } = await Preferences.get({ key: 'attemptedVersion' })
    if (attemptedVersion && attemptedVersion !== currentVersion) {
      console.warn(`[Updater] Detected rollback! Update to ${attemptedVersion} failed to boot. Marking version as failed.`)
      await Preferences.set({ key: 'lastFailedVersion', value: attemptedVersion })
      await Preferences.remove({ key: 'attemptedVersion' })
    } else if (attemptedVersion && attemptedVersion === currentVersion) {
      // Success! Clean up tracking variables
      await Preferences.remove({ key: 'attemptedVersion' })
      await Preferences.remove({ key: 'lastFailedVersion' })
    }

    const { value: lastFailedVersion } = await Preferences.get({ key: 'lastFailedVersion' })

    console.log('[Updater] Starting update check...')
    // 3. Fetch version info from public dashboard endpoint
    const response = await fetch('https://dashbaord.lavillastjean.com/updates/version.json', {
      cache: 'no-store',
    })

    if (!response.ok) {
      console.warn('[Updater] Failed to retrieve updates config from server:', response.statusText)
      return
    }

    const serverUpdate = await response.json()
    if (!serverUpdate || !serverUpdate.version || !serverUpdate.url) {
      console.warn('[Updater] Invalid update format returned by server.')
      return
    }

    // 4. Prevent loop if the server version has already failed and rolled back
    if (serverUpdate.version === lastFailedVersion) {
      console.warn(`[Updater] Server version ${serverUpdate.version} previously failed and rolled back. Skipping to prevent infinite reload loop.`)
      return
    }

    console.log(
      `[Updater] Current version: ${currentVersion}, Server version: ${serverUpdate.version}`,
    )

    // If version is different, trigger update
    if (serverUpdate.version !== currentVersion) {
      console.log(
        `[Updater] New version detected! Downloading update zip from ${serverUpdate.url}...`,
      )

      // Store the version we are attempting to download
      await Preferences.set({ key: 'attemptedVersion', value: serverUpdate.version })

      // 5. Download the zipped assets
      const downloadResult = await CapacitorUpdater.download({
        url: serverUpdate.url,
        version: serverUpdate.version,
      })

      console.log('[Updater] Download complete. Setting active version...')

      // 6. Set the new version active and reload webview immediately to apply
      await CapacitorUpdater.set(downloadResult)
      console.log(
        `[Updater] Active version successfully set to ${serverUpdate.version}. Reloading app...`,
      )
      await CapacitorUpdater.reload()
    } else {
      console.log('[Updater] App is already up to date.')
    }
  } catch (error) {
    console.error('[Updater] Error checking/performing self-hosted updates:', error)
  }
}
