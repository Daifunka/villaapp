<script>
import { Preferences } from '@capacitor/preferences'
import { App } from '@capacitor/app'
import foodFallback from '../assets/img/food.png'
import drinkFallback from '../assets/img/drink.png'
import VideoSection from '../components/home/VideoSection.vue'
import MenuCard from '../components/menu/MenuCard.vue'
import MenuSearchField from '../components/menu/MenuSearchField.vue'
import MenuTranslationIndex from '../components/menu/MenuTranslationIndex.vue'
import ProductDetailDialog from '../components/menu/ProductDetailDialog.vue'
import { getMenuSearchKey, normalizeMenuSearch } from '../utils/menuSearch'
import { notifyNetworkUnavailable, resetNetworkNotification } from '../utils/networkStatus'

export default {
  components: {
    MenuCard,
    MenuSearchField,
    MenuTranslationIndex,
    ProductDetailDialog,
    VideoSection,
  },
  data() {
    return {
      foodFallback,
      drinkFallback,
      activeSection: 'infos_basiques',
      currentPage: 1,
      nbParPage: 14,
      video: null,
      page: 'Accueil',
      page_id: '',
      langue: 'Fr',
      menuType: 'Restaurant',
      menuSearchQuery: '',
      menuTranslatedNames: {},
      itemsToShow: 14, // Initial number of items to show
      statut: null,
      videos: '',
      bateau: null,
      nomChambre: '',
      nomBloc: '',
      chambre: '',
      bloc: '',
      reservations: null,
      images: [],
      bookingASupprimer: '',
      success: false,
      link: 'https://testoikos.lavillastjean.com/api/public/',
      link2: 'https://testoikos.lavillastjean.com/api/public/',
      erreur: '',
      err: '',
      showSettingsModal: false,
      showDeleteModal: false,
      isScrolled: false,
      occupationInterval: null,
      translationTimeout: null,
      showLeftScrollIndicator: false,
      showRightScrollIndicator: false,
      showBackToTop: false,
      isTranslating: false,
      showWelcomeGate: true,
      showConfirmOrderModal: false,
      showWifiDialog: false,
      showFullAnnonceDialog: false,
      showProductDialog: false,
      selectedMenuItem: null,
      annonceInterval: null,
      appStateListener: null,
      visibilityListener: null,
      scrollFrame: null,
      pendingScrollTop: 0,
      swipeStartX: null,
      swipeStartY: null,
      appDataPromise: null,
      lastAppDataFetchAt: 0,
      isClientIdentityReady: false,
      appVersion: import.meta.env.VITE_APP_VERSION || '1.1.5',
      cartNotifications: [],
    }
  },
  async created() {
    // Only show welcome gate once per session
    const gateShown = sessionStorage.getItem('welcomeGateShown')
    if (gateShown) {
      this.showWelcomeGate = false
    }

    // Restaurer la page active si enregistrée (utile après rechargement pour changement de langue)
    const savedPage = sessionStorage.getItem('activePage')
    if (savedPage) {
      this.page = savedPage
      sessionStorage.removeItem('activePage')
    }

    // 1. Récupération Asynchrone des Préférences
    const { value: langValue } = await Preferences.get({ key: 'langue' })
    if (langValue) {
      this.langue = langValue
    }
    localStorage.setItem('langue', this.langue)

    const { value: blocValue } = await Preferences.get({ key: 'bloc' })
    if (blocValue) {
      this.bloc = blocValue
      this.nomBloc = blocValue
    }

    const { value: chambreValue } = await Preferences.get({ key: 'chambre' })
    if (chambreValue) {
      this.chambre = chambreValue
      this.nomChambre = chambreValue
    }

    try {
      const appInfo = await App.getInfo()
      this.appVersion = appInfo.version || appInfo.build || ''
    } catch {
      this.appVersion = import.meta.env.VITE_APP_VERSION || this.appVersion
    }

    if (this.chambre) {
      const maxAttempts = 3
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const activeReservation = await this.$store.dispatch(
          'verifierOccupationChambre',
          this.chambre,
        )
        if (activeReservation) break
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)))
        }
      }
    }
    this.isClientIdentityReady = true

    // 2. Dispatch des Actions Vuex
    this.$store.dispatch('chargerPanierDepuisPreferences')
    void this.fetchAppData({ skipOccupation: true })
  },
  mounted() {
    this.$nextTick(() => {
      this.verifierReglages()
      // Automatiquement traduire en anglais si la langue de préférence est l'anglais
      if (this.langue === 'En') {
        setTimeout(() => {
          this.triggerGoogleTranslate('en')
        }, 1200)
      }
      this.setupMutationObserver()

      // Initial scroll checks for navigation tabs
      setTimeout(() => this.checkTabsScroll(), 600)
      setTimeout(() => this.checkTabsScroll(), 1800)

      const layout = document.querySelector('.q-layout')
      if (layout) {
        layout.addEventListener('scroll', this.queueScrollUpdate, { passive: true })
      }
    })
    window.addEventListener('scroll', this.queueScrollUpdate, { passive: true })
    window.addEventListener('resize', this.checkTabsScroll)
    window.addEventListener('online', this.handleOnlineTransition)
    window.addEventListener('offline', this.handleOfflineTransition)
    if (navigator.onLine === false) this.handleOfflineTransition()

    // Listen to Capacitor App state changes (background/foreground)
    this.appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      document.documentElement.classList.toggle('app-paused', !isActive)
      if (isActive) {
        console.log('[Capacitor] App became active. Refreshing data...')
        void this.fetchAppData()
      }
    })

    // Listen to Web Visibility API (tab focus change)
    this.visibilityListener = () => {
      const isVisible = document.visibilityState === 'visible'
      document.documentElement.classList.toggle('app-paused', !isVisible)
      if (isVisible) {
        console.log('[Browser] Visibility status: active. Refreshing data...')
        void this.fetchAppData()
      }
    }
    document.addEventListener('visibilitychange', this.visibilityListener)

    // Shortened polling intervals to keep backend data updated dynamically (every 5 minutes)
    this.occupationInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && this.chambre) {
        this.$store.dispatch('verifierOccupationChambre', this.chambre)
      }
    }, 300000) // 5 minutes
    this.annonceInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.$store.dispatch('fetchAnnonce')
      }
    }, 300000) // 5 minutes
  },
  unmounted() {
    window.removeEventListener('scroll', this.queueScrollUpdate)
    window.removeEventListener('resize', this.checkTabsScroll)
    window.removeEventListener('online', this.handleOnlineTransition)
    window.removeEventListener('offline', this.handleOfflineTransition)
    const layout = document.querySelector('.q-layout')
    if (layout) {
      layout.removeEventListener('scroll', this.queueScrollUpdate)
    }
    if (this.occupationInterval) {
      clearInterval(this.occupationInterval)
    }
    if (this.annonceInterval) {
      clearInterval(this.annonceInterval)
    }
    if (this.appStateListener) {
      this.appStateListener.remove()
    }
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener)
    }
    if (this.domObserver) {
      this.domObserver.disconnect()
    }
    if (this.scrollFrame) {
      cancelAnimationFrame(this.scrollFrame)
    }
    this.dismissCartNotifications()
    document.documentElement.classList.remove('app-paused')
  },
  watch: {
    '$store.state.videos'(newCategories) {
      this.videos = newCategories
      this.translateCurrentDOM()
    },
    articles(newVal) {
      if (!newVal) return
      this.translateCurrentDOM()
    },
    menuType() {
      this.itemsToShow = 14 // Reset count when category changes
      this.translateCurrentDOM()
    },
    menuSearchQuery() {
      this.itemsToShow = 14
    },
    page(newVal) {
      if (newVal === 'Menu') {
        this.itemsToShow = 14
      }
      this.loadVideoForCurrentPage()
      // Tab change causes a full panel re-render with animation (~300ms)
      this.translateCurrentDOM()
      // Extra retry passes to catch content appearing after the animation completes
      if (this.langue === 'En') {
        setTimeout(() => this.triggerGoogleTranslate('en'), 1000)
        setTimeout(() => this.triggerGoogleTranslate('en'), 2500)
      }
    },
    'panier.length'() {
      this.translateCurrentDOM()
    },
    showSettingsModal(newVal) {
      if (newVal && this.langue === 'En') {
        // Dialog has a ~300ms open animation, translate after it completes
        setTimeout(() => this.triggerGoogleTranslate('en'), 500)
        setTimeout(() => this.triggerGoogleTranslate('en'), 1500)
      }
    },
    bloc() {
      this.translateCurrentDOM()
    },
    chambre(newVal) {
      this.translateCurrentDOM()
      if (newVal && this.isClientIdentityReady) {
        this.$store.dispatch('verifierOccupationChambre', newVal)
        this.$store.dispatch('fetchAnnonce')
      }
    },
    itemsToShow() {
      this.translateCurrentDOM()
    },
    langue() {
      this.translateCurrentDOM()
    },
    lastKnownClientName(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.$store.dispatch('fetchAnnonce')
      }
    },
    '$store.state.dynamicPages'() {
      this.$nextTick(() => {
        setTimeout(() => this.checkTabsScroll(), 500)
      })
    },
  },
  methods: {
    async validerPanier() {
      this.success = false
      this.erreur = ''
      this.err = 'commande'
      const { value: blocValue } = await Preferences.get({ key: 'bloc' })
      const { value: chambreValue } = await Preferences.get({ key: 'chambre' })

      if (!chambreValue || !blocValue) {
        this.erreur =
          this.langue === 'En'
            ? 'Please register your room settings before placing an order'
            : 'Veuillez enregistrer les réglages avant de passer une commande'
        this.showSettingsModal = true
      } else if (!this.lastKnownClientName) {
        this.$q.notify({
          type: 'warning',
          message:
            this.langue === 'En'
              ? 'This room is not currently occupied. Ordering is disabled.'
              : "Cette chambre n'est pas déclarée occupée actuellement. Commande impossible.",
          position: 'bottom',
          timeout: 4000,
        })
      } else {
        this.showConfirmOrderModal = true
      }
    },
    async ajouterCommande() {
      this.showConfirmOrderModal = false
      const commandeAjoutee = await this.$store.dispatch('ajouterCommande', {
        statut: 'en attente de paiement',
        statutPreparation: 'En attente',
        source: 'Restaurant',
        provenance: 'application',
        nomChambre: this.chambre,
        articles: this.panier,
        preferencesCommande: this.preference || '',
      })

      if (commandeAjoutee) {
        this.setPage('Commandes')
      }
    },
    async verifierReglages() {
      const { value: blocValue } = await Preferences.get({ key: 'bloc' })
      const { value: chambreValue } = await Preferences.get({ key: 'chambre' })

      if (!chambreValue || !blocValue) {
        try {
          if (!this.$store.state.menus || this.$store.state.menus.length === 0) {
            await this.$store.dispatch('fetchMenus')
          }
        } catch (e) {
          console.error('Error loading rooms for settings modal:', e)
        }
        setTimeout(() => {
          this.showSettingsModal = true
        }, 300)
      } else {
        this.nomChambre = chambreValue
        this.nomBloc = blocValue
      }
    },
    checkTabsScroll() {
      const container = this.$refs.tabsContainer
      if (container) {
        const isScrollable = container.scrollWidth > container.clientWidth
        this.showLeftScrollIndicator = isScrollable && container.scrollLeft > 5
        const hasScrolledToEnd =
          container.scrollLeft + container.clientWidth >= container.scrollWidth - 15
        this.showRightScrollIndicator = isScrollable && !hasScrolledToEnd
      }
    },
    scrollTabs(direction) {
      const container = this.$refs.tabsContainer
      if (container) {
        const scrollAmount = direction === 'left' ? -150 : 150
        container.scrollBy({
          left: scrollAmount,
          behavior: 'smooth',
        })
      }
    },
    verifierReglages2() {
      if (!this.chambre || !this.bloc) {
        this.showSettingsModal = true
      }
    },
    ouvrirReglages() {
      this.showSettingsModal = true
    },
    ouvrirProduit(article) {
      this.selectedMenuItem = article
      this.showProductDialog = true
    },
    async ajouterPanier(article) {
      this.success = false
      this.erreur = ''
      this.err = 'panier'
      const productId = parseInt(article.id)

      await this.$store.dispatch('ajouterAuPanier', {
        id: productId,
        nom: article.nom,
        prix: article.prix,
        image: article.imageMenu,
        source: article.source,
        quantite: 1,
      })

      const cartItem = this.panier.find((item) => item.id === productId)
      const quantity = cartItem?.quantite || 1
      this.showCartNotification(article.nom, productId, quantity)
    },
    showCartNotification(productName, productId, quantity) {
      const existingNotification = this.cartNotifications.find(
        (notification) => notification.productId === productId,
      )

      if (existingNotification) {
        window.clearTimeout(existingNotification.timer)
        existingNotification.quantity = quantity
        existingNotification.timer = window.setTimeout(() => {
          this.removeCartNotification(productId)
        }, 4000)
        return
      }

      while (this.cartNotifications.length >= 2) {
        const oldestNotification = this.cartNotifications.shift()
        window.clearTimeout(oldestNotification.timer)
      }

      const notification = {
        id: `${productId}-${Date.now()}`,
        productId,
        productName,
        quantity,
        timer: null,
      }
      const timer = window.setTimeout(() => {
        this.removeCartNotification(productId)
      }, 4000)
      notification.timer = timer
      this.cartNotifications.push(notification)
    },
    getCartNotificationMessage(productName) {
      return this.langue === 'En'
        ? `${productName} added to cart.`
        : `${productName} ajouté au panier.`
    },
    removeCartNotification(productId) {
      const notificationIndex = this.cartNotifications.findIndex(
        (notification) => notification.productId === productId,
      )
      if (notificationIndex === -1) return

      const [notification] = this.cartNotifications.splice(notificationIndex, 1)
      window.clearTimeout(notification.timer)
    },
    dismissCartNotifications() {
      this.cartNotifications.forEach((notification) => {
        window.clearTimeout(notification.timer)
      })
      this.cartNotifications = []
    },
    confirmerViderPanier() {
      this.$q.dialog({
        title: this.langue === 'En' ? 'Clear Cart' : 'Vider le panier',
        message: this.langue === 'En' ? 'Are you sure you want to remove all items from your cart?' : 'Êtes-vous sûr de vouloir retirer tous les articles de votre panier ?',
        cancel: {
          label: this.langue === 'En' ? 'Cancel' : 'Annuler',
          color: 'grey-7',
          flat: true,
          rounded: true
        },
        ok: {
          label: this.langue === 'En' ? 'Clear' : 'Vider',
          color: 'negative',
          unelevated: true,
          rounded: true
        },
        persistent: true
      }).onOk(async () => {
        await this.$store.dispatch('viderLePanier')
        this.$q.notify({
          type: 'info',
          message: this.langue === 'En' ? 'Cart cleared' : 'Panier vidé',
          position: 'top',
          timeout: 2000
        })
      })
    },
    async switchLanguage(lang) {
      this.isTranslating = true
      this.$i18n.locale = lang
      this.langue = lang
      await Preferences.set({
        key: 'langue',
        value: lang,
      })
      localStorage.setItem('langue', lang)

      const targetLang = lang.toLowerCase() === 'fr' ? 'fr' : 'en'

      if (targetLang === 'fr') {
        // Enregistrer la page courante pour la restaurer après reload
        sessionStorage.setItem('activePage', this.page)

        // Clear translation cookies to restore original French version
        const hostname = window.location.hostname
        const domains = ['', hostname, '.' + hostname]
        domains.forEach((domain) => {
          let clearStr = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
          if (domain) clearStr += `; domain=${domain}`
          document.cookie = clearStr
        })

        // Set combo to original language (fr) and trigger change event
        const selectEl = document.querySelector('.goog-te-combo')
        if (selectEl) {
          selectEl.value = 'fr'
          selectEl.dispatchEvent(new Event('change'))
        }

        // Trigger page reload to completely remove Google Translate DOM modifications and restore native French texts
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        // Translate to English
        this.triggerGoogleTranslate('en')

        // Hide preloader after 2 seconds
        setTimeout(() => {
          this.isTranslating = false
        }, 2000)
      }

      if (this.page !== 'Cart' && this.page !== 'Menu' && this.page !== 'Commandes') {
        this.videos = ''
        this.$store.dispatch('fetchVideos', {
          page_id: this.currentPageId,
          page: this.page,
          langue: this.langue,
        })
      }
    },
    triggerGoogleTranslate(lang) {
      const targetLang = lang.toLowerCase()
      const cookieVal = targetLang === 'en' ? '/fr/en' : ''

      // Set/clear googtrans cookie across multiple domains to make Google Translate script react
      const hostname = window.location.hostname
      const domains = ['', hostname, '.' + hostname]

      domains.forEach((domain) => {
        let cookieStr = `googtrans=${cookieVal}; path=/`
        if (domain) cookieStr += `; domain=${domain}`
        document.cookie = cookieStr

        if (targetLang === 'fr') {
          let clearStr = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
          if (domain) clearStr += `; domain=${domain}`
          document.cookie = clearStr
        }
      })

      const selectEl = document.querySelector('.goog-te-combo')
      if (selectEl) {
        if (selectEl.value !== targetLang) {
          selectEl.value = targetLang
          selectEl.dispatchEvent(new Event('change'))
        }
      }
    },
    translateCurrentDOM() {
      if (this.langue !== 'En') return

      // Always clear any pending translation to debounce properly
      if (this.translationTimeout) {
        clearTimeout(this.translationTimeout)
      }

      this.$nextTick(() => {
        this.translationTimeout = setTimeout(() => {
          this.triggerGoogleTranslate('en')
        }, 400)
      })
    },
    setupMutationObserver() {
      // Désactivé pour éviter les boucles de mutations infinies causées par le widget Google Translate.
      return
    },
    translateStatus(status) {
      if (!status) return ''
      if (this.langue === 'En') {
        const statusMap = {
          'en attente de paiement': 'pending payment',
          'En attente': 'Pending',
          'En cours de préparation': 'Preparing',
          'En cours': 'In progress',
          Prêt: 'Ready',
          Livré: 'Delivered',
          Enregistrée: 'Registered',
          Annule: 'Cancelled',
        }
        return statusMap[status] || status
      }
      return status
    },
    translateRoom(chambre) {
      return chambre || ''
    },
    determinerBlocDepuisChambre(chambre) {
      if (!chambre) return 'nouveau'
      const c = chambre.toLowerCase()
      if (
        c.includes('edmond') ||
        c.includes('limata') ||
        c.includes('vintage') ||
        c.includes('imprimerie')
      ) {
        return 'ancien'
      }
      return 'nouveau'
    },
    async setReglages() {
      const roomChanged = this.chambre && this.chambre !== this.nomChambre
      if (roomChanged) {
        this.$store.commit('VIDER_COMMANDES_SESSION')
        await this.$store.dispatch('viderLePanier')
        this.$store.commit('CLEAR_LAST_KNOWN_CLIENT_EMAIL')
        this.$store.commit('CLEAR_LAST_KNOWN_CLIENT_NAME')
      }

      this.nomBloc = this.determinerBlocDepuisChambre(this.nomChambre)

      await Preferences.set({
        key: 'bloc',
        value: this.nomBloc,
      })

      await Preferences.set({
        key: 'chambre',
        value: this.nomChambre,
      })

      // 1. Fetch the new client name before updating the local room state
      // This ensures the client name is updated in the store before any watchers are triggered.
      await this.$store.dispatch('verifierOccupationChambre', this.nomChambre)

      this.bloc = this.nomBloc
      this.chambre = this.nomChambre

      const { value: blocValue } = await Preferences.get({ key: 'bloc' })
      const { value: chambreValue } = await Preferences.get({ key: 'chambre' })

      if (blocValue && chambreValue) {
        this.showSettingsModal = false
        sessionStorage.removeItem('welcomeGateShown')
        this.showWelcomeGate = true
      }
    },
    setPage(value) {
      if (value === 'Chambres') {
        if (this.bloc === 'ancien') {
          this.page = 'Chambres'
        } else {
          this.page = 'Chambres'
        }
      } else {
        this.page = value
      }
    },
    handleSwipeStart(event) {
      const currentPage = this.page === 'Chambres2' ? 'Chambres' : this.page
      if (!this.swipeTabNames.includes(currentPage)) return

      const touch = event.touches && event.touches[0]
      if (!touch) return

      this.swipeStartX = touch.clientX
      this.swipeStartY = touch.clientY
    },
    handleSwipeEnd(event) {
      if (this.swipeStartX === null || this.swipeStartY === null) return

      const touch = event.changedTouches && event.changedTouches[0]
      if (!touch) return

      const deltaX = touch.clientX - this.swipeStartX
      const deltaY = touch.clientY - this.swipeStartY
      this.swipeStartX = null
      this.swipeStartY = null

      // Ignore vertical scrolling and short movements.
      if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return

      const currentPage = this.page === 'Chambres2' ? 'Chambres' : this.page
      const currentIndex = this.swipeTabNames.indexOf(currentPage)
      if (currentIndex === -1) return

      const nextIndex = currentIndex + (deltaX < 0 ? 1 : -1)
      const nextPage = this.swipeTabNames[nextIndex]
      if (nextPage) this.setPage(nextPage)
    },
    handleSwipeCancel() {
      this.swipeStartX = null
      this.swipeStartY = null
    },
    loadVideoForCurrentPage() {
      if (['Menu', 'Cart', 'Commandes', 'Wifi'].includes(this.page)) return

      this.videos = ''
      void this.$store.dispatch('fetchVideos', {
        page_id: this.currentPageId,
        page: this.page,
        langue: this.langue,
      })
    },
    chargerPlusArticles() {
      this.itemsToShow += 14
    },
    queueScrollUpdate(e) {
      if (e && e.target && e.target !== window && e.target !== document) {
        this.pendingScrollTop = e.target.scrollTop
      } else {
        this.pendingScrollTop =
          window.scrollY ||
          window.pageYOffset ||
          document.documentElement.scrollTop ||
          document.body.scrollTop
      }

      if (this.scrollFrame) return
      this.scrollFrame = requestAnimationFrame(() => {
        this.isScrolled = this.pendingScrollTop > 50
        this.showBackToTop = this.pendingScrollTop > 300
        this.scrollFrame = null
      })
    },
    scrollToTop() {
      const scrollOptions = { top: 0, behavior: 'smooth' }
      window.scrollTo(scrollOptions)
      document.documentElement.scrollTo(scrollOptions)
      document.body.scrollTo(scrollOptions)

      const layouts = document.querySelectorAll('.q-layout, .q-page-container, .home-page')
      layouts.forEach((el) => {
        try {
          el.scrollTo(scrollOptions)
        } catch {
          el.scrollTop = 0
        }
      })
    },
    scrollToContent() {
      const content = document.querySelector('.main-content-wrapper')
      if (content) {
        content.scrollIntoView({ behavior: 'smooth' })
      }
    },
    closeWelcomeGate() {
      if (!this.isClientIdentityReady) return
      this.showWelcomeGate = false
      sessionStorage.setItem('welcomeGateShown', 'true')
    },
    supprimerProduit(index) {
      this.$store.dispatch('retirerDuPanier', index)
    },
    incrementerQuantite(index) {
      this.$store.dispatch('incrementerQuantite', index)
    },
    decrementerQuantite(index) {
      this.$store.dispatch('decrementerQuantite', index)
    },
    getArticleImage(article) {
      if (!article) return ''
      const imgPath = article.imageMenu || article.image
      if (!imgPath) {
        return article.source === 'Bar' ? this.drinkFallback : this.foodFallback
      }
      const img = imgPath.trim()
      if (img === '') {
        return article.source === 'Bar' ? this.drinkFallback : this.foodFallback
      }
      if (img.startsWith('http://') || img.startsWith('https://')) {
        return img
      }
      const normalizedPath = img.startsWith('/') ? img.slice(1) : img
      return this.link2 + normalizedPath
    },
    copierWifiPassword() {
      if (this.annonce && this.annonce.motdepasseWifi) {
        navigator.clipboard
          .writeText(this.annonce.motdepasseWifi)
          .then(() => {
            this.$q.notify({
              type: 'positive',
              message: this.langue === 'En' ? 'Password copied!' : 'Mot de passe copié !',
              position: 'bottom',
              timeout: 2000,
            })
          })
          .catch((err) => {
            console.error('Error copying text: ', err)
          })
      }
    },
    fetchAppData({ force = false, skipOccupation = false } = {}) {
      if (this.appDataPromise) return this.appDataPromise

      const now = Date.now()
      if (!force && now - this.lastAppDataFetchAt < 15000) return Promise.resolve()

      this.lastAppDataFetchAt = now
      const requests = [
        this.$store.dispatch('fetchMenus'),
        this.$store.dispatch('fetchDynamicPages'),
        this.$store.dispatch('fetchFaqs'),
        this.$store.dispatch('fetchAnnonce'),
      ]

      if (this.page !== 'Menu' && this.page !== 'Cart' && this.page !== 'Commandes') {
        requests.push(
          this.$store.dispatch('fetchVideos', {
            page_id: this.currentPageId,
            page: this.page,
            langue: this.langue,
          }),
        )
      }
      if (this.chambre && !skipOccupation) {
        requests.push(this.$store.dispatch('verifierOccupationChambre', this.chambre))
      }

      this.appDataPromise = Promise.allSettled(requests).finally(() => {
        this.appDataPromise = null
      })
      return this.appDataPromise
    },
    handleOnlineTransition() {
      console.log('[Connection] Network connection restored. Re-fetching data...')
      resetNetworkNotification()
      void this.fetchAppData({ force: true })
    },
    handleOfflineTransition() {
      console.log('[Connection] Network connection unavailable.')
      notifyNetworkUnavailable()
    },
    stripHtmlTags(html) {
      if (!html) return ''
      let text = html.replace(/<[^>]*>/g, ' ')
      // Decode common HTML entities
      text = text
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&#39;/g, "'")
        .replace(/&#039;/g, "'")
      return text.replace(/\s+/g, ' ').trim()
    },
    updateMenuTranslatedNames(translatedNames) {
      this.menuTranslatedNames = translatedNames
    },
  },
  computed: {
    lastKnownClientName() {
      return this.$store.state.lastKnownClientName
    },
    faqs() {
      return this.$store.state.faqs || []
    },
    annonce() {
      return this.$store.state.annonce || null
    },
    validatedFields() {
      return !!this.nomChambre
    },
    panier() {
      return this.$store.getters.panier || []
    },
    totalPanier() {
      return this.$store.getters.totalPanier || 0
    },
    articlesFiltresTotal() {
      if (!this.articles) return []

      const normalizedQuery = normalizeMenuSearch(this.menuSearchQuery)

      return this.articles.filter((article) => {
        if (article.source !== this.menuType) return false
        if (!normalizedQuery) return true

        const translatedName =
          this.langue === 'En' ? this.menuTranslatedNames[getMenuSearchKey(article)] : ''

        return [article.nom, translatedName].some((name) =>
          normalizeMenuSearch(name).includes(normalizedQuery),
        )
      })
    },
    articlesFiltres() {
      return this.articlesFiltresTotal.slice(0, this.itemsToShow)
    },
    menuEmptyTitle() {
      if (this.menuSearchQuery) {
        return this.langue === 'En' ? 'No items found' : 'Aucun article trouvé'
      }

      return this.langue === 'En' ? 'No items available' : 'Aucun article disponible'
    },
    menuEmptyMessage() {
      if (this.menuSearchQuery) {
        return this.langue === 'En'
          ? `No menu item matches “${this.menuSearchQuery}”.`
          : `Aucun article ne correspond à « ${this.menuSearchQuery} ».`
      }

      return this.langue === 'En'
        ? 'This category does not contain any items yet.'
        : 'Cette catégorie ne contient pas encore d’article.'
    },
    articles() {
      return this.$store.state.menus || []
    },
    menuSearchIndexItems() {
      return this.articles.filter((article) => ['Restaurant', 'Bar'].includes(article.source))
    },
    selectedProductImage() {
      return this.getArticleImage(this.selectedMenuItem)
    },
    articlesFiltres2() {
      if (this.articles) {
        return this.articles.filter((tache) => tache.source === 'Guesthouse')
      }
      return []
    },
    chambresOptions() {
      return this.articlesFiltres2.map((a) => a.nom)
    },
    onglets() {
      const dynamicPages = this.$store.state.dynamicPages || []
      if (dynamicPages.length === 0) {
        return []
      }
      const mapped = dynamicPages.map((p) => {
        const labelStr = p && typeof p === 'object' ? p.titre || '' : p
        const lower = labelStr.toLowerCase()
        let name = 'Accueil'
        if (lower.includes('accueil') || lower.includes('villa')) {
          name = 'Accueil'
        } else if (lower.includes('chambre')) {
          name = 'Chambres'
        } else if (lower.includes('service')) {
          name = 'Services'
        } else if (lower.includes('faq')) {
          name = 'FAQs'
        } else {
          name = labelStr.charAt(0).toUpperCase() + labelStr.slice(1)
        }
        return { id: p && typeof p === 'object' ? p.id : null, name, label: labelStr }
      })

      const uniqueMapped = mapped.filter(
        (tab, index, tabs) => tabs.findIndex((candidate) => candidate.name === tab.name) === index,
      )

      // Ajouter Menu (lien statique) juste à côté
      uniqueMapped.push({ id: null, name: 'Menu', label: 'Au Menu' })
      uniqueMapped.push({ id: null, name: 'Wifi', label: 'Wi-Fi' })

      return uniqueMapped
    },
    dynamicTabNames() {
      const names = this.onglets.map((o) => o.name).filter((name) => name !== 'Menu' && name !== 'Wifi')
      const defaultNames = ['Accueil', 'Chambres', 'Chambres2', 'Services', 'FAQs']
      defaultNames.forEach((name) => {
        if (!names.includes(name)) {
          names.push(name)
        }
      })
      return names
    },
    swipeTabNames() {
      return this.onglets.map((tab) => tab.name)
    },
    currentPageId() {
      const currentTab = this.onglets.find((o) => o.name === this.page)
      if (currentTab && currentTab.id !== undefined && currentTab.id !== null) {
        return currentTab.id
      }
      const fallbacks = {
        Accueil: 1,
        Chambres: 2,
        Services: 3,
        FAQs: 4,
      }
      return fallbacks[this.page] || null
    },
  },
}
</script>

<template>
  <q-page class="home-page bg-white overflow-hidden q-pb-xl">
    <!-- Premium Loader Overlay -->
    <transition name="fade">
      <div v-if="isTranslating" class="premium-loader-overlay">
        <div class="loader-content text-center">
          <q-spinner-tail color="primary" size="64px" />
          <div class="loader-text text-serif q-mt-lg">
            {{
              langue === 'En'
                ? 'Translation in progress...'
                : 'Restauration de la version originale...'
            }}
          </div>
          <div class="loader-subtext text-serif q-mt-sm">La Villa Saint-Jean</div>
        </div>
      </div>
    </transition>

    <!-- Welcome Gate Overlay -->
    <transition name="fade-gate">
      <div v-if="showWelcomeGate" class="welcome-gate-overlay" @click="closeWelcomeGate">
        <!-- Floating Animated Background Orbs -->
        <div class="liquid-orb orb-1"></div>
        <div class="liquid-orb orb-2"></div>
        <div class="liquid-orb orb-3"></div>

        <div class="welcome-gate-glass text-center">
          <div class="welcome-gate-glass-inner">
            <!-- Lang Switcher Capsule inside Welcome Gate -->
            <div class="lang-switcher-capsule gate-lang-switcher row items-center no-wrap notranslate" @click.stop>
              <div
                class="lang-item cursor-pointer text-center"
                :class="{ 'active-lang-item': langue === 'Fr' }"
                @click="switchLanguage('Fr')"
              >
                FR
              </div>
              <div
                class="lang-item cursor-pointer text-center"
                :class="{ 'active-lang-item': langue === 'En' }"
                @click="switchLanguage('En')"
              >
                EN
              </div>
            </div>

            <!-- Decorative Background Details -->
            <div class="decorative-ring"></div>



            <!-- Personalized Greeting -->
            <div class="welcome-gate-greeting text-serif q-px-lg">
              <template v-if="!isClientIdentityReady">
                <q-spinner-tail color="white" size="44px" aria-label="Chargement du client" />
              </template>
              <template v-else-if="lastKnownClientName">
                <span class="greeting-pre anim-pre">{{
                  langue === 'En' ? 'Hello Dear' : 'Bonjour Cher(e)'
                }}</span>
                <h1 class="client-name anim-title notranslate">{{ lastKnownClientName }}</h1>
                <div class="greeting-sub anim-sub">
                  {{
                    langue === 'En'
                      ? 'Your exceptional stay begins here.'
                      : "Votre séjour d'exception commence ici."
                  }}
                </div>
              </template>
              <template v-else>
                <span class="greeting-pre anim-pre">{{
                  langue === 'En' ? 'Welcome to' : 'Bienvenue à'
                }}</span>
                <h2 class="welcome-hotel text-weight-bold anim-title notranslate"> LA VILLA SAINT-JEAN </h2>
                <div class="greeting-sub anim-sub">
                  {{ langue === 'En' ? 'Welcome home.' : 'Bienvenue chez vous.' }}
                </div>
              </template>
            </div>

            <!-- Elegant Line Divider -->
            <div class="elegant-divider anim-divider">
              <div class="divider-line"></div>
              <img src="../assets/img/logo.png" alt="Logo" class="divider-logo" />
              <div class="divider-line"></div>
            </div>

            <!-- WiFi & Annonce in Welcome Gate -->
            <div v-if="annonce" class="welcome-gate-info-container q-mt-md q-px-md" @click.stop>
              <!-- WiFi Access info -->
              <div
                v-if="annonce.motdepasseWifi"
                class="gate-wifi-box row no-wrap items-center justify-center q-py-sm q-px-md q-mb-md notranslate"
              >
                <q-icon name="sym_o_wifi" size="xs" class="q-mr-xs text-primary" />
                <span class="text-caption text-weight-medium text-white op-80 q-mr-sm"
                  >Wi-Fi: Villa Saint-Jean</span
                >
                <span
                  class="text-caption text-weight-bold text-primary font-mono"
                  style="letter-spacing: 0.5px"
                  >{{ annonce.motdepasseWifi }}</span
                >
              </div>

              <!-- WiFi QR Code in Welcome Gate -->
              <div v-if="annonce.qrcode" class="row justify-center q-mb-md notranslate">
                <q-img
                  :src="annonce.qrcode.startsWith('/') ? 'https://testoikos.lavillastjean.com/api/public' + annonce.qrcode : 'https://testoikos.lavillastjean.com/api/public/' + annonce.qrcode"
                  alt="QR Code"
                  class="annonce-qrcode"
                  style="max-width: 140px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15);"
                />
              </div>

              <!-- Announcement Box -->
              <div
                v-if="annonce.titre || annonce.texte"
                class="gate-annonce-box q-pa-md text-left cursor-pointer"
                style="transition: background 0.3s"
                @click="showFullAnnonceDialog = true"
              >
                <div class="row items-center justify-between q-mb-xs">
                  <div class="row items-center">
                    <q-icon name="sym_o_campaign" size="xs" class="text-primary q-mr-xs" />
                    <span
                      class="text-caption text-grey-4 text-uppercase tracking-wider"
                      style="font-size: 0.65rem; letter-spacing: 0.5px"
                    >
                      {{ langue === 'En' ? 'Announcement' : 'Annonce de la Villa' }}
                    </span>
                  </div>
                  <q-icon name="sym_o_open_in_new" size="14px" class="text-primary op-80" />
                </div>
                <div
                  class="gate-annonce-titre text-subtitle2 text-weight-bold text-white leading-tight q-mb-xs"
                  style="font-size: 0.85rem"
                >
                  {{ annonce.titre }}
                </div>
                <div
                  class="gate-annonce-texte text-caption text-white op-85 leading-relaxed overflow-hidden"
                  style="
                    font-size: 0.8rem;
                    display: -webkit-box;
                    -webkit-line-clamp: 4;
                    -webkit-box-orient: vertical;
                    line-clamp: 4;
                    max-height: 76px;
                  "
                >
                  {{ stripHtmlTags(annonce.texte) }}
                </div>
                <div
                  class="text-primary text-weight-bold text-right q-mt-xs"
                  style="font-size: 0.7rem"
                >
                  {{ langue === 'En' ? 'Read more...' : 'Lire la suite...' }}
                </div>
              </div>
            </div>

            <!-- Premium Enter Button -->
            <div class="btn-container q-mt-lg anim-btn">
              <q-btn
                :label="langue === 'En' ? 'Continue' : 'Continuer'"
                :ripple="false"
                unelevated
                rounded
                class="enter-app-btn text-weight-bold"
                @click.stop="closeWelcomeGate"
              />
              <div class="enter-instruction-hint text-white q-mt-md">
                {{
                  langue === 'En'
                    ? 'or tap anywhere to enter'
                    : "ou appuyez n'importe où pour entrer"
                }}
              </div>
            </div>
          </div>
        </div>

        <!-- Local Full Announcement Modal (Welcome Gate) -->
        <transition name="fade">
          <div v-if="showFullAnnonceDialog" class="local-annonce-modal" @click.stop>
            <div class="local-annonce-card">
              <div class="row items-center q-pb-none justify-between q-mb-md flex-shrink-0">
                <div class="row items-center">
                  <q-icon name="sym_o_campaign" size="sm" class="text-primary q-mr-sm" />
                  <span
                    class="text-subtitle2 text-grey-4 text-uppercase tracking-wider"
                    style="font-size: 0.75rem"
                  >
                    {{ langue === 'En' ? 'Announcement' : 'Annonce de la Villa' }}
                  </span>
                </div>
                <q-btn
                  icon="close"
                  flat
                  round
                  dense
                  color="grey-4"
                  @click="showFullAnnonceDialog = false"
                />
              </div>

              <div class="local-annonce-body">
                <h2
                  class="text-serif text-weight-bold q-mt-none q-mb-sm text-white text-left flex-shrink-0"
                  style="font-size: 1.3rem; line-height: 1.3"
                >
                  {{ annonce.titre }}
                </h2>
                <div
                  class="annonce-content wysiwyg-content text-body2 text-grey-3 leading-relaxed overflow-y-auto q-pr-sm text-left"
                  v-html="annonce.texte"
                ></div>
                </div>

              <!-- Action button at bottom to enter the app directly -->
              <div class="row justify-center q-pt-md flex-shrink-0">
                <q-btn
                  :label="langue === 'En' ? 'Continue' : 'Continuer'"
                  :ripple="false"
                  unelevated
                  rounded
                  class="enter-app-btn text-weight-bold"
                  style="width: 100%; max-width: 280px"
                  @click="closeWelcomeGate"
                />
              </div>
            </div>
          </div>
        </transition>
      </div>
    </transition>

    <!-- Top Blur Band for scrolling content -->
    <transition name="fade">
      <div v-if="isScrolled" class="top-blur-band"></div>
    </transition>

    <!-- Fixed Footer Banner -->
    <div
      v-if="page === 'Accueil'"
      class="footer-banner text-center text-weight-bold animate__animated animate__fadeInUp"
    >
      {{ langue === 'En' ? 'Welcome to ' : 'Bienvenue à ' }}<span class="notranslate"> La Villa Saint-Jean </span>,{{ langue === 'En' ? ' welcome home.' : ' bienvenue chez vous.' }}
    </div>

    <div class="hero-section">
      <div class="hero-overlay"></div>

      <!-- Top Navigation -->
      <div
        class="top-nav row justify-between items-start q-px-lg q-pt-lg z-top"
        :class="{ 'scrolled-nav': isScrolled }"
      >
        <!-- Left Icons -->
        <div class="row items-center q-gutter-md">
          <q-btn flat round dense class="custom-icon-btn" @click="ouvrirReglages" v-if="!chambre">
            <q-icon name="sym_o_person" size="md" />
          </q-btn>
          <q-btn
            flat
            round
            dense
            class="custom-icon-btn"
            @click="showWifiDialog = true"
            v-if="annonce"
          >
            <q-icon name="sym_o_info" size="md" />
          </q-btn>
          <q-btn flat round dense class="custom-icon-btn" @click="setPage('Commandes')">
            <q-icon name="sym_o_receipt_long" size="md" />
          </q-btn>
          <q-btn
            flat
            dense
            no-caps
            class="custom-icon-btn custom-cart-btn"
            @click="setPage('Cart')"
          >
            <span class="custom-cart-btn__label notranslate" translate="no">
              {{ langue === 'En' ? 'Cart' : 'Panier' }}
            </span>
            <q-icon name="sym_o_shopping_bag" size="md" />
            <q-badge
              color="negative"
              floating
              rounded
              v-if="panier && panier.length > 0"
              class="badge-float notranslate"
            >
              {{ panier.length }}
            </q-badge>
          </q-btn>
        </div>

        <!-- Right Lang Switcher Capsule -->
        <div class="lang-switcher-capsule row items-center no-wrap notranslate">
          <div
            class="lang-item cursor-pointer text-center"
            :class="{ 'active-lang-item': langue === 'Fr' }"
            @click="switchLanguage('Fr')"
          >
            FR
          </div>
          <div
            class="lang-item cursor-pointer text-center"
            :class="{ 'active-lang-item': langue === 'En' }"
            @click="switchLanguage('En')"
          >
            EN
          </div>
        </div>
      </div>

      <!-- Hero Text -->
      <div class="hero-text q-px-lg">
        <h1 class="text-serif text-white q-my-none notranslate" style="font-weight: 400; opacity: 0.9; line-height: 1.4;">
          {{ lastKnownClientName ? (langue === 'En' ? 'Hello ' + lastKnownClientName + ', welcome to' : 'Bonjour ' + lastKnownClientName + ', bienvenue à') : (langue === 'En' ? 'Hello, welcome to' : 'Bonjour, bienvenue à') }}
        </h1>
        <h2 class="text-serif text-white text-weight-bold q-mt-xs q-mb-none notranslate">
          LA VILLA SAINT-JEAN
        </h2>
        <div class="room-badge notranslate" v-if="chambre">
          <q-icon
            name="sym_o_meeting_room"
            size="xs"
            class="q-mr-xs"
            style="vertical-align: middle"
          />
          <span style="vertical-align: middle">{{ translateRoom(chambre) }}</span>
        </div>
      </div>
    </div>

    <!-- Main Content Overlapping Hero -->
    <div class="main-content-wrapper bg-white">
      <!-- Drag Handle for Mobile Sheet Feel -->
      <div class="sheet-handle row justify-center q-py-sm">
        <div class="handle-bar"></div>
      </div>

      <!-- Custom Tabs -->
      <div
        class="custom-tabs-wrapper"
        :class="{
          'has-left-indicator': showLeftScrollIndicator,
          'has-right-indicator': showRightScrollIndicator,
        }"
      >
        <div class="custom-tabs-container" ref="tabsContainer" @scroll="checkTabsScroll">
          <div
            v-for="t in onglets"
            :key="t.name"
            class="custom-tab-pill cursor-pointer text-weight-bold text-center"
            :class="{ active: page === t.name || (t.name === 'Chambres' && page === 'Chambres2') }"
            @click="setPage(t.name)"
          >
            {{ t.label }}
          </div>
        </div>
      </div>

      <!-- Global Alerts -->
      <div class="q-px-lg">
        <q-banner v-if="!bloc || !chambre" class="premium-warning-banner q-mb-md">
          <q-icon name="sym_o_warning" size="sm" />
          <span
            >Veuillez renseigner les informations de la chambre pour utiliser normalement
            l'application.</span
          >
        </q-banner>
      </div>

      <!-- Content Area -->
      <div class="q-px-lg q-pb-lg">
        <div
          class="tab-panels-swipe-area"
          @touchstart="handleSwipeStart"
          @touchend="handleSwipeEnd"
          @touchcancel="handleSwipeCancel"
        >
        <q-tab-panels v-model="page" animated class="bg-transparent">
          <!-- Tab: Default (Video) for dynamic page names -->
          <q-tab-panel v-for="t in dynamicTabNames" :key="t" :name="t" class="q-pa-none">
            <VideoSection
              v-if="page === t"
              :base-url="link"
              :language="langue"
              :section="t"
              :video="videos"
            />

            <!-- FAQs Accordion Component -->
            <div
              v-if="t === 'FAQs' && faqs && faqs.length > 0"
              class="faqs-accordion-container q-mt-lg q-mb-xl"
            >
              <h3
                class="text-serif text-primary text-weight-bold q-mb-md notranslate"
                style="font-size: 1.5rem; margin-top: 2rem"
              >
                {{ langue === 'En' ? 'Frequently Asked Questions' : 'Questions Fréquentes' }}
              </h3>

              <q-list class="premium-faq-list q-gutter-y-sm">
                <q-expansion-item
                  v-for="faq in faqs"
                  :key="faq.id"
                  class="premium-faq-card overflow-hidden shadow-1"
                  header-class="text-weight-bold text-dark q-py-md text-subtitle1"
                  expand-icon-class="text-primary"
                  :label="faq.question"
                  dense
                >
                  <q-card class="bg-grey-1">
                    <q-card-section class="text-grey-8 text-body2 q-py-md q-px-lg leading-relaxed">
                      {{ faq.reponse }}
                    </q-card-section>
                  </q-card>
                </q-expansion-item>
              </q-list>
            </div>
          </q-tab-panel>

          <!-- Tab: Menu -->
          <q-tab-panel name="Menu" class="q-pa-none q-mb-lg">
            <div
              v-if="articles === null || articles.length === 0"
              class="text-center q-pa-xl bg-grey-1 rounded-borders animate__animated animate__fadeIn"
              style="border-radius: 30px"
            >
              <q-img
                src="../assets/img/chic_empty_state.png"
                width="220px"
                class="q-mb-lg opacity-80"
              />
              <div class="text-grey-8 text-subtitle1 text-weight-medium">
                Une erreur s'est produite lors de la récupération du contenu.
              </div>
              <div class="text-grey-6 text-caption q-mt-sm">
                Notre menu est en cours de mise à jour.
              </div>
            </div>

            <div v-else>
              <!-- Segmented Sliding Control -->
              <div class="segmented-control-wrapper q-mx-auto q-mb-xl q-mt-sm">
                <div class="segmented-control row no-wrap relative-position">
                  <div
                    class="segmented-slider"
                    :style="{
                      transform: menuType === 'Restaurant' ? 'translateX(0)' : 'translateX(100%)',
                    }"
                  ></div>
                  <div
                    class="segmented-item col text-center cursor-pointer text-weight-bold"
                    :class="{ active: menuType === 'Restaurant' }"
                    @click="menuType = 'Restaurant'"
                  >
                    <q-icon name="sym_o_restaurant" size="18px" class="q-mr-xs" />
                    <span>Repas</span>
                  </div>
                  <div
                    class="segmented-item col text-center cursor-pointer text-weight-bold"
                    :class="{ active: menuType === 'Bar' }"
                    @click="menuType = 'Bar'"
                  >
                    <q-icon name="sym_o_local_bar" size="18px" class="q-mr-xs" />
                    <span>Boissons</span>
                  </div>
                </div>
              </div>

              <MenuSearchField
                v-model="menuSearchQuery"
                :language="langue"
                :result-count="articlesFiltresTotal.length"
              />

              <MenuTranslationIndex
                :items="menuSearchIndexItems"
                :language="langue"
                @indexed="updateMenuTranslatedNames"
                @translation-needed="translateCurrentDOM"
              />

              <div>
                <div
                  v-if="articlesFiltresTotal.length === 0"
                  class="menu-search-empty notranslate"
                  translate="no"
                >
                  <q-icon name="sym_o_search_off" size="38px" color="primary" />
                  <div class="menu-search-empty__title">
                    {{ menuEmptyTitle }}
                  </div>
                  <div class="menu-search-empty__message">
                    {{ menuEmptyMessage }}
                  </div>
                  <q-btn
                    v-if="menuSearchQuery"
                    flat
                    no-caps
                    color="primary"
                    icon="sym_o_close"
                    :label="langue === 'En' ? 'Clear search' : 'Effacer la recherche'"
                    @click="menuSearchQuery = ''"
                  />
                </div>

                <div v-else class="row q-col-gutter-md">
                  <div
                    class="col-12 col-sm-6 col-md-4 col-lg-3"
                    v-for="(article, index) in articlesFiltres"
                    :key="article.id || `${article.source}-${article.nom}`"
                  >
                    <MenuCard
                      :image-url="getArticleImage(article)"
                      :index="index"
                      :item="article"
                      :language="langue"
                      @add="ajouterPanier"
                      @select="ouvrirProduit"
                    />
                  </div>
                </div>

                <!-- "Voir plus" Button -->
                <div
                  v-if="itemsToShow < articlesFiltresTotal.length"
                  class="row justify-center q-mt-xl q-mb-md"
                >
                  <q-btn
                    label="Voir plus"
                    color="primary"
                    unelevated
                    rounded
                    class="q-px-xl text-weight-bold premium-btn"
                    @click="chargerPlusArticles"
                  />
                </div>
              </div>
            </div>
          </q-tab-panel>

          <!-- Tab: Cart -->
          <q-tab-panel name="Cart" class="q-pa-none q-mb-lg">
            <div class="row justify-between items-center q-mb-lg">
              <div
                class="text-h4 text-weight-bold q-my-none notranslate"
                style="color: #8d162f"
                translate="no"
              >
                {{ langue === 'En' ? 'Cart' : 'Panier' }}
              </div>
              <q-btn
                v-if="panier && panier.length > 0"
                flat
                rounded
                dense
                color="negative"
                icon="sym_o_delete_sweep"
                :label="langue === 'En' ? 'Clear' : 'Vider'"
                class="q-px-md text-weight-bold"
                style="background: rgba(239, 83, 80, 0.08);"
                @click="confirmerViderPanier"
              />
            </div>

            <div
              v-if="!panier || panier.length === 0"
              class="text-center q-pa-xl empty-state-container"
            >
              <q-img src="../assets/img/cart.png" width="120px" class="q-mb-md opacity-70" />
              <div class="text-grey-7 text-h6 text-weight-medium notranslate" translate="no">
                {{ langue === 'En' ? 'Your cart is empty' : 'Votre panier est vide' }}
              </div>
              <div class="text-grey-5 q-mt-sm notranslate" translate="no">
                {{
                  langue === 'En'
                    ? 'Discover our delights in the menu tab and start ordering.'
                    : "Découvrez nos délices dans l'onglet menu et commencez à commander."
                }}
              </div>
              <q-btn
                label="Voir le menu"
                color="primary"
                rounded
                unelevated
                class="q-mt-lg q-px-xl text-weight-bold premium-btn"
                @click="setPage('Menu')"
              />
            </div>

            <div v-else class="cart-container-modern">
              <!-- Cart Items List -->
              <div class="cart-items-list">
                <div class="cart-item-row" v-for="(article, index) in panier" :key="index">
                  <!-- Product Image -->
                  <div class="cart-item-img-wrapper">
                    <q-img :src="getArticleImage(article)" class="cart-item-img" loading="lazy">
                      <template v-slot:error>
                        <q-img
                          v-if="article.source === 'Bar'"
                          src="../assets/img/drink.png"
                          class="cart-item-img"
                        />
                        <q-img v-else src="../assets/img/food.png" class="cart-item-img" />
                      </template>
                    </q-img>
                  </div>

                  <!-- Product Details -->
                  <div class="cart-item-details">
                    <div class="row justify-between items-start no-wrap">
                      <div class="cart-item-name ellipsis-2-lines">{{ article.nom }}</div>
                      <q-btn
                        icon="sym_o_close"
                        color="grey-6"
                        flat
                        round
                        dense
                        class="delete-item-btn"
                        @click="supprimerProduit(index)"
                      />
                    </div>
                    <div class="text-caption text-grey-6 q-mt-xs notranslate" style="font-size: 0.75rem;">
                      {{ article.prix }} F
                    </div>

                    <div class="row justify-between items-center q-mt-sm">
                      <div class="cart-item-price-total">
                        {{ article.prix * article.quantite }} F
                      </div>

                      <!-- Modern Stepper capsule -->
                      <div class="stepper-capsule row items-center no-wrap">
                        <q-btn
                          dense
                          flat
                          round
                          icon="sym_o_remove"
                          class="stepper-btn"
                          @click="decrementerQuantite(index)"
                          :disable="article.quantite <= 1"
                        />
                        <span class="stepper-value text-weight-bold">{{ article.quantite }}</span>
                        <q-btn
                          dense
                          flat
                          round
                          icon="sym_o_add"
                          class="stepper-btn"
                          @click="incrementerQuantite(index)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Modern Checkout Summary -->
              <div class="checkout-summary-card">
                <div class="row justify-between items-center q-mb-md">
                  <span class="summary-label">Total de la commande</span>
                  <span class="summary-value">{{ totalPanier }} F</span>
                </div>
                <q-btn
                  color="primary"
                  size="lg"
                  rounded
                  no-caps
                  unelevated
                  class="full-width checkout-btn"
                  :class="{ 'disabled-btn-style': !lastKnownClientName }"
                  @click="validerPanier"
                >
                  <q-icon name="sym_o_shopping_cart_checkout" class="q-mr-sm" />
                  Confirmer la commande
                </q-btn>
              </div>
            </div>
          </q-tab-panel>

          <!-- Tab: Commandes -->
          <q-tab-panel name="Commandes" class="q-pa-none q-mb-lg">
            <div class="text-h4 text-weight-bold q-mb-lg" style="color: #8d162f">Mes Commandes</div>

            <div
              v-if="
                !$store.state.mesCommandesSession || $store.state.mesCommandesSession.length === 0
              "
              class="text-center q-pa-xl empty-state-container"
            >
              <q-icon
                name="sym_o_receipt_long"
                size="80px"
                color="grey-4"
                class="q-mb-md opacity-70"
              />
              <div class="text-grey-7 text-h6 text-weight-medium">Aucune commande récente</div>
              <div class="text-grey-5 q-mt-sm">Vos commandes passées s'afficheront ici.</div>
            </div>

            <div v-else class="orders-container-modern">
              <div class="orders-list">
                <div
                  class="order-card-modern"
                  v-for="(commande, index) in $store.state.mesCommandesSession.slice().reverse()"
                  :key="index"
                >
                  <!-- Order Header -->
                  <div class="order-header-row row justify-between items-center">
                    <div class="order-date-wrapper row items-center">
                      <q-icon name="sym_o_calendar_today" size="xs" class="q-mr-xs text-grey-6" />
                      <span class="order-date-text text-weight-medium">
                        {{
                          new Date(commande.date).toLocaleString(
                            langue.toLowerCase() === 'en' ? 'en-US' : 'fr-FR',
                            {
                              timeZone: 'Africa/Porto-Novo',
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            },
                          )
                        }}
                      </span>
                    </div>
                    <q-badge
                      :color="commande.statut === 'Enregistrée' ? 'positive' : 'warning'"
                      class="order-status-badge text-weight-bold q-px-sm q-py-xs"
                    >
                      {{ translateStatus(commande.statut) }}
                    </q-badge>
                  </div>

                  <q-separator class="order-divider" />

                  <!-- Order Articles List -->
                  <div class="order-items-list q-py-xs">
                    <div
                      v-for="(article, i) in commande.articles"
                      :key="i"
                      class="order-item-line row justify-between text-grey-8"
                    >
                      <div class="order-item-name-qty">
                        <span class="qty-badge">{{ article.quantite }}x</span>
                        <span class="name-text">{{ article.nom }}</span>
                      </div>
                      <div class="order-item-price-sum text-weight-medium">
                        {{ article.prix * article.quantite }} F
                      </div>
                    </div>
                  </div>

                  <q-separator class="order-divider" />

                  <!-- Order Total -->
                  <div class="order-footer-row row justify-between items-center">
                    <div class="total-label text-weight-bold text-grey-7">Total réglé</div>
                    <div class="total-value">{{ commande.total }} F</div>
                  </div>
                </div>
              </div>
            </div>
          </q-tab-panel>

          <!-- Tab: Wifi -->
          <q-tab-panel name="Wifi" class="q-pa-none q-mb-lg">
            <div
              class="wifi-page-card q-pa-xl text-center shadow-1"
              style="border-radius: 30px; background: #fafafa; border: 1px solid rgba(0,0,0,0.05);"
            >
              <div class="row justify-center q-mb-md">
                <div
                  class="wifi-icon-badge"
                  style="
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: #8D162F;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  "
                >
                  <q-icon name="sym_o_wifi" size="md" class="text-white" />
                </div>
              </div>

              <h3 class="text-serif text-weight-bold text-dark q-mt-sm q-mb-xs" style="font-size: 1.6rem;">
                {{ langue === 'En' ? 'Wi-Fi Connection' : 'Connexion Wi-Fi' }}
              </h3>
              <p class="text-grey-6 text-caption q-mb-lg">
                {{ langue === 'En' ? 'Scan the QR code or enter password below' : 'Scannez le code QR ou saisissez le mot de passe ci-dessous' }}
              </p>

              <!-- Wi-Fi Password -->
              <div class="wifi-info-row q-mx-auto q-mb-xl" style="max-width: 320px;" v-if="annonce && annonce.motdepasseWifi">
                <div class="text-caption text-grey-7 text-uppercase tracking-wider text-center" style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px;">
                  {{ langue === 'En' ? 'Password' : 'Mot de passe' }}
                </div>
                <div class="row items-center justify-center bg-white q-py-md q-px-md q-mt-xs shadow-sm" style="border-radius: 12px; border: 1px solid rgba(0,0,0,0.04);">
                  <span class="text-h6 text-weight-bolder text-primary font-mono select-all" style="letter-spacing: 1px;">{{ annonce.motdepasseWifi }}</span>
                </div>
              </div>

              <!-- QR Code -->
              <div v-if="annonce && annonce.qrcode" class="wifi-qrcode-wrapper q-mx-auto q-mt-md" style="max-width: 220px;">
                <div class="text-caption text-grey-5 text-uppercase tracking-wider q-mb-sm" style="font-size: 0.7rem; font-weight: 600;">
                  {{ langue === 'En' ? 'Quick Scan' : 'Connexion Rapide' }}
                </div>
                <q-img
                  :src="annonce.qrcode.startsWith('/') ? 'https://testoikos.lavillastjean.com/api/public' + annonce.qrcode : 'https://testoikos.lavillastjean.com/api/public/' + annonce.qrcode"
                  alt="Wi-Fi QR Code"
                  class="wifi-page-qrcode"
                  style="border-radius: 16px; border: 1px solid rgba(0,0,0,0.08);"
                />
              </div>
            </div>
          </q-tab-panel>
        </q-tab-panels>
        </div>
      </div>
    </div>

    <!-- Settings Dialog -->
    <ProductDetailDialog
      v-model="showProductDialog"
      :image-url="selectedProductImage"
      :item="selectedMenuItem"
      :language="langue"
      @add="ajouterPanier"
    />

    <q-dialog v-model="showSettingsModal" :persistent="!bloc || !chambre">
      <q-card class="settings-card" style="min-width: 350px; border-radius: 24px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold text-dark">Réglages</div>
          <q-space />
          <q-btn icon="sym_o_close" flat round dense v-close-popup v-if="bloc && chambre" />
        </q-card-section>

        <q-card-section class="q-pt-sm text-grey-9 text-body1">
          Enregistrez ces informations pour le bon fonctionnement de l'application.
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="setReglages" class="q-gutter-md">
            <q-select
              outlined
              color="primary"
              label-color="grey-7"
              v-model="nomChambre"
              :options="chambresOptions"
              label="Sélectionner la chambre"
              options-dense
              @popup-show="translateCurrentDOM"
              class="custom-select-white notranslate"
              popup-content-class="custom-select-popup notranslate"
            />

            <div class="row justify-center q-mt-lg">
              <q-btn
                label="Enregistrer"
                type="submit"
                color="primary"
                unelevated
                rounded
                size="md"
                class="q-px-xl"
                :disable="!validatedFields"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Order Confirmation Dialog -->
    <q-dialog v-model="showConfirmOrderModal">
      <q-card
        class="settings-card"
        style="min-width: 320px; border-radius: 24px; padding: 12px 8px"
      >
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold text-dark">
            {{ langue === 'En' ? 'Confirm Order' : 'Confirmer la commande' }}
          </div>
          <q-space />
          <q-btn icon="sym_o_close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md text-grey-9 text-body1">
          {{
            langue === 'En'
              ? 'By confirming, the order will be automatically added to your bill.'
              : 'En confirmant, la commande sera automatiquement rajoutée à votre facture.'
          }}
        </q-card-section>

        <q-card-actions align="center" class="q-mt-md">
          <q-btn
            flat
            rounded
            :label="langue === 'En' ? 'Cancel' : 'Annuler'"
            color="grey-7"
            v-close-popup
            class="q-px-lg text-weight-bold"
          />
          <q-btn
            unelevated
            rounded
            :label="langue === 'En' ? 'Confirm' : 'Confirmer'"
            color="primary"
            @click="ajouterCommande"
            class="q-px-xl text-weight-bold premium-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Wi-Fi and Announcement Dialog -->
    <q-dialog
      v-model="showWifiDialog"
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="column no-wrap bg-white" style="height: 100vh; width: 100vw">
        <!-- Fixed Header -->
        <q-card-section
          class="row items-center justify-between q-py-md q-px-lg border-bottom flex-shrink-0"
          style="border-bottom: 1px solid rgba(0, 0, 0, 0.05)"
        >
          <div class="row items-center">
            <div
              class="wifi-icon-container q-mr-md"
              style="
                width: 42px;
                height: 42px;
                border-radius: 12px;
                background: rgba(141, 22, 47, 0.08);
                display: flex;
                align-items: center;
                justify-content: center;
              "
            >
              <q-icon name="sym_o_info" size="sm" class="text-primary" />
            </div>
            <div
              class="text-h6 text-weight-bold text-dark"
              style="font-family: 'Outfit', sans-serif"
            >
              {{ langue === 'En' ? 'Villa Notice' : 'Annonce de la Villa' }}
            </div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup color="grey-7" size="md" />
        </q-card-section>

        <!-- Scrollable Body Content -->
          <q-card-section class="col column no-wrap q-pa-lg" style="min-height: 0">
            <div class="col overflow-auto" style="min-height: 0">

          <!-- Announcement Box -->
            <div
              v-if="annonce && (annonce.titre || annonce.texte)"
            class="q-pa-md bg-grey-1"
            style="border-radius: 20px; border: 1px solid rgba(0, 0, 0, 0.05)"
          >
            <div class="row items-center q-mb-sm">
              <q-icon name="sym_o_campaign" size="xs" class="text-primary q-mr-xs" />
              <span
                class="text-subtitle2 text-grey-6 text-uppercase tracking-wider"
                style="font-size: 0.75rem; letter-spacing: 0.5px"
                >{{ langue === 'En' ? 'Notice' : 'Annonce' }}</span
              >
            </div>
            <div class="text-subtitle1 text-weight-bold text-dark q-mb-sm" style="line-height: 1.3">
              {{ annonce.titre }}
            </div>
            <div
              class="text-body2 text-grey-8 leading-relaxed wysiwyg-content"
              v-html="annonce.texte"
            ></div>
          </div>

            </div>

          <div class="q-pt-md text-center text-caption text-grey-6">
            <span class="text-weight-bold">Version - {{ appVersion }}</span>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Vue-managed back-to-top button -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="showBackToTop" class="back-to-top-icon" @click="scrollToTop">
          <i class="fa-solid fa-arrow-up"></i>
        </div>
      </transition>
    </teleport>

    <teleport to="body">
      <transition-group name="cart-toast-fade" tag="div" class="cart-toast-stack">
        <div
          v-for="notification in cartNotifications"
          :key="notification.id"
          class="cart-toast"
        >
          <span class="cart-toast__quantity">{{ notification.quantity }}</span>
          <q-icon name="sym_o_shopping_bag" class="cart-toast__icon" size="24px" />
          <div class="cart-toast__message">
            {{ getCartNotificationMessage(notification.productName) }}
          </div>
          <q-btn
            flat
            no-caps
            dense
            class="cart-toast__action"
            :label="langue === 'En' ? 'View Cart' : 'Voir le panier'"
            @click="setPage('Cart')"
          />
        </div>
      </transition-group>
    </teleport>
  </q-page>
</template>

<style>
.cart-toast-stack {
  position: fixed;
  top: 110px;
  left: 50%;
  z-index: 9500;
  display: flex;
  width: min(92vw, 560px);
  transform: translateX(-50%);
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  pointer-events: none;
}
.cart-toast {
  position: relative;
  display: flex;
  min-height: 56px;
  align-items: center;
  gap: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #0b2b1b;
  color: #ffffff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  padding: 10px 14px;
  pointer-events: auto;
}
.cart-toast__quantity {
  position: absolute;
  top: -8px;
  left: -8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #d92323;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 4px 10px rgba(217, 35, 35, 0.35);
  z-index: 2;
}
.cart-toast__icon {
  flex: 0 0 auto;
  color: #c5a880;
}
.cart-toast__message {
  flex: 1 1 auto;
  color: #ffffff;
  font-family: 'Outfit', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.35;
}
.cart-toast__action {
  flex: 0 0 auto;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  font-weight: 700;
  padding: 4px 12px;
}
.cart-toast-fade-enter-active,
.cart-toast-fade-leave-active {
  transition: opacity 0.28s ease;
}
.cart-toast-fade-enter-from,
.cart-toast-fade-leave-to {
  opacity: 0;
}
.cart-toast-fade-move {
  transition: transform 0.22s ease;
}
.custom-select-white .q-field__control {
  background-color: #ffffff !important;
  border: 1.5px solid #dcdcdc !important;
  border-radius: 12px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02) !important;
  transition: all 0.3s ease !important;
}
.custom-select-white .q-field__native,
.custom-select-white .q-field__input,
.custom-select-white .q-field__native *,
.custom-select-white .q-field__input *,
.custom-select-white span,
.custom-select-white div {
  color: #616161 !important;
}
.custom-select-white .q-field__control:before,
.custom-select-white .q-field__control:after {
  display: none !important;
}
.custom-select-white.q-field--focused .q-field__control {
  border-color: var(--q-primary) !important;
  box-shadow: 0 0 0 3px rgba(141, 22, 47, 0.15) !important;
}

/* Premium Glassmorphic Cards for Announcement & WiFi */
.premium-glass-card {
  border-radius: 24px !important;
  background: rgba(255, 255, 255, 0.72) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04) !important;
  transition: all 0.3s ease;
}
.premium-glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(141, 22, 47, 0.08) !important;
  border-color: rgba(141, 22, 47, 0.15) !important;
}
.wifi-icon-container {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(141, 22, 47, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Welcome Gate Info Box styles */
.welcome-gate-info-container {
  width: 100%;
  max-width: 380px;
  margin-left: auto;
  margin-right: auto;
  z-index: 10;
}
.gate-wifi-box {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 12px;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}
.gate-wifi-box .q-btn {
  opacity: 0.85;
}
.gate-wifi-box .q-btn:hover {
  opacity: 1;
}
.gate-annonce-box {
  background: rgba(0, 0, 0, 0.25) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.op-80 {
  opacity: 0.8;
}
.op-90 {
  opacity: 0.9;
}

/* FAQs Premium Accordion styles */
.premium-faq-card {
  border-radius: 16px !important;
  background: rgba(255, 255, 255, 0.7) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03) !important;
}
.premium-faq-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08) !important;
  border-color: rgba(141, 22, 47, 0.2) !important;
}
.premium-faq-card .q-expansion-item__container {
  border-radius: 16px !important;
}
.premium-faq-card .q-card {
  border-radius: 0 0 16px 16px !important;
  border: none !important;
}

/* Optimize native scroll performance & momentum for horizontal categories container */
.custom-tabs-container {
  -webkit-overflow-scrolling: touch !important;
}

/* Avoid visual line artifact on the left during tab panel slide transitions */
.q-tab-panels,
.q-tab-panel,
.q-panel {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  overflow: hidden !important;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

/* Glassmorphic Top Blur Band to blur scrolled content above navigation capsule */
.top-blur-band {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 120px;
  z-index: 1998;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.97), rgba(255, 255, 255, 0.78));
  pointer-events: none;
  -webkit-mask-image: linear-gradient(to bottom, black 0%, black 65%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 0%, black 65%, transparent 100%);
}

/* Global viewport overflow fix for mobile */
html,
body {
  overflow-x: hidden !important;
  max-width: 100% !important;
  width: 100%;
}

/* Global Quasar color override for safety */
.text-primary,
.bg-primary {
  color: #8d162f !important;
}
.bg-primary {
  background-color: #8d162f !important;
  color: white !important;
}

/* Global scroll-to-top button styling override */
.back-to-top-icon {
  position: fixed;
  right: 24px;
  bottom: 105px !important; /* Stand above floating welcome banner (at bottom: 24px) */
  z-index: 1999 !important;
  width: 46px !important;
  height: 46px !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  border-radius: 50% !important; /* Soft circle shape */
  background: linear-gradient(
    135deg,
    #8d162f 0%,
    #a8243d 100%
  ) !important; /* Premium Bordeaux gradient */
  color: #ffffff !important;
  box-shadow: 0 8px 24px rgba(141, 22, 47, 0.35) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.2) !important;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
}
.back-to-top-icon:hover {
  transform: translateY(-4px) scale(1.08) !important;
  box-shadow: 0 12px 30px rgba(141, 22, 47, 0.45) !important;
  background: linear-gradient(135deg, #a8243d 0%, #8d162f 100%) !important;
}
.back-to-top-icon:active {
  transform: translateY(-2px) scale(0.92) !important;
  transition: transform 0.08s ease !important;
}
.back-to-top-icon i {
  font-size: 16px !important;
}

/* Masquer la barre d'outils, la bannière supérieure, les gadgets, les spinners et les iframes de Google Traduction */
.goog-te-banner-frame,
.goog-te-banner,
.goog-te-balloon-frame,
#goog-gt-tt,
.goog-te-menu-value,
iframe.goog-te-banner-frame,
.skiptranslate,
#google_translate_element,
.goog-te-spinner-pos,
.goog-te-spinner,
.goog-te-spinner-animation,
.goog-te-gadget,
.goog-te-gadget-simple,
.goog-te-gadget-icon,
.goog-te-gadget-lang {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  width: 0 !important;
  overflow: hidden !important;
}
body {
  top: 0 !important;
  position: static !important;
}
.goog-tooltip,
.goog-tooltip:hover {
  display: none !important;
  visibility: hidden !important;
}

/* Welcome Gate Overlay - Red Gradient with Liquid Orbs */
.welcome-gate-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #2d0208 0%, #5c0616 50%, #8d162f 100%);
  z-index: 99999;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

/* Liquid Glowing Orbs in Background */
.liquid-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.45;
  pointer-events: none;
  z-index: 0;
}
.orb-1 {
  top: -10%;
  left: -10%;
  width: 50vw;
  height: 50vw;
  background: radial-gradient(circle, #c5a880 0%, transparent 70%);
  animation: floatOrb1 18s ease-in-out infinite alternate;
}
.orb-2 {
  bottom: -15%;
  right: -10%;
  width: 60vw;
  height: 60vw;
  background: radial-gradient(circle, #a8243d 0%, transparent 70%);
  animation: floatOrb2 22s ease-in-out infinite alternate;
}
.orb-3 {
  top: 30%;
  right: 15%;
  width: 35vw;
  height: 35vw;
  background: radial-gradient(circle, #db3552 0%, transparent 70%);
  animation: floatOrb3 15s ease-in-out infinite alternate;
}

@keyframes floatOrb1 {
  0% {
    transform: translate(0, 0) scale(1);
  }
  100% {
    transform: translate(10%, 15%) scale(1.15);
  }
}
@keyframes floatOrb2 {
  0% {
    transform: translate(0, 0) scale(1);
  }
  100% {
    transform: translate(-10%, -10%) scale(0.9);
  }
}
@keyframes floatOrb3 {
  0% {
    transform: translate(0, 0) scale(1);
  }
  100% {
    transform: translate(-15%, 15%) scale(1.1);
  }
}

/* Glassmorphic luxury container */
.welcome-gate-glass {
  background: rgba(255, 255, 255, 0.04);
  border: none;
  border-radius: 40px;
  box-shadow:
    0 40px 100px rgba(0, 0, 0, 0.35),
    0 10px 30px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 10;
  max-width: 440px;
  width: 90%;
  padding: 1px; /* border thickness */
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Inner content container covering the rotating glow center */
.welcome-gate-glass-inner {
  background: rgba(26, 2, 6, 0.45); /* Less dark, more glassmorphic translucent bordeaux */
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border-radius: 39px;
  width: 100%;
  height: 100%;
  padding: 44px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
  position: relative;
}

.brand-badge {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.15);
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}
.brand-badge-icon {
  color: #c5a880; /* Gold */
}

/* Typography elements */
.welcome-gate-greeting .greeting-pre {
  font-size: 0.85rem;
  letter-spacing: 6px;
  text-transform: uppercase;
  font-weight: 600;
  color: #c5a880; /* Luxury gold label */
  display: block;
}

.welcome-gate-greeting .client-name,
.welcome-gate-greeting .welcome-hotel {
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.5px;
  margin: 8px 0;
  color: #ffffff; /* White for readability on dark background */
  text-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.welcome-gate-greeting .greeting-sub {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.75);
  font-style: italic;
  margin-top: 10px;
  font-weight: 400;
}

/* Elegant Line Divider */
.elegant-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70%;
  margin: 14px 0;
}
.divider-line {
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  flex-grow: 1;
}
.divider-icon {
  color: #c5a880;
  margin: 0 16px;
  opacity: 0.9;
}
.divider-logo {
  height: 60px;
  width: auto;
  margin: 0 16px;
  object-fit: contain;
  opacity: 0.9;
}

/* Decorative Background Details */
.decorative-ring {
  position: absolute;
  top: -80px;
  right: -80px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  pointer-events: none;
  animation: rotateRing 60s linear infinite;
}
@keyframes rotateRing {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Premium Gold Glass Enter Button */
.enter-app-btn {
  background: linear-gradient(135deg, #c5a880 0%, #b29367 100%) !important;
  color: #2d0208 !important;
  font-size: 1rem !important;
  padding: 12px 54px !important;
  border-radius: 30px !important;
  box-shadow: 0 10px 25px rgba(197, 168, 128, 0.35) !important;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
}
.enter-app-btn:hover {
  transform: translateY(-3px) scale(1.03) !important;
  box-shadow: 0 14px 35px rgba(197, 168, 128, 0.5) !important;
}

.enter-instruction-hint {
  font-size: 0.72rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 500;
  opacity: 0.7;
}

/* Compositor-only gate transition for older Android GPUs */
.fade-gate-enter-active {
  transition: opacity 0.32s ease-out;
}

.fade-gate-enter-from {
  opacity: 0;
}

.fade-gate-leave-active {
  pointer-events: none;
  backface-visibility: hidden;
  will-change: transform;
  transition: transform 0.52s cubic-bezier(0.22, 1, 0.36, 1);
}

.fade-gate-leave-to {
  transform: translate3d(0, -100%, 0);
}

.fade-gate-leave-active .liquid-orb,
.fade-gate-leave-active .decorative-ring,
.fade-gate-leave-active .welcome-gate-glass::before {
  animation-play-state: paused;
}

.welcome-gate-overlay.fade-gate-leave-active::before {
  animation-play-state: paused;
}

/* Luxury Staggered Entrance Animations */
.anim-logo {
  opacity: 0;
  transform: translateY(-25px);
  animation: gateFadeSlideDown 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.15s;
}

.anim-pre {
  opacity: 0;
  transform: translateY(20px);
  animation: gateFadeSlideUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.35s;
  display: block;
}

.anim-title {
  opacity: 0;
  transform: translateY(25px) scale(0.97);
  animation: gateTitleEntrance 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.55s;
}

.anim-sub {
  opacity: 0;
  transform: translateY(20px);
  animation: gateFadeSlideUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.75s;
}

.anim-divider {
  opacity: 0;
  transform: scaleX(0.1);
  animation: gateDividerEntrance 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.9s;
}

.anim-btn {
  opacity: 0;
  transform: translateY(25px);
  animation: gateFadeSlideUp 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 1.1s;
}

/* Ambient moving background glow */
.welcome-gate-overlay::before {
  content: '';
  position: absolute;
  top: -10%;
  left: -10%;
  right: -10%;
  bottom: -10%;
  background: radial-gradient(circle at 20% 20%, rgba(197, 168, 128, 0.12) 0%, transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(141, 22, 47, 0.06) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
  animation: gateAmbientDrift 25s ease-in-out infinite alternate;
}

/* Infinite rotating golden border spotlight glow */
.welcome-gate-glass::before {
  content: '';
  position: absolute;
  width: 250%;
  height: 250%;
  top: -75%;
  left: -75%;
  background: conic-gradient(from 0deg, transparent 35%, #c5a880 50%, transparent 65%);
  animation: rotateGlow 3.5s linear infinite;
  z-index: 1;
  opacity: 0.55; /* Soften the rotating gold beam intensity */
}

@keyframes rotateGlow {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Keyframes */
@keyframes gateFadeSlideDown {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes gateFadeSlideUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes gateTitleEntrance {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes gateDividerEntrance {
  to {
    opacity: 1;
    transform: scaleX(1);
  }
}

@keyframes gateAmbientDrift {
  0% {
    transform: translate(0, 0) scale(1);
  }
  100% {
    transform: translate(3%, 3%) scale(1.05);
  }
}

.goog-text-highlight {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
</style>

<style scoped>
/* Style Material Symbols to be ultra-thin and refined */
.material-symbols-outlined,
:deep(.material-symbols-outlined) {
  font-variation-settings:
    'wght' 200,
    'opsz' 24 !important;
}

/* Theme Variables & Base */
.home-page {
  --primary-color: #8d162f;
  --primary-rgb: 141, 22, 47;
  --accent-gold: #c5a880;
  --accent-gold-rgb: 197, 168, 128;
  --glass-bg: rgba(255, 255, 255, 0.45);
  --glass-border: rgba(255, 255, 255, 0.55);
  --glass-shadow: 0 12px 40px 0 rgba(141, 22, 47, 0.08);
  --glass-glow: 0 0 20px rgba(141, 22, 47, 0.15);
  background: radial-gradient(circle at top right, rgba(141, 22, 47, 0.03) 0%, #ffffff 60%);
}

/* Hero Section */
.hero-section {
  position: relative;
  height: 380px; /* Slimmer for mobile app proportion */
  background-image: url('../assets/img/banner/banner-01.jpg');
  background-size: cover;
  background-position: center;
  overflow: hidden;
}
.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.65) 0%,
    rgba(0, 0, 0, 0.35) 50%,
    rgba(10, 10, 10, 0.85) 100%
  );
  z-index: 1;
}

/* Top Navigation - Floating Liquid Glass Capsule */
.top-nav {
  position: fixed;
  top: 45px;
  left: 0;
  right: 0;
  transition:
    top 0.4s ease,
    left 0.4s ease,
    right 0.4s ease,
    padding 0.4s ease,
    background-color 0.4s ease,
    box-shadow 0.4s ease,
    border-color 0.4s ease;
  z-index: 2000;
  background: transparent;
  padding: 12px 24px !important;
  border-radius: 40px;
  border: 1px solid transparent !important;
}

.scrolled-nav {
  top: max(40px, env(safe-area-inset-top, 40px));
  left: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.6) !important;
  backdrop-filter: blur(25px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(25px) saturate(190%) !important;
  box-shadow:
    0 16px 40px rgba(141, 22, 47, 0.12),
    inset 0 1px 1px rgba(255, 255, 255, 0.85),
    inset 0 -1px 1px rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.45) !important;
  border-radius: 40px;
  padding: 10px 20px !important;
}

/* Glassmorphic Top Nav Buttons */
.custom-icon-btn {
  color: white;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  min-height: 44px;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.custom-icon-btn:hover {
  transform: scale(1.1) translateY(-2px);
  background: rgba(255, 255, 255, 0.28);
  border-color: rgba(255, 255, 255, 0.65);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}
.custom-cart-btn {
  width: auto;
  min-width: 94px;
  padding: 0 12px !important;
  border-radius: 24px;
}
.custom-cart-btn__label {
  color: inherit;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  margin-right: 6px;
}
.scrolled-nav .custom-icon-btn {
  color: #8d162f !important;
  background: rgba(141, 22, 47, 0.07);
  border: 1px solid rgba(141, 22, 47, 0.18);
  box-shadow: 0 2px 8px rgba(141, 22, 47, 0.04);
}
.scrolled-nav .custom-icon-btn:hover {
  background: rgba(141, 22, 47, 0.14);
  border-color: rgba(141, 22, 47, 0.35);
  box-shadow: 0 6px 16px rgba(141, 22, 47, 0.1);
  transform: scale(1.08) translateY(-1px);
}

.badge-float {
  top: -2px;
  right: -2px;
  padding: 4px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(239, 83, 80, 0.4);
  border: 1.5px solid white;
}
/* Segmented Lang Switcher Capsule */
.lang-switcher-capsule {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 24px;
  padding: 3px;
  display: flex;
  transition: all 0.4s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.gate-lang-switcher {
  position: relative;
  margin-top: 0px;
  margin-bottom: 28px;
  z-index: 10;
}

.scrolled-nav .lang-switcher-capsule {
  background: rgba(141, 22, 47, 0.05);
  border: 1px solid rgba(141, 22, 47, 0.15);
}

.lang-item {
  font-size: 11px;
  letter-spacing: 0.8px;
  padding: 6px 14px;
  border-radius: 20px;
  color: white;
  transition: all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
  font-weight: 700;
}

.scrolled-nav .lang-item {
  color: rgba(141, 22, 47, 0.7);
}

.lang-item.active-lang-item {
  background: white !important;
  color: #8d162f !important;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.scrolled-nav .lang-item.active-lang-item {
  background: #8d162f !important;
  color: white !important;
  box-shadow: 0 3px 8px rgba(141, 22, 47, 0.18);
}

/* Typography */
.text-serif {
  font-family: 'Outfit', sans-serif;
}
.hero-text {
  position: absolute;
  bottom: 85px; /* Safely above the overlapping white sheet (margin-top: -65px) */
  left: 0;
  right: 0;
  z-index: 2;
}
.personal-welcome {
  font-size: 1.1rem;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  margin-bottom: 6px;
  text-transform: capitalize;
  display: inline-flex;
  align-items: center;
  transition: opacity 0.3s ease;
}
.personal-welcome:hover {
  opacity: 0.9;
}
.animate-bounce {
  animation: bounce 1.2s infinite;
}
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(5px);
  }
}
.hero-text h1 {
  font-size: 1.4rem; /* Reduced from 1.8rem for better responsive scale on small screens */
  line-height: 1.1;
  letter-spacing: -0.5px;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.85);
}
.hero-text h2 {
  font-size: 1.85rem; /* Reduced from 2.2rem to prevent wrapping issues on mobile */
  line-height: 1.1;
  letter-spacing: -1.2px;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  background: linear-gradient(135deg, #ffffff 0%, #c5a880 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.room-badge {
  display: inline-flex;
  align-items: center;
  margin-top: 12px;
  padding: 6px 16px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #ffffff !important; /* Written in white as requested */
  background: rgba(255, 255, 255, 0.12); /* Frosted light background */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25); /* Sleek white outline */
  border-radius: 30px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 0px rgba(255, 255, 255, 0.2);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}
.room-badge:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.4);
}

@media (min-width: 768px) {
  .hero-section {
    height: 420px;
  }
  .hero-text {
    bottom: 95px;
  }
  .hero-text h1 {
    font-size: 2.1rem; /* Reduced from 2.6rem */
  }
  .hero-text h2 {
    font-size: 2.8rem; /* Reduced from 3.6rem */
  }
}

/* Main Content Overlay */
.main-content-wrapper {
  border-radius: 40px 40px 0 0;
  margin-top: -65px;
  position: relative;
  z-index: 10;
  min-height: 60vh;
  background: #ffffff !important;
  border-top: 1px solid rgba(141, 22, 47, 0.08) !important;
  box-shadow: 0 -20px 40px rgba(141, 22, 47, 0.02);
  padding-top: 10px;
}

/* Custom Nav Tabs - Horizontal Sliding Glass Capsule */
.custom-tabs-container {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  padding: 24px 24px 16px 24px;
  -webkit-overflow-scrolling: touch;
  -ms-overflow-style: none;
  scrollbar-width: none;
  width: 100%;
  box-sizing: border-box;
}
.custom-tabs-container::-webkit-scrollbar {
  display: none;
}
.custom-tab-pill {
  flex: 0 0 auto;
  border: 1px solid rgba(141, 22, 47, 0.18);
  color: #8d162f;
  border-radius: 30px;
  padding: 10px 22px;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 700;
  transition: all 0.45s cubic-bezier(0.165, 0.84, 0.44, 1);
  margin-right: 10px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}
.custom-tab-pill:hover {
  transform: translateY(-2px);
  background: rgba(141, 22, 47, 0.04);
  border-color: rgba(141, 22, 47, 0.4);
}
.custom-tab-pill.active {
  background: linear-gradient(135deg, #8d162f 0%, #a8243d 100%) !important;
  color: white !important;
  border-color: #8d162f;
  box-shadow:
    0 8px 24px rgba(141, 22, 47, 0.28),
    inset 0 1px 1px rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}
@media (min-width: 768px) {
  .custom-tab-pill {
    padding: 12px 28px;
    font-size: 15px;
    margin-right: 12px;
  }
}
.custom-tab-pill:last-child {
  margin-right: 24px;
}

/* Video Container */
.video-container {
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.6);
}
.custom-plyr {
  border-radius: 28px;
  overflow: hidden;
}

/* Plyr Custom Styling */
:deep(.plyr__control--overlaid) {
  background-color: #8d162f !important;
  opacity: 0.95;
  padding: 24px !important;
  box-shadow: 0 8px 24px rgba(141, 22, 47, 0.4) !important;
}

/* ------------------- Cart Tab Liquid Glass Redesign ------------------- */
.q-tab-panel[name='Cart'] .text-h4,
.q-tab-panel[name='Commandes'] .text-h4 {
  color: #8d162f !important;
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-top: 10px;
}

.q-tab-panel[name='Cart'] .menu-card {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.45) !important;
  backdrop-filter: blur(15px) saturate(120%);
  -webkit-backdrop-filter: blur(15px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.55) !important;
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.02),
    inset 0 1px 1px rgba(255, 255, 255, 0.6) !important;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  overflow: hidden;
}
.q-tab-panel[name='Cart'] .menu-card:hover {
  transform: translateY(-3px);
  box-shadow:
    0 16px 40px rgba(141, 22, 47, 0.06),
    inset 0 1px 1px rgba(255, 255, 255, 0.8) !important;
}

.q-tab-panel[name='Cart'] .cart-img {
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border: 1.5px solid white;
}

.q-tab-panel[name='Cart'] .custom-close-btn {
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  top: 8px;
  right: 8px;
}
.q-tab-panel[name='Cart'] .custom-close-btn:hover {
  background: rgba(141, 22, 47, 0.1);
  color: #8d162f !important;
  transform: rotate(90deg);
}

.q-tab-panel[name='Cart'] .row.items-center.q-mt-sm {
  background: rgba(141, 22, 47, 0.03);
  padding: 4px;
  border-radius: 30px;
  display: inline-flex;
  border: 1px solid rgba(141, 22, 47, 0.05);
}
.q-tab-panel[name='Cart'] .row.items-center.q-mt-sm .q-btn {
  background: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  width: 28px;
  height: 28px;
  min-height: 28px;
  padding: 0;
}
.q-tab-panel[name='Cart'] .row.items-center.q-mt-sm .text-h6 {
  font-weight: 700;
  font-size: 15px;
  color: #8d162f;
}

/* Cart Checkout Premium Box */
.q-tab-panel[name='Cart'] .row.justify-between.bg-grey-1 {
  background: rgba(255, 255, 255, 0.5) !important;
  backdrop-filter: blur(20px) saturate(130%);
  -webkit-backdrop-filter: blur(20px) saturate(130%);
  border: 1px solid rgba(255, 255, 255, 0.65) !important;
  box-shadow:
    0 16px 40px rgba(141, 22, 47, 0.08),
    inset 0 1px 1px rgba(255, 255, 255, 0.8) !important;
  border-radius: 28px;
  padding: 24px !important;
  margin-top: 35px !important;
}

.q-tab-panel[name='Cart'] .row.justify-between.bg-grey-1 .q-btn {
  background: linear-gradient(135deg, #8d162f 0%, #a8243d 100%) !important;
  color: white;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(141, 22, 47, 0.25);
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.q-tab-panel[name='Cart'] .row.justify-between.bg-grey-1 .q-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(141, 22, 47, 0.35);
}

/* ------------------- Commandes Tab Receipt Style ------------------- */
.q-tab-panel[name='Commandes'] .q-card {
  border-radius: 24px !important;
  background: rgba(255, 255, 255, 0.55) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6) !important;
  box-shadow:
    0 12px 36px rgba(0, 0, 0, 0.03),
    inset 0 1px 2px rgba(255, 255, 255, 0.8) !important;
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}
.q-tab-panel[name='Commandes'] .q-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #8d162f 0%, #c5a880 100%);
}
.q-tab-panel[name='Commandes'] .q-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(141, 22, 47, 0.08) !important;
}

.q-tab-panel[name='Commandes'] .q-badge {
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background: rgba(46, 125, 50, 0.08) !important;
  color: #2e7d32 !important;
  border: 1px solid rgba(46, 125, 50, 0.15);
}

/* Settings Dialog Solid White Styling */
.q-dialog .settings-card {
  background: #ffffff !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid rgba(141, 22, 47, 0.15) !important;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25) !important;
  border-radius: 28px !important;
  overflow: hidden;
}

.q-dialog .q-card .q-btn[type='submit'] {
  background: linear-gradient(135deg, #8d162f 0%, #a8243d 100%) !important;
  box-shadow: 0 8px 24px rgba(141, 22, 47, 0.25);
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.q-dialog .q-card .q-btn[type='submit']:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(141, 22, 47, 0.35);
}

/* Floating Footer Welcome Banner */
.footer-banner {
  position: fixed;
  bottom: 24px;
  left: 24px;
  right: 24px;
  background: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(25px) saturate(190%);
  -webkit-backdrop-filter: blur(25px) saturate(190%);
  color: #8d162f;
  padding: 16px 24px;
  border-radius: 30px;
  font-size: 14px;
  letter-spacing: 0.3px;
  font-weight: 700;
  z-index: 1000;
  text-align: center;
  box-shadow: 0 12px 40px rgba(141, 22, 47, 0.12);
  border: 1px solid rgba(141, 22, 47, 0.1);
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  animation: bannerFloat 4s ease-in-out infinite alternate;
}

@keyframes bannerFloat {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-4px);
  }
}

@media (min-width: 768px) {
  .footer-banner {
    font-size: 16px;
    bottom: 30px;
    left: 50%;
    right: auto;
    width: 480px;
    transform: translateX(-50%);
    animation: bannerFloatDesktop 4s ease-in-out infinite alternate;
  }
}

@keyframes bannerFloatDesktop {
  0% {
    transform: translateX(-50%) translateY(0);
  }
  100% {
    transform: translateX(-50%) translateY(-4px);
  }
}

/* Menu items fallback styling in case needed (leaving menu layout untouched) */
.menu-search-empty {
  display: grid;
  width: min(100%, 620px);
  min-height: 220px;
  padding: 32px 24px;
  margin: 0 auto;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: #606060;
  text-align: center;
  border: 1px dashed rgba(141, 22, 47, 0.24);
  border-radius: 24px;
  background: rgba(141, 22, 47, 0.035);
}

.menu-search-empty__title {
  color: #282828;
  font-size: 1.05rem;
  font-weight: 700;
}

.menu-search-empty__message {
  margin-bottom: 6px;
  font-size: 0.9rem;
}

.menu-type-card {
  border-radius: 20px;
  border: 1px solid rgba(141, 22, 47, 0.1);
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  background: white;
}
.active-type {
  background: linear-gradient(135deg, #8d162f 0%, #a8243d 100%) !important;
  color: white !important;
  border-color: #8d162f;
}

/* Card alignment & layout to prevent messy grid */
.q-tab-panel[name='Menu'] .row.q-col-gutter-lg > div {
  display: flex;
}
.q-tab-panel[name='Menu'] .menu-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.45) !important;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.55) !important;
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.02),
    inset 0 1px 1px rgba(255, 255, 255, 0.6) !important;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  overflow: hidden;
  padding: 0 !important; /* Bleed layout: remove padding */
}

.q-tab-panel[name='Menu'] .menu-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(141, 22, 47, 0.08) !important;
  border-color: rgba(141, 22, 47, 0.2) !important;
}

/* Make image cover full space */
.q-tab-panel[name='Menu'] .menu-img {
  width: 100%;
  height: 165px;
  object-fit: cover;
  border-radius: 24px 24px 0 0 !important; /* Match top corners of card */
  border: none !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.q-tab-panel[name='Menu'] .menu-card .q-card__section,
.q-tab-panel[name='Menu'] .menu-card .col-grow {
  padding: 0 !important; /* Bleed layout: remove padding */
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  flex-grow: 1;
  width: 100%;
}

.q-tab-panel[name='Menu'] .menu-card .text-subtitle1 {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-top: 12px;
  margin-bottom: 0;
  padding: 0 16px !important; /* Keep text padded */
  line-height: 1.25;
  height: 38px; /* Fixed height for 2 lines to align all titles */
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  width: 100%;
}

.q-tab-panel[name='Menu'] .menu-card .q-card__actions,
.q-tab-panel[name='Menu'] .menu-card .q-card-actions {
  padding: 8px 16px 16px 16px !important; /* Keep actions padded */
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto; /* Push actions to the very bottom */
}

.q-tab-panel[name='Menu'] .menu-card .text-primary {
  font-size: 16px;
  font-weight: 800;
  color: #8d162f !important;
  letter-spacing: -0.2px;
}

.q-tab-panel[name='Menu'] .menu-card .q-btn {
  background: linear-gradient(135deg, #8d162f 0%, #a8243d 100%) !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(141, 22, 47, 0.25) !important;
  width: 38px;
  height: 38px;
  min-height: 38px;
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
}
.q-tab-panel[name='Menu'] .menu-card .q-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 14px rgba(141, 22, 47, 0.35);
}

/* Bottom Sheet Handle indicator */
.sheet-handle {
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 15;
}
.handle-bar {
  width: 38px;
  height: 4px;
  background: rgba(141, 22, 47, 0.12);
  border-radius: 10px;
}

/* Custom Tabs Wrapper */
.custom-tabs-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  margin-top: 18px; /* Shift the menu down from the sheet handle */
}

/* Premium high-visibility button */
.premium-btn {
  background: linear-gradient(135deg, #8d162f 0%, #a8243d 100%) !important;
  color: white !important;
  font-weight: 700;
  letter-spacing: 0.2px;
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}
.premium-btn:hover {
  transform: translateY(-2px);
}
.premium-btn:active {
  transform: translateY(0);
}

/* Smooth mask-image transitions for fade indicators */
.custom-tabs-container {
  transition:
    mask-image 0.4s ease,
    -webkit-mask-image 0.4s ease;
  /* Default: no mask */
  -webkit-mask-image: none;
  mask-image: none;
}

/* Fades the left edge when left scroll is possible */
.custom-tabs-wrapper.has-left-indicator .custom-tabs-container {
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 48px, black 100%);
  mask-image: linear-gradient(to right, transparent 0%, black 48px, black 100%);
}

/* Fades the right edge when right scroll is possible */
.custom-tabs-wrapper.has-right-indicator .custom-tabs-container {
  -webkit-mask-image: linear-gradient(
    to right,
    black 0%,
    black calc(100% - 48px),
    transparent 100%
  );
  mask-image: linear-gradient(to right, black 0%, black calc(100% - 48px), transparent 100%);
}

/* Fades both edges when scrolling is possible in both directions */
.custom-tabs-wrapper.has-left-indicator.has-right-indicator .custom-tabs-container {
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 48px,
    black calc(100% - 48px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 48px,
    black calc(100% - 48px),
    transparent 100%
  );
}

/* Segmented Sliding Control styling */
.segmented-control-wrapper {
  max-width: 280px;
  width: 100%;
}
.segmented-control {
  background: rgba(141, 22, 47, 0.04);
  border: 1px solid rgba(141, 22, 47, 0.08);
  border-radius: 24px;
  padding: 3px;
  height: 42px;
  position: relative;
  z-index: 1;
}
.segmented-slider {
  position: absolute;
  top: 3px;
  left: 3px;
  bottom: 3px;
  width: calc(50% - 3px);
  background: linear-gradient(135deg, #8d162f 0%, #a8243d 100%);
  border-radius: 20px;
  z-index: 0;
  box-shadow: 0 4px 12px rgba(141, 22, 47, 0.25);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.segmented-item {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #8d162f;
  transition: color 0.3s ease;
  height: 100%;
}
.segmented-item.active {
  color: white !important;
}

/* Card Entry Animation Keyframes */
.menu-card {
  animation: cardFadeIn 0.5s cubic-bezier(0.21, 0.82, 0.42, 1) both;
}
@keyframes cardFadeIn {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Active state tactile scale feedback */
.custom-icon-btn:active,
.custom-tab-pill:active,
.segmented-item:active,
.menu-card .q-btn:active,
.lang-item:active,
.q-btn:active {
  transform: scale(0.94) !important;
  transition: transform 0.08s ease !important;
}

/* Badge Bounce animation */
.badge-float {
  animation: badgeBounce 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}
@keyframes badgeBounce {
  0% {
    transform: scale(0);
  }
  70% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* Cart Item entrance */
.q-tab-panel[name='Cart'] .menu-card {
  animation: slideInLeft 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}
@keyframes slideInLeft {
  0% {
    opacity: 0;
    transform: translateX(-15px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Commandes receipts entrance */
.q-tab-panel[name='Commandes'] .q-card {
  animation: slideInRight 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}
@keyframes slideInRight {
  0% {
    opacity: 0;
    transform: translateX(15px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Premium Warning Banner (Yellow Notifications) Styling */
.premium-warning-banner {
  background: rgba(197, 168, 128, 0.08) !important; /* Soft brand gold translucent background */
  border: 1px solid rgba(197, 168, 128, 0.3) !important; /* Brand gold outline */
  border-radius: 20px !important;
  color: #8d162f !important; /* Bordeaux text color for luxury branding */
  padding: 14px 20px !important;
  box-shadow: 0 8px 24px rgba(141, 22, 47, 0.03) !important;
  font-weight: 600;
  display: flex;
  align-items: center;
}
.premium-warning-banner .q-icon {
  color: #c5a880 !important; /* Brand gold warning icon */
  margin-right: 12px;
}

/* Responsive Menu Card Design */
.menu-card {
  border-radius: 20px !important;
  background: rgba(255, 255, 255, 0.45) !important;
  backdrop-filter: blur(15px) saturate(120%);
  -webkit-backdrop-filter: blur(15px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.55) !important;
  box-shadow: 0 8px 32px 0 rgba(141, 22, 47, 0.04) !important;
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  overflow: hidden;
}

.menu-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(141, 22, 47, 0.08) !important;
  background: rgba(255, 255, 255, 0.65) !important;
  border-color: rgba(141, 22, 47, 0.25) !important;
}

.menu-card-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.menu-card-inner {
  display: flex;
  flex-direction: row;
  height: 100%;
  align-items: center;
}

.menu-image-container {
  padding: 0;
  display: block;
  background: transparent;
  border-radius: 20px 0 0 20px;
  margin: 0;
  width: 33.333%;
  height: 120px;
  flex-shrink: 0;
  overflow: hidden;
}

.menu-img {
  width: 100%;
  max-width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0;
}

.menu-info-container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px 10px 12px 16px; /* Reduced right padding to bring + closer to right border */
  width: 66.667%;
  flex-grow: 1;
  height: 120px;
}

.menu-item-title {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  line-height: 1.3;
  margin-bottom: 6px;
  height: 36px;
  overflow: hidden;
}

@media (min-width: 600px) {
  .menu-card-inner {
    flex-direction: column;
    align-items: stretch;
  }

  .menu-image-container {
    width: 100%;
    height: 180px;
    border-radius: 20px 20px 0 0;
  }

  .menu-img {
    height: 180px;
  }

  .menu-info-container {
    height: auto;
    padding: 12px 16px; /* Restores elegant 16px padding on all sides of the info section */
    width: 100%; /* Overrides the global 66.667% width to take up the full card width on tablet/desktop */
  }

  .menu-item-title {
    font-size: 15px;
    height: 40px;
    margin-bottom: 8px;
  }
}

.menu-action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.menu-item-price {
  font-size: 16px;
  font-weight: 800;
  color: #8d162f;
}

.add-to-cart-btn {
  background: #8d162f !important;
  color: white !important;
  box-shadow: 0 4px 10px rgba(141, 22, 47, 0.2);
  transition: all 0.3s ease;
  margin-right: -4px; /* Align to the very right border */
}

.add-to-cart-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 14px rgba(141, 22, 47, 0.35);
}

/* Responsive adjustments for Mobile (Horizontal Layout) */
@media (max-width: 599px) {
  /* Reduce spacing between top left action buttons to keep them on a single line */
  .top-nav .q-gutter-md {
    margin-left: -6px !important;
  }
  .top-nav .q-gutter-md > * {
    margin-left: 6px !important;
  }

  .menu-card-inner {
    flex-direction: row;
    align-items: center;
  }

  .menu-image-container {
    margin: 8px;
    padding: 6px;
    background: transparent;
  }

  .menu-img {
    width: 100%;
    height: 100%;
    max-width: 100%;
  }

  .menu-info-container {
    padding: 8px 6px 8px 4px; /* Reduced right padding to bring + closer to right border on mobile */
  }

  .menu-item-title {
    font-size: 14px;
    margin-bottom: 4px;
  }

  .menu-item-price {
    font-size: 15px;
  }
}

/* Modern Cart and Orders styling */
.empty-state-container {
  background: rgba(255, 255, 255, 0.4) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.5) !important;
  border-radius: 24px;
  padding: 40px 24px !important;
  box-shadow: 0 8px 32px rgba(141, 22, 47, 0.02) !important;
}

.cart-container-modern,
.orders-container-modern {
  max-width: 600px;
  margin: 0 auto;
}

.cart-items-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.cart-item-row {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.45) !important;
  backdrop-filter: blur(15px) saturate(120%);
  -webkit-backdrop-filter: blur(15px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.55) !important;
  border-radius: 20px;
  padding: 12px;
  box-shadow: 0 6px 20px rgba(141, 22, 47, 0.03);
}

.cart-item-img-wrapper {
  width: 70px;
  height: 70px;
  border-radius: 14px;
  overflow: hidden;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cart-item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cart-item-details {
  flex-grow: 1;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
}

.cart-item-name {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  line-height: 1.3;
}

.delete-item-btn {
  margin-top: -6px;
  margin-right: -6px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}
.delete-item-btn:hover {
  opacity: 1;
  color: #c10015 !important;
}

.cart-item-price-total {
  font-size: 15px;
  font-weight: 800;
  color: #8d162f;
}

/* Stepper capsule styling */
.stepper-capsule {
  background: rgba(141, 22, 47, 0.07);
  border-radius: 30px;
  padding: 2px 4px;
}

.stepper-btn {
  color: #8d162f !important;
  padding: 4px !important;
}

.stepper-value {
  font-size: 14px;
  color: #111827;
  min-width: 24px;
  text-align: center;
}

/* Summary and action buttons */
.checkout-summary-card {
  background: rgba(255, 255, 255, 0.75) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8) !important;
  border-radius: 24px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(141, 22, 47, 0.08) !important;
}

.summary-label {
  font-size: 15px;
  color: #4e5561;
  font-weight: 600;
}

.summary-value {
  font-size: 22px;
  font-weight: 800;
  color: #8d162f;
}

.checkout-btn {
  background: #8d162f !important;
  color: white !important;
  font-weight: 700;
  letter-spacing: 0.2px;
  padding: 14px 0 !important;
  box-shadow: 0 8px 24px rgba(141, 22, 47, 0.25) !important;
  transition: all 0.3s ease;
}
.checkout-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(141, 22, 47, 0.35) !important;
}

/* Orders List Styling */
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.order-card-modern {
  background: rgba(255, 255, 255, 0.5) !important;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.6) !important;
  border-radius: 24px;
  padding: 18px;
  box-shadow: 0 8px 25px rgba(141, 22, 47, 0.03);
  transition: transform 0.2s ease;
}

.order-card-modern:hover {
  transform: scale(1.01);
}

.order-header-row {
  padding-bottom: 8px;
}

.order-date-text {
  font-size: 14px;
  color: #111827;
}

.order-status-badge {
  border-radius: 30px !important;
  font-size: 12px;
}

.order-divider {
  background: rgba(141, 22, 47, 0.08) !important;
}

.order-items-list {
  padding: 8px 0;
}

.order-item-line {
  padding: 8px 0;
  font-size: 14px;
}

.order-item-name-qty {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qty-badge {
  background: rgba(141, 22, 47, 0.06);
  color: #8d162f;
  font-weight: 700;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 30px;
}

.name-text {
  color: #393f4d;
  font-weight: 600;
}

.order-item-price-sum {
  color: #111827;
}

.order-footer-row {
  padding-top: 10px;
}

.total-label {
  font-size: 14px;
}

.total-value {
  font-size: 18px;
  font-weight: 800;
  color: #8d162f;
}

/* Premium Full-screen Loader Overlay */
.premium-loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loader-content {
  max-width: 85%;
  animation: pulseLoader 2s ease-in-out infinite;
}

.loader-text {
  font-size: 18px;
  font-weight: 700;
  color: #8d162f;
}

.loader-subtext {
  font-size: 12px;
  font-weight: 500;
  color: #c5a880;
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes pulseLoader {
  0% {
    transform: scale(1);
    opacity: 0.95;
  }
  50% {
    transform: scale(1.02);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.95;
  }
}

/* Style for WYSIWYG Rich Text Content */
.wysiwyg-content {
  line-height: 1.6;
}
.wysiwyg-content p {
  margin: 0 0 10px 0;
}
.wysiwyg-content p:last-child {
  margin-bottom: 0;
}
.wysiwyg-content ul {
  list-style-type: disc !important;
  margin: 10px 0 !important;
  padding-left: 24px !important;
}
.wysiwyg-content ol {
  list-style-type: decimal !important;
  margin: 10px 0 !important;
  padding-left: 24px !important;
}
.wysiwyg-content li {
  margin-bottom: 4px;
  display: list-item !important;
}
.wysiwyg-content a {
  color: #8d162f;
  text-decoration: underline;
  font-weight: 500;
}
.annonce-content a {
  color: #ffb84d !important; /* Gold/yellowish accent color for high visibility in dark background */
}
.wysiwyg-content img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 8px 0;
}
.wysiwyg-content blockquote {
  border-left: 3px solid rgba(141, 22, 47, 0.5);
  margin: 12px 0;
  padding-left: 12px;
  font-style: italic;
  opacity: 0.9;
}

/* Local Announcement Modal inside Welcome Gate overlay */
.local-annonce-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(30, 4, 10, 0.98);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100000;
  padding: 0;
}
.local-annonce-card {
  width: 100vw;
  height: 100vh;
  max-width: none;
  max-height: none;
  background: transparent;
  border: none;
  border-radius: 0;
  padding: calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom)) 24px;
  box-shadow: none;
  display: flex;
  flex-direction: column;
}
.local-annonce-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-top: 4px;
}
.local-annonce-body .annonce-content {
  flex: 1;
  overflow-y: auto;
}
.disabled-btn-style {
  opacity: 0.6 !important;
  background: #757575 !important;
  color: #e0e0e0 !important;
  cursor: not-allowed !important;
}
</style>
