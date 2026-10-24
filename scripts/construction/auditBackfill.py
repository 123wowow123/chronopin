import json,re,html
from pathlib import Path
D=Path('.scrape/construction-status-backfill-2026-10-24');now='2026-10-24'
prior=json.load(open('scripts/construction/status.json'))
physical=re.compile(r'\b(construction|groundbreak\w*|breaks? ground|power (?:plant|station)|nuclear (?:plant|reactor)|reactor|solar (?:farm|park|project|plant|facility)|wind (?:farm|project|park)|hydropower|hydroelectric|pipeline|bridge|tunnel|railway|rail line|rail link|railroad|metro|subway|high.speed rail|airport|terminal|stadium|arena|data cent(?:er|re)|gigafactory|factory|factories|refinery|steelworks|smelter|dam|reservoir|desalination|water treatment|housing (?:development|project)|residential|tower|skyscraper|offshore wind|battery (?:storage|project|plant|facility)|energy storage|BESS|transmission (?:line|project)|port expansion|manufacturing (?:plant|site|campus|facility)|campus|hospital|convention cent(?:er|re))\b',re.I)
exclude=re.compile(r'\b(collapse[sd]?|freed|rescued?|earthquake (?:hits|strikes)|attack|bombard|ransomware|shuts? down|shutdown|retires?|retire[sd]|decommission|demol\w*|halts?|suspend\w*|cancel\w*|shelv\w*|abandon\w*|mothball\w*|layup|long.term layup|fire destroys|explosion|strike|legislation|height caps|ceasefire|crisis forces|study finds|renames|filling.*complete|orders pipeline work)\b',re.I)
nonphysical=re.compile(r'(?:\b(?:built.in|built.on|home.built|british.built|zeekr.built|railway gun|first plasma|fusion experiment|terminal list|super bowl|paralympic|grand prix|concert|tour dates|matchday|qualifier|riders|robotaxi|AI model|model weights|drug approval|GPT|Gemini|Claude)\b|\b(?:mission|spacecraft|rocket|satellite|ship|vessel|yacht)\b.*\b(?:launch|flight|flies|lands|deliver))',re.I)
def plain(s):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',re.sub(r'</(?:li|p|h[1-6])>', '. ', s or '',flags=re.I)))).strip().replace('under-construction','under construction').replace('Under-construction','Under construction')
def match(p):
 title=p['title'];desc=plain(p['description']);body=plain(p['longFormSummary']);lead=desc+' '+body.split('Earlier pin evidence')[0][:2200]
 if p['id'] in [101,3654,6097,14185,15988]:return 'excluded','Product, planning law, ownership acquisition or tariff event rather than physical construction milestone',None
 if p['id'] in [7021,4830,4831,2302,15700,15760,15875,15941,15810,15688]:return 'research','Saved sources show disputed/denied/held status or mixed phase evidence; confirm the exact physical project stage before tagging',None
 if p['id'] in [2267,2280,15989,16342,16892]:return 'In Progress','Manual review of the saved cited construction-start or under-construction statement',next((s for s in re.split(r'(?<=[.!?])\s+',body) if re.search(r'under construction|construction began|groundbreaking',s,re.I)),body[:900])
 if re.search(r'seasonal activity|\b(?:at .*arena|at .*stadium)\b',title,re.I) and not re.search(r'construction|opens|opening|breaks ground|complet|build|renovat',title,re.I):return 'excluded','Hosted sports/leisure event, not construction of the venue',None
 if re.search(r'placed in service\s*(?:in\s*)?(?:19|20)\d\d|began welcoming residents|grand.opening celebration on|community is now operating',lead,re.I) and re.search(r'affordable housing|apartment|homes|residen',title+' '+desc,re.I):return 'Completed','Saved developer/HUD/operator evidence establishes placed-in-service, resident move-in or opening',next((s for s in re.split(r'(?<=[.!?])\s+',lead) if re.search(r'placed in service|began welcoming|grand.opening|now operating',s,re.I)),desc)
 if re.search(r'\b(?:active .* (?:request|study)|in.development|preconstruction|pre.construction|remains.*study request|interconnection.*(?:request|study)|queue request)\b',desc,re.I) and not re.search(r'withdrawn|cancelled|shelved|under construction|construction (?:began|started|continuing)',title+' '+desc,re.I):return 'Proposed','Project-specific interconnection/development request, with no physical construction assertion',desc
 if re.search(r'stalled|stop.work|frozen|withdrawn|denied|restraining order|moratorium|on hold',title,re.I):return 'research','Halted/denied or conflicting project state; verify a resumed physical-work stage before applying one of the three tags',None
 if p['id']==15776:return 'Proposed','Manual phase-scope review: NEO-01 construction is not evidence of NEO-02 to NEO-04 construction',desc
 if p['id']==16444:return 'Proposed','Manual negation review: proposed additional demand is not verified construction of the pinned 300 MW scope',desc
 if p['id']==16646:return 'Completed','Manual phase-scope review: Aratina 1 is operating; the construction statement concerns separate Aratina 2',title
 # Reviewed project-stage blocks take precedence over generic planning prose.
 stage=re.search(r'Verified project stage\s*(Under construction|Operational|Planned|Proposed|Under construction / commissioning)',body,re.I)
 if stage:return ('Completed' if stage[1].lower()=='operational' else 'Proposed' if stage[1].lower() in ['planned','proposed'] else 'In Progress'),'Explicit sourced project-stage block',stage[0]
 # Manual review resolves scope/historical clashes found during the audit.
 manual={150:('In Progress','Saved project history explicitly gives status under construction for the multiphase Hudson Yards scope.'),216:('In Progress','Terminal/runway construction is completed and cargo flights have begun; passenger opening remains October 25, 2026.'),219:('In Progress','Saved current history says Jeddah work restarted January 2025 and reached 113 floors September 2026.'),495:('Completed','Description says the tower was finished; source disagreement concerns completion year (2013/2014), not whether it was completed.'),683:('Completed','Description states the 40 Leadenhall tower has reached completion; saved history dates completion to 2024.'),685:('Completed','The stadium/arena opened in 2022; the separately planned museum/hotel does not alter this pinned scope.'),703:('Completed','Description dates first apartment closings after finishing construction; saved history gives completion in 2020.'),704:('Completed','Description explicitly says Steinway Tower completed construction; saved history dates this to 2022.'),710:('Completed','Description states Australia 108 is completed; saved history dates completion to September 2020.'),748:('Completed','Pin represents completed Beirut Terraces building, distinct from its historical construction start.'),5483:('In Progress','Saved project history explicitly dates start of the port/build programme to June 10, 2024, with commissioning planned 2027.'),15828:('In Progress','Substation energization is completed but the pinned campus remains under phased data-center construction through 2027.')}
 if p['id'] in manual:return manual[p['id']][0],'Manual review of saved cited unit/phase evidence',manual[p['id']][1]
 if p['id'] in [136,15859]:return 'research','Current work status halted or site scope disputed in saved sources; do not reuse historical construction or a different parcel as proof',None
 # Category evidence filters out venue-name and product false positives.
 cats=category.get(p['id'],set())
 if cats.intersection({'Food','Music','TV','Gaming','Anime','Manga','Tabletop','Conference','Festival','Award'}) and not re.search(r'manufacturing|chocolate factory|food factory|construction|breaks? ground|groundbreaking|renovation|redevelopment|stadium (?:opens|completes)|arena (?:opens|completes)',title,re.I):return 'excluded','Venue/brand/product name or hosted event; no physical construction scope',None
 if re.search(r'\b(?:IPO|REIT|Lists on|job cuts|hires|layoffs|renames|foreclosure auction|partnership|auction.*(?:radio|spectrum)|show.*fills|needed coastal permits|fines.*orders)\b',title,re.I):return 'excluded','Financial, employment, branding or legal event; no construction milestone',None
 if re.search(r'\b(?:stalled|withdrawn|denied|rejects?|on hold|restraining order|moratorium|abandoned|not proceed|stopped)\b',title,re.I):return 'research','Halted, denied, withdrawn or contested project; three requested statuses do not reliably express its present state',None
 if re.search(r'\b(?:phase 1 operating|phase 2 planned|operational target|online H[12] 202[7-9]|finishes its.*tunnels)\b',title,re.I):return 'research','Partial phase or future operating target does not establish completion of the entire pinned scope',None
 if re.search(r'(?:—|–|:|,)\s*(?:operational|in service|operating since|online)|\b(?:Operating Since|In Service Since|Online in \d{4})\b',title,re.I):return 'Completed','Explicit operating/completed scope in reviewed title',title
 if re.search(r'\bunder construction\b',title,re.I):return 'In Progress','Explicit under-construction scope in reviewed title',title
 if re.search(r'\b(?:groundbreaking announced|sets.*groundbreaking|still on tract|still on track)\b',title,re.I):return 'research','Announced groundbreaking is not proof it took place; verify physical start',None
 # Explicit structural false positives are retained in excluded audit, not assigned.
 if nonphysical.search(title):return 'excluded','Not a construction-phase event',None
 if exclude.search(title) and not re.search(r'shuts for.*(?:retub|refurb|life extension)',title,re.I):return 'excluded','Closure, accident, halt/cancellation or other non-construction milestone',None
 if re.search(r'\b(?:award|busiest|record|world cup|anniversary|referendum|safety vote|investigation|retirement)\b',title,re.I):return 'excluded','Recognition/event or policy rather than physical construction scope',None
 # Past, affirmative milestone in the title: source date alone never supplies completion.
 if p['utcStartDateTime'][:10]<=now and not re.search(r'\b(?:will|expected|targeted|scheduled|set to|due to|planned to)\b',desc[:300],re.I) and re.search(r'\b(?:opens|opened|inaugurat\w*|dedicat\w*|completes|completed|finishes|finished|reopens?|commissioned|commissions|begins? commercial|enters? commercial|resumes? commercial|commercial operation)\b',title,re.I) and not re.search(r'\b(?:target|set to|due|will|expects?|plans?|propos\w*|forecast|first (?:coil|plasma|power)|tunnel bor\w*|drilling|excavat\w*|tops? out|technical opening|partial|phase.*later)\b',title,re.I):
  return 'Completed','Explicit dated opening/completion/commercial-operation milestone',title
 # A reported historical groundbreaking is the phase shown by that pin; scheduled future groundbreakings remain proposed.
 if p['utcStartDateTime'][:10]<=now and re.search(r'\b(?:breaks? ground|broke ground|groundbreaking|construction (?:begins|starts|began)|begins? construction|starts? (?:building|construction)|construction restarts?|construction resumes?)\b',title,re.I) and not re.search(r'\b(?:targets?|set to|sets?|still on tra(?:ct|ck)|due|schedules?|scheduled|will|expects?|plans?|propos\w*|delayed|pushed)\b',title,re.I):
  return 'In Progress','Explicit construction/groundbreaking milestone, dated on or before the research check',title
 # Explicit structured timeline stages and construction verbs missed by nominal project titles.
 for sentence in re.split(r'(?<=[.!?])\s+',lead):
  if re.search(r'\b(?:began|begun|started|commenced|progressed|advanced(?: final)?) construction\b(?! (?:planning|documentation|permitting))|\bTimeline:\s*under construction\b(?! (?:planning|documentation|permitting))',sentence,re.I) and not re.search(r'\b(?:will|would|could|not|never|expects?|planned|scheduled|targeted)\b.{0,45}(?:began|begun|started|commenced|progressed|advanced) construction',sentence,re.I):return 'In Progress','Explicit construction-start/progress or under-construction timeline assertion',sentence
 # Read individual current-state clauses; do not apply a historical predecessor's completed status.
 sentences=re.split(r'(?<=[.!?;])\s+|(?<=\.) (?=[A-Z])',lead)
 for sent in sentences[:9]:
  # Affirmative active-work language. Planned "will begin" and negated construction are not active work.
  if re.search(r'\b(?:is|are|was|were)? (?:currently |now |still )?(?:under construction|being built|being construct\w*|being refurbish\w*|being install\w*|undergoing (?:construction|commissioning|testing|refurbishment))\b|\b(?:is|are) (?:building|constructing|installing|adding|commissioning)\b|\b(?:broke ground|construction began|construction started|construction is under ?way|work is under ?way|construction underway)\b',sent,re.I):
   if not re.search(r'\b(?:not|no|never|not yet|will|would|could|plans? to|expects? to|scheduled to|due to|target\w* to)\b.{0,90}(?:under construction|being built|building|constructing|installing|broke ground|construction (?:began|started))',sent,re.I):return 'In Progress','Saved cited content explicitly describes physical work underway',sent
 if re.search(r'\bTimeline:\s*(?:proposed|planned|pre.construction|permitted|certificated|in.development)\b',body,re.I):return 'Proposed','Explicit proposal/permitting/development timeline; no physical-work claim in reviewed lead',next((s for s in re.split(r'(?<=[.!?])\s+',body) if 'Timeline:' in s),desc)
 # Explicit planning/approval statements, after checking stronger physical-work assertions.
 if re.search(r'\b(?:proposed|proposes?|proposing|pre.construction|planned|planning|plans? (?:a|an|the|to)|seeking approval|under (?:environmental|siting|regulatory) review|permit application|rezoning application)\b',desc+' '+title,re.I):
  return 'Proposed','Explicit plan/proposal or pre-construction stage; no affirmative physical-work evidence in reviewed lead',desc or title
 if re.search(r'\b(?:proposed|proposes?|proposing|pre.construction|planned|planning|seeking approval|under (?:environmental|siting|regulatory) review)\b',body[:1200],re.I) and not re.search(r'construction|completed|operating|opened|in service|operational|starts up|ships first|first residents|first patients',title,re.I):
  return 'Proposed','Saved cited opening section explicitly describes proposal/planning',body[:700]
 return 'research','Construction stage not established: need explicit proposal, physical-work or completed-scope evidence; elapsed pin date and capacity/parcel/permit alone are insufficient',None
category={}
for t in json.load(open(D/'categories.json')):category.setdefault(t['pinId'],set()).add(t['name'])
for host in ['127.0.0.1','www.chronopin.com']:
 rows=json.load(open(D/(host+'-pins.json')));known={p['id'] for e in prior['environments'] if host in e['base'] for p in e['pins']}
 out={'assigned':[],'research':[],'excluded':[],'previous':[]};scanned=0
 for p in rows:
  if not (re.search(r'—.*(?:operational|under construction|planned)',p['title'],re.I) or physical.search(p['title']) or 'cleanview.co/projects/' in str(p['longFormSummary']) or re.search(r'\b(?:housing|canal|seaport|geothermal|combined.cycle|solar|wind farm|storage project|power station|highway|motorway|construction|groundbreaking|building a|new (?:factory|plant|facility))\b',p['description'] or '',re.I)):continue
  scanned+=1
  if p['id'] in known:out['previous'].append({'id':p['id'],'title':p['title']});continue
  status,why,evidence=match(p)
  item={'id':p['id'],'title':p['title'],'sourceUrl':p['sourceUrl'],'date':p['utcStartDateTime'][:10],'reason':why,'evidence':evidence}
  if status not in out:item['status']=status;out['assigned'].append(item)
  else:out[status].append(item)
 (D/(host+'-audit.json')).write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
 (D/(host+'-review.txt')).write_text('\n'.join(f"{p['id']} [{p['status']}] {p['title']} | {p['evidence']}" for p in out['assigned']))
 (D/(host+'-gaps.txt')).write_text('\n'.join(f"{p['id']} {p['title']}" for p in out['research']))
 print(host,'scanned',scanned,{k:len(v) for k,v in out.items()})
