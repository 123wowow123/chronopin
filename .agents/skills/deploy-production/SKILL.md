---
name: deploy-production
description: >-
  Use this skill whenever the user asks to deploy, release, restart, resize or build on Chronopin
  production (VM 20.109.175.187, www.chronopin.com). It encodes the explicit-request rule and the
  image-based deploy flow. Do not use it for editing, committing or pushing alone.
---

# Deploy to production

## Gate (read first)

Never deploy, restart, resize or build on the production VM unless the user asked for **that deploy in this
conversation, in words**. Editing code, committing and pushing are **not** a deploy request. Approval for one
deploy does not cover the next. If unsure, ask.

## Flow

1. Make sure the work is committed and **pushed** (GitHub builds the image from the pushed commit).
2. Check nothing is already running: `ssh ... "pgrep -f next-build"` style check on the VM. If a build or deploy
   is running, wait; never start a second.
3. Run `npm run deploy` (scripts/deploy-image.sh): GitHub builds the image and the VM pulls it.
   - The script refuses a non-interactive shell unless `DEPLOY_CONFIRMED=1`. Set it **only after** the user
     asked for this deploy, never to get around a refusal.
4. Verify afterwards: homepage responds quickly, a sample pin page and `/api/main` load, standby/failover
   (app-next + Caddy) healthy.

## Never

- Never build on the VM: `next build` beside the live site swaps the 2-vCPU box and the site 502s for the
  whole build (2026-10-10).
- `npm run deploy:vm` is a fallback needing `DEPLOY_ON_VM=1`; only when the user explicitly asks for a VM build.
- Do not read deeper prod internals over SSH (`/proc/<pid>`, `docker top`, container logs): the classifier
  blocks it. Stop and tell the user rather than work around it.

## Related notes

Memory: azure-deploy, deploy-uses-image, deploy-guard-load-shedding, pin-tag-cache-zero-downtime,
bot-overload (deploy/standby and bind-mount traps).
