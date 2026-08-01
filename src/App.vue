<script setup>
import { RouterView } from 'vue-router'
/*
import { computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()

const authChecked = computed(() => store.state.authChecked) */
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <RouterView></RouterView>
    </q-page-container>
  </q-layout>
</template>

<style>
/* Premium styles for Quasar components */
body {
  overflow-x: hidden;
}
.premium-toast {
  border-radius: 12px !important;
  backdrop-filter: blur(10px);
  background: rgba(0, 0, 0, 0.7) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  padding: 12px 18px !important;
}

.premium-loader {
  backdrop-filter: blur(5px);
  background: rgba(255, 255, 255, 0.5) !important;
}

/* Ensure smooth transitions */
.q-loading {
  transition: all 0.3s ease-in-out !important;
}

/* Animations for page transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Global Typography Override for Quasar & Common Elements */
body,
button,
input,
select,
textarea,
.q-btn,
.q-tab,
.q-field,
.q-item,
.q-table,
.q-dialog,
.q-menu,
.q-card,
.q-list,
.q-badge,
.q-banner,
.q-chip,
.q-tooltip,
.q-notification,
.q-header,
.q-footer,
.q-drawer {
  font-family: 'Outfit', sans-serif !important;
}

/* Hide Google Translate dynamic spinner overlay */
.VIpgJd-ZVi9od-aZ2wEe-wOHMyf,
.VIpgJd-ZVi9od-aZ2wEe-wOHMyf-ti6hGc {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* Force all dialogs/overlays to sit on top of fixed menus/headers */
.q-dialog, .q-dialog__inner {
  z-index: 999999 !important;
}
.q-menu {
  z-index: 1000000 !important;
  background-color: #ffffff !important;
}
.q-menu .q-item,
.q-menu .q-item__label,
.q-menu .q-item__section,
.q-menu .q-item * {
  color: #616161 !important;
}
.q-menu .q-item--active,
.q-menu .q-item--active .q-item__label,
.q-menu .q-item--active .q-item__section,
.q-menu .q-item--active * {
  background-color: rgba(141, 22, 47, 0.08) !important;
  color: #8d162f !important; /* primary color */
}
</style>
