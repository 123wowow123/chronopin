---
name: senate-trades-browser
description: >-
  Use this skill when the personTrades task reports "Senate eFD: ... Access Denied" (or any Senate eFD failure),
  or when Senate periodic transaction reports need importing: it reads them in the owner's own Chrome, exports a
  JSON file with one browser download, and imports it locally and on production with `--senate-file`.
---

# Senate eFD trades through the owner's browser

The Senate eFD site (efdsearch.senate.gov) sits behind a bot filter that answers 403 "Access Denied" to this
server's curl reader (since 2026-11-01). It loads normally in the owner's Chrome. **Never spoof a browser
User-Agent or otherwise route around the filter** (an auto-mode check refuses it); use the owner's real browser.

## Preconditions (ask first, once per session)

- The site makes you accept the Ethics in Government Act notice ("unlawful ... for any commercial purpose, other than
  by news and communications media ..."). That is a legal attestation: **only accept it after the owner has said so in
  chat.** Owner, 2026-11-01: "it's not commercial ... agree". Do not carry that approval into a later session without
  asking again.
- The owner has approved a file being saved to `~/Downloads` by the page. Say so before triggering it.

## Steps

1. Load the Chrome tools (`ToolSearch` select `mcp__claude-in-chrome__tabs_context_mcp,navigate,computer,find,javascript_tool,tabs_close_mcp`),
   `tabs_context_mcp {createIfEmpty:true}`, navigate to `https://efdsearch.senate.gov/search/home/`.
2. Tick the agreement checkbox (find "agreement checkbox"; the page then moves to `/search/`). If the click errors with a
   stale ref, take a screenshot: the page has usually already advanced to "Find Reports".
3. On `/search/`, run this in `javascript_tool` (it must be an async IIFE that writes its status to `window`; the tool
   does not wait for promises). It lists periodic transaction reports from the last 30 days, fetches each report's
   `<tbody>`, and triggers a download:

```js
window.__st='running'; (async()=>{ try{
const csrf=document.querySelector('input[name=csrfmiddlewaretoken]')?.value||(document.cookie.match(/csrftoken=([^;]+)/)||[])[1];
const d=new Date(Date.now()-30*864e5); const start=String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0')+'/'+d.getFullYear()+' 00:00:00';
let rows=[]; for(let off=0;;off+=100){ const body=new URLSearchParams({start:String(off),length:'100',report_types:'[11]',filer_types:'[]',submitted_start_date:start,submitted_end_date:'',candidate_state:'',senator_state:'',office_id:'',first_name:'',last_name:'',csrfmiddlewaretoken:csrf}); const r=await fetch('/search/report/data/',{method:'POST',headers:{'X-CSRFToken':csrf,'Content-Type':'application/x-www-form-urlencoded'},body}); const t=await r.text(); if(!t.startsWith('{')){window.__st='non-json '+r.status;return;} const j=JSON.parse(t); rows.push(...j.data); if(off+100>=j.recordsFiltered) break; }
const out=[]; for(const [first,last,,link,filed] of rows){ const href=/href="([^"]+)"/.exec(link)?.[1]; if(!href||!href.includes('/view/ptr/')) continue; const t=await (await fetch(href)).text(); const i=t.indexOf('<tbody'); out.push({first,last,filed,href,html:i>=0?t.slice(i,t.indexOf('</tbody>')+8):''}); }
const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(out)],{type:'application/json'})); a.download='chronopin-senate-ptr-YYYY-MM-DD.json'; document.body.appendChild(a); a.click(); a.remove();
window.__st='downloaded '+out.length; }catch(e){window.__st='err '+e.message} })(); 'started'
```

   Then read `window.__st` after a few seconds (`await new Promise(r=>setTimeout(r,4000)); window.__st`) and check the file with
   `ls -la ~/Downloads/chronopin-senate-ptr-*.json`. Close the tab afterwards.
4. Dry run, then import locally, then to production (the admin token comes from the `admin-login-refresh` skill):

```bash
npm run people:trades -- --senate --senate-file ~/Downloads/chronopin-senate-ptr-YYYY-MM-DD.json --dry-run
npm run people:trades -- --senate --senate-file ~/Downloads/chronopin-senate-ptr-YYYY-MM-DD.json
npm run people:trades -- --senate --senate-file ~/Downloads/chronopin-senate-ptr-YYYY-MM-DD.json --prod --token-file .scrape/admin.token
```

   A filing already stored is skipped, so reruns are safe; "push to user 1 failed (403)" lines on the local import are
   the live-feed notification and do not matter. Check `unmatched` and the dry-run counts against the page's report counts.

## What does not work (do not retry)

- Page-to-localhost `fetch` (blocked by the browser) and `navigator.clipboard.writeText` (no focus): nothing arrives.
- Returning the HTML through `javascript_tool` output: it is cut at about 1,000 characters, and hand-copying trades is
  not acceptable for public figures' financial data.
- `person_trades_update` takes `senateFile` (the export's path): `person_trades_update {senateFile: "/Users/ianflynn/Downloads/chronopin-senate-ptr-YYYY-MM-DD.json"}` reads House, the Senate export and executive, stores locally and sends the last 21 days to production in one call, replacing steps 4's three commands. Without it the tool reports `Senate eFD: Access Denied` in `failed` and House/executive still import.
- The MCP server loads code at start: after editing `personTradesImport.ts` reconnect `chronopin` before expecting the tool to change.
