-- Recent incidents from the service's StatusGator page, newest first:
-- [{name, duration, startedAt (ISO), severity: 'warn'|'down'|'maintenance'}]
ALTER TABLE "ServiceStatus" ADD COLUMN IF NOT EXISTS "incidents" jsonb NOT NULL DEFAULT '[]';
