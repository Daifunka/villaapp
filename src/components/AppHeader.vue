<script>

export default {
  
  name: 'AppSidebar',
  data() {
    return {
      type: '',
      typeUser:'',
      prenoms:'',
      nom:'',
    }
  },
  watch: {
    '$store.state.erreur'(newErreur) {
      this.erreur = newErreur
    },
    '$store.state.success'(newSuccess) {
      this.success = newSuccess
    },
    '$store.state.userData'(newLoading) {
            this.typeUser = newLoading.typeUser
            this.prenoms = newLoading.prenoms
            this.nom = newLoading.nom
        },
    
  },
  created(){
    this.$store.dispatch('fetchUserData')
  },

  methods: {
    
    logout: function() {
      this.$store.dispatch('logout')
    },
  },
}
</script>
<template>
  <q-header elevated class="bg-primary text-dark">
    <q-toolbar>
      <!-- Hamburger Menu (Mobile) -->
      <q-btn flat dense round icon="menu" aria-label="Menu" class="q-mr-sm" />

      <!-- Logo -->
      <q-toolbar-title>
        <router-link to="/">
          <img src="../assets/img/logo.png" alt="Logo" style="height: 40px; margin-top: 5px;">
        </router-link>
      </q-toolbar-title>

      <!-- Navigation (Desktop) -->
      <div class="gt-sm q-gutter-md">
        <q-btn flat label="Dashboard" to="/" />
        <q-btn flat label="Bateaux" to="/bateaux" />
        <q-btn flat label="Réservations" to="/reservations" />
        <q-btn flat label="Indisponibilité" to="/ajouter-indisponibilite" />
        <q-btn color="secondary" label="Nouveau Bateau" to="/ajouter-bateau" />
      </div>

      <!-- Profile Dropdown -->
      <q-btn flat round class="q-ml-md">
        <q-avatar size="32px">
          <img src="../assets/img/users/user-05.jpg" alt="User">
        </q-avatar>
        <q-menu>
          <q-list style="min-width: 150px">
            <q-item clickable v-close-popup to="/profil">
              <q-item-section avatar>
                <q-icon name="person" />
              </q-item-section>
              <q-item-section>Mon profil</q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable v-close-popup @click="logout">
              <q-item-section avatar>
                <q-icon name="logout" color="negative" />
              </q-item-section>
              <q-item-section class="text-negative">Déconnexion</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </q-toolbar>
  </q-header>
</template>