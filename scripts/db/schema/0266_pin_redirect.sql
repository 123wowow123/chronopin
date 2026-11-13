-- Permanent 308 redirects for retired or merged pins so external links and
-- search indexes transfer seamlessly to the surviving pin.
CREATE TABLE IF NOT EXISTS "PinRedirect" (
  "fromPinId" integer PRIMARY KEY,
  "toPinId" integer NOT NULL REFERENCES "Pin"("id") ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinRedirect_notSelf" CHECK ("fromPinId" <> "toPinId")
);

CREATE INDEX IF NOT EXISTS "pinRedirectToIdx" ON "PinRedirect" ("toPinId");
