-- Which observation a pin's chart marks, when the rule cannot know. A chart
-- marks the last observation that was over by the pin's day, which is right
-- for a release on its normal schedule (the 26 August PCE report covers July).
-- A delayed release breaks it: the January 2026 PCE report came out on
-- 13 March, after the shutdown, so the rule lands on February. Null keeps the
-- rule; a day key ("2026-01-01") names the observation outright.
ALTER TABLE "PinSeries" ADD COLUMN "markedDay" date;
