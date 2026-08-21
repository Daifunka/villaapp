
import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import * as Sentry from '@sentry/capacitor'
import { SplashScreen } from '@capacitor/splash-screen'
import App from './App.vue'
import { notifyAppReady } from './utils/updater'
import router from './router'
import store from './store'
import i18n from './i18n'
import VuePlyr from 'vue-plyr'
import 'vue-plyr/dist/vue-plyr.css'
import { Quasar, Notify, Loading, Dialog } from 'quasar'
import quasarLang from 'quasar/lang/fr'
import '@quasar/extras/material-icons/material-icons.css'
import '@quasar/extras/material-symbols-outlined/material-symbols-outlined.css'
import 'quasar/src/css/index.sass'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: Capacitor.isNativePlatform() ? 'android' : 'web',
  release: `villaapp@${import.meta.env.VITE_APP_VERSION || 'unknown'}`,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
})

const app = createApp(App)
app.use(store)
app.use(router)
app.use(i18n)
app.use(VuePlyr, {
  plyr: {
    controls: [
      'play-large',
      'play',
      'progress',
      'current-time',
      'mute',
      'volume',
      'settings',
      'fullscreen',
    ],
  },
})

// Configure Notify defaults for a premium look
Notify.setDefaults({
  position: 'top',
  timeout: 5000,
  textColor: 'white',
  actions: [{ icon: 'close', color: 'white' }],
  classes: 'premium-toast'
})

// Configure Loading defaults
Loading.setDefaults({
  backgroundColor: 'white',
  spinnerColor: 'primary',
  customClass: 'premium-loader'
})

app.use(Quasar, {
  plugins: {
    Notify,
    Loading,
    Dialog
  },
  lang: quasarLang
})
  const splashStartedAt = performance.now()
  let splashHidden = false

  const hideLaunchSplash = async () => {
    if (splashHidden || !Capacitor.isNativePlatform()) return

    splashHidden = true

    try {
      await SplashScreen.hide()
    } catch (error) {
      console.warn('[SplashScreen] Unable to hide launch splash:', error)
    }
  }

  app.mount('#app')

  if (Capacitor.isNativePlatform()) {
    // Keep a short minimum display to avoid a flash on fast devices, then
    // reveal the app only once the initial route has rendered.
    router.isReady().then(() => {
      // Validate the loaded Capgo bundle only after Vue has rendered successfully.
      void notifyAppReady()
      const minimumDisplayTime = 900
      const remainingTime = Math.max(0, minimumDisplayTime - (performance.now() - splashStartedAt))

      window.setTimeout(() => {
        window.requestAnimationFrame(() => hideLaunchSplash())
      }, remainingTime)
    })

    // Safety fallback: never leave users stuck behind the splash screen.
    window.setTimeout(() => hideLaunchSplash(), 2500)
  } else {
    void router.isReady().then(() => notifyAppReady())
  }
