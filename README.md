# Deepfake OTOP

Application mobile et web de remplacement de personne dans une vidéo par intelligence artificielle.
Elle exploite le **First Order Motion Model (FOMM)** pour transférer les gestes, mouvements et expressions, et **Wav2Lip** pour la synchronisation labiale.

> **Avertissement éthique** : Cette technologie est destinée à des usages créatifs, éducatifs et de production audiovisuelle. Toute utilisation à des fins de désinformation, de harcèlement ou de création de contenu trompeur est strictement interdite et potentiellement illégale.

---

## Architecture

```
deepfake-otop/
├── backend/          # API FastAPI + Celery + services IA
├── frontend/         # Application web React + TypeScript
├── mobile/           # Application mobile React Native + Expo
├── infrastructure/   # Terraform AWS (ECS, S3, CloudFront, Redis)
├── models/           # Modèles IA (téléchargés séparément)
└── scripts/          # Scripts de configuration
```

## Pipeline IA

```
Vidéo source (mouvements) ──┐
                             ├──► FOMM ──► Vidéo animée ──► Wav2Lip ──► Résultat final
Image cible (personne) ─────┘               Audio source ──────────────┘
```

1. **FOMM** (First Order Motion Model) : anime l'image de la personne cible pour reproduire exactement les gestes et mouvements de la vidéo source
2. **Wav2Lip** : synchronise les lèvres de la personne animée avec l'audio de la vidéo source

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Backend API | Python 3.11, FastAPI, Celery |
| Queue & Cache | Redis |
| IA – Animation | First Order Motion Model (PyTorch) |
| IA – Lip Sync | Wav2Lip |
| IA – Visage | InsightFace |
| Vidéo | OpenCV, FFmpeg |
| Frontend Web | React 18, TypeScript, Vite, Tailwind CSS |
| Mobile | React Native, Expo SDK 50 |
| Cloud | AWS (ECS, S3, CloudFront, ElastiCache) |
| IaC | Terraform |

## Prérequis

- Docker & Docker Compose
- GPU NVIDIA (recommandé) avec drivers CUDA 11.8+
- 16 Go RAM minimum
- 50 Go d'espace disque (modèles inclus)

## Installation rapide (développement local)

### 1. Cloner le projet

```bash
git clone <repo-url>
cd deepfake-otop
```

### 2. Télécharger les modèles IA

```bash
chmod +x scripts/setup_models.sh
./scripts/setup_models.sh
```

Ce script :
- Clone First Order Motion Model et Wav2Lip
- Télécharge les checkpoints pré-entraînés (vox-cpk.pth.tar, wav2lip_gan.pth)

### 3. Configuration

```bash
cp backend/.env.example backend/.env
# Éditer backend/.env selon votre configuration
```

### 4. Lancer avec Docker Compose

```bash
docker-compose up --build
```

Accès :
- **Web App** : http://localhost:3000
- **API** : http://localhost:8000
- **Docs API** : http://localhost:8000/docs

## Déploiement AWS

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init && terraform apply
```

## Développement Mobile

```bash
cd mobile
npm install
npx expo start
```

Scanner le QR code avec l'app Expo Go sur votre téléphone.

## Licence

Projet privé — Tous droits réservés.
