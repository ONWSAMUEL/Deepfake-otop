# Guide d'installation — Application mobile Deepfake OTOP

## Prérequis

| Outil | Version | Commande de vérification |
|-------|---------|--------------------------|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Expo CLI | 10+ | `npx expo --version` |
| EAS CLI | 10+ | `npx eas --version` |
| Compte Expo | — | https://expo.dev |

Pour iOS en production, un **Mac avec Xcode 15+** est requis.

---

## Étape 1 — Installation des dépendances

```bash
cd mobile
npm install
```

---

## Étape 2 — Configuration du serveur

Ouvrez l'app → bouton **⚙️ Paramètres** → entrez l'URL de votre serveur backend.

Ou modifiez la valeur par défaut dans `src/services/storage.ts` :
```ts
const DEFAULT_API_URL = "http://VOTRE_IP_OU_DOMAINE:8000";
```

Pour trouver votre IP locale :
- **Mac/Linux** : `ifconfig | grep "inet "`
- **Windows** : `ipconfig`

---

## Étape 3 — Tester avec Expo Go (le plus rapide)

```bash
npx expo start
```

Scannez le QR code avec l'app **Expo Go** :
- 📱 iOS → [App Store](https://apps.apple.com/app/expo-go/id982107779)
- 📱 Android → [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

---

## Étape 4 — Générer les assets

Créez les images requises (voir `assets/README.md`) et placez-les dans `assets/`.

---

## Étape 5 — Build APK Android (installable directement)

### 5.1 Connexion à Expo
```bash
npx eas login
```

### 5.2 Configuration du projet
```bash
npx eas project:init
```
Renseignez le `projectId` généré dans `app.json` → `extra.eas.projectId`.

### 5.3 Générer l'APK (profil "preview")
```bash
npm run build:android:preview
# ou directement :
npx eas build --platform android --profile preview
```

Le build se fait sur les serveurs Expo (~10-15 min). Vous recevez un lien pour télécharger l'APK.

### 5.4 Installer l'APK sur Android
```bash
# Via USB (Android Debug Bridge)
adb install deepfake-otop.apk

# Ou téléchargez depuis le lien EAS et installez directement
```

> **Note Android** : Activez "Sources inconnues" dans Paramètres → Sécurité pour installer l'APK.

---

## Étape 6 — Build iOS (iPhone)

### 6.1 Prérequis iOS
- Mac avec Xcode 15+
- Compte Apple Developer (99$/an) pour distribuer
- Pour tests internes : utilisez le profil "preview" avec distribution "internal"

### 6.2 Générer le build iOS
```bash
npm run build:ios:preview
# ou :
npx eas build --platform ios --profile preview
```

Pour la distribution interne (TestFlight ou Ad-hoc) :
```bash
npx eas build --platform ios --profile preview
```

### 6.3 Installer sur iPhone (sans App Store)
```bash
# Soumettre à TestFlight
npx eas submit --platform ios

# Ou installer via Xcode (câble USB)
```

---

## Étape 7 — Build de production (App Store / Play Store)

```bash
# Android (AAB pour le Play Store)
npm run build:android:prod

# iOS (IPA pour l'App Store)
npm run build:ios:prod

# Les deux en même temps
npm run build:all

# Soumettre automatiquement
npm run submit:android
npm run submit:ios
```

---

## Build local (sans serveurs Expo Cloud)

Si vous voulez builder localement :

### Android
```bash
# Installer Android Studio + SDK
npx expo run:android
# ou
npx eas build --platform android --profile preview --local
```

### iOS (Mac uniquement)
```bash
npx expo run:ios
# ou
npx eas build --platform ios --profile preview --local
```

---

## Résolution des problèmes courants

| Problème | Solution |
|----------|----------|
| `Cannot connect to server` | Vérifiez l'IP dans Paramètres, même réseau Wi-Fi requis |
| `Module not found @/` | `npm install` + vérifier `babel.config.js` |
| `Camera permission denied` | Paramètres téléphone → Applis → Deepfake OTOP → Autorisations |
| Build EAS échoue (assets manquants) | Créer les fichiers dans `assets/` (voir `assets/README.md`) |
| `Invariant Violation: requireNativeComponent` | `npx expo install` pour réinstaller les dépendances natives |

---

## Structure des fichiers clés

```
mobile/
├── App.tsx                         # Point d'entrée
├── app.json                        # Configuration Expo
├── babel.config.js                 # Alias @/ et Reanimated
├── eas.json                        # Profils de build EAS
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx          # Upload vidéo + image
│   │   ├── CameraScreen.tsx        # Enregistrement vidéo
│   │   ├── ProcessingScreen.tsx    # Progression temps réel
│   │   ├── ResultScreen.tsx        # Résultat + téléchargement
│   │   └── SettingsScreen.tsx      # Configuration URL serveur
│   ├── services/
│   │   ├── api.ts                  # Appels REST + WebSocket URL
│   │   └── storage.ts              # Persistance (AsyncStorage)
│   └── hooks/
│       └── useJobWebSocket.ts      # WebSocket temps réel
```
