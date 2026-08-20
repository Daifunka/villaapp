import type { Announcement, DynamicPage, Faq, MenuItem, VideoContent } from '@/types'

const API_BASE = 'https://testoikos.lavillastjean.com/api/public/api'
const MEDIA_BASE = 'https://testoikos.lavillastjean.com/api/public/'
const inflight = new Map<string, Promise<unknown>>()
const cache = new Map<string, { expires: number; value: unknown }>()

interface RequestOptions extends RequestInit { cacheMs?: number }

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const key = `${method}:${path}`
  const cached = cache.get(key)
  if (method === 'GET' && cached && cached.expires > Date.now()) return cached.value as T
  if (inflight.has(key)) return inflight.get(key) as Promise<T>

  const isFormData = options.body instanceof FormData
  const pending = fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
  }).then(async (response) => {
    if (!response.ok) throw new Error(`API ${response.status}: ${path}`)
    const value = await response.json() as T
    if (method === 'GET') cache.set(key, { expires: Date.now() + (options.cacheMs ?? 120_000), value })
    return value
  }).finally(() => inflight.delete(key))

  inflight.set(key, pending)
  return pending
}

function appendFormValue(form: FormData, key: string, value: unknown) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendFormValue(form, `${key}[${index}]`, item))
    return
  }
  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => appendFormValue(form, `${key}[${childKey}]`, childValue))
    return
  }
  form.append(key, value == null ? '' : String(value))
}

function toFormData(payload: Record<string, unknown>) {
  const form = new FormData()
  Object.entries(payload).forEach(([key, value]) => appendFormValue(form, key, value))
  return form
}

export const mediaUrl = (path?: string) => {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  return `${MEDIA_BASE}${path.replace(/^\//, '')}`
}

export const api = {
  async getMenus(): Promise<MenuItem[]> {
    const result = await request<{ success?: MenuItem[]; menus?: MenuItem[] }>('/menus', { cacheMs: 300_000 })
    return result.success ?? result.menus ?? []
  },
  async getPages(): Promise<DynamicPage[]> {
    const result = await request<{ pages?: DynamicPage[] }>('/pages', { cacheMs: 300_000 })
    return result.pages ?? []
  },
  async getFaqs(): Promise<Faq[]> {
    const result = await request<{ faqs?: Faq[] }>('/faqs', { cacheMs: 300_000 })
    return result.faqs ?? []
  },
  async getAnnouncement(): Promise<Announcement | null> {
    const result = await request<{ annonces?: Announcement }>('/annonces', { cacheMs: 180_000 })
    return result.annonces ?? null
  },
  async getVideo(pageId: string | number, language: string): Promise<VideoContent | null> {
    const result = await request<{ video?: VideoContent }>(`/videos-chambres/${pageId}/${language}`, { cacheMs: 300_000 })
    return result.video ?? null
  },
  submitOrder(payload: Record<string, unknown>) {
    return request('/commande/ajouter', { method: 'POST', body: toFormData(payload) })
  },
}
