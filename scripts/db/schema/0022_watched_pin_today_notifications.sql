-- 'today' notifications: a pin you watch lands on today's date. Nothing runs on
-- a schedule, so they are written when the bell asks for its count, in the
-- viewer's time zone. "pinDay" is the date the pin landed on, and the unique
-- index keeps that to one per user, pin and day however often the bell polls
-- (a pin moved to another date can land, and notify, again).

ALTER TABLE "Notification" ADD COLUMN "pinDay" date;

CREATE UNIQUE INDEX "UX_Notification_today" ON "Notification" ("userId", "pinId", "pinDay") WHERE "type" = 'today';
