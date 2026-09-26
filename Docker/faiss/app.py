"""
The FAISS search microservice, run in development and production alike.

Speaks the HTTP contract the Node app uses (src/server/model/searchPin.ts):

  GET    /faiss/search?q=<text>&k=<n>[&model=multi|both]
                                  -> {"res": [{"index": <pinId>, "match": <score>}], "took": <ms>}
  POST   /faiss/add     {"id", "title", "description"}   (an upsert)
  DELETE /faiss/remove  {"id"}

A pin's title and description are embedded together and normalised, so the
inner-product index scores by cosine similarity. Each index is written to its
file after every change, so it survives a container restart.

Two indexes of the same pins, each with its own model:

  en     BAAI/bge-small-en-v1.5, English only. What duplicate detection's
         thresholds and the address match's score are calibrated against.
  multi  paraphrase-multilingual-MiniLM-L12-v2, which puts a query in any of
         the site's languages near the English text it means: a Chinese or
         Japanese search found 2 of 14 test pins in the English index and 10
         and 12 in this one. It reads English a little worse (12 of 14).

model=both reads a query with each and keeps each pin's better score, the
multilingual one raised by MULTILINGUAL_BOOST (its scores run lower): a search
then finds its pins in whatever language it was typed, whatever the page's
language. On 84 test queries (14 pins, in en/zh/ja/es/de/fr) it found 74 in the
top ten, against 45 for the English index and 69 for the multilingual one,
English still 14 of 14; boosts from 0.10 to 0.15 all found 71-74.

Both embed only the pin's English words: indexing its translations as well
found no more (65 of 84 test queries against 69).
"""

import os
import threading
import time

import faiss
import numpy as np
from fastapi import Body, FastAPI, HTTPException, Query
from fastembed import TextEmbedding

MODEL_PATHS = {
    "en": (os.environ.get("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5"), os.environ.get("INDEX_PATH", "/data/pins.faiss")),
    "multi": (
        os.environ.get("MULTILINGUAL_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"),
        os.environ.get("MULTILINGUAL_INDEX_PATH", "/data/pins-multi.faiss"),
    ),
}
MULTILINGUAL_BOOST = float(os.environ.get("MULTILINGUAL_BOOST", "0.12"))
lock = threading.Lock()


class Space:
    """One model and the index of pins it embedded."""

    def __init__(self, model_name, path):
        self.model_name = model_name
        self.path = path
        self.model = TextEmbedding(model_name)
        self.dimension = len(next(iter(self.model.embed(["dimension probe"]))))
        self.index = self.load()

    def load(self):
        if os.path.exists(self.path):
            index = faiss.read_index(self.path)
            if index.d == self.dimension:
                return index
            print(f"Ignoring {self.path}: built for dimension {index.d}, model has {self.dimension}")
        return self.empty()

    def empty(self):
        return faiss.IndexIDMap2(faiss.IndexFlatIP(self.dimension))

    def save(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        faiss.write_index(self.index, self.path)

    def embed(self, texts):
        vectors = np.array(list(self.model.embed(texts)), dtype="float32")
        faiss.normalize_L2(vectors)
        return vectors


spaces = {name: Space(model_name, path) for name, (model_name, path) in MODEL_PATHS.items()}
app = FastAPI()


@app.get("/health")
def health():
    return {name: {"model": space.model_name, "count": space.index.ntotal} for name, space in spaces.items()}


def nearest(name, q, k):
    space = spaces[name]
    if space.index.ntotal == 0:
        return []
    vector = space.embed([q])
    with lock:
        scores, ids = space.index.search(vector, min(k, space.index.ntotal))
    return [(int(pin_id), float(score)) for pin_id, score in zip(ids[0], scores[0]) if pin_id != -1]


@app.get("/faiss/search")
def search(q: str = "", k: int = Query(20, ge=1), model: str = "en"):
    if model not in spaces and model != "both":
        raise HTTPException(400, f"no such model: {model}")
    started = time.perf_counter()
    if not q.strip():
        return {"res": [], "took": 0}

    if model == "both":
        best = dict(nearest("en", q, k))
        for pin_id, score in nearest("multi", q, k):
            best[pin_id] = max(best.get(pin_id, -1.0), score + MULTILINGUAL_BOOST)
        found = sorted(best.items(), key=lambda hit: -hit[1])[:k]
    else:
        found = nearest(model, q, k)

    res = [{"index": pin_id, "match": score} for pin_id, score in found]
    return {"res": res, "took": round((time.perf_counter() - started) * 1000)}


@app.post("/faiss/add")
def add(id: int = Body(...), title: str = Body(""), description: str = Body("")):
    text = "\n".join(part for part in (title, description) if part)
    ids = np.array([id], dtype="int64")
    vectors = {name: space.embed([text]) for name, space in spaces.items()}
    with lock:
        for name, space in spaces.items():
            space.index.remove_ids(ids)
            space.index.add_with_ids(vectors[name], ids)
            space.save()
    return {"id": id, "count": spaces["en"].index.ntotal}


@app.delete("/faiss/remove")
def remove(id: int = Body(..., embed=True)):
    ids = np.array([id], dtype="int64")
    with lock:
        removed = 0
        for space in spaces.values():
            removed = max(removed, int(space.index.remove_ids(ids)))
            space.save()
    return {"id": id, "removed": removed, "count": spaces["en"].index.ntotal}


@app.delete("/faiss/reset")
def reset():
    with lock:
        for space in spaces.values():
            space.index = space.empty()
            space.save()
    return {"count": 0}
