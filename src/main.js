
import { createApp } from 'vue'
import App from './App.vue'
import { notifyAppReady } from './utils/updater'

// Declare app ready to Capgo to validate downloaded bundle and prevent rollback
notifyAppReady()
import router from './router'
import store from './store'
import VCalendar from 'v-calendar';
import 'v-calendar/style.css';
import i18n from './i18n'
import VuePlyr from 'vue-plyr'
import 'vue-plyr/dist/vue-plyr.css'
import { Quasar, Notify, Loading, Dialog } from 'quasar'
import quasarLang from 'quasar/lang/fr'
import '@quasar/extras/material-icons/material-icons.css'
import '@quasar/extras/material-icons-outlined/material-icons-outlined.css'
import '@quasar/extras/material-symbols-outlined/material-symbols-outlined.css'
import 'quasar/src/css/index.sass'

const app = createApp(App)
app.use(store)
app.use(router)
app.use(VCalendar, {});
app.use(i18n)

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
  app.use(VuePlyr, {
    plyr: {
      controls: [
        'play-large', 'play', 'progress', 'current-time', 
        'mute', 'volume', 'settings', 'fullscreen'
      ]
    }
  })
  app.mount('#app')

