<script>
import MenuAside from '@/components/MenuAside.vue';

export default {
  components: {
    MenuAside
  },
  data() {
    return {
      activeTab: 'infos',
      mdppassword: '',
      mdpnewpassword: '',
      mdpnewpassword2: '',
      userData: null,
      success: false,
      erreur: ''
    };
  },
  created() {
    // Peut-être nécessaire pour le MenuAside
    this.$store.dispatch('fetchBateaux');
  },
  watch: {
    '$store.state.erreur'(newErreur) {
      this.erreur = newErreur;
      setTimeout(() => {
        this.erreur = '';
      }, 3000);
    },
    '$store.state.success'(newSuccess) {
      this.success = newSuccess;
      setTimeout(() => {
        this.success = false;
      }, 3000);
    },
    '$store.state.userData'(newUserData) {
      this.userData = newUserData;
    },
  },
  methods: {
    modifierProfil() {
      this.success = false;
      this.erreur = '';
      this.$store.dispatch('updateUser', {
        id: this.userData.id,
        nom: this.userData.nom,
        prenoms: this.userData.prenoms,
        email: this.userData.email,
        type: this.userData.typeUser,
        numTelephone: this.userData.numTelephone
      });
    },
    modifierMdp() {
      this.success = false;
      this.erreur = '';
      const password = this.mdpnewpassword;
      const password2 = this.mdpnewpassword2;
      const longueurMinimale = 8;
      const caracteresSpeciaux = /[-_!@#$%^&*(),.?":{}|<>]/;
      
      if (password.length >= longueurMinimale) {
        if (/[a-z]/.test(password)) {
          if (/[A-Z]/.test(password)) {
            if (caracteresSpeciaux.test(password)) {
              if (password === password2) {
                this.$store.dispatch('modifierMdp', {
                  current_password: this.mdppassword,
                  new_password: this.mdpnewpassword
                });
              } else {
                this.erreur = "Le mot de passe et la confirmation ne correspondent pas";
              }
            } else {
              this.erreur = "Le mot de passe doit contenir au moins un caractère spécial.";
            }
          } else {
            this.erreur = "Le mot de passe doit contenir au moins une lettre majuscule.";
          }
        } else {
          this.erreur = "Le mot de passe doit contenir au moins une lettre minuscule.";
        }
      } else {
        this.erreur = "Le mot de passe doit contenir au moins " + longueurMinimale + " caractères.";
      }
    },
  }
};
</script>

<template>
  <q-page padding class="bg-grey-2">
    <!-- Breadcrumb -->
    <div class="q-mb-lg text-center">
      <div class="text-h4 text-weight-bold q-mb-sm">Profil</div>
      <q-breadcrumbs align="center" class="text-grey-8" active-color="primary">
        <q-breadcrumbs-el icon="home" to="/" />
        <q-breadcrumbs-el label="Profil" />
      </q-breadcrumbs>
    </div>

    <div class="row q-col-gutter-lg justify-center">
      <!-- Sidebar -->
      <div class="col-12 col-md-4 col-lg-3">
        <MenuAside />
      </div>

      <!-- Main Content -->
      <div class="col-12 col-md-8 col-lg-9">
        
        <!-- Loading -->
        <div v-if="!userData" class="text-center q-pa-xl flex flex-center column">
          <q-spinner color="primary" size="3em" />
          <div class="text-grey-8 q-mt-md">Chargement des Informations...</div>
        </div>
        
        <!-- Data Ready -->
        <q-card v-if="userData" class="shadow-2 rounded-borders">
          <q-card-section class="bg-primary text-dark">
            <div class="text-h6">Profil</div>
          </q-card-section>

          <q-tabs
            v-model="activeTab"
            class="text-grey-8"
            active-color="primary"
            indicator-color="primary"
            align="left"
            narrow-indicator
          >
            <q-tab name="infos" icon="person" label="Informations" />
            <q-tab name="mdp" icon="shield" label="Sécurité" />
          </q-tabs>

          <q-separator />

          <q-tab-panels v-model="activeTab" animated>
            <!-- Informations -->
            <q-tab-panel name="infos" class="q-pa-md">
              <q-form @submit.prevent="modifierProfil" class="q-gutter-md">
                <div class="row q-col-gutter-md">
                  <div class="col-12 col-md-6">
                    <q-input filled v-model="userData.nom" label="Nom" />
                  </div>
                  <div class="col-12 col-md-6">
                    <q-input filled v-model="userData.prenoms" label="Prénom" />
                  </div>
                  <div class="col-12 col-md-6">
                    <q-input filled v-model="userData.email" type="email" label="Adresse mail" />
                  </div>
                  <div class="col-12 col-md-6">
                    <q-input filled v-model="userData.numTelephone" type="tel" label="Téléphone" />
                  </div>
                </div>
                
                <div class="q-mt-md">
                  <q-btn label="Enregistrer" type="submit" color="primary" icon="save" />
                </div>

                <q-banner v-if="success" class="bg-positive text-white q-mt-md rounded-borders">
                  Informations modifiées avec succès.
                </q-banner>
                <q-banner v-if="erreur !== ''" class="bg-negative text-white q-mt-md rounded-borders">
                  {{ erreur }}
                </q-banner>
              </q-form>
            </q-tab-panel>

            <!-- Change Password -->
            <q-tab-panel name="mdp" class="q-pa-md">
              <q-form @submit.prevent="modifierMdp" class="q-gutter-md">
                <q-input 
                  filled 
                  v-model="mdppassword" 
                  type="password" 
                  label="Mot de passe actuel" 
                  lazy-rules
                  :rules="[val => !!val || 'Requis']"
                />
                
                <q-input 
                  filled 
                  v-model="mdpnewpassword" 
                  type="password" 
                  label="Nouveau mot de passe" 
                  hint="Doit contenir au moins 8 caractères, une majuscule, une minuscule, un caractère spécial"
                  lazy-rules
                  :rules="[val => !!val || 'Requis']"
                />
                
                <q-input 
                  filled 
                  v-model="mdpnewpassword2" 
                  type="password" 
                  label="Confirmer le mot de passe" 
                  lazy-rules
                  :rules="[val => !!val || 'Requis']"
                />

                <div class="q-mt-md">
                  <q-btn label="Enregistrer" type="submit" color="primary" icon="save" />
                </div>

                <q-banner v-if="success" class="bg-positive text-white q-mt-md rounded-borders">
                  Mot de passe modifié avec succès.
                </q-banner>
                <q-banner v-if="erreur !== ''" class="bg-negative text-white q-mt-md rounded-borders">
                  {{ erreur }}
                </q-banner>
              </q-form>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
      </div>
    </div>
  </q-page>
</template>