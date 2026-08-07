import { computed, readonly, shallowRef } from 'vue'
import { api } from '@/services/api'
import type { Announcement, AppTab, DynamicPage, Faq, Language, MenuItem, SectionName, VideoContent } from '@/types'

const menus = shallowRef<MenuItem[]>([])
const pages = shallowRef<DynamicPage[]>([])
const faqs = shallowRef<Faq[]>([])
const announcement = shallowRef<Announcement | null>(null)
const video = shallowRef<VideoContent | null>(null)
const loading = shallowRef(false)
const videoLoading = shallowRef(false)
const error = shallowRef('')
let initialLoad: Promise<void> | null = null

const fallbackPages: DynamicPage[] = [
  { id: 1, titre: 'Accueil' }, { id: 2, titre: 'Nos chambres' },
  { id: 3, titre: 'Services' }, { id: 4, titre: 'FAQs' },
]

function normalizeName(title: string): SectionName {
  const value = title.toLowerCase()
  if (value.includes('chambre')) return 'Chambres'
  if (value.includes('service')) return 'Services'
  if (value.includes('faq')) return 'FAQs'
  return 'Accueil'
}

const tabs = computed<AppTab[]>(() => [
  ...(pages.value.length ? pages.value : fallbackPages).map((page) => ({
    id: page.id, name: normalizeName(page.titre), label: page.titre.replace(/-/g, ' '),
  })),
  { id: null, name: 'Menu', label: 'Au menu' },
  { id: null, name: 'Wifi', label: 'Wi-Fi' },
])

async function loadInitial() {
  if (initialLoad) return initialLoad
  loading.value = true
  error.value = ''
  initialLoad = Promise.allSettled([api.getMenus(), api.getPages(), api.getFaqs(), api.getAnnouncement()])
    .then((results) => {
      if (results[0].status === 'fulfilled') menus.value = results[0].value
      if (results[1].status === 'fulfilled') pages.value = results[1].value
      if (results[2].status === 'fulfilled') faqs.value = results[2].value
      if (results[3].status === 'fulfilled') announcement.value = results[3].value
      if (results.every((result) => result.status === 'rejected')) error.value = 'Connexion indisponible'
    })
    .finally(() => { loading.value = false })
  return initialLoad
}

async function loadVideo(section: SectionName, language: Language) {
  if (['Menu', 'Wifi', 'Cart', 'Commandes'].includes(section)) return
  const page = tabs.value.find((tab) => tab.name === section)
  videoLoading.value = true
  try { video.value = await api.getVideo(page?.id ?? section, language) }
  catch { video.value = null }
  finally { videoLoading.value = false }
}

export function useAppData() {
  return {
    menus: readonly(menus), pages: readonly(pages), faqs: readonly(faqs),
    announcement: readonly(announcement), video: readonly(video), tabs,
    loading: readonly(loading), videoLoading: readonly(videoLoading), error: readonly(error),
    loadInitial, loadVideo,
  }
}
