# ─── Base image with CUDA support ────────────────────────────────────────────
FROM pytorch/pytorch:2.2.2-cuda11.8-cudnn8-runtime

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    git \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# M16: Create a non-root user — never run application code as root
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# ─── Python dependencies ─────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ─── Application code ────────────────────────────────────────────────────────
COPY . .

# ─── Runtime directories ─────────────────────────────────────────────────────
RUN mkdir -p /app/uploads /app/outputs /app/models/checkpoints \
    && chown -R appuser:appuser /app

# M16: Switch to non-root user before starting the process
USER appuser

# ─── Health check ────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
