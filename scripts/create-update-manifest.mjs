import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

function parseArguments(argv) {
  const result = {}

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (!argument.startsWith('--')) continue

    const [key, inlineValue] = argument.slice(2).split('=', 2)
    const value = inlineValue ?? argv[index + 1]
    result[key] = value
    if (inlineValue === undefined) index += 1
  }

  return result
}

function required(args, name) {
  const value = args[name]?.trim()
  if (!value) throw new Error(`Argument obligatoire manquant : --${name}`)
  return value
}

function assertVersion(value, name) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value)) {
    throw new Error(`${name} doit respecter le format 1.2.3.`)
  }
}

function assertHttps(value, name) {
  if (!/^https:\/\//i.test(value)) throw new Error(`${name} doit être une URL HTTPS.`)
}

function assertChecksum(value, name) {
  if (!/^[a-f\d]{64}$/i.test(value)) {
    throw new Error(`${name} doit être une empreinte SHA-256 de 64 caractères.`)
  }
}

function compareVersions(left, right) {
  const leftParts = left.split('-')[0].split('.').map(Number)
  const rightParts = right.split('-')[0].split('.').map(Number)

  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0)
    if (difference !== 0) return difference
  }

  return left.localeCompare(right)
}

function joinUrl(baseUrl, folder, filename) {
  return `${baseUrl.replace(/\/$/, '')}/${folder}/${encodeURIComponent(filename)}`
}

async function loadCurrentManifest(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return {}
    throw error
  }
}

const args = parseArguments(process.argv.slice(2))
const kind = required(args, 'kind')
const baseUrl = required(args, 'base-url')
const currentPath = resolve(required(args, 'current'))
const outputPath = resolve(required(args, 'output'))
const webVersion = required(args, 'web-version')
const webFile = required(args, 'web-file')
const webChecksum = required(args, 'web-checksum').toLowerCase()
const minNativeBuild = Number.parseInt(required(args, 'min-native-build'), 10)

if (!['web', 'android'].includes(kind)) throw new Error('--kind doit valoir web ou android.')
assertHttps(baseUrl, '--base-url')
assertVersion(webVersion, '--web-version')
assertChecksum(webChecksum, '--web-checksum')
if (!Number.isInteger(minNativeBuild) || minNativeBuild < 1) {
  throw new Error('--min-native-build doit être un entier positif.')
}

const current = await loadCurrentManifest(currentPath)
const currentWebVersion = current.web?.version ?? current.version
if (currentWebVersion && compareVersions(webVersion, currentWebVersion) <= 0) {
  throw new Error(
    `La version web doit être supérieure à la version publiée (${currentWebVersion}).`,
  )
}

const manifest = {
  ...current,
  schemaVersion: 2,
  web: {
    version: webVersion,
    url: joinUrl(baseUrl, 'bundles', webFile),
    checksum: webChecksum,
    minNativeBuild,
  },
}

if (kind === 'android') {
  const androidVersion = required(args, 'android-version')
  const androidVersionCode = Number.parseInt(required(args, 'android-version-code'), 10)
  const apkFile = required(args, 'apk-file')
  const apkChecksum = required(args, 'apk-checksum').toLowerCase()

  assertVersion(androidVersion, '--android-version')
  assertChecksum(apkChecksum, '--apk-checksum')
  if (!Number.isInteger(androidVersionCode) || androidVersionCode < 1) {
    throw new Error('--android-version-code doit être un entier positif.')
  }
  if (current.android?.versionCode && androidVersionCode <= Number(current.android.versionCode)) {
    throw new Error(
      `Le versionCode Android doit être supérieur au code publié (${current.android.versionCode}).`,
    )
  }

  manifest.android = {
    versionCode: androidVersionCode,
    versionName: androidVersion,
    apkUrl: joinUrl(baseUrl, 'apk', apkFile),
    sha256: apkChecksum,
    mandatory: args.mandatory === 'true',
    releaseNotes: {
      fr: args['notes-fr']?.trim() || `Mise à jour ${androidVersion}`,
      en: args['notes-en']?.trim() || `Update ${androidVersion}`,
    },
  }
}

// Preserve the legacy fields while older APKs still read the first manifest format.
manifest.version = manifest.web.version
manifest.url = manifest.web.url
manifest.checksum = manifest.web.checksum

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`Manifeste ${kind} écrit dans ${outputPath}`)
