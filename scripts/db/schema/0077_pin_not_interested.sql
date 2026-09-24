-- Pins a reader marked "Not interested" (a pin card's or the pin page's
-- three-dot menu): left out of their timeline, search and "More like this"
-- from then on, until they take it back from the pin's page.
CREATE TABLE "PinNotInterested" (
  "userId"             integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "pinId"              integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("userId", "pinId")
);
