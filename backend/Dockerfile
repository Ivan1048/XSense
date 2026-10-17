FROM python:3.11-slim

WORKDIR /app

# Install system audio libraries required for WAV processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Cache TensorFlow Hub models inside the image so YAMNet loads instantly
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TFHUB_CACHE_DIR=/app/.tfhub_cache

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-warm YAMNet weights during build so containers start ready for inference
RUN python -c "import tensorflow_hub as hub; hub.load('https://tfhub.dev/google/yamnet/1')" || true

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
