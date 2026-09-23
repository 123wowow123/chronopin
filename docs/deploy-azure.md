# Production on Azure

Chronopin runs on one Linux VM on the **Windows Azure MSDN - Visual Studio
Professional** subscription (id `9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5`), whose
$50 monthly credit is also its spending cap: going over switches the
subscription off, site included. The same login also has a **Pay-As-You-Go**
subscription with no cap, so every `az` command names the subscription.

| Resource | Group `Chronopin-US-West`, region West US 2 | ≈ a month |
|---|---|---|
| VM `chronopin-web` | Ubuntu 24.04, Standard_B2s (2 vCPU, 4 GB) + 4 GB swap | $30 |
| OS disk | 32 GB Standard SSD | $2.40 |
| Public IP `chronopin-ip` | static, `20.109.175.187` | $3.65 |
| Storage `chronopin` | blob container `thumb` (public read): thumbnails and avatars | cents |
| NSG `chronopin-web-nsg` | 22 from Ian's IP only, 80/443 from anywhere | - |

On the VM, `Docker/docker-compose.prod.yml` runs the app, PostgreSQL with
PostGIS, the FAISS search service and Caddy, which serves HTTPS with
certificates it gets and renews itself (`Docker/Caddyfile`).

## Getting in

```sh
ssh -i ~/.ssh/chronopin_azure azureuser@20.109.175.187
```

The key was made for this VM and lives only on Ian's Mac. SSH is open to one
IP address; from somewhere else, add it first:

```sh
az network nsg rule update --subscription 9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5 \
  -g Chronopin-US-West --nsg-name chronopin-web-nsg -n ssh-from-ian \
  --source-address-prefixes <your-ip>/32
```

## Configuration

`~/chronopin/Docker/env.prod.list` on the VM holds every secret (mode 600,
never in git or an image). It was made from `.env.local` plus values of its
own: a generated `SESSION_SECRET` and database password, the `chronopin`
storage account's connection string, and `DOMAIN` for the sign-in callbacks.
Change a value there, then `docker compose ... up -d app` to restart with it.

## Deploying a change

From the repository on the Mac:

```sh
rsync -az --delete -e "ssh -i ~/.ssh/chronopin_azure" \
  --exclude node_modules --exclude .next --exclude .git --exclude test-results \
  --exclude playwright-report --exclude scratchpad --exclude '.env*' \
  --exclude 'Docker/env.*.list' --exclude '*.tsbuildinfo' \
  ./ azureuser@20.109.175.187:chronopin/
ssh -i ~/.ssh/chronopin_azure azureuser@20.109.175.187 \
  'cd chronopin && docker compose -f Docker/docker-compose.prod.yml up -d --build app'
```

`--exclude 'Docker/env.*.list'` keeps `--delete` from removing the VM's env
file. A new schema file needs `npm run create:db` through the tools container
(below) before or right after the app restarts.

## One-off scripts

The runtime image is only the standalone server. Scripts run in the `tools`
service, which is the Dockerfile's build stage (source and dev dependencies):

```sh
cd chronopin
docker compose -f Docker/docker-compose.prod.yml --profile tools run --rm tools npm run create:db
docker compose -f Docker/docker-compose.prod.yml --profile tools run --rm tools npm run db:refresh     # schema + seeds, first launch
docker compose -f Docker/docker-compose.prod.yml --profile tools run --rm tools npm run create:search  # FAISS index from the pins
```

Rebuild it (`--profile tools build tools`) after a code change the script needs.

## DNS and HTTPS

chronopin.com's DNS is at GoDaddy. `@` and `www` are A records pointing at the
VM's IP; the bare domain redirects to `https://www.chronopin.com`. After
changing the records, `docker compose ... restart caddy` makes it ask for the
certificates at once instead of waiting out its back-off. `comment` points at
an older Google Cloud service and is not part of this.

Mail (Microsoft 365 MX/SPF at the root, Resend's `send`, `rsend`,
`resend._domainkey` and `_dmarc` records) is unrelated to the web records.
