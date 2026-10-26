---
type: API Endpoint
title: Named searches API
description: Shared names for searches, shown as pills in everyone's popular searches.
resource: "../../../src/app/api/saved-searches/route.ts"
tags: [api, search, tag-cloud]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-26T00:00:00Z }
---

# Named searches

A search (any query, above all a list of exact pins, `pin:1,2,3`) can be given a
name. A named search is shared: it shows in the tag cloud's **Popular searches**
row for every viewer, signed in or not. Only a signed-in user can name one.

## What the viewer sees

- A named pill is **emerald with a label icon**; pinned pills are amber, the
  viewer's recent searches blue, the rest plain.
- A named pin list reads `Name · count` (`Google · 24`). The search box shows
  the same pill in place of the `24 pins` pill when the query is named.
- Hovering a named pill shows `Named by @handle`.
- **`name:` directive**: add `name:"Veo releases"` to any search and press Enter
  (signed in). The search box saves the name (`PUT` below) and runs the search
  without the term, so it then shows as the named pill. The parser reads
  `name:` but it never narrows results (`takeName` in `src/lib/savedQueries.ts`;
  signed out, the term is just dropped). Entered where a query is only
  loaded from a URL, it is ignored: only the search box saves.
- **`[Name]` prefix**: the quick form, `[Veo releases]pin:19661,...`. Same
  effect as `name:`; the parser (`LEADING_NAME`) ignores the bracket text, and
  `takeName` reads it (a `name:` term wins if both are present).
- **`[Name](...)` group**: for a long filter, `[Predicted food](tag:Predicted
  updated:>=2026-10-17 OR tag:Predicted posted:2026-10-18 tag:Food)`. Brackets
  group terms in the parser too (`expandGroups` in `searchQuery.ts` multiplies
  them out into OR alternatives, so `(tag:A OR tag:B) company:X` is
  `tag:A company:X OR tag:B company:X`, capped at 32; a `(...)` counts only if
  it holds an OR or a field term, so `iphone (2020)` stays text). A search that
  is only one group is saved without the brackets. The search box shows a
  saved multi-term search as one named pill; clicking it opens it into its
  terms (the pill returns when the query is run again).
- **Name this search** (under the row, signed in only) names the search on
  screen, or renames one. For a pin list the field opens pre-filled with a
  generated name: the tag most of the pins share if at least half carry it
  (`Google`), else `N pins`. An empty name removes it.

The user-facing explanation is on the search guide page (`/search-guide`, text in
`src/lib/searchGuide.ts`: the `pin:` entry and the Pills and Named searches rules).

## Pin lists stay out unless named

A `pin:` list is how a batch links to its pins, not a search anyone returns to
by its text. It is never recorded in the viewer's recent or saved searches, the
popular tally (`POST /api/pins/popular-queries` ignores it; the 30-day read
filters old rows), or the row, until it has a name.

## Calls

| Call | Does |
|---|---|
| `GET /api/saved-searches` | every name, newest first (200 max): `{ [query]: { name, by } }`, `by` the namer's `@handle` or null when that account is gone. Public |
| `GET /api/saved-searches?suggest=<query>` | `{ name }` generated for a pin list, null otherwise. Signed in |
| `PUT /api/saved-searches` `{ q, name }` | name a search; empty `name` removes it. Signed in; only the namer or an admin may change an existing name (else 403) |

Queries are trimmed and whitespace-collapsed; names are cut to 60 characters.

## Storage

`SavedSearch` (0220, replaced the per-user 0219): `query` primary key, `name`,
`userId` (set null if the user is deleted), `utcCreatedDateTime`. Model:
`src/server/model/savedSearch.ts`. Client: `src/lib/savedQueries.ts`
(`useQueryNames`, `saveQueryName`, `syncQueryNames`, `queryLabel`), rendered by
`TagCloud.tsx` and `SearchBox.tsx`. UI strings: `tagCloud.nameQuery*`,
`tagCloud.namedBy`, in every locale.
