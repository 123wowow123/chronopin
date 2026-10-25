# Autopilot people coverage — 2026-10-25

Applied to localhost and production through the authenticated People APIs:
54 new profiles and 18 existing profiles enriched, covering 72 people and
public individual creator identities. The directory now contains 1,328 people.
No deployment was needed.

## Image storage correction and Google Images follow-up

The initial image pass mistakenly used the local Azure storage emulator. Its
HTTP URLs were rejected by the People API, leaving the new profiles without
photos. The follow-up uploaded the 53 reviewed portraits and public creator
avatars to the actual `chronopin` Azure account, under
`https://chronopin.blob.core.windows.net/thumb/people/autopilot/`. Every public
file was downloaded, hash-checked and decoded before attaching its URL through
the authenticated People APIs in both environments. The replay now rejects
non-public image URLs before saving. The research catalog and People backup
carry the corrected public URLs and source credits.

Both environments now have photos or published creator avatars for 71 of the
72 people. The remaining person is Julian Baker. Google Images was searched
with his name, middle initial, Madrigal and Baker Brothers. Madrigal's official
board biography has no portrait, Forbes supplies a placeholder, and the
Bloomberg image result identifies his brother Felix. Unrelated namesakes and
an illustration were rejected. The Spiking article uses a Wall Street scene,
not a portrait. Julian's photo stays blank pending a verified photograph.

## Sources and scope

- [Requested landing page](https://www.joinautopilot.com/landing).
- [Official public strategy directory](https://start.joinautopilot.com/strategies).
- [Official structured catalog](https://start.joinautopilot.com/strategies/portfolios.json),
  generated 2026-10-25: 144 portfolios and 50 pilots.
- Each profile's biography, education and portfolio connection has its own
  HTTPS citation in the native contributions, education and compiled wiki.
  Individual pilot biographies are explicitly treated as self-reported.
- Named subjects of trackers, principals of explicitly tracked firms, named
  creators and self-described individual creators' public aliases are included.
  Organizations and AI models are excluded as people. Thematic portfolios
  referencing Swift, Musk or Harris are distinguished from personal-trade trackers.
- Landing-page-only creators Molly Cantillon and Antonio Marrazzo are included.
  Antonio's professional LinkedIn profile was opened in Chrome after the HTTP
  fetch failed. His ongoing Rice study is not represented as a completed degree.

## Saved content and preservation

The reviewed catalog is `scripts/people/data/autopilot.json`; replay using
`npx tsx scripts/people/autopilot.ts` (dry-run), adding `--apply` to save and
`--base https://www.chronopin.com` for production. It authenticates using the
existing admin environment credentials, never records them in the catalog,
merges existing lists and missing scalar fields, checks for concurrent edits,
and verifies the saved profile and compiled wiki. Existing financial research,
legal records, phases and sourced personal facts are preserved.

The People backup was synchronized for these 72 profiles, preserving unrelated
snapshot records. Images were downloaded, decoded and visually inspected, then
53 portraits or public creator avatars were uploaded to Azure Blob Storage and
verified by public download and SHA-256. Source URLs and credits remain in the
catalog; no image binaries were added to Git. The Burry tracker image depicting
Christian Bale was rejected and replaced by Tony Avelar's photograph of Burry.
Steven A. Cohen the investor is distinct from Steve Cohen the congressman.

## Verification and limits

- Both environments' replay dry-runs return 72 unchanged entries, zero creates
  and zero updates after application.
- Every saved profile and compiled wiki was read back and checked for its
  additions and citations. Production People filtering and the Michael Burry
  detail page were also checked in Chrome.
- TypeScript and the replay script's ESLint check passed.
- The official public directory is limited to portfolios above $100,000. It
  cannot prove exhaustive coverage of private or smaller app-only portfolios;
  the landing page also reports more portfolios than the public catalog.
- Julian Baker's sourced biography and education are saved. Forbes supplies a
  placeholder image; no unverified portrait was substituted.
- Antonio Marrazzo's precise Autopilot portfolio details are absent from the
  public catalog. His public professional biography and portrait are saved.
- No private dates, income, property, health or religion were invented. Client
  assets and portfolio returns were never treated as personal income. This
  profile pass does not certify a complete legal/ethics or impact review.
