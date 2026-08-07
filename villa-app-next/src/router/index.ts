import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/profil', name: 'profile', component: () => import('@/views/ProfileView.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
