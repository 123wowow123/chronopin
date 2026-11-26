// SQL for whether pin "as" is a predicted pin: tagged 'Predicted', or an
// estimated-date pin citing a prediction market ('Prediction Market' in
// PinTagView). 'Predicted' is a derived reserved tag that a save does not store
// (model/pinTag.ts), so a query for the tag's row alone misses almost all of
// them: ask this instead. The code's twin is isPredictedPin (lib/tags.ts).
export const predictedPinOf = (as: string) =>
  `EXISTS (SELECT 1 FROM "PinTagView" AS "pt" WHERE "pt"."pinId" = "${as}"."id" AND ("pt"."name" = 'Predicted'::citext OR ("${as}"."dateConfidence" = 'estimated' AND "pt"."name" = 'Prediction Market'::citext)))`;
