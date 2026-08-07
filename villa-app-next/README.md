# Villa App Next

Reconstruction performante de l’application Villa Saint-Jean avec Vue 3, TypeScript, Vite et Quasar.

## Principes

- aucun jQuery, Google Translate DOM ou plugin de thème historique ;
- aucun pack de police d’icônes : les icônes sont des SVG intégrés ;
- routes et écran profil chargés à la demande ;
- requêtes GET mises en cache et dédupliquées ;
- scroll passif limité à une mise à jour par frame ;
- composants courts et état partagé via composables ;
- vidéo HTML native chargée avec `preload="metadata"`.

## Lancer

Depuis ce dossier :

```bash
npm install
npm run dev
npm run build
```

Le bandeau visuel est importé depuis l’ancien dossier `src/assets` pendant la migration. Il pourra être copié puis converti en AVIF/WebP lorsque la nouvelle application deviendra autonome.
