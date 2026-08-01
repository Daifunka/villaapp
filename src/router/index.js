import { createRouter, createWebHistory } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue';
import AppFooter from '@/components/AppFooter.vue';
import AppProfil from '@/views/AppProfil.vue';
import AppHome from '@/views/AppHome.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      components: {
        default: AppHome,
        header: AppHeader,
        footer: AppFooter
      },
    },
    {
      path: '/profil',
      name: 'AppProfil',
      components: {
        default: AppProfil,
        header: AppHeader,
        footer: AppFooter
      },
    },
  ],
})

export default router
