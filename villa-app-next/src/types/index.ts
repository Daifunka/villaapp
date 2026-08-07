export type Language = 'Fr' | 'En'
export type SectionName = 'Accueil' | 'Chambres' | 'Services' | 'FAQs' | 'Menu' | 'Wifi' | 'Cart' | 'Commandes'

export interface MenuItem {
  id: number | string
  nom: string
  prix: number
  source: 'Restaurant' | 'Bar' | 'Guesthouse' | string
  imageMenu?: string
  image?: string
}

export interface CartItem extends MenuItem { quantite: number }
export interface DynamicPage { id: number | string; titre: string }
export interface Faq { id: number | string; question: string; reponse: string }
export interface Announcement { titre?: string; texte?: string; motdepasseWifi?: string; qrcode?: string }
export interface VideoContent { video_url?: string; description?: string }
export interface AppTab { id: number | string | null; name: SectionName; label: string }
export interface RoomSettings { chambre: string; bloc: string }
export interface SessionOrder { id: string; date: string; items: CartItem[]; total: number; status: string }
