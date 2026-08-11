# Publier les mises à jour de VillaApp

Le projet gère deux types de livraison :

- **web** : écrans Vue, styles, textes, images et logique JavaScript. Le bundle est téléchargé en arrière-plan, vérifié par SHA-256 puis activé au redémarrage de l’application ;
- **android** : plugins Capacitor, permissions, splash screen, configuration ou code Android. L’application affiche une fenêtre, télécharge l’APK avec une barre de progression, vérifie son empreinte SHA-256 puis lance l’installateur Android.

## 1. Configuration unique

### Conserver la clé de signature existante

Une mise à jour APK doit obligatoirement être signée avec **la même clé que l’APK déjà installé**. La signature a été vérifiée directement sur une tablette et correspond à ce fichier :

```text
C:\Users\PRECISION 7550\.android\debug.keystore
```

Configuration confirmée :

| Élément                | Valeur                                                             |
| ---------------------- | ------------------------------------------------------------------ |
| Alias                  | `androiddebugkey`                                                  |
| Mot de passe keystore  | Conservé uniquement dans le secret GitHub correspondant            |
| Mot de passe de la clé | Conservé uniquement dans le secret GitHub correspondant            |
| Empreinte SHA-256      | `a05bc56fcf04e31b7fe899b4e239f8854f946ee1ba92f1369386d40ac688225e` |

Ne créez pas une nouvelle clé si des tablettes possèdent déjà l’application : Android refuserait la mise à jour. Il faudrait alors désinstaller l’ancienne application, ce qui effacerait ses données locales.

Convertissez le keystore en Base64 sur votre PC avec PowerShell :

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\Users\PRECISION 7550\.android\debug.keystore')) | Set-Clipboard
```

Gardez également une copie chiffrée et sauvegardée de cette clé. Sa perte empêcherait toute future mise à jour de l’application installée.

### Préparer l’hébergement

L’URL configurée dans l’application est actuellement :

```text
https://dashbaord.lavillastjean.com/updates/version.json
```

L’hébergement est l’offre **Business de SiteBunker**. L’accès SSH externe n’est pas disponible ; la publication utilise donc FTPS explicite avec TLS.

Configuration confirmée :

| Élément                  | Valeur                                               |
| ------------------------ | ---------------------------------------------------- |
| Serveur FTPS             | `toranaga.nexloc.ro`                                 |
| Port                     | `21`                                                 |
| Utilisateur dédié        | `app@lavillastjean.com`                              |
| Dossier du compte FTPS   | `/home/snkagbbt/dashboard.lavillastjean.com/updates` |
| Document root du domaine | `/home/snkagbbt/dashboard.lavillastjean.com`         |

Le compte FTPS est limité au dossier `updates`. Le workflow créera cette structure :

```text
updates/
├── version.json
├── bundles/
│   └── villa-web-1.0.8.zip
└── apk/
    └── villaapp-1.1.0.apk
```

Le serveur doit servir ces fichiers en **HTTPS**, autoriser le téléchargement des fichiers JSON, ZIP et APK, et retourner un en-tête CORS autorisant l’application à lire `version.json`.

Avant la première publication, cette URL peut encore renvoyer la page HTML du tableau de bord. Après la première publication réussie, elle doit retourner uniquement du JSON.

### Ajouter les secrets GitHub

Dans le dépôt GitHub : **Settings → Secrets and variables → Actions → New repository secret**. Ajoutez :

| Secret                      | Contenu                                       |
| --------------------------- | --------------------------------------------- |
| `UPDATE_BASE_URL`           | `https://dashbaord.lavillastjean.com/updates` |
| `UPDATE_FTP_HOST`           | `toranaga.nexloc.ro`                          |
| `UPDATE_FTP_PORT`           | `21`                                          |
| `UPDATE_FTP_USER`           | `app@lavillastjean.com`                       |
| `UPDATE_FTP_PASSWORD`       | Mot de passe fort du compte FTPS dédié        |
| `ANDROID_KEYSTORE_BASE64`   | Contenu Base64 copié précédemment             |
| `ANDROID_KEYSTORE_PASSWORD` | Mot de passe du keystore                      |
| `ANDROID_KEY_ALIAS`         | Alias de la clé                               |
| `ANDROID_KEY_PASSWORD`      | Mot de passe de la clé                        |

Ne placez jamais ces valeurs dans Git ou dans un fichier du projet. Le transfert utilise FTPS explicite : le workflow refuse de publier si le serveur n’établit pas la connexion TLS.

### Vérifier la configuration GitHub avant la première publication

La liste des secrets doit contenir exactement les neuf noms indiqués ci-dessus. GitHub n’affiche plus leur valeur après enregistrement ; c’est normal. Si un mot de passe change dans cPanel, mettez immédiatement à jour `UPDATE_FTP_PASSWORD` dans GitHub.

Le fichier d’automatisation doit être présent sur la branche utilisée :

```text
.github/workflows/publish-updates.yml
```

### Première publication et installation du nouveau système

La version actuelle ajoute le téléchargement et l’installation intégrés. Une dernière installation manuelle est nécessaire pour amorcer ce nouveau composant natif :

1. poussez le projet et le workflow sur GitHub ;
2. lancez le workflow avec `release_kind = android` ;
3. utilisez `web_version = 1.1.2`, `android_version = 1.1.2`, `android_version_code = 7` et `min_native_build = 7` ;
4. laissez `mandatory = false` ;
5. renseignez les notes de version en français et en anglais ;
6. récupérez l’APK dans l’artefact GitHub Actions ou à l’URL publiée ;
7. installez-le manuellement sur chaque tablette **sans désinstaller** l’application existante ;
8. pour cette version d’amorçage uniquement, acceptez si nécessaire l’installation provenant du navigateur ;
9. vérifiez ensuite que `version.json` affiche bien un document JSON.

Cette étape d’amorçage n’est nécessaire qu’une fois.

## 2. Choisir le type de mise à jour

| Modification                                          | Type à publier |
| ----------------------------------------------------- | -------------- |
| Vue, CSS, textes, images et logique JavaScript        | `web`          |
| Plugin Capacitor, permission ou configuration Android | `android`      |
| Splash screen ou icône native                         | `android`      |
| Fichier situé dans `android/`                         | `android`      |
| Correction web dépendant d’un nouveau plugin natif    | `android`      |

## 3. À chaque modification normale de l’application

Utilisez une mise à jour **web** si vous avez seulement changé des fichiers dans `src/`, des styles ou des ressources web.

1. Testez le projet et poussez le commit sur GitHub.
2. Ouvrez l’onglet **Actions** du dépôt.
3. Sélectionnez **Publier une mise à jour** puis **Run workflow**.
4. Choisissez `web`.
5. Saisissez une version **strictement supérieure** à la dernière, par exemple `1.1.1`, puis `1.1.2` après la première publication.
6. Conservez `min_native_build = 7` tant que le bundle dépend du téléchargement APK intégré.
7. Lancez et attendez que toutes les étapes deviennent vertes.
8. Vérifiez l’URL `version.json`, puis ouvrez l’application sur une tablette connectée.

Le bundle sera téléchargé sans interrompre l’utilisateur. L’application le validera après son prochain chargement. Si ce chargement échoue, Capgo revient au bundle précédent et cette version défectueuse n’est pas retentée.

## 4. Lorsqu’une nouvelle version APK est nécessaire

Publiez une mise à jour **android** pour les changements suivants :

- ajout ou mise à jour d’un plugin Capacitor ;
- changement de permissions Android ;
- splash screen, icône, SDK Android ou configuration Gradle ;
- tout changement dans `android/` ou `capacitor.config.json` qui agit nativement.

Procédure :

1. Poussez le code testé sur GitHub.
2. Ouvrez **Actions → Publier une mise à jour → Run workflow**.
3. Choisissez `android`.
4. Donnez au bundle web une nouvelle version, par exemple `1.1.0`.
5. Donnez à l’APK une version lisible, par exemple `1.1.0`.
6. Augmentez toujours `android_version_code` : après `4`, utilisez `5`, puis `6`, etc.
7. Mettez `min_native_build` à ce même nouveau code si le nouveau bundle dépend des nouveautés natives. Exemple : `5`.
8. Renseignez les notes en français et en anglais.
9. Laissez **mandatory** désactivé dans le cas normal.
10. Lancez le workflow et vérifiez son résultat.

À la prochaine vérification, la fenêtre apparaît. **Télécharger** conserve l’utilisateur dans VillaApp et affiche la progression. L’application vérifie ensuite l’empreinte SHA-256 et lance automatiquement l’installateur Android. La première fois, Android peut demander d’autoriser VillaApp comme source d’installation. Selon la version et la gestion de la tablette, Android peut encore exiger une confirmation système. Le bouton **Plus tard** masque la proposition pendant 24 heures.

### Quand utiliser « obligatoire »

Réservez `mandatory = true` à une version réellement indispensable : faille de sécurité, incompatibilité bloquante avec le backend ou version devenue inutilisable. La fenêtre ne peut alors plus être fermée et le bouton **Plus tard** disparaît. Android exigera malgré tout une confirmation humaine pour installer l’APK.

## 5. Vérifications après publication

Ouvrez dans un navigateur :

```text
https://dashbaord.lavillastjean.com/updates/version.json
```

Vérifiez que :

- `web.version` correspond à la version demandée ;
- `web.url` télécharge bien le ZIP ;
- pour un APK, `android.versionCode` est supérieur à celui installé et `android.apkUrl` télécharge le fichier ;
- les empreintes `checksum` et `sha256` comportent 64 caractères.

Sur une tablette, fermez puis rouvrez l’application. Pour une mise à jour APK, remettez aussi l’application au premier plan afin de déclencher une nouvelle vérification.

## 6. Corriger ou revenir en arrière

Ne republiez jamais un numéro déjà utilisé et ne diminuez jamais une version.

- **Bundle web défectueux** : repartez du dernier code fiable et publiez-le avec un **nouveau numéro supérieur**. Exemple : si `1.0.9` pose problème, publiez le code fiable en `1.0.10`.
- **APK défectueux** : corrigez-le puis publiez une version avec un `android_version_code` supérieur. Android n’accepte pas un code inférieur.
- **Échec du workflow avant le manifeste** : rien n’est activé, car `version.json` est toujours envoyé en dernier.

Les fichiers produits restent également disponibles pendant 30 jours dans l’artefact du workflow GitHub Actions.
