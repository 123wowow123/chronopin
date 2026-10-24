-- Factory capability profiles with per-axis evidence and planned/demonstrated basis.
-- Separate from Pin updates, and from construction prices on Pin itself.
CREATE TABLE "PinFactory" (
  "pinId" integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "profile" jsonb NOT NULL,
  "checkedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinFactory_profile" CHECK (
    jsonb_typeof("profile") = 'object'
    AND "profile" ?& ARRAY['source', 'axes', 'status', 'sector', 'assessmentDate', 'rubricYear', 'metrics']
    AND "profile"->>'source' IN ('session', 'hand')
    AND "profile"->>'status' IN ('announced', 'construction', 'commissioning', 'production', 'offline')
    AND jsonb_typeof("profile"->'axes') = 'object'
    AND "profile"->'axes' ?& ARRAY['scale', 'automation', 'technical', 'efficiency', 'supplyChain', 'workforce']
    AND jsonb_typeof("profile"->'metrics') = 'array'
  )
);
