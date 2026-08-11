import { Capacitor } from '@capacitor/core'
import { FileTransfer } from '@capacitor/file-transfer'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import { readonly, shallowRef } from 'vue'

const CACHE_DIRECTORY = 'video-cache'
const MANIFEST_KEY = 'video-cache-manifest-v2'
const LEGACY_MANIFEST_KEY = 'video-cache-manifest-v1'
const MAX_CACHED_VIDEOS = 12
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

function getCacheKey(url, version = '') {
  return `${url}::${version || ''}`
}

function getEntryCacheKey(entry) {
  return entry.cacheKey ?? getCacheKey(entry.url, entry.version)
}

async function deleteVideoFile(entry) {
  await Filesystem.deleteFile({
    path: entry.path,
    directory: entry.directory ?? Directory.Cache,
  })
}

async function readManifest() {
  const { value } = await Preferences.get({ key: MANIFEST_KEY })
  if (!value) {
    const { value: legacyValue } = await Preferences.get({ key: LEGACY_MANIFEST_KEY })
    if (!legacyValue) return []

    try {
      const legacyEntries = JSON.parse(legacyValue)
      return Array.isArray(legacyEntries)
        ? legacyEntries.map((entry) => ({ ...entry, directory: Directory.Cache }))
        : []
    } catch {
      return []
    }
  }

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
  const directory = entry.directory ?? Directory.Cache
  await Filesystem.stat({ path: entry.path, directory })
  const { uri } = await Filesystem.getUri({ path: entry.path, directory })
  return Capacitor.convertFileSrc(uri)
}

async function evictOldVideos(entries) {
  const sorted = [...entries].sort((left, right) => right.lastAccessedAt - left.lastAccessedAt)
  const retained = sorted.slice(0, MAX_CACHED_VIDEOS)
  const expired = sorted.slice(MAX_CACHED_VIDEOS)

  await Promise.allSettled(
    expired.map((entry) => deleteVideoFile(entry)),
  )

  await writeManifest(retained)
}

async function downloadVideo(url, version) {
  const cacheKey = getCacheKey(url, version)
  if (!Capacitor.isNativePlatform()) return

  const pendingDownload = pendingDownloads.get(cacheKey)
  if (pendingDownload) return pendingDownload

  const download = (async () => {
    const path = `${CACHE_DIRECTORY}/${hashUrl(cacheKey)}.${getExtension(url)}`
    await Filesystem.mkdir({ path: CACHE_DIRECTORY, directory: Directory.Data, recursive: true })
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Data })

    await FileTransfer.downloadFile({
      url,
      path: uri,
      connectTimeout: 30_000,
      readTimeout: 120_000,
    })

    const currentManifest = await readManifest()
    const obsoleteEntries = currentManifest.filter(
      (entry) => entry.url === url && getEntryCacheKey(entry) !== cacheKey,
    )
    await Promise.allSettled(obsoleteEntries.map((entry) => deleteVideoFile(entry)))

    const manifest = currentManifest.filter(
      (entry) => entry.url !== url && getEntryCacheKey(entry) !== cacheKey,
    )
    manifest.push({
      url,
      version: version || '',
      cacheKey,
      path,
      directory: Directory.Data,
      lastAccessedAt: Date.now(),
    })
    await evictOldVideos(manifest)
  })()

  pendingDownloads.set(cacheKey, download)
  try {
    await download
  } finally {
    pendingDownloads.delete(cacheKey)
  }
}

export function useVideoCache() {
  const sourceUrl = shallowRef('')
  const isCached = shallowRef(false)
  let resolutionId = 0
  let activeCacheKey = ''

  async function resolve(url, version = '') {
    const currentResolutionId = ++resolutionId
    const cacheKey = getCacheKey(url, version)
    activeCacheKey = cacheKey
    sourceUrl.value = ''
    isCached.value = false
    if (!url) return
    if (!Capacitor.isNativePlatform()) {
      sourceUrl.value = url
      return
    }

    const manifest = await readManifest()
    const entry = manifest.find((item) => getEntryCacheKey(item) === cacheKey)

    if (entry) {
      try {
        const cachedUrl = await localVideoUrl(entry)
        if (currentResolutionId !== resolutionId) return
        sourceUrl.value = cachedUrl
        isCached.value = true
        entry.lastAccessedAt = Date.now()
        await writeManifest(manifest)
        return
      } catch {
        await writeManifest(manifest.filter((item) => getEntryCacheKey(item) !== cacheKey))
      }
    }

    if (currentResolutionId !== resolutionId) return
    sourceUrl.value = url
  }

  async function cache(url, version = '') {
    if (!url || isCached.value) return

    const cacheKey = getCacheKey(url, version)
    await downloadVideo(url, version)
    if (activeCacheKey === cacheKey) isCached.value = true
  }

  return {
    sourceUrl: readonly(sourceUrl),
    isCached: readonly(isCached),
    cache,
    resolve,
  }
}
