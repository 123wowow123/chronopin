-- Where a ServiceStatus row was read from: the vendor's own status page API
-- ('official') or StatusGator's page for it ('statusgator').
ALTER TABLE "ServiceStatus" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'statusgator';
