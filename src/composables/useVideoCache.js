import { Capacitor } from '@capacitor/core'
import { FileTransfer } from '@capacitor/file-transfer'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import { readonly, shallowRef } from 'vue'

const CACHE_DIRECTORY = 'video-cache'
const MANIFEST_KEY = 'video-cache-manifest-v1'
const MAX_CACHED_VIDEOS = 3
const pendingDownloads = new Map()

function hashUrl(value) {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index)
  }
  return (hash >>> 0).toString(36)
}

function getExtension(url) {
  try {
    const extension = new URL(url).pathname.match(/\.(mp4|m4v|webm|mov)$/i)?.[1]
    return extension?.toLowerCase() ?? 'mp4'
  } catch {
    return 'mp4'
  }
}

async function readManifest() {
  const { value } = await Preferences.get({ key: MANIFEST_KEY })
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeManifest(entries) {
  await Preferences.set({ key: MANIFEST_KEY, value: JSON.stringify(entries) })
}

async function localVideoUrl(entry) {
  await Filesystem.stat({ path: entry.path, directory: Directory.Cache })
  const { uri } = await Filesystem.getUri({ path: entry.path, directory: Directory.Cache })
  return Capacitor.convertFileSrc(uri)
}

async function evictOldVideos(entries) {
  const sorted = [...entries].sort((left, right) => right.lastAccessedAt - left.lastAccessedAt)
  const retained = sorted.slice(0, MAX_CACHED_VIDEOS)
  const expired = sorted.slice(MAX_CACHED_VIDEOS)

  await Promise.allSettled(
    expired.map((entry) =>
      Filesystem.deleteFile({ path: entry.path, directory: Directory.Cache }),
    ),
  )

  await writeManifest(retained)
}

async function downloadVideo(url) {
  if (!Capacitor.isNativePlatform() || pendingDownloads.has(url)) return

  const download = (async () => {
    const path = `${CACHE_DIRECTORY}/${hashUrl(url)}.${getExtension(url)}`
    await Filesystem.mkdir({ path: CACHE_DIRECTORY, directory: Directory.Cache, recursive: true })
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache })

    await FileTransfer.downloadFile({
      url,
      path: uri,
      connectTimeout: 30_000,
      readTimeout: 120_000,
    })

    const manifest = (await readManifest()).filter((entry) => entry.url !== url)
    manifest.push({ url, path, lastAccessedAt: Date.now() })
    await evictOldVideos(manifest)
  })()

  pendingDownloads.set(url, download)
  try {
    await download
  } finally {
    pendingDownloads.delete(url)
  }
}

export function useVideoCache() {
  const sourceUrl = shallowRef('')
  const isCached = shallowRef(false)

  async function resolve(url) {
    sourceUrl.value = url
    isCached.value = false
    if (!url || !Capacitor.isNativePlatform()) return

    const manifest = await readManifest()
    const entry = manifest.find((item) => item.url === url)

    if (entry) {
      try {
        sourceUrl.value = await localVideoUrl(entry)
        isCached.value = true
        entry.lastAccessedAt = Date.now()
        await writeManifest(manifest)
        return
      } catch {
        await writeManifest(manifest.filter((item) => item.url !== url))
      }
    }

    window.setTimeout(() => {
      void downloadVideo(url).catch(() => undefined)
    }, 1_200)
  }

  return {
    sourceUrl: readonly(sourceUrl),
    isCached: readonly(isCached),
    resolve,
  }
}
