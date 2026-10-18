-- A signed-in user's preference wiki: what they open, watch, like and comment
-- on, boiled down to the categories and companies they lean to and the pins
-- they have opened (src/lib/userWiki.ts). Rebuilt from those signals after a
-- new one (src/server/model/userWiki.ts), or by `npm run user-wiki:build`.
--
--   profile   the preference the timeline weighs a crowded day's cards by
--             ({ clicked, categories, companies, signals }), when the admin
--             setting "personalBag" is on
--   page      the same as an Open Knowledge Format concept (markdown with
--             YAML frontmatter), for the user, admins and `okf` exports
CREATE TABLE "UserWiki" (
  "userId"           integer PRIMARY KEY REFERENCES "User" ("id") ON DELETE CASCADE,
  "profile"          jsonb NOT NULL,
  "page"             text NOT NULL,
  "utcBuiltDateTime" timestamptz NOT NULL DEFAULT now()
);

-- A user's opens, read on every rebuild ("PinView"'s key leads with pinId).
CREATE INDEX "IX_PinView_viewer" ON "PinView" ("viewer", "day");
