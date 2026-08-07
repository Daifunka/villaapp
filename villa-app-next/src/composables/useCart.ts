import { computed, readonly, shallowRef } from 'vue'
import { api } from '@/services/api'
import type { CartItem, MenuItem, RoomSettings, SessionOrder } from '@/types'

const CART_KEY = 'villa-next-cart'
const ORDER_KEY = 'villa-next-orders'

function parseStorage<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? '') as T }
  catch { return fallback }
}

const items = shallowRef<CartItem[]>(parseStorage(CART_KEY, []))
const orders = shallowRef<SessionOrder[]>(parseStorage(ORDER_KEY, []))
const submitting = shallowRef(false)
const total = computed(() => items.value.reduce((sum, item) => sum + Number(item.prix) * item.quantite, 0))
const count = computed(() => items.value.reduce((sum, item) => sum + item.quantite, 0))

function persist() { localStorage.setItem(CART_KEY, JSON.stringify(items.value)) }
function add(product: MenuItem) {
  const existing = items.value.find((item) => String(item.id) === String(product.id))
  items.value = existing
    ? items.value.map((item) => item === existing ? { ...item, quantite: item.quantite + 1 } : item)
    : [...items.value, { ...product, quantite: 1 }]
  persist()
}
function setQuantity(id: CartItem['id'], quantity: number) {
  items.value = quantity <= 0 ? items.value.filter((item) => item.id !== id) : items.value.map((item) => item.id === id ? { ...item, quantite: quantity } : item)
  persist()
}
function clear() { items.value = []; persist() }

async function submit(settings: RoomSettings) {
  if (!items.value.length || !settings.chambre) throw new Error('ROOM_REQUIRED')
  submitting.value = true
  const groups = ['Restaurant', 'Bar'].map((source) => items.value.filter((item) => item.source === source)).filter(Boolean)
  try {
    await Promise.all(groups.filter((group) => group.length).map((group) => api.submitOrder({
      statut: 'en attente de paiement', statutPreparation: 'En attente', provenance: 'application-next',
      source: group[0].source, nomChambre: settings.chambre, articles: group,
    })))
    const order: SessionOrder = { id: crypto.randomUUID(), date: new Date().toISOString(), items: items.value, total: total.value, status: 'Enregistrée' }
    orders.value = [order, ...orders.value]
    localStorage.setItem(ORDER_KEY, JSON.stringify(orders.value))
    clear()
  } finally { submitting.value = false }
}

export function useCart() {
  return { items: readonly(items), orders: readonly(orders), total, count, submitting: readonly(submitting), add, setQuantity, clear, submit }
}
