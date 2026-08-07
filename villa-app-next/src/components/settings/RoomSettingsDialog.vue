<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
const model = defineModel<boolean>({ required: true })
const props = defineProps<{ rooms: string[]; currentRoom: string }>()
const emit = defineEmits<{ save: [room: string] }>()
const room = shallowRef(props.currentRoom)
const options = computed(() => [...new Set(props.rooms)].sort())
watch(() => props.currentRoom, (value) => { room.value = value })
function save() { if (!room.value) return; emit('save', room.value); model.value = false }
</script>

<template>
  <q-dialog v-model="model" position="bottom">
    <q-card class="settings-sheet">
      <div class="sheet-handle"><span /></div>
      <q-card-section><span class="eyebrow">Votre séjour</span><h2>Réglages de la chambre</h2><p>Choisissez votre chambre pour personnaliser les services.</p></q-card-section>
      <q-card-section><q-select v-model="room" outlined rounded emit-value map-options :options="options" label="Chambre" behavior="menu" /></q-card-section>
      <q-card-actions class="q-pa-md"><q-btn unelevated rounded color="primary" class="full-width" size="lg" label="Enregistrer" :disable="!room" @click="save" /></q-card-actions>
    </q-card>
  </q-dialog>
</template>
