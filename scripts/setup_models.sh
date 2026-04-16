#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup_models.sh — Download AI models required by Deepfake OTOP
#
# Usage:
#   chmod +x scripts/setup_models.sh
#   ./scripts/setup_models.sh
#
# What it does:
#   1. Clone First Order Motion Model (FOMM)
#   2. Clone Wav2Lip
#   3. Download FOMM checkpoint (vox-cpk.pth.tar — ~200 MB)
#   4. Download Wav2Lip checkpoint (wav2lip_gan.pth — ~435 MB)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

MODELS_DIR="$(cd "$(dirname "$0")/.." && pwd)/models"
CHECKPOINTS_DIR="$MODELS_DIR/checkpoints"

echo "📁  Models directory: $MODELS_DIR"
mkdir -p "$CHECKPOINTS_DIR"

# ─── 1. First Order Motion Model ─────────────────────────────────────────────
FOMM_DIR="$MODELS_DIR/first-order-model"

if [ ! -d "$FOMM_DIR" ]; then
  echo "📥  Cloning First Order Motion Model..."
  git clone --depth 1 https://github.com/AliaksandrSiarohin/first-order-model.git "$FOMM_DIR"
  echo "✅  FOMM cloned"
else
  echo "✔   FOMM already present at $FOMM_DIR"
fi

# Install FOMM Python requirements
echo "📦  Installing FOMM Python dependencies..."
pip install --quiet face_alignment

# ─── 2. Wav2Lip ──────────────────────────────────────────────────────────────
WAV2LIP_DIR="$MODELS_DIR/Wav2Lip"

if [ ! -d "$WAV2LIP_DIR" ]; then
  echo "📥  Cloning Wav2Lip..."
  git clone --depth 1 https://github.com/Rudrabha/Wav2Lip.git "$WAV2LIP_DIR"
  echo "✅  Wav2Lip cloned"
else
  echo "✔   Wav2Lip already present at $WAV2LIP_DIR"
fi

# ─── 3. FOMM checkpoint ──────────────────────────────────────────────────────
FOMM_CKPT="$CHECKPOINTS_DIR/vox-cpk.pth.tar"

if [ ! -f "$FOMM_CKPT" ]; then
  echo "📥  Downloading FOMM vox-cpk checkpoint (~200 MB)..."
  # Official release from the FOMM repository
  wget -q --show-progress \
    "https://github.com/AliaksandrSiarohin/first-order-model/releases/download/vox/vox-cpk.pth.tar" \
    -O "$FOMM_CKPT"
  echo "✅  FOMM checkpoint saved to $FOMM_CKPT"
else
  echo "✔   FOMM checkpoint already present"
fi

# ─── 4. Wav2Lip checkpoint ────────────────────────────────────────────────────
WAV2LIP_CKPT="$CHECKPOINTS_DIR/wav2lip_gan.pth"

if [ ! -f "$WAV2LIP_CKPT" ]; then
  echo "📥  Downloading Wav2Lip GAN checkpoint (~435 MB)..."
  echo "ℹ️   You need to download this manually from the Wav2Lip release page."
  echo "    URL: https://github.com/Rudrabha/Wav2Lip#getting-the-weights"
  echo ""
  echo "    Option A — if you have gdown installed:"
  echo "      pip install gdown"
  echo "      gdown --id 1j0OiSMnfhg5z5JTQy8pjkGHDNDHT2WOu -O $WAV2LIP_CKPT"
  echo ""
  echo "    Option B — download directly from the Wav2Lip repo releases"
  echo "    and place it at: $WAV2LIP_CKPT"

  # Attempt gdown if available
  if command -v gdown &> /dev/null; then
    echo "📥  Attempting download via gdown..."
    gdown --id 1j0OiSMnfhg5z5JTQy8pjkGHDNDHT2WOu -O "$WAV2LIP_CKPT" || \
      echo "⚠️  gdown failed. Please download manually."
  fi
else
  echo "✔   Wav2Lip checkpoint already present"
fi

# ─── 5. InsightFace buffalo_l model ──────────────────────────────────────────
echo "📦  Pre-downloading InsightFace buffalo_l model..."
python3 -c "
import insightface
from insightface.app import FaceAnalysis
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=-1, det_size=(640, 640))
print('InsightFace buffalo_l ready.')
" 2>/dev/null || echo "⚠️  InsightFace not installed yet (will be available after pip install -r requirements.txt)"

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo "  Setup complete!"
echo "═══════════════════════════════════════════"
echo "  FOMM:     $FOMM_DIR"
echo "  Wav2Lip:  $WAV2LIP_DIR"
echo "  Ckpts:    $CHECKPOINTS_DIR"
echo ""
echo "  Next steps:"
echo "  1. cp backend/.env.example backend/.env"
echo "  2. docker-compose up --build"
echo "  3. Open http://localhost:3000"
echo ""
