"""Apply visually reviewed dish photos to either restaurant management API.

Usage: python3 applyReviewed.py manifest.json uploads.jsonl [--apply]
Manifest: [{kind: "specials"|"content", id, pinSourceUrl, menuLabel, itemName,
            file, caption, credit, sourceUrl, sourceCaption, reviewed: true}]
Uploads are JSON lines from uploadDishPhotos.ts. Dry run by default. Existing
photos are never replaced. Saves use fresh revisions and verify full readbacks.
Keep manifests, uploads and before/after evidence in ignored .scrape directories.
"""
import argparse
import json
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('uploads', type=Path)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--base', default='https://www.chronopin.com')
    args = parser.parse_args()
    token = (Path(__file__).resolve().parents[3] / '.scrape/admin.token').read_text().strip()

    def api(path, method='GET', body=None):
        request = Request(args.base.rstrip('/') + path, method=method,
                          data=json.dumps(body).encode() if body is not None else None,
                          headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        with urlopen(request, timeout=60) as response:
            return json.load(response)

    uploads = {str(Path(u['file']).resolve()): u for u in
               (json.loads(line) for line in args.uploads.read_text().splitlines() if line.strip())}
    records = {}
    evidence_path = args.manifest.with_suffix('.readbacks.json')
    evidence = json.loads(evidence_path.read_text()) if evidence_path.exists() else []
    manifest = json.loads(args.manifest.read_text())
    for entry in manifest:
        if entry.get('reviewed') is not True or not all(isinstance(entry.get(k), str) and entry[k].strip()
                for k in ['pinSourceUrl', 'menuLabel', 'itemName', 'caption', 'credit', 'sourceUrl', 'sourceCaption']):
            raise ValueError('Every photo needs a visual review, source caption and complete attribution')
        if entry['kind'] not in ['specials', 'content']:
            raise ValueError('Unknown record kind')
        path = f"/api/admin/restaurant-{entry['kind']}/{int(entry['id'])}"
        if path not in records:
            record = api(path)
            records[path] = {'before': record, 'after': json.loads(json.dumps(record)), 'count': 0}
        record = records[path]['after']
        if record['profile']['pinSourceUrl'] != entry['pinSourceUrl']:
            raise ValueError('Branch source changed; review again')
        profile = record['profile'] if entry['kind'] == 'specials' else record['profile']['menu']
        items = [i for m in profile['menus'] if m['label'] == entry['menuLabel']
                 for i in m['items'] if i['name'] == entry['itemName']]
        if len(items) != 1:
            raise ValueError(f"Expected exactly one menu item: {entry['itemName']}")
        upload = uploads[str(Path(entry['file']).resolve())]
        url = urlparse(upload['src'])
        if url.scheme != 'https' or url.netloc != 'chronopin.blob.core.windows.net':
            raise ValueError('Only public Chronopin Azure blobs are accepted')
        image = {k: entry[k] for k in ['caption', 'credit', 'sourceUrl']}
        image.update({k: upload[k] for k in ['src', 'width', 'height']})
        if items[0].get('image'):
            if items[0]['image'] != image:
                raise ValueError('Refusing to replace an existing photo')
            continue
        # Recheck public availability before changing any live references.
        with urlopen(upload['src'], timeout=60) as response:
            if not response.headers.get('Content-Type', '').startswith('image/') or not response.read(1):
                raise ValueError('Public photo download failed')
        items[0]['image'] = image
        records[path]['count'] += 1

    for path, change in records.items():
        if not change['count']:
            continue
        record = change['after']
        if args.apply:
            body = {k: record[k] for k in ['revision', 'profile', 'enabled']}
            if 'regionSlug' in record:
                body['regionSlug'] = record['regionSlug']
            api(path, 'PUT', body)
            readback = api(path)
            if readback['profile'] != record['profile'] or readback['revision'] != record['revision'] + 1 or readback['enabled'] != record['enabled']:
                raise RuntimeError(f'Readback mismatch: {path}')
            evidence.append({'path': path, 'before': change['before'], 'after': readback})
            evidence_path.write_text(json.dumps(evidence, indent=2))
        print(('Verified' if args.apply else 'Would update'), path, change['count'], 'photos')


if __name__ == '__main__':
    main()
