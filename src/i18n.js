
import { createI18n } from 'vue-i18n'

const messages = {
    Fr: {
      menu: {
        villa: "La villa",
        rooms: "Vos chambres",
        services: "Services",
        restaurantMenu: "Menu",
        faqs: "FAQs",
        
        
      },
      welcome: "Bienvenue à",
      homeText: "Bienvenue à La Villa Saint-Jean, Bienvenue chez vous.",
      restaurant: "Repas",
      bar: "Boissons",
      panier: "Panier",
      panierMessage: "Panier vide pour le moment !",
      erreurVideo: "Une erreur s'est produite lors de la récupération du contenu.",
      erreurR: "Veuillez renseigner les informations de la chambre pour utiliser normalement l'application.",
      chargement: "Chargement en cours",
      payer: "Commander"
    },
    En: {
      menu: {
        villa: "The villa",
        rooms: "Rooms",
        services: "Services",
        restaurantMenu: "Menu",
        faqs: "FAQs"
      },
      welcome: "Welcome to",
      homeText: "Welcome to La Villa Saint-Jean, welcome home.",
      restaurant: "Meal",
      bar: "Drinks",
      panier: "Cart",
      panierMessage: "Empty shopping cart !",
      erreurVideo: "An error occurred while retrieving the content.",
      erreurR: "Please enter the room information to use the application normally.",
      chargement: "Loading in progress",
      payer: "Order"
    }
  }

const savedLocale = localStorage.getItem('lang') || 'Fr'

const i18n = createI18n({
  locale: savedLocale,
  fallbackLocale: 'En',
  messages,
})

export default i18n
