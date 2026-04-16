#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# build_push.sh — Build Docker images and push to AWS ECR
#
# Usage:
#   export AWS_REGION=us-east-1
#   export ECR_API_URL=<account>.dkr.ecr.us-east-1.amazonaws.com/deepfake-otop/api
#   export ECR_WORKER_URL=<account>.dkr.ecr.us-east-1.amazonaws.com/deepfake-otop/worker
#   export ECR_FRONTEND_URL=<account>.dkr.ecr.us-east-1.amazonaws.com/deepfake-otop/frontend
#   ./scripts/build_push.sh [tag]
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

TAG="${1:-$(git rev-parse --short HEAD)}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "🏷️  Building images with tag: $TAG"

# ECR login
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_API_URL"

# ─── API ─────────────────────────────────────────────────────────────────────
echo "🔨  Building API image..."
docker build \
  -t "$ECR_API_URL:$TAG" \
  -t "$ECR_API_URL:latest" \
  ./backend

docker push "$ECR_API_URL:$TAG"
docker push "$ECR_API_URL:latest"
echo "✅  API pushed"

# ─── Worker (same image, different command) ───────────────────────────────────
echo "🔨  Tagging worker image..."
docker tag "$ECR_API_URL:$TAG" "$ECR_WORKER_URL:$TAG"
docker tag "$ECR_API_URL:latest" "$ECR_WORKER_URL:latest"
docker push "$ECR_WORKER_URL:$TAG"
docker push "$ECR_WORKER_URL:latest"
echo "✅  Worker pushed"

# ─── Frontend ────────────────────────────────────────────────────────────────
echo "🔨  Building Frontend image..."
docker build \
  --build-arg VITE_API_URL="${VITE_API_URL:-}" \
  -t "$ECR_FRONTEND_URL:$TAG" \
  -t "$ECR_FRONTEND_URL:latest" \
  ./frontend

docker push "$ECR_FRONTEND_URL:$TAG"
docker push "$ECR_FRONTEND_URL:latest"
echo "✅  Frontend pushed"

echo ""
echo "═══════════════════════════════════════"
echo "  All images pushed with tag: $TAG"
echo "  Update ECS services to deploy."
echo "═══════════════════════════════════════"
