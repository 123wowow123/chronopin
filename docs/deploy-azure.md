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
| Storage `chronopin` | container `thumb` (public read): thumbnails and avatars; container `backups` (private): nightly database dumps, deleted after 14 days | cents |
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

## Backups

`Docker/backup.sh` runs from cron on the VM every day at 10:15 UTC
(`crontab -l`, log in `~/backup.log`): a `pg_dump` in custom format, checked
with `pg_restore --list`, uploaded to the private `backups` container as
`chronopin-<UTC time>.dump`. A lifecycle rule on the storage account deletes
copies older than 14 days.

The VM uploads with a SAS token in `~/chronopin/Docker/env.backup.list` that
may only create and write: it cannot list, read or delete a backup. It expires
2028-09-23; make a new one the same way:

```sh
KEY=$(az storage account keys list --subscription 9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5 \
  -g Chronopin-US-West -n chronopin --query "[0].value" -o tsv)
SAS=$(az storage container generate-sas --account-name chronopin --account-key "$KEY" \
  -n backups --permissions cw --expiry 2030-09-23T00:00Z --https-only -o tsv)
printf 'BACKUP_CONTAINER_URL="https://chronopin.blob.core.windows.net/backups?%s"\n' "$SAS" |
  ssh -i ~/.ssh/chronopin_azure azureuser@20.109.175.187 'umask 077; cat > chronopin/Docker/env.backup.list'
```

To restore, download a dump with the account key (`az storage blob list` /
`az storage blob download --account-name chronopin -c backups ...`), copy it
to the VM and `pg_restore --no-owner -d chronopin` it into the `postgres`
container. The first backup was restored into a throwaway database to check it
(2,744 pins, 28 users, all 71 migrations).

## Social sign-in

The Google, Facebook and Apple buttons appear only for a provider whose keys
are set (`signInProviders` in `src/server/oauth.ts`), read per request, so
adding them needs no rebuild. In each provider's console, register the
callback `https://www.chronopin.com/auth/<google|facebook|apple>/callback`,
then add to `Docker/env.prod.list` and `docker compose ... up -d app`:

- Google: `GOOGLE_ID`, `GOOGLE_SECRET` - set 2026-09-23. The client "Chronopin web"
  lives in Google Cloud project `chronopin-web` (Google Auth Platform), owned by
  flynni2008 with chronopin.official as Editor and as the support/contact email;
  published to production with only openid/email/profile, so no verification
  review. Its redirect URIs are the live callback and
  `http://localhost:3000/auth/google/callback` for development. A new secret
  can be added under Clients; Google shows it only once.
- Facebook: `FACEBOOK_ID`, `FACEBOOK_SECRET`
- Apple: `APPLE_ID` (the Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID`,
  `APPLE_KEY` (the .p8 file's text)

## DNS and HTTPS

chronopin.com's DNS is at GoDaddy. `@` and `www` are A records pointing at the
VM's IP; the bare domain redirects to `https://www.chronopin.com`. After
changing the records, `docker compose ... restart caddy` makes it ask for the
certificates at once instead of waiting out its back-off. (The old
`comment` record went with the Google Cloud project it pointed at.)

Mail (Microsoft 365 MX/SPF at the root, Resend's `send`, `rsend`,
`resend._domainkey` and `_dmarc` records) is unrelated to the web records.
