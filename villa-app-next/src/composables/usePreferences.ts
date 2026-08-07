import { computed, reactive, readonly, shallowRef } from 'vue'
import type { Language, RoomSettings } from '@/types'

const settings = reactive<RoomSettings>({ chambre: localStorage.getItem('chambre') ?? '', bloc: localStorage.getItem('bloc') ?? '' })
const language = shallowRef<Language>((localStorage.getItem('langue') as Language) || 'Fr')
const guestName = shallowRef(localStorage.getItem('lastKnownClientName') ?? '')
const hasRoom = computed(() => Boolean(settings.chambre))

function saveRoom(room: string) {
  settings.chambre = room
  settings.bloc = /edmond|limata|vintage|imprimerie/i.test(room) ? 'ancien' : 'nouveau'
  localStorage.setItem('chambre', settings.chambre)
  localStorage.setItem('bloc', settings.bloc)
}
function setLanguage(value: Language) { language.value = value; localStorage.setItem('langue', value) }

export function usePreferences() {
  return { settings: readonly(settings), language: readonly(language), guestName: readonly(guestName), hasRoom, saveRoom, setLanguage }
}
