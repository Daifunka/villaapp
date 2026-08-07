import type { Language } from '@/types'

const messages = {
  Fr: { hello: 'Bonjour, bienvenue à', welcome: 'Bienvenue à La Villa Saint-Jean, bienvenue chez vous.', loading: 'Chargement en cours', unavailable: 'Ce contenu est momentanément indisponible.', room: 'Votre chambre', add: 'Ajouter', emptyCart: 'Votre panier est vide', order: 'Commander', total: 'Total', settings: 'Réglages de la chambre' },
  En: { hello: 'Hello, welcome to', welcome: 'Welcome to La Villa Saint-Jean, welcome home.', loading: 'Loading', unavailable: 'This content is temporarily unavailable.', room: 'Your room', add: 'Add', emptyCart: 'Your cart is empty', order: 'Place order', total: 'Total', settings: 'Room settings' },
} as const

export const t = (language: Language, key: keyof typeof messages.Fr) => messages[language][key]
