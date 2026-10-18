#!/usr/bin/env bash
# Replays a finished local job run on production through the admin API, so no
# curator password is needed and every write lands in prod's AdminAudit or
# the pin routes' own history.
#
#   scripts/jobs/post-run-to-prod.sh <run id> [--dry]
#
# Asks for the admin password (ADMIN_PW skips the prompt; ADMIN_EMAIL defaults
# to flynni2008@gmail.com); neither is written anywhere. Needs the local app
# on :3000 for the run's pins.
#
#   new pins     POST /api/admin/pins, authored by the same curator as locally
#                (found on prod by handle, so ids need not match)
#   edits        prod's copy with only the run's patched fields (and new
#                references) laid over it, PUT /api/pins/:id
#   event info   PUT /api/pins/:id/event-info, unless prod's is a hand reading
#   sentiment    PUT /api/pins/sentiments, only for a live
#                company pin whose prod text hashes to what was scored
# A pin whose title or author differs on prod is skipped and reported.
set -euo pipefail
RUN="${1:?run id}"; DRY="${2:-}"
cd "$(dirname "$0")/../.."
source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use 24 >/dev/null 2>&1 || true
export RUN DRY
EXPORT="$(mktemp)"; trap 'rm -f "$EXPORT"' EXIT; export EXPORT
npm run --silent jobs:export -- "$RUN" > "$EXPORT"
python3 - <<'PY'
import getpass, hashlib, json, os, re, time, urllib.request, urllib.error
LOCAL, BASE = "http://127.0.0.1:3000", "https://www.chronopin.com"
dry = os.environ.get("DRY") == "--dry"
run = json.loads(open(os.environ["EXPORT"]).readline())
last_write = 0.0

def call(method, url, token=None, body=None, ok404=False):
    global last_write
    writing = method not in ("GET", "HEAD")
    if writing: time.sleep(max(0.0, last_write + 2.0 - time.monotonic()))
    req = urllib.request.Request(url, method=method, data=None if body is None else json.dumps(body).encode(),
        headers={"Content-Type": "application/json", **({"Authorization": "Bearer " + token} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=240) as r:
            t = r.read(); return json.loads(t) if t else None
    except urllib.error.HTTPError as e:
        if ok404 and e.code in (204, 404): return None
        raise SystemExit(f"{method} {url} -> {e.code} {e.read()[:400]}")
    finally:
        if writing: last_write = time.monotonic()

email = os.environ.get("ADMIN_EMAIL") or "flynni2008@gmail.com"
password = os.environ.get("ADMIN_PW") or getpass.getpass(f"Admin password for {email}: ")
token = call("POST", BASE + "/auth/local", body={"email": email, "password": password})["token"]
del password

def user_tags(p): return [t["name"] for t in p.get("tags", []) if t.get("source") != "auto"]
def refs_new(lp, pp):
    known = {r["url"] for r in pp.get("references") or []}
    return [{k: v for k, v in r.items() if k not in ("id", "pinId", "utcCreatedDateTime")} for r in lp.get("references") or [] if r["url"] not in known]
DROP = {"id","user","userId","utcCreatedDateTime","utcUpdatedDateTime","favoriteCount","likeCount","viewCount","rootThread","companyId","marketVolume"}
def same_pin(l, p): return p and p["title"] == l["title"] and p["user"]["userName"] == l["user"]["userName"]

created, updates, infos = [], {}, []
for a in run["actions"]:
    if a["tool"] == "create_pin": created.append(a["pinId"])
    elif a["tool"] == "update_pin":
        m = re.search(r"\[([^\]]*)\]\s*$", a["detail"])
        updates.setdefault(a["pinId"], set()).update(f.strip() for f in (m.group(1).split(",") if m else []) if f.strip())
    elif a["tool"] == "record_event_info": infos.append(a["pinId"])
sentiments = run.get("sentiments") or []
print(f"run {run['id']} ({run['jobId']}, {run['status']}): {len(created)} created, {len(updates)} updated, "
      f"{len(infos)} event-info, {len(sentiments)} sentiment; dry={dry}")

for pid in created:
    l = call("GET", f"{LOCAL}/api/pins/{pid}")
    body = {k: v for k, v in l.items() if k not in DROP and v is not None}
    body["media"] = [{k: v for k, v in m.items() if k in ("originalUrl", "type", "html")} for m in l["media"]]
    body["references"] = [{k: v for k, v in r.items() if k not in ("id", "pinId", "utcCreatedDateTime")} for r in l["references"]]
    body["tags"] = user_tags(l); body["parentId"] = None
    if dry: print(f"  create {pid} would POST as {l['user']['userName']}: {l['title'][:60]}"); continue
    [r] = call("POST", BASE + "/api/admin/pins", token, {"userName": l["user"]["userName"], "pins": [body]})["results"]
    print(f"  create local {pid} -> " + (f"prod {r['id']}" if "id" in r else f"FAILED {r['error']}") + f": {l['title'][:60]}")

for pid, fields in updates.items():
    fields -= {"addReferences", "addMedia", "removeMediumIds"}
    l = call("GET", f"{LOCAL}/api/pins/{pid}"); p = call("GET", f"{BASE}/api/pins/{pid}", ok404=True)
    if not (p and p["user"]["userName"] == l["user"]["userName"] and (p["title"] == l["title"] or "title" in fields)):
        print(f"  update {pid} SKIP prod pin differs: {p and p['title'][:50]}"); continue
    body = {**p, **{k: l[k] for k in fields if k in l}}
    body["tags"] = user_tags(l) if "tags" in fields else user_tags(p)
    body["references"] = (p.get("references") or []) + refs_new(l, p)
    if dry: print(f"  update {pid} would PUT {sorted(fields)} +{len(refs_new(l, p))} refs"); continue
    call("PUT", f"{BASE}/api/pins/{pid}", token, body)
    print(f"  update {pid} ok {sorted(fields)} +{len(refs_new(l, p))} refs")

for pid in infos:
    l = call("GET", f"{LOCAL}/api/pins/{pid}"); p = call("GET", f"{BASE}/api/pins/{pid}", ok404=True)
    r = call("GET", f"{LOCAL}/api/pins/{pid}/event-info", ok404=True)
    if not r or not same_pin(l, p): print(f"  event-info {pid} SKIP"); continue
    cur = call("GET", f"{BASE}/api/pins/{pid}/event-info", ok404=True)
    if cur and cur.get("source") == "hand": print(f"  event-info {pid} SKIP hand reading on prod"); continue
    body = {k: r.get(k) for k in ("performers","ticketUrl","lowPrice","highPrice","priceCurrency","availability","onSaleDate","source","sourceUrl","checkedAt")}
    if dry: print(f"  event-info {pid} would PUT"); continue
    call("PUT", f"{BASE}/api/pins/{pid}/event-info", token, body); print(f"  event-info {pid} ok")

rows = []
for s in sentiments:
    pid = s["pinId"]; p = call("GET", f"{BASE}/api/pins/{pid}", ok404=True)
    if not p or not p.get("companyId"): print(f"  sentiment {pid} SKIP not a live company pin on prod"); continue
    if hashlib.sha256(f"{p['title']}\n{p.get('description') or ''}".encode()).hexdigest() != s["textHash"]:
        print(f"  sentiment {pid} SKIP prod text is not what was scored"); continue
    rows.append(s)
if rows and dry: print(f"  sentiment would save {len(rows)}: {[r['pinId'] for r in rows]}")
elif rows:
    # Dedicated score writes recheck the text hash and avoid every pin-save hook.
    for start in range(0, len(rows), 10):
        batch = [{"id": s["pinId"], "sentiment": s["sentiment"], "textHash": s["textHash"],
                  "product": s.get("product") or ""} for s in rows[start:start + 10]]
        result = call("PUT", f"{BASE}/api/pins/sentiments", token, batch)
        print(f"  sentiment saved {result['saved']}: {[r['id'] for r in batch]}")
        if result["refused"]: print(f"  sentiment refused: {result['refused']}")
PY
