# Refreshes the Census BTOS AI lines in scripts/industry/btos.json.
#   python3 -I scripts/industry/btos.py <National.xlsx> [out.json]
# Download first: curl -L -o National.xlsx https://www.census.gov/hfp/btos/downloads/National.xlsx
# Each point is dated by the fortnight's reference-period end; values are the
# national "Yes" share for the AI-use question now and expected in six months.
import json, sys, openpyxl

wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
dates = {}
for r in list(wb['Collection and Reference Dates'].iter_rows(values_only=True))[1:]:
    if r[3] and r[7]:
        dates[str(r[3])] = r[7].date().isoformat()
rows = list(wb['Response Estimates'].iter_rows(values_only=True))
head = rows[0]
lines = {}
for r in rows[1:]:
    if r[0] in (7, 24) and r[2] == 1:
        pts = []
        for col, cycle in zip(r[4:], head[4:]):
            if col and str(cycle) in dates and str(col).rstrip('%').replace('.', '', 1).isdigit():
                pts.append({'x': dates[str(cycle)], 'value': float(col.rstrip('%'))})
        lines[r[0]] = sorted(pts, key=lambda p: p['x'])
out = [
    {'label': 'Census BTOS: using AI now (all employer firms)', 'points': lines[7]},
    {'label': 'Census BTOS: expect to use AI in 6 months', 'points': lines[24]},
]
json.dump(out, open(sys.argv[2] if len(sys.argv) > 2 else 'scripts/industry/btos.json', 'w'), indent=1)
print({k: (v[0]['x'], v[-1]['x'], v[-1]['value']) for k, v in lines.items()})
