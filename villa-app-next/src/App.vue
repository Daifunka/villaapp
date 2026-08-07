<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <q-layout view="hHh lpR fFf" class="app-shell">
    <q-page-container>
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </q-page-container>
  </q-layout>
</template>
