export default {
      panier(state) {
        return Array.isArray(state.panier) ? state.panier : [];
      },
    
      totalPanier(state) {
        const panier = Array.isArray(state.panier) ? state.panier : [];
        return panier.reduce((total, produit) => {
          return total + produit.prix * produit.quantite;
        }, 0);
      },
        getEtape(state) {
            return state.etape;
        },
          getMode(state) {
            return state.mode;
        },
        getMsg(state) {
            return state.msg;
        },
        getSignup(state) {
            return state.signup;
        },
        getForgot(state) {
            return state.msgForgot;
        },
        userData(state) {
            return state.userData
        },
        isAuthenticated: state => state.isAuthenticated,
        selectedImage: state => state.selectedImage,
};
