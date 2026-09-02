import { Notify } from 'quasar'

let offlineNotificationVisible = false

export function isNetworkUnavailable(error) {
  return navigator.onLine === false || error?.code === 'ERR_NETWORK' || !error?.response
}

export function notifyNetworkUnavailable() {
  if (offlineNotificationVisible) return

  offlineNotificationVisible = true
  const isEnglish = (localStorage.getItem('langue') || 'Fr').toLowerCase() === 'en'

  Notify.create({
    group: 'network-unavailable',
    icon: 'sym_o_wifi_off',
    message: isEnglish
      ? 'No or poor internet connection. Some information may be unavailable.'
      : 'Aucune ou mauvaise connexion internet. Certaines informations peuvent être indisponibles.',
    position: 'bottom',
    timeout: 5000,
    color: 'grey-9',
    textColor: 'white',
  })
}

export function resetNetworkNotification() {
  offlineNotificationVisible = false
}
