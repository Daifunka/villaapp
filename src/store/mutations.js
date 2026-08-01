export default {
        SET_PANIER(state, nouveauPanier) {
            state.panier = nouveauPanier;
          },
          AJOUTER_AU_PANIER(state, produit) {
            if (!Array.isArray(state.panier)) {
                state.panier = [];
            }
            const produitExistant = state.panier.find(p => p.id === produit.id);
            
            if (produitExistant) {
                produitExistant.quantite++;
            } else {
                state.panier.push({ ...produit, quantite: 1 });
            }
            setTimeout(() => {
                state.success = true
            }, 0) 
        },
        
        RETIRER_DU_PANIER(state, index) {
            if (index >= 0 && index < state.panier.length) {
                state.panier.splice(index, 1);  
            }
        },
        
        INCREMENTER_QUANTITE(state, index) {
            const produit = state.panier[index];
            if (produit) {
                produit.quantite++;  
            }
        },
        
        DECREMENTER_QUANTITE(state, index) {
            const produit = state.panier[index];
            if (produit && produit.quantite > 1) {
                produit.quantite--;  
            }
        },
        
        VIDER_PANIER(state) {
            state.panier = [];
        },
        AJOUTER_COMMANDE_SESSION(state, commande) {
            state.mesCommandesSession.push(commande);
            sessionStorage.setItem('mesCommandes', JSON.stringify(state.mesCommandesSession));
        },
        VIDER_COMMANDES_SESSION(state) {
            state.mesCommandesSession = [];
            sessionStorage.removeItem('mesCommandes');
        },
        SET_LAST_KNOWN_CLIENT_EMAIL(state, email) {
            state.lastKnownClientEmail = email;
            localStorage.setItem('lastKnownClientEmail', email);
        },
        CLEAR_LAST_KNOWN_CLIENT_EMAIL(state) {
            state.lastKnownClientEmail = null;
            localStorage.removeItem('lastKnownClientEmail');
        },
        SET_LAST_KNOWN_CLIENT_NAME(state, name) {
            state.lastKnownClientName = name;
            localStorage.setItem('lastKnownClientName', name);
        },
        CLEAR_LAST_KNOWN_CLIENT_NAME(state) {
            state.lastKnownClientName = null;
            localStorage.removeItem('lastKnownClientName');
        },
        SET_UPLOAD_PROGRESS(state, progress) {
            state.uploadProgress = progress;
        },
        SET_TOKEN(state, token) {
            state.loading = false;
            state.token = token;
            state.isAuthenticated = true;
            
        },
        SET_ERROR(state, erreur) {
            state.erreur = erreur;
            state.loading = false;
            state.success = false;
        },
        UNSET_ERROR(state) {
            state.erreur = '';
        },
        SET_LOADING(state) {
            state.loading = true;
        },
        SET_SIGNUP(state) {
            state.loading = false;
            state.success = true;
        },
        SET_SUCCESS(state) {
            state.erreur = "";
            state.loading = false;
            state.success = true;
        },
        UNSET_SUCCESS(state) {
            state.success = false;
        },
        SET_SIGNUP1(state) {
            state.loading = false;
            state.success = false;
        },
        SET_FORGOT(state) {
            state.forgot = 2;
            state.msgForgot ="";
        },
        SET_FORGOT1(state, erreur) {
            state.forgot = 1;
            state.msgForgot= erreur;
        },
        SET_MDP(state) {
            state.mdp = 2;
            state.msgMdp ="";
        },
        SET_MDP1(state, erreur) {
            state.mdp = 1;
            state.msgMdp= erreur;
        },
        SET_INFOS(state) {
            state.infos = 2;
            state.msgInfos ="";
        },
        SET_INFOS1(state, erreur) {
            state.infos = 1;
            state.msgInfos= erreur;
        },
        SET_PRO(state) {
            state.pro = true;
        },
        CLEAR_TOKEN(state) {
            localStorage.removeItem('token');
            localStorage.removeItem('devise');
            state.token = null;
            state.isAuthenticated = false;
        },
        updateEtapeAndMode(state, payload) {
            state.etape = payload.etape;
            state.mode = payload.mode;
        },
        setUserData(state, userData) {
            state.userData = userData
        },
        setArticles(state, articles) {
            state.articles = articles
        },
        
        setArticle(state, article) {
            state.article = article
        },
        setMenus(state, articles) {
            state.menus = articles
        },
        setMenu(state, article) {
            state.menu = article
        },
        setCategorie(state, categorie) {
            state.categorie = categorie
        },
        setStats(state, stats) {
            state.stats = stats
        },
        setStats2(state, stats) {
            state.stats2 = stats
        },
        setStatsTresor(state, stats) {
            state.statsTresor = stats
        },
        setStatsFiltres(state, stats) {
            state.statsFiltres = stats
        },
        setStatsTresorFiltres(state, stats) {
            state.statsTresorFiltres = stats
        },
        setPromo(state, promo) {
            state.promo = promo
        },
        setCode(state, codePromo) {
            state.code = codePromo
        },
        setPersonnel(state, personnel) {
            state.personnel = personnel
        },
        setProduitsC(state, personnel) {
            state.personnelC = personnel
        },
        setFavoris(state, favoris) {
            state.favoris = favoris
        },
        setVideos(state, videos) {
            state.videos = videos
        },
        setTransactions(state, transactions) {
            state.transactions = transactions
        },
        setTransaction(state, transaction) {
            state.transaction = transaction
        },
        setLogs(state, logs) {
            state.logs = logs
        },
        setTransferts(state, transactions) {
            state.transferts = transactions
        },
        setChecklists(state, checklists) {
            state.checklists = checklists
        },
        setChecklist(state, checklist) {
            state.checklist = checklist
        },
        setDemandes(state, demandes) {
            state.demandes = demandes
        },
        setDemande(state, demande) {
            state.demande = demande
        },
        setConges(state, demandes) {
            state.conges = demandes
        },
        setConge(state, demande) {
            state.conge = demande
        },
        setClients(state, clients) {
            state.clients = clients
        },
        setClient(state, client) {
            state.client = client
        },
        setReservations(state, reservations) {
            state.reservations = reservations
        },
        setReservations2(state, reservations) {
            state.reservations2 = reservations
        },
        setReservation(state, reservation) {
            state.reservation = reservation
        },
        setCommandes(state, commandes) {
            state.commandes = commandes
        },
        setCommande(state, commande) {
            state.commande = commande
        },
        setFactures(state, factures) {
            state.factures = factures
        },
        setFacture(state, facture) {
            state.facture = facture
        },
        setPromos(state, promos) {
            state.promos = promos
        },
        setMembre(state, membre) {
            state.membre = membre
        },
        setPanierPrix(state, panierPrix) {
            state.panierPrix = panierPrix
        },
        setAdmins(state, admins) {
            state.admins = admins
        },
        setTaches(state, taches) {
            state.taches = taches
        },
        setTache(state, tache) {
            state.tache = tache
        },
        setMesTaches(state, taches) {
            state.taches = taches
        },
        setVariations(state, variations) {
            state.variations = variations
        },
        setVariations2(state, variations) {
            state.variations2 = variations
        },
        setCA(state, ca) {
            state.ca = ca
        },
        setCAM(state, cam) {
            state.cam = cam
        },
        setTotalp(state, totalp) {
            state.totalp = totalp
        },
        setTotalco(state, totalco) {
            state.totalco = totalco
        },
        setTotalca(state, totalca) {
            state.totalca = totalca
        },
        SET_SELECTED_IMAGE(state, image) {
            state.selectedImage = image
        },
        setDynamicPages(state, pages) {
            state.dynamicPages = pages;
        },
        setFaqs(state, faqs) {
            state.faqs = faqs;
        },
        setAnnonce(state, annonce) {
            state.annonce = annonce;
        },
};
