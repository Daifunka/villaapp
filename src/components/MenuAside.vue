<script>
export default {
  data() {
    return {
      currentPath: this.$route.path,
      userData: null,
      nom: '',
      prenoms: ''
    };
  },
  watch: {
    $route(to) {
      this.currentPath = to.path;
    },
    '$store.state.userData'(newLoading) {
            this.userData = newLoading;
            this.nom = this.userData.nom;
            this.prenoms = this.userData.prenoms;
        },
  },
  methods: {
    
    logout: function() {
      this.$store.dispatch('logout')
    },
  }
};
</script>
<template>
    <div class="col-xl-3 col-lg-4 theiaStickySidebar">
        <div class="card user-sidebar agent-sidebar mb-4 mb-lg-0">
            <div class="card-header user-sidebar-header text-center bg-gray-transparent">
                <div class="agent-profile d-inline-flex">
                    <img src="../assets/img/users/user-05.jpg" alt="image" class="img-fluid rounded-circle">
                    <a href="/profil" class="avatar avatar-sm rounded-circle btn btn-primary d-flex align-items-center justify-content-center p-0"><i class="isax isax-edit-2 fs-14"></i></a>
                </div>
                <h6 class="fs-16">{{ prenoms +' '+ nom }}</h6>
                
            </div>
            <div class="card-body user-sidebar-body">
                <ul>
                    <li>
                        <a href="/" class="d-flex align-items-center" :class="{ active: currentPath === '/' }">
                            <i class="isax isax-grid-55 me-2"></i>Dashboard
                        </a>
                    </li>
                    
                    <li class="submenu">
                        <a href="javascript:void(0);" class="d-block"><i class="isax isax-ship5 me-2" :class="{ active: currentPath === '/bateaux' || currentPath === '/ajouter-bateau' }"></i><span>Bateaux</span><span class="menu-arrow"></span></a>
                        <ul>
                            <li>
                                <a href="/ajouter-bateau" class="fs-14 d-inline-flex align-items-center">Ajouter un bateau</a>
                            </li>
                            <li>
                                <a href="/bateaux" class="fs-14 d-inline-flex align-items-center">Liste des bateaux</a>
                            </li>
                        </ul>
                    </li>
                    <li>
                        <a href="/reservations" class="d-flex align-items-center" :class="{ active: currentPath === '/reservations' }">
                            <i class="isax isax-calendar-tick5 me-2"></i>Réservations
                        </a>
                    </li>
                    <li>
                        <a href="/ajouter-indisponibilite" class="d-flex align-items-center" :class="{ active: currentPath === '/ajouter-indisponibilite' }">
                            <i class="isax isax-calendar-tick5 me-2"></i>Nouvelle indisponibilité
                        </a>
                    </li>
                    
                    <li>
                        <a href="/profil" class="d-flex align-items-center" :class="{ active: currentPath === '/profil' }">
                            <i class="isax isax-setting-25"></i> Profil
                        </a>
                    </li>
                    <li class="logout-link">
                        <a href="#" @click="logout" class="d-flex align-items-center pb-0">
                            <i class="isax isax-logout-15"></i> Déconnexion
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>