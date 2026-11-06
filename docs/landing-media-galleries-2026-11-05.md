# Landing media galleries — November 5, 2026

`LandingMediaGallery` now supplies the same media controls across product/car cards and heroes, resort cards and heroes, activity cards, music cards and heroes, topic tiles, company product cards and spotlights, company/product picture grids, and restaurant cards and heroes. Existing pin cards used by topic and timeline pages already support mouse, finger and trackpad gestures; they now show the same shared hover arrows beside their dots.

The shared gallery uses native stored media with attribution and optional credited cover photography. It deduplicates source URLs and includes up to ten items, omitting demoted media. Mouse dragging follows the pointer and snaps to a slide; finger scrolling remains native, preserving vertical scrolling and pinch zoom. Swipes suppress the following click; an ordinary image click opens its original destination. The numeric counter remains removed. Arrows use the shared pin component and hide on touch-only devices.

Video players load after a click and unmount when their slide changes. Music entries receive their backing pins' native media in the existing ranking query, alongside their existing artwork and verified video references. No pin facts or translations were changed, and no media files were added to Git.

The UI shows existing media rather than duplicating a lone cover. Some cards still have only one usable item and require further branch/subject-specific sourcing. This change does not claim complete media coverage for every pin.

Verification: TypeScript, targeted ESLint (one existing ActivitiesView dependency warning when that file is included), and 64 tests passed. Browser checks passed mouse dragging on products, cars, travel, music and restaurant pages; finger swipes passed on those same pages. Tests also verified valid link/control nesting, on-demand video mounting, player removal on slide changes, and responsive gallery sizing. Fixed hero sizing and grid minimum widths found during phone checks. Screenshots and browser scripts are in ignored `.scrape/` files. No production deployment was requested or performed.
