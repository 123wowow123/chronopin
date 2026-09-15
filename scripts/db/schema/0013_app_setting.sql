-- Site-wide settings an admin can change without a deploy, one JSON value per
-- key. A missing row means the setting's default in code applies.

CREATE TABLE "AppSetting" (
  "key"                varchar(100) PRIMARY KEY,
  "value"              jsonb NOT NULL,
  "userId"             integer,
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now()
);
