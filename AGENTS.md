<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Deploying to production

Never deploy, restart, resize or build on the production VM (20.109.175.187) unless the user has asked for that deploy in this conversation, in words. Editing code, committing and pushing are not a request to deploy, and approval for one deploy does not cover the next.

`npm run deploy` is the only deploy: GitHub builds the image and the VM pulls it (scripts/deploy-image.sh). Never build on the VM - `next build` beside the live site swaps the 2-vCPU box and the site returns 502s for the length of the build (2026-10-10). `npm run deploy:vm` exists only as a fallback and needs `DEPLOY_ON_VM=1`; use it only when the user explicitly asks for a VM build. The deploy scripts refuse a non-interactive shell unless `DEPLOY_CONFIRMED=1`; set that only after the user has asked for this deploy, and never to get around a refusal. If a deploy or build is already running on the VM (`pgrep -f next-build`), wait; do not start another.

## Pin media storage

Store pin images in Azure Blob Storage. Do not add pin photos or generated thumbnails to Git. Keep blob URLs, source URLs, credits and other metadata in the repository. Use ignored temporary files while sourcing or uploading; verify the public blob before removing a local file or switching a live pin reference. Application icons, logos and other UI assets may remain in Git.

## Restaurant guide navigation

Keep both country and city navigation menus sorted from west to east, not alphabetically. Order cities by city-center longitude; order countries by their westernmost supported guide city. Preserve this ordering when adding or updating guides.

Every restaurant landing page, including Japan's city guides, should support the same four sections as San Diego: Coming soon, Just opened, Top restaurants, and Specials. Hide tabs with no eligible content, and fall back to a populated view for links to empty tabs. Keep Specials visible whenever verified active or upcoming offers exist, even outside service hours and without a published rating. Show each upcoming offer's next local start time on its card; show active offers as available now. Expired offers do not keep a tab visible. Make a thorough research effort to populate every section before accepting incomplete coverage: search operator announcements, local reporting, branch-specific menus and verified promotions. Add sourced content whenever possible; never invent opening dates, discounts, ratings or menu items merely to make a tab appear. Record the sources checked and unresolved coverage gaps in the guide notes.

## Restaurant menu research

Always make a thorough effort to find and display actual menu items, including happy-hour and other specials, on restaurant cards and pin details. Search beyond the first link: check branch-specific operator pages, linked PDFs, menu images, ordering menus and credible branch-specific sources. Transcribe verified dishes and drinks with published prices, currency and conditions. If items are published without prices, include the items with “Price not published”; missing prices are not a reason to leave the menu empty. Never borrow another branch's menu or infer that regular-menu items participate in a special. Use link-only coverage only after a deep search fails to find verifiable items, and document the sources checked and the remaining gap.
