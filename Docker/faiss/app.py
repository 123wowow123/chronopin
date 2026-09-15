"""
Local stand-in for the FAISS search microservice, for development.

Speaks the same HTTP contract the Node app uses (server/model/pin/searchPin):

  GET    /faiss/search?q=<text>&k=<n>   -> {"res": [{"index": <pinId>, "match": <score>}], "took": <ms>}
  POST   /faiss/add     {"id", "title", "description"}   (an upsert)
  DELETE /faiss/remove  {"id"}

A pin's title and description are embedded together and normalised, so the
inner-product index scores by cosine similarity. The index is written to
INDEX_PATH after every change, so it survives a container restart.
"""

import os
import threading
import time

import faiss
import numpy as np
from fastapi import Body, FastAPI, Query
from fastembed import TextEmbedding

MODEL_NAME = os.environ.get("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
INDEX_PATH = os.environ.get("INDEX_PATH", "/data/pins.faiss")

model = TextEmbedding(MODEL_NAME)
dimension = len(next(iter(model.embed(["dimension probe"]))))
lock = threading.Lock()


def load_index():
    if os.path.exists(INDEX_PATH):
        index = faiss.read_index(INDEX_PATH)
        if index.d == dimension:
            return index
        print(f"Ignoring {INDEX_PATH}: built for dimension {index.d}, model has {dimension}")
    return faiss.IndexIDMap2(faiss.IndexFlatIP(dimension))


def save_index():
    os.makedirs(os.path.dirname(INDEX_PATH), exist_ok=True)
    faiss.write_index(index, INDEX_PATH)


def embed(texts):
    vectors = np.array(list(model.embed(texts)), dtype="float32")
    faiss.normalize_L2(vectors)
    return vectors


index = load_index()
app = FastAPI()


@app.get("/health")
def health():
    return {"model": MODEL_NAME, "count": index.ntotal}


@app.get("/faiss/search")
def search(q: str = "", k: int = Query(20, ge=1)):
    started = time.perf_counter()
    if not q.strip() or index.ntotal == 0:
        return {"res": [], "took": 0}

    vector = embed([q])
    with lock:
        scores, ids = index.search(vector, min(k, index.ntotal))

    res = [
        {"index": int(pin_id), "match": float(score)}
        for pin_id, score in zip(ids[0], scores[0])
        if pin_id != -1
    ]
    return {"res": res, "took": round((time.perf_counter() - started) * 1000)}


@app.post("/faiss/add")
def add(id: int = Body(...), title: str = Body(""), description: str = Body("")):
    text = "\n".join(part for part in (title, description) if part)
    vector = embed([text])
    ids = np.array([id], dtype="int64")
    with lock:
        index.remove_ids(ids)
        index.add_with_ids(vector, ids)
        save_index()
    return {"id": id, "count": index.ntotal}


@app.delete("/faiss/remove")
def remove(id: int = Body(..., embed=True)):
    with lock:
        removed = index.remove_ids(np.array([id], dtype="int64"))
        save_index()
    return {"id": id, "removed": int(removed), "count": index.ntotal}


@app.delete("/faiss/reset")
def reset():
    global index
    with lock:
        index = faiss.IndexIDMap2(faiss.IndexFlatIP(dimension))
        save_index()
    return {"count": 0}
