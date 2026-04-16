# Assets requis

Ces fichiers sont requis par Expo pour la génération des builds :

| Fichier | Dimensions | Format | Usage |
|---------|-----------|--------|-------|
| `icon.png` | 1024×1024 px | PNG, fond opaque | Icône iOS & Android |
| `adaptive-icon.png` | 1024×1024 px | PNG, fond transparent | Icône adaptative Android |
| `splash.png` | 1284×2778 px | PNG | Écran de démarrage |
| `favicon.png` | 48×48 px | PNG | Favicon web |

## Générer des assets rapidement

### Option A — Avec un outil en ligne
1. Aller sur https://expo.dev/tools/icon-designer
2. Uploader votre logo
3. Télécharger le pack d'assets
4. Placer les fichiers ici

### Option B — Script automatique

```bash
npm install -g sharp-cli

# Créer une image de base (fond dégradé avec texte)
# Puis redimensionner :
sharp -i logo.png -o icon.png resize 1024 1024
sharp -i logo.png -o adaptive-icon.png resize 1024 1024
sharp -i logo.png -o splash.png resize 1284 2778 --fit contain --background "#030712"
sharp -i logo.png -o favicon.png resize 48 48
```

### Option C — Expo Asset Generator (recommandé)
```bash
npx expo install expo-assets
npx expo-asset generate icon.png --size 1024
```
