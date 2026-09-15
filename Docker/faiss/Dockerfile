# Local FAISS search service, for development. See app.py for the HTTP contract.
#
# fastembed runs the embedding model on ONNX Runtime rather than PyTorch, which
# keeps the image small, and both it and faiss-cpu publish arm64 and amd64
# wheels, so this builds natively on Apple Silicon and Intel alike.
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download the embedding model at build time so the container starts offline.
ENV EMBEDDING_MODEL=BAAI/bge-small-en-v1.5 \
    FASTEMBED_CACHE_PATH=/models \
    INDEX_PATH=/data/pins.faiss
RUN python -c "import os; from fastembed import TextEmbedding; TextEmbedding(os.environ['EMBEDDING_MODEL'])"

COPY app.py .

EXPOSE 5050
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5050"]
