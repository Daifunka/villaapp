//import store from '@/store'

export const TOKEN_KEY = 'token'

export function estConnecte() {
  const token = localStorage.getItem(TOKEN_KEY)
  //const utilisateur = store.state.userData

  return token 
}
