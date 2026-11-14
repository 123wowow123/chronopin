"""Parse NBC News (AP data) Senate and House results pages into src/server/data/elections.json.

Usage: python3 -I scripts/election/parseNbc.py SENATE_HTML HOUSE_HTML YEAR
Fetch the pages with `curl -sL -A "Mozilla/5.0"`. Re-run to refresh; the file is the single source of the
election side panel and the /election/<year> landing page. Read the output against the page: the scraped
text mangles candidate names (a winner's name can repeat), so check the rows that look odd.
"""
import json
import re
import sys

senate_html, house_html, year = sys.argv[1], sys.argv[2], int(sys.argv[3])


def text(path):
    h = open(path, errors='ignore').read()
    h = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', h, flags=re.S)
    t = re.sub(r'<[^>]+>', '\n', h)
    return [l.strip() for l in t.split('\n') if l.strip()]


def stamp(lines):
    i = lines.index('Last update')
    return lines[i + 1]


s = text(senate_html)
h = text(house_html)
num = lambda x: float(x.rstrip('%'))

# ---- Senate: the "All Senate Races" table cells carry their party in the class (dem / rep / ind) and
# the winner in "winner", which the flattened text loses, so read the HTML.
raw = open(senate_html, errors='ignore').read()
races = []
for row in re.findall(r'<tr[^>]*>(.*?)</tr>', raw, flags=re.S):
    m = re.search(r'state-link-label[^>]*>([^<]+)<', row)
    if not m or 'vote-cell' not in row:
        continue
    label = m.group(1).strip()
    cands = []
    winner = None
    for cls, cell in re.findall(r'<td class="[^"]*vote-cell[^"]*?\b(dem|rep|ind)\b([^"]*)">(.*?)</td>', row, flags=re.S) and []:
        pass
    for cell in re.findall(r'<td class="([^"]*vote-cell[^"]*)">(.*?)</td>', row, flags=re.S):
        cls, body = cell
        party = 'D' if ' dem ' in cls + ' ' else 'R' if ' rep ' in cls + ' ' else 'I' if ' ind ' in cls + ' ' else None
        nm = re.search(r'<span[^>]*>([^<]*)</span><span[^>]*candidate-percent[^>]*>([\d.]+)', body)
        if party and nm:
            cands.append({'name': nm.group(1).strip(), 'party': party, 'pct': float(nm.group(2))})
            if ' winner' in cls:
                winner = party
    pin_ = re.search(r'percent-in-cell[^>]*>([\d.]+)', row)
    races.append({
        'state': label.replace(' Special', ''), 'special': label.endswith('Special'), 'flip': 'FLIP' in row,
        'candidates': sorted(cands, key=lambda c: -c['pct']),
        'pctIn': float(pin_.group(1)) if pin_ else None, 'winner': winner,
    })

def seat_summary(lines):
    k = lines.index('Number of seats to tie: 50') if 'Number of seats to tie: 50' in lines else None
    return k

# Control box (the block after "Senate Control:").
sc = s.index('Senate Control:')
sen = {
    'democrats': int(s[sc + 3]), 'independents': int(s[sc + 5]), 'republicans': int(s[sc + 7]),
    'majority': 51, 'projectedWinner': 'D' if 'Democrats win control' in ' '.join(s[sc:sc + 4]) else None,
}

# ---- House
hc = h.index('House Control:')
latest = h.index('Latest seat count')
hn = lambda needle: h.index(needle, hc)
est = {'democrats': int(h[hn('NBC News Estimate') + 1]), 'republicans': int(h[hn('Estimated GOP Seats') - 1])}
seat_idx = h.index('Democratic seats', latest)
house = {
    'democrats': int(h[seat_idx - 1]), 'republicans': int(h[h.index('Republican seats', seat_idx) - 1]),
    'independents': int(h[h.index('Independent seats', seat_idx) - 1]),
    'majority': 218, 'estimate': est, 'projectedWinner': 'D' if 'Democrats win control' in ' '.join(h[hc:hc + 4]) else None,
}
m = re.search(r'Flipped (\d+) seats \(\+(\d+) net gain\)', ' '.join(h[seat_idx:seat_idx + 40]))
house['democraticFlips'] = int(m.group(1)) if m else None
house['democraticNetGain'] = int(m.group(2)) if m else None
m = re.search(r'Flipped (\d+) seats', ' '.join(h[seat_idx + 12:seat_idx + 60]))
house['republicanFlips'] = int(m.group(1)) if m else None

# Battlegrounds: State, "house District N", Projected winner, D/R, name, pct ...
battlegrounds = []
b0 = h.index('House Battlegrounds', hc + 1)
b1 = h.index('See more races', b0)
blk = h[b0 + 1:b1]
k = 0
while k + 8 < len(blk):
    if blk[k + 1].startswith('house District'):
        battlegrounds.append({
            'state': blk[k], 'district': int(blk[k + 1].split()[-1]),
            'winnerParty': blk[k + 3], 'winner': blk[k + 4], 'winnerPct': num(blk[k + 5]),
            'otherParty': blk[k + 6], 'other': blk[k + 7], 'otherPct': num(blk[k + 8]),
        })
        k += 9
    else:
        k += 1

# State seat counts: "AL|Alabama|7 seats|2|seats|⬢...|5|seats|...|0|uncalled"
states = []
t0 = h.index('All House Races')
blk = [x for x in h[t0:h.index('Source', t0)] if x != '⬢']
k = 0
while k < len(blk):
    if re.fullmatch(r'[A-Z]{2}', blk[k]) and k + 1 < len(blk) and re.fullmatch(r'\d+ seats?', blk[k + 2] if k + 2 < len(blk) else ''):
        try:
            total = int(blk[k + 2].split()[0])
            d_n, r_n, un = int(blk[k + 3]), int(blk[k + 5]), int(blk[k + 7])
            states.append({'code': blk[k], 'state': blk[k + 1], 'seats': total, 'democrats': d_n, 'republicans': r_n, 'uncalled': un})
            k += 9
            continue
        except (ValueError, IndexError):
            pass
    k += 1

out = {
    'year': year,
    'pins': {'hub': 1648, 'senate': 21052},
    'updated': {'senate': stamp(s), 'house': stamp(h), 'checked': '2026-11-14'},
    'source': {'label': 'NBC News, data provided by The Associated Press; projections by the NBC News Decision Desk',
               'senateUrl': 'https://www.nbcnews.com/politics/2026-elections/senate-results',
               'houseUrl': 'https://www.nbcnews.com/politics/2026-elections/house-results'},
    'senate': {**sen, 'races': races},
    'house': {**house, 'battlegrounds': battlegrounds, 'states': states},
}
path = 'src/server/data/elections.json'
try:
    prev = json.load(open(path))
except FileNotFoundError:
    prev = {'years': []}
years = [y for y in prev.get('years', []) if y['year'] != year] + [out]
json.dump({'years': sorted(years, key=lambda y: -y['year'])}, open(path, 'w'), indent=1, ensure_ascii=False)
print('senate races', len(races), 'battlegrounds', len(battlegrounds), 'states', len(states), 'house', house, 'senate', sen)
