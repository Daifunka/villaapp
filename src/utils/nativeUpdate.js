import { Directory, Filesystem } from '@capacitor/filesystem'
import { FileTransfer } from '@capacitor/file-transfer'
import { ApkInstaller } from '@/plugins/apkInstaller'

const UPDATE_DIRECTORY = 'app-updates'

function validateUpdate(update) {
  if (!update || !/^https:\/\//i.test(update.apkUrl ?? '')) {
    throw new Error('Lien APK invalide.')
  }
  if (!/^[a-f0-9]{64}$/i.test(update.sha256 ?? '')) {
    throw new Error('Empreinte SHA-256 invalide.')
  }
}

function getApkPath(update) {
  const safeVersion = String(update.versionName ?? update.versionCode ?? 'update').replace(
    /[^a-z0-9._-]/gi,
    '-',
  )
  return `${UPDATE_DIRECTORY}/villaapp-${safeVersion}.apk`
}

async function ensureUpdateDirectory() {
  try {
    await Filesystem.mkdir({
      path: UPDATE_DIRECTORY,
      directory: Directory.Cache,
      recursive: true,
    })
  } catch {
    // Le dossier peut déjà exister après une tentative précédente.
  }
}

async function removePreviousDownload(path) {
  try {
    await Filesystem.deleteFile({ path, directory: Directory.Cache })
  } catch {
    // L'absence d'un ancien téléchargement est le cas normal.
  }
}

export async function downloadNativeApk(update, onProgress) {
  validateUpdate(update)

  const path = getApkPath(update)
  await ensureUpdateDirectory()
  await removePreviousDownload(path)

  const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache })
  const progressListener = await FileTransfer.addListener('progress', (event) => {
    if (event.type !== 'download' || event.url !== update.apkUrl) return

    const progress =
      event.lengthComputable && event.contentLength > 0
        ? Math.min(1, event.bytes / event.contentLength)
        : null
    onProgress?.(progress, event.bytes, event.contentLength)
  })

  try {
    await FileTransfer.downloadFile({
      url: update.apkUrl,
      path: uri,
      progress: true,
      connectTimeout: 30_000,
      readTimeout: 120_000,
    })
  } catch (error) {
    await removePreviousDownload(path)
    throw error
  } finally {
    await progressListener.remove()
  }

  onProgress?.(1)
  return uri
}

export async function installNativeApk(path, sha256) {
  return ApkInstaller.install({ path, sha256 })
}

export async function canInstallNativeApk() {
  return ApkInstaller.canInstall()
}
