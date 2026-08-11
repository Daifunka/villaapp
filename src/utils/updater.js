import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { CapacitorUpdater } from '@capgo/capacitor-updater'

export const UPDATE_MANIFEST_URL = 'https://dashbaord.lavillastjean.com/updates/version.json'

const ATTEMPTED_WEB_VERSION_KEY = 'update.attemptedWebVersion'
const FAILED_WEB_VERSION_KEY = 'update.failedWebVersion'
const LEGACY_ATTEMPTED_VERSION_KEY = 'attemptedVersion'
const LEGACY_FAILED_VERSION_KEY = 'lastFailedVersion'

function parseVersion(version) {
  const normalized = String(version ?? '')
    .trim()
    .replace(/^v/i, '')
  const [core = '0.0.0', prerelease = ''] = normalized.split('-', 2)

  return {
    core: core.split('.').map((part) => Number.parseInt(part, 10) || 0),
    prerelease,
  }
}

export function compareVersions(leftVersion, rightVersion) {
  const left = parseVersion(leftVersion)
  const right = parseVersion(rightVersion)
  const length = Math.max(left.core.length, right.core.length)

  for (let index = 0; index < length; index += 1) {
    const leftPart = left.core[index] ?? 0
    const rightPart = right.core[index] ?? 0

    if (leftPart !== rightPart) return leftPart > rightPart ? 1 : -1
  }

  if (left.prerelease === right.prerelease) return 0
  if (!left.prerelease) return 1
  if (!right.prerelease) return -1
  return left.prerelease.localeCompare(right.prerelease, undefined, { numeric: true })
}

function normalizeManifest(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Le manifeste de mise à jour est invalide.')
  }

  const webPayload = payload.web ?? payload
  const web = {
    version: String(webPayload.version ?? payload.version ?? '').trim(),
    url: String(webPayload.url ?? payload.url ?? '').trim(),
    checksum: String(webPayload.checksum ?? payload.checksum ?? '').trim(),
    minNativeBuild: Number(webPayload.minNativeBuild ?? payload.minNativeBuild ?? 0),
  }

  if (!web.version || !web.url) {
    throw new Error('Le manifeste ne contient pas de bundle web valide.')
  }

  const androidPayload = payload.android
  const android = androidPayload
    ? {
        versionCode: Number(androidPayload.versionCode ?? 0),
        versionName: String(androidPayload.versionName ?? '').trim(),
        apkUrl: String(androidPayload.apkUrl ?? '').trim(),
        sha256: String(androidPayload.sha256 ?? '').trim(),
        mandatory: Boolean(androidPayload.mandatory),
        releaseNotes: androidPayload.releaseNotes ?? {},
      }
    : null

  return {
    schemaVersion: Number(payload.schemaVersion ?? 1),
    web,
    android,
  }
}

async function fetchUpdateManifest() {
  const response = await fetch(UPDATE_MANIFEST_URL, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Le serveur de mise à jour a répondu ${response.status}.`)
  }

  return normalizeManifest(await response.json())
}

async function getCurrentWebVersion() {
  const current = await CapacitorUpdater.current()
  const bundleVersion = current.bundle?.version

  if (bundleVersion && bundleVersion !== 'builtin') return bundleVersion
  return current.native || '0.0.0'
}

async function reconcilePreviousWebUpdate(currentVersion) {
  const [{ value: attemptedVersion }, { value: legacyAttemptedVersion }] = await Promise.all([
    Preferences.get({ key: ATTEMPTED_WEB_VERSION_KEY }),
    Preferences.get({ key: LEGACY_ATTEMPTED_VERSION_KEY }),
  ])
  const attempted = attemptedVersion || legacyAttemptedVersion

  if (!attempted) return

  if (attempted === currentVersion) {
    await Promise.all([
      Preferences.remove({ key: ATTEMPTED_WEB_VERSION_KEY }),
      Preferences.remove({ key: FAILED_WEB_VERSION_KEY }),
      Preferences.remove({ key: LEGACY_ATTEMPTED_VERSION_KEY }),
      Preferences.remove({ key: LEGACY_FAILED_VERSION_KEY }),
    ])
    return
  }

  console.warn(`[Updater] Rollback détecté pour le bundle ${attempted}.`)
  await Promise.all([
    Preferences.set({ key: FAILED_WEB_VERSION_KEY, value: attempted }),
    Preferences.set({ key: LEGACY_FAILED_VERSION_KEY, value: attempted }),
    Preferences.remove({ key: ATTEMPTED_WEB_VERSION_KEY }),
    Preferences.remove({ key: LEGACY_ATTEMPTED_VERSION_KEY }),
  ])
}

async function applyWebUpdate(webUpdate, currentWebVersion, currentNativeBuild) {
  if (webUpdate.minNativeBuild > currentNativeBuild) {
    console.info(
      `[Updater] Bundle ${webUpdate.version} réservé au build natif ${webUpdate.minNativeBuild} ou supérieur.`,
    )
    return false
  }

  if (compareVersions(webUpdate.version, currentWebVersion) <= 0) return false

  const [{ value: failedVersion }, { value: legacyFailedVersion }] = await Promise.all([
    Preferences.get({ key: FAILED_WEB_VERSION_KEY }),
    Preferences.get({ key: LEGACY_FAILED_VERSION_KEY }),
  ])

  if (webUpdate.version === (failedVersion || legacyFailedVersion)) {
    console.warn(`[Updater] Le bundle ${webUpdate.version} a déjà échoué. Mise à jour ignorée.`)
    return false
  }

  await Preferences.set({ key: ATTEMPTED_WEB_VERSION_KEY, value: webUpdate.version })

  try {
    const bundle = await CapacitorUpdater.download({
      url: webUpdate.url,
      version: webUpdate.version,
      ...(webUpdate.checksum ? { checksum: webUpdate.checksum } : {}),
    })

    await CapacitorUpdater.set({ id: bundle.id })
    return true
  } catch (error) {
    await Preferences.remove({ key: ATTEMPTED_WEB_VERSION_KEY })
    throw error
  }
}

export async function notifyAppReady() {
  if (!Capacitor.isNativePlatform()) return

  try {
    await CapacitorUpdater.notifyAppReady()
  } catch (error) {
    console.error('[Updater] Impossible de confirmer le chargement du bundle :', error)
  }
}

export async function checkSelfHostedUpdates() {
  if (!Capacitor.isNativePlatform()) {
    return { nativeUpdate: null, manifest: null }
  }

  try {
    const [manifest, appInfo, currentWebVersion] = await Promise.all([
      fetchUpdateManifest(),
      App.getInfo(),
      getCurrentWebVersion(),
    ])
    const currentNativeBuild = Number.parseInt(appInfo.build, 10) || 0

    await reconcilePreviousWebUpdate(currentWebVersion)

    const nativeUpdate =
      manifest.android?.apkUrl && manifest.android.versionCode > currentNativeBuild
        ? {
            ...manifest.android,
            currentVersionCode: currentNativeBuild,
            currentVersionName: appInfo.version,
          }
        : null

    await applyWebUpdate(manifest.web, currentWebVersion, currentNativeBuild)

    return { nativeUpdate, manifest }
  } catch (error) {
    console.warn('[Updater] Vérification impossible, l’application continue normalement :', error)
    return { nativeUpdate: null, manifest: null, error }
  }
}
