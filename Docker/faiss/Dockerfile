# The FAISS search service (development and production). See app.py for the HTTP contract.
#
# fastembed runs the embedding model on ONNX Runtime rather than PyTorch, which
# keeps the image small, and both it and faiss-cpu publish arm64 and amd64
# wheels, so this builds natively on Apple Silicon and Intel alike.
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download the embedding models at build time so the container starts offline.
ENV EMBEDDING_MODEL=BAAI/bge-small-en-v1.5 \
    MULTILINGUAL_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 \
    FASTEMBED_CACHE_PATH=/models \
    INDEX_PATH=/data/pins.faiss \
    MULTILINGUAL_INDEX_PATH=/data/pins-multi.faiss
RUN python -c "import os; from fastembed import TextEmbedding; TextEmbedding(os.environ['EMBEDDING_MODEL']); TextEmbedding(os.environ['MULTILINGUAL_MODEL'])"

COPY app.py .

EXPOSE 5050
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5050"]
