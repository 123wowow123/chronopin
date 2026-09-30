#!/usr/bin/env bash
# Replays a finished local job run on production, as each pin's own curator.
#
#   scripts/jobs/post-run-to-prod.sh <run id> [--dry]
#
# Needs the local app on :3000 (reads the run's pins), python3, and the curator
# logins in the memory note reference_curator_accounts.md. Creates are POSTed;
# updates GET prod's copy, overlay only the fields the run patched (plus new
# references) and PUT; event-info readings are PUT as the author. Sentiment has
# no endpoint and pins by @ThePinGang/@PrettyGang need the admin login: both are
# reported, not posted. A pin whose title/author differs on prod is skipped.
set -euo pipefail
RUN="${1:?run id}"; DRY="${2:-}"
cd "$(dirname "$0")/../.."
source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use 24 >/dev/null 2>&1 || true
export RUN DRY
EXPORT="$(mktemp)"; trap 'rm -f "$EXPORT"' EXIT; export EXPORT
npm run --silent jobs:export -- "$RUN" > "$EXPORT"
python3 - <<'PY'
import json, os, re, sys, urllib.request, urllib.error
LOCAL, BASE = "http://127.0.0.1:3000", "https://www.chronopin.com"
dry = os.environ.get("DRY") == "--dry"
run = json.loads(open(os.environ["EXPORT"]).readline())
creds = {}
for line in open(os.path.expanduser("~/.claude/projects/-Users-ianflynn-chronopin/memory/reference_curator_accounts.md")):
    m = re.match(r"\| \d+ \| (@\w+) \| (\S+) \| `([^`]+)`", line)
    if m: creds[m.group(1)] = (m.group(2), m.group(3))
# @ShowDesk (422) is not in the roster note: pass its password as SHOWDESK_PW.
if "@ShowDesk" not in creds and os.environ.get("SHOWDESK_PW"):
    creds["@ShowDesk"] = ("showdesk.curator@chronopin.local", os.environ["SHOWDESK_PW"])
def call(method, url, token=None, body=None, ok404=False):
    req = urllib.request.Request(url, method=method, data=None if body is None else json.dumps(body).encode(),
        headers={"Content-Type": "application/json", **({"Authorization": "Bearer " + token} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=240) as r:
            t = r.read(); return json.loads(t) if t else None
    except urllib.error.HTTPError as e:
        if ok404 and e.code in (204, 404): return None
        raise SystemExit(f"{method} {url} -> {e.code} {e.read()[:400]}")
toks = {}
def tok(h):
    if h not in toks:
        if h not in creds: raise SystemExit(f"no login for {h}")
        toks[h] = call("POST", BASE + "/auth/local", body={"email": creds[h][0], "password": creds[h][1]})["token"]
    return toks[h]
def personal(h): return h in ("@ThePinGang", "@PrettyGang")
def refs_new(lp, pp):
    known = {r["url"] for r in pp.get("references") or []}
    return [{k: v for k, v in r.items() if k not in ("id", "pinId", "utcCreatedDateTime")} for r in lp.get("references") or [] if r["url"] not in known]
def user_tags(p): return [t["name"] for t in p.get("tags", []) if t.get("source") != "auto"]
DROP = {"id","user","userId","utcCreatedDateTime","utcUpdatedDateTime","favoriteCount","likeCount","viewCount","rootThread","companyId","marketVolume"}

created, updates, infos = [], {}, []
for a in run["actions"]:
    if a["tool"] == "create_pin": created.append(a["pinId"])
    elif a["tool"] == "update_pin":
        m = re.search(r"\[([^\]]*)\]\s*$", a["detail"])
        updates.setdefault(a["pinId"], set()).update(f.strip() for f in (m.group(1).split(",") if m else []) if f.strip())
    elif a["tool"] == "record_event_info": infos.append(a["pinId"])
print(f"run {run['id']} ({run['jobId']}, {run['status']}): {len(created)} created, {len(updates)} updated, {len(infos)} event-info; dry={dry}")

for pid in created:
    l = call("GET", f"{LOCAL}/api/pins/{pid}"); h = l["user"]["userName"]
    if personal(h): print(f"  create {pid} SKIP {h} needs admin login: {l['title'][:60]}"); continue
    body = {k: v for k, v in l.items() if k not in DROP and v is not None}
    body["media"] = [{k: v for k, v in m.items() if k in ("originalUrl", "type", "html")} for m in l["media"]]
    body["references"] = [{k: v for k, v in r.items() if k not in ("id", "pinId", "utcCreatedDateTime")} for r in l["references"]]
    body["tags"] = user_tags(l); body["parentId"] = None
    if dry: print(f"  create {pid} {h} would POST: {l['title'][:60]}"); continue
    r = call("POST", BASE + "/api/pins", tok(h), body)
    print(f"  create local {pid} -> prod {r['id']} {h}: {r['title'][:60]}")

for pid, fields in updates.items():
    fields -= {"addReferences", "addMedia", "removeMediumIds"}
    l = call("GET", f"{LOCAL}/api/pins/{pid}"); p = call("GET", f"{BASE}/api/pins/{pid}", ok404=True)
    if not p or p["title"] != l["title"] and "title" not in fields or p["user"]["userName"] != l["user"]["userName"]:
        print(f"  update {pid} SKIP prod pin differs: {p and p['title'][:50]}"); continue
    h = p["user"]["userName"]
    if personal(h): print(f"  update {pid} SKIP {h} needs admin login"); continue
    body = {**p, **{k: l[k] for k in fields if k in l}}
    body["tags"] = user_tags(p) if "tags" not in fields else user_tags(l)
    body["references"] = (p.get("references") or []) + refs_new(l, p)
    if dry: print(f"  update {pid} {h} would PUT {sorted(fields)} +{len(refs_new(l, p))} refs"); continue
    call("PUT", f"{BASE}/api/pins/{pid}", tok(h), body)
    print(f"  update {pid} {h} ok {sorted(fields)} +{len(refs_new(l, p))} refs")

for pid in infos:
    l = call("GET", f"{LOCAL}/api/pins/{pid}"); p = call("GET", f"{BASE}/api/pins/{pid}", ok404=True)
    r = call("GET", f"{LOCAL}/api/pins/{pid}/event-info", ok404=True)
    if not r or not p or p["title"] != l["title"]: print(f"  event-info {pid} SKIP"); continue
    cur = call("GET", f"{BASE}/api/pins/{pid}/event-info", ok404=True)
    if cur and cur.get("source") == "hand": print(f"  event-info {pid} SKIP hand reading on prod"); continue
    body = {k: r.get(k) for k in ("performers","ticketUrl","lowPrice","highPrice","priceCurrency","availability","onSaleDate","source","sourceUrl","checkedAt")}
    if dry: print(f"  event-info {pid} would PUT"); continue
    call("PUT", f"{BASE}/api/pins/{pid}/event-info", tok(p["user"]["userName"]), body); print(f"  event-info {pid} ok")
print("Sentiment scores are not posted here (no endpoint); see feedback_daily_jobs_on_prod.md.")
PY
