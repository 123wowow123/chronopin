-- Translations for the secondary content tables that had none: the other
-- languages the site speaks (15, the same list as PinTranslation 0044).
-- English (the source's own language) has no rows.
--
-- Every table follows PinProTipTranslation (0264): the source's key + "locale",
-- the translated columns, and "sourceHash", the sha1 of the English fields the
-- words were made from. A row whose hash no longer matches the source is not
-- shown, so editing the English text retires its translations without a
-- trigger. Rows cascade away with the source row. The translation agent makes
-- them in the same run as the pin translations, through /api/admin/content-translations; saving
-- content never writes them (see .agents/skills/prod-translations).
--
-- jsonb columns hold the source's JSON with only its prose swapped.

-- A company hub product's name and one-line summary (CompanyProduct, 0243).
CREATE TABLE "CompanyProductTranslation" (
  "productId" integer NOT NULL REFERENCES "CompanyProduct" ("id") ON DELETE CASCADE,
  "locale" varchar(5) NOT NULL,
  "name" varchar(200) NOT NULL,
  "summary" varchar(400),
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("productId", "locale"),
  CONSTRAINT "CK_CompanyProductTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_CompanyProductTranslation_name" CHECK (length(btrim("name")) > 0)
);

-- A product pin's one-line blurb (ProductBlurb, 0142).
CREATE TABLE "ProductBlurbTranslation" (
  "pinId" integer NOT NULL REFERENCES "ProductBlurb" ("pinId") ON DELETE CASCADE,
  "locale" varchar(5) NOT NULL,
  "blurb" varchar(400) NOT NULL,
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("pinId", "locale"),
  CONSTRAINT "CK_ProductBlurbTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_ProductBlurbTranslation_blurb" CHECK (length(btrim("blurb")) > 0)
);

-- A member's written review comment (PinReview, 0209). Star-only reviews have no row.
CREATE TABLE "PinReviewTranslation" (
  "reviewId" integer NOT NULL REFERENCES "PinReview" ("id") ON DELETE CASCADE,
  "locale" varchar(5) NOT NULL,
  "comment" text NOT NULL,
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("reviewId", "locale"),
  CONSTRAINT "CK_PinReviewTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_PinReviewTranslation_comment" CHECK (length(btrim("comment")) > 0)
);

-- A pin's critic-review list (PinCriticReview, 0215). "reviews" is the same array with only its prose (quotes, summaries) translated; outlets, scores and URLs are unchanged.
CREATE TABLE "PinCriticReviewTranslation" (
  "pinId" integer NOT NULL REFERENCES "PinCriticReview" ("pinId") ON DELETE CASCADE,
  "locale" varchar(5) NOT NULL,
  "reviews" jsonb NOT NULL,
  "basis" varchar(1000),
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("pinId", "locale"),
  CONSTRAINT "CK_PinCriticReviewTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_PinCriticReviewTranslation_reviews" CHECK (jsonb_typeof("reviews") IN ('object', 'array'))
);

-- A restaurant guide entry's profile (RestaurantContent, 0148) with its prose translated: dish descriptions, notes, headlines. Prices, dates, names of dishes' places and URLs are unchanged.
CREATE TABLE "RestaurantContentTranslation" (
  "contentId" integer NOT NULL REFERENCES "RestaurantContent" ("id") ON DELETE CASCADE,
  "locale" varchar(5) NOT NULL,
  "profile" jsonb NOT NULL,
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("contentId", "locale"),
  CONSTRAINT "CK_RestaurantContentTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_RestaurantContentTranslation_profile" CHECK (jsonb_typeof("profile") IN ('object', 'array'))
);

-- A restaurant-specials venue profile (RestaurantSpecialVenue, 0137) with its prose translated.
CREATE TABLE "RestaurantSpecialVenueTranslation" (
  "venueId" integer NOT NULL REFERENCES "RestaurantSpecialVenue" ("id") ON DELETE CASCADE,
  "locale" varchar(5) NOT NULL,
  "profile" jsonb NOT NULL,
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("venueId", "locale"),
  CONSTRAINT "CK_RestaurantSpecialVenueTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_RestaurantSpecialVenueTranslation_profile" CHECK (jsonb_typeof("profile") IN ('object', 'array'))
);

-- A person page's wiki text and profile prose (PersonWiki, 0151).
CREATE TABLE "PersonWikiTranslation" (
  "personId" integer NOT NULL REFERENCES "PersonWiki" ("personId") ON DELETE CASCADE,
  "locale" varchar(5) NOT NULL,
  "page" text NOT NULL,
  "profile" jsonb NOT NULL,
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("personId", "locale"),
  CONSTRAINT "CK_PersonWikiTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_PersonWikiTranslation_page" CHECK (length(btrim("page")) > 0),
  CONSTRAINT "CK_PersonWikiTranslation_profile" CHECK (jsonb_typeof("profile") IN ('object', 'array'))
);

-- A person research note's text (PersonResearchNote, 0163).
CREATE TABLE "PersonResearchNoteTranslation" (
  "noteId" integer NOT NULL REFERENCES "PersonResearchNote" ("id") ON DELETE CASCADE,
  "locale" varchar(5) NOT NULL,
  "note" text NOT NULL,
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("noteId", "locale"),
  CONSTRAINT "CK_PersonResearchNoteTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_PersonResearchNoteTranslation_note" CHECK (length(btrim("note")) > 0)
);

-- A company wiki page (CompanyWiki, 0206).
CREATE TABLE "CompanyWikiTranslation" (
  "companyId" integer NOT NULL REFERENCES "CompanyWiki" ("companyId") ON DELETE CASCADE,
  "locale" varchar(5) NOT NULL,
  "page" text NOT NULL,
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("companyId", "locale"),
  CONSTRAINT "CK_CompanyWikiTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_CompanyWikiTranslation_page" CHECK (length(btrim("page")) > 0)
);

-- An industry forecast panel's title and note (IndustryForecast, 0216).
CREATE TABLE "IndustryForecastTranslation" (
  "forecastId" integer NOT NULL REFERENCES "IndustryForecast" ("id") ON DELETE CASCADE,
  "locale" varchar(5) NOT NULL,
  "title" varchar(200) NOT NULL,
  "note" text,
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("forecastId", "locale"),
  CONSTRAINT "CK_IndustryForecastTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_IndustryForecastTranslation_title" CHECK (length(btrim("title")) > 0)
);

-- A sign's daily horoscope (DailyHoroscope, 0221).
CREATE TABLE "DailyHoroscopeTranslation" (
  "sign" varchar(16) NOT NULL,
  "day" date NOT NULL,
  "locale" varchar(5) NOT NULL,
  "text" text NOT NULL,
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("sign", "day", "locale"),
  FOREIGN KEY ("sign", "day") REFERENCES "DailyHoroscope" ("sign", "day") ON DELETE CASCADE,
  CONSTRAINT "CK_DailyHoroscopeTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_DailyHoroscopeTranslation_text" CHECK (length(btrim("text")) > 0)
);

-- A personal transit horoscope (TransitHoroscope, 0222).
CREATE TABLE "TransitHoroscopeTranslation" (
  "transits" text NOT NULL,
  "day" date NOT NULL,
  "locale" varchar(5) NOT NULL,
  "text" text NOT NULL,
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("transits", "day", "locale"),
  FOREIGN KEY ("transits", "day") REFERENCES "TransitHoroscope" ("transits", "day") ON DELETE CASCADE,
  CONSTRAINT "CK_TransitHoroscopeTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_TransitHoroscopeTranslation_text" CHECK (length(btrim("text")) > 0)
);

-- A built project's note (PinProject, 0249).
CREATE TABLE "PinProjectTranslation" (
  "pinId" integer NOT NULL REFERENCES "PinProject" ("pinId") ON DELETE CASCADE,
  "locale" varchar(5) NOT NULL,
  "note" varchar(500) NOT NULL,
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("pinId", "locale"),
  CONSTRAINT "CK_PinProjectTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_PinProjectTranslation_note" CHECK (length(btrim("note")) > 0)
);

-- A contender's name and artist (PinCandidate, 0146).
CREATE TABLE "PinCandidateTranslation" (
  "candidateId" integer NOT NULL REFERENCES "PinCandidate" ("id") ON DELETE CASCADE,
  "locale" varchar(5) NOT NULL,
  "name" varchar(200) NOT NULL,
  "artist" varchar(200),
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("candidateId", "locale"),
  CONSTRAINT "CK_PinCandidateTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_PinCandidateTranslation_name" CHECK (length(btrim("name")) > 0)
);

-- The basis note behind a pin's taste radar (PinTaste, 0157).
CREATE TABLE "PinTasteTranslation" (
  "pinId" integer NOT NULL REFERENCES "PinTaste" ("pinId") ON DELETE CASCADE,
  "locale" varchar(5) NOT NULL,
  "basis" varchar(1000) NOT NULL,
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("pinId", "locale"),
  CONSTRAINT "CK_PinTasteTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_PinTasteTranslation_basis" CHECK (length(btrim("basis")) > 0)
);
