# Restaurant specials duplicate audit — 2026-10-13

Audited production at https://www.chronopin.com on October 13, 2026. The guide audit completed at 4:59 pm Pacific.

- Read all 1,315 enabled restaurant profiles through the authenticated restaurant-specials API, including six profiles used for existing-pin enrichment without a regional guide assignment.
- Checked all 1,651 stored specials for repeated promotion names within a branch. Checked capitalization, Unicode normalization, whitespace and punctuation variations. No duplicates found.
- Checked branch records by city, normalized restaurant name and address, and separately by punctuation-insensitive name within each city. No duplicate branch records found.
- Read every page of both Specials sections in all 100 registered city guides through the public guide API: 230 requests, 1,296 restaurant cards and 1,599 offer tabs.
- Checked restaurant identity across pages and between Available now and Upcoming specials. Checked promotion names, kinds and validity dates within each card. No duplicate cards or tabs found.

The public guide counts reflect eligible, scheduled offers at the time of the audit and the existing upcoming-section limit. The full profile audit also covered records outside those displayed results. This audit checked API output; it did not manually inspect every card in a browser.

No content changes or production deployment were needed for this audit.
