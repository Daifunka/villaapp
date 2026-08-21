import { Preferences } from '@capacitor/preferences'
import axios from 'axios'

import { Loading, Notify } from 'quasar'
import {
  isNetworkUnavailable,
  notifyNetworkUnavailable,
  resetNetworkNotification,
} from '../utils/networkStatus'

const VIDEO_METADATA_CACHE_PREFIX = 'video-metadata-v1'
const pendingVideoRequests = new Map()

const getVideoMetadataCacheKey = ({ page_id: pageId, page, langue }) =>
  `${VIDEO_METADATA_CACHE_PREFIX}:${pageId ?? page}:${langue}`

async function readCachedVideoMetadata(infos) {
  const { value } = await Preferences.get({ key: getVideoMetadataCacheKey(infos) })
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

async function cacheVideoMetadata(infos, video) {
  if (!video) return
  await Preferences.set({
    key: getVideoMetadataCacheKey(infos),
    value: JSON.stringify(video),
  })
}

const getLangue = () => localStorage.getItem('langue') || 'Fr'

const getNotificationMessage = (key) => {
  const isEn = getLangue().toLowerCase() === 'en'
  const messages = {
    operationSuccess: { Fr: 'Opération réussie', En: 'Operation successful' },
    errorOccurred: { Fr: "Une erreur s'est produite", En: 'An error occurred' },
    errorTryAgain: {
      Fr: "Une erreur s'est produite, veuillez réessayer.",
      En: 'An error occurred, please try again.',
    },
    videoUnavailable: {
      Fr: 'Vidéo indisponible pour le moment',
      En: 'Video unavailable at the moment',
    },
  }
  return messages[key] ? (isEn ? messages[key].En : messages[key].Fr) : ''
}

const instance = axios.create({
  baseURL: 'https://testoikos.lavillastjean.com/api/public/api',
  headers: {
    'Content-Type': 'multipart/form-data',
    'Access-Control-Allow-Origin': '*',
    Authorization: 'Bearer ' + localStorage.getItem('token'),
  },
})

const testInstance = axios.create({
  baseURL: 'https://testoikos.lavillastjean.com/api/public/api',
  headers: {
    'Content-Type': 'multipart/form-data',
    'Access-Control-Allow-Origin': '*',
    Authorization: 'Bearer ' + localStorage.getItem('token'),
  },
})

// Request Interceptor: Show Loading
instance.interceptors.request.use(
  (config) => {
    if (config.showLoading !== false) {
      Loading.show({
        delay: 400, // only show if request takes more than 400ms
      })
    }
    return config
  },
  (error) => {
    Loading.hide()
    return Promise.reject(error)
  },
)

// Request Interceptor for testInstance: Show Loading
testInstance.interceptors.request.use(
  (config) => {
    if (config.showLoading !== false) {
      Loading.show({
        delay: 400, // only show if request takes more than 400ms
      })
    }
    return config
  },
  (error) => {
    Loading.hide()
    return Promise.reject(error)
  },
)

// Response Interceptor: Hide Loading and Handle Errors/Success
instance.interceptors.response.use(
  (response) => {
    Loading.hide()
    resetNetworkNotification()

    // Show success notification if explicitly requested or on specific methods
    if (
      response.config.method !== 'get' &&
      response.data.success &&
      response.config.silentSuccess !== true
    ) {
      Notify.create({
        type: 'positive',
        message: response.data.message || getNotificationMessage('operationSuccess'),
      })
    }

    return response
  },
  (error) => {
    Loading.hide()

    if (isNetworkUnavailable(error)) {
      notifyNetworkUnavailable()
      return Promise.reject(error)
    }

    if (error.config && error.config.silentError === true) {
      return Promise.reject(error)
    }

    let message = getNotificationMessage('errorOccurred')
    if (error.response && error.response.data) {
      message = error.response.data.message || error.response.data.error || message
      if (typeof message === 'object') {
        // Handle Laravel validation errors
        message = Object.values(message).flat().join('\n')
      }
    }

    Notify.create({
      type: 'negative',
      message: message,
    })

    return Promise.reject(error)
  },
)

// Response Interceptor for testInstance: Hide Loading and Handle Errors/Success
testInstance.interceptors.response.use(
  (response) => {
    Loading.hide()
    resetNetworkNotification()

    // Show success notification if explicitly requested or on specific methods
    if (
      response.config.method !== 'get' &&
      response.data.success &&
      response.config.silentSuccess !== true
    ) {
      Notify.create({
        type: 'positive',
        message: response.data.message || getNotificationMessage('operationSuccess'),
      })
    }

    return response
  },
  (error) => {
    Loading.hide()

    if (isNetworkUnavailable(error)) {
      notifyNetworkUnavailable()
      return Promise.reject(error)
    }

    if (error.config && error.config.silentError === true) {
      return Promise.reject(error)
    }

    let message = getNotificationMessage('errorOccurred')
    if (error.response && error.response.data) {
      message = error.response.data.message || error.response.data.error || message
      if (typeof message === 'object') {
        // Handle Laravel validation errors
        message = Object.values(message).flat().join('\n')
      }
    }

    Notify.create({
      type: 'negative',
      message: message,
    })

    return Promise.reject(error)
  },
)

instance.defaults.headers.common['Access-Control-Allow-Origin'] =
  'https://testoikos.lavillastjean.com'
instance.defaults.headers.common['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE'
instance.defaults.headers.common['Access-Control-Allow-Headers'] =
  'Origin, Accept, Content-Type, Authorization'

testInstance.defaults.headers.common['Access-Control-Allow-Origin'] =
  'https://testoikos.lavillastjean.com'
testInstance.defaults.headers.common['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE'
testInstance.defaults.headers.common['Access-Control-Allow-Headers'] =
  'Origin, Accept, Content-Type, Authorization'

export default {
  TranslatePage: (lang) => {
    const googleTranslateElement = document.querySelector('#google_translate_element')
    if (googleTranslateElement) {
      googleTranslateElement.translate({ toLang: lang }, { fromLang: window.navigator.language })
    }
  },

  ajouterCommande: ({ commit, state, dispatch }, infos) => {
    commit('UNSET_ERROR')
    commit('UNSET_SUCCESS')

    // Préparer la commande pour l'historique local (qui reste unique)
    const commandePourHistorique = {
      date: new Date().toISOString(),
      articles: state.panier.map((a) => ({ nom: a.nom, quantite: a.quantite, prix: a.prix })),
      total: infos.total || state.panier.reduce((sum, a) => sum + a.prix * a.quantite, 0),
      statut: 'Enregistrée',
    }

    const articlesRestau = state.panier.filter((a) => a.source !== 'Bar')
    const articlesBar = state.panier.filter((a) => a.source === 'Bar')

    const promises = []

    if (articlesRestau.length > 0) {
      const restauInfos = {
        ...infos,
        source: 'Restaurant',
        articles: articlesRestau,
      }
      promises.push(instance.post('/commande/ajouter', restauInfos))
    }

    if (articlesBar.length > 0) {
      const barInfos = {
        ...infos,
        source: 'Bar',
        articles: articlesBar,
      }
      promises.push(instance.post('/commande/ajouter', barInfos))
    }

    if (promises.length === 0) {
      return
    }

    Promise.all(promises)
      .then(function (responses) {
        const allSuccess = responses.every((response) => response.data && response.data.commande)
        if (allSuccess) {
          commit('AJOUTER_COMMANDE_SESSION', commandePourHistorique)
          commit('SET_SUCCESS')
          dispatch('viderLePanier')

          // Notifier le client du succès de la commande
          const isEn = getLangue().toLowerCase() === 'en'
          Notify.create({
            message: isEn
              ? 'Your order has been placed successfully!'
              : 'Votre commande a été enregistrée avec succès !',
            position: 'top',
            timeout: 4000,
            classes: 'premium-cart-notify',
            icon: 'sym_o_check_circle',
          })
        } else {
          const erreur = getNotificationMessage('errorTryAgain')
          commit('SET_ERROR', erreur)
        }
      })
      .catch(function (error) {
        if (error.response && error.response.data && error.response.data.error) {
          let erreur = ''
          const errors = error.response.data.error

          for (const field in errors) {
            if (Object.prototype.hasOwnProperty.call(errors, field)) {
              errors[field].forEach((msg) => {
                erreur += msg + '\n'
              })
            }
          }
          commit('SET_ERROR', erreur.trim())
        } else {
          const erreur = getNotificationMessage('errorTryAgain')
          commit('SET_ERROR', erreur)
        }
      })
  },

  fetchArticles({ commit }) {
    return instance
      .get('/articles')
      .then((response) => {
        const articles = response.data.articles
        commit('setArticles', articles)
      })
      .catch((error) => {
        throw error
      })
  },

  verifierOccupationChambre: ({ commit, state, dispatch }, chambre) => {
    if (!chambre) return Promise.resolve(null)
    return instance
      .get('/reservations', { silentError: true, showLoading: false, timeout: 10000 })
      .then((response) => {
        const reservations = response.data.reservations || []

        // Obtenir la date et l'heure actuelle au Bénin (Afrique/Porto-Novo, UTC+1)
        const now = new Date()
        let beninDateStr = ''
        let beninHour = 12
        try {
          const optionsDate = {
            timeZone: 'Africa/Porto-Novo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }
          const dateParts = new Intl.DateTimeFormat('en-CA', optionsDate)
            .formatToParts(now)
            .reduce((parts, part) => {
              if (part.type !== 'literal') parts[part.type] = part.value
              return parts
            }, {})
          beninDateStr = `${dateParts.year}-${dateParts.month}-${dateParts.day}`

          const optionsHour = { timeZone: 'Africa/Porto-Novo', hour: 'numeric', hour12: false }
          beninHour = parseInt(new Intl.DateTimeFormat('en-US', optionsHour).format(now), 10)
        } catch {
          // Fallback en cas de problème de timezone ou de format
          const utcHour = now.getUTCHours()
          beninHour = (utcHour + 1) % 24 // Bénin est UTC+1
          beninDateStr = now.toISOString().split('T')[0]
        }

        // Seuil standard de check-out : 13h00 (Heure du Bénin)
        const isAfter13h = beninHour >= 13

        // Filtrer et trier les réservations confirmées pour cette chambre
        const roomReservations = reservations
          .filter((r) => r.menu_nom === chambre && r.statut !== 'Annule')
          .sort((a, b) => a.check_in.localeCompare(b.check_in))

        // Trouver la réservation active (en cours) aujourd'hui
        // Une réservation est active si : check_in <= today ET (check_out > today OU (check_out === today ET avant 13h))
        const activeRes = roomReservations.find((r) => {
          const isAfterCheckIn = r.check_in <= beninDateStr
          const isBeforeCheckOut = r.check_out > beninDateStr
          const isCheckOutDayBefore13h = r.check_out === beninDateStr && !isAfter13h
          return isAfterCheckIn && (isBeforeCheckOut || isCheckOutDayBefore13h)
        })

        if (activeRes) {
          // Une réservation est en cours actuellement, on maintient la session
          // MAIS si le client associé à cette réservation est différent de celui stocké, on réinitialise tout
          if (state.lastKnownClientEmail && state.lastKnownClientEmail !== activeRes.email) {
            commit('VIDER_COMMANDES_SESSION')
            dispatch('viderLePanier')
          }
          commit('SET_LAST_KNOWN_CLIENT_EMAIL', activeRes.email)
          const rawName = ((activeRes.prenoms || '') + ' ' + (activeRes.nom || '')).trim()
          const formattedName = rawName
            .toLowerCase()
            .replace(/(?:^|\s|-)\S/g, (char) => char.toUpperCase())
          commit('SET_LAST_KNOWN_CLIENT_NAME', formattedName || 'Client')
          return activeRes
        }

        // Sinon, si la date actuelle coïncide avec la date de fin d'une réservation (check_out === today) ET qu'il est >= 13h
        const endingRes = roomReservations.find((r) => r.check_out === beninDateStr)
        if (endingRes && isAfter13h) {
          // Trouver la prochaine réservation pour cette chambre
          const nextRes = roomReservations.find(
            (r) => r.check_in >= beninDateStr && r.id !== endingRes.id,
          )

          if (nextRes) {
            // Vérifier si c'est le même client (email, téléphone ou nom complet)
            const isSameClient =
              (nextRes.email && nextRes.email === endingRes.email) ||
              (nextRes.telephone && nextRes.telephone === endingRes.telephone) ||
              (nextRes.nom === endingRes.nom && nextRes.prenoms === endingRes.prenoms)

            if (!isSameClient) {
              // Pas le même client, on réinitialise tout
              commit('VIDER_COMMANDES_SESSION')
              dispatch('viderLePanier')
              commit('CLEAR_LAST_KNOWN_CLIENT_EMAIL')
              commit('CLEAR_LAST_KNOWN_CLIENT_NAME')
            }
          } else {
            // Pas de prochaine réservation, la chambre devient libre, on réinitialise tout
            commit('VIDER_COMMANDES_SESSION')
            dispatch('viderLePanier')
            commit('CLEAR_LAST_KNOWN_CLIENT_EMAIL')
            commit('CLEAR_LAST_KNOWN_CLIENT_NAME')
          }
        } else {
          // Pas de réservation active et pas en période de check-out (chambre libre/vide)
          // On réinitialise également par précaution
          commit('VIDER_COMMANDES_SESSION')
          dispatch('viderLePanier')
          commit('CLEAR_LAST_KNOWN_CLIENT_EMAIL')
          commit('CLEAR_LAST_KNOWN_CLIENT_NAME')
        }
      })
      .catch((err) => console.error('Erreur vérif occupation:', err))
  },

  fetchMenus({ commit }) {
    return instance
      .get('/menus')
      .then((response) => {
        const articles = response.data.success
        commit('setMenus', articles)
      })
      .catch((error) => {
        throw error
      })
  },

  async fetchVideos({ commit }, infos) {
    const requestKey = getVideoMetadataCacheKey(infos)
    const pendingRequest = pendingVideoRequests.get(requestKey)
    if (pendingRequest) return pendingRequest

    // Clear previous states to avoid UI glitches
    commit('setVideos', '')
    commit('UNSET_ERROR')

    if (navigator.onLine === false) {
      notifyNetworkUnavailable()
      const cachedVideo = await readCachedVideoMetadata(infos)
      commit('setVideos', cachedVideo)
      if (!cachedVideo) commit('SET_ERROR', getNotificationMessage('videoUnavailable'))
      return cachedVideo
    }

    const request = instance
      .get(
        '/videos-chambres/' +
          (infos.page_id !== undefined && infos.page_id !== null ? infos.page_id : infos.page) +
          '/' +
          infos.langue,
        {
          silentError: true,
          showLoading: false, // We'll use a local loading state or the spinner in AppHome.vue instead of the global one for videos
          timeout: 15000,
        },
      )
      .then(async (response) => {
        const videos = response.data.video
        commit('setVideos', videos)
        await cacheVideoMetadata(infos, videos)
        return videos
      })
      .catch(async (error) => {
        console.log(error)
        const cachedVideo = await readCachedVideoMetadata(infos)
        commit('setVideos', cachedVideo)

        // Show specific message for 404 or other errors ONLY on pages that contain a video
        const videoPages = ['Accueil', 'Chambres', 'Chambres2', 'Services', 'FAQs']

        if (error.response && error.response.status === 404 && videoPages.includes(infos.page)) {
          Notify.create({
            type: 'warning',
            message: getNotificationMessage('videoUnavailable'),
            position: 'bottom',
            offset: [18, 140],
          })
        }

        if (!cachedVideo) commit('SET_ERROR', getNotificationMessage('videoUnavailable'))
        return cachedVideo
      })

    pendingVideoRequests.set(requestKey, request)
    try {
      return await request
    } finally {
      pendingVideoRequests.delete(requestKey)
    }
  },

  async sauvegarderPanierDansPreferences({ state }) {
    if (state.panier.length === 0) {
      await Preferences.remove({ key: 'panier' })
      return
    }
    const panierJSON = JSON.stringify(state.panier)
    try {
      await Preferences.set({
        key: 'panier',
        value: panierJSON,
      })
    } catch (error) {
      console.error('Erreur paramètre Preferences:', error)
    }
  },

  async ajouterAuPanier({ commit, dispatch }, produit) {
    commit('UNSET_SUCCESS')
    commit('AJOUTER_AU_PANIER', produit)
    await dispatch('sauvegarderPanierDansPreferences')
  },

  async retirerDuPanier({ commit, dispatch }, index) {
    commit('RETIRER_DU_PANIER', index)
    await dispatch('sauvegarderPanierDansPreferences')
  },

  async incrementerQuantite({ commit, dispatch }, index) {
    commit('INCREMENTER_QUANTITE', index)
    await dispatch('sauvegarderPanierDansPreferences')
  },

  async decrementerQuantite({ commit, dispatch }, index) {
    commit('DECREMENTER_QUANTITE', index)
    await dispatch('sauvegarderPanierDansPreferences')
  },

  async viderLePanier({ commit, dispatch }) {
    commit('VIDER_PANIER')
    await dispatch('sauvegarderPanierDansPreferences')
  },

  async chargerPanierDepuisPreferences({ commit }) {
    const { value: panierStocke } = await Preferences.get({ key: 'panier' })
    if (panierStocke) {
      try {
        const parsedPanier = JSON.parse(panierStocke)
        commit('SET_PANIER', parsedPanier)
      } catch (e) {
        console.error('Erreur de parsing du panier stocké:', e)
        await Preferences.remove({ key: 'panier' })
        commit('SET_PANIER', [])
      }
    }
  },
  chargerPanierDepuisLocalStorage({ commit }) {
    const panierStocke = localStorage.getItem('panier')
    if (panierStocke) {
      try {
        const parsedPanier = JSON.parse(panierStocke)
        commit('SET_PANIER', parsedPanier)
      } catch (e) {
        console.error('Erreur de parsing localStorage:', e)
        localStorage.removeItem('panier')
      }
    }
  },
  fetchDynamicPages({ commit }) {
    return instance
      .get('/pages', { silentError: true })
      .then((response) => {
        const pages = response.data.pages || []
        commit('setDynamicPages', pages)
      })
      .catch((error) => {
        console.error('Erreur lors de la récupération des pages:', error)
        // Fallback par défaut si l'API échoue
        commit('setDynamicPages', [
          { id: 1, titre: 'accueil' },
          { id: 2, titre: 'nos-chambres' },
          { id: 3, titre: 'services' },
          { id: 4, titre: 'faq' },
        ])
      })
  },
  fetchFaqs({ commit }) {
    return instance
      .get('/faqs', { silentError: true })
      .then((response) => {
        const faqs = response.data.faqs || []
        commit('setFaqs', faqs)
      })
      .catch((error) => {
        console.error('Erreur lors de la récupération des faqs:', error)
        commit('setFaqs', [])
      })
  },
  fetchAnnonce({ commit }) {
    return instance
      .get('/annonces', { silentError: true })
      .then((response) => {
        const annonce = response.data.annonces || null
        commit('setAnnonce', annonce)
      })
      .catch((error) => {
        console.error('Erreur lors de la récupération des annonces:', error)
        commit('setAnnonce', null)
      })
  },
}
export { instance, testInstance }
