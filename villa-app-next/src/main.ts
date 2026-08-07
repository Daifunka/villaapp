import { createApp } from 'vue'
import { Quasar, Dialog, Notify } from 'quasar'
import 'quasar/src/css/index.sass'
import App from './App.vue'
import router from './router'
import './styles/main.css'

createApp(App)
  .use(router)
  .use(Quasar, {
    plugins: { Dialog, Notify },
    config: {
      brand: { primary: '#8d162f', secondary: '#c5a880', dark: '#2d0208' },
      notify: { position: 'top', timeout: 2200 },
    },
  })
  .mount('#app')
