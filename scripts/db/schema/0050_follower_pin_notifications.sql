-- 'pin' notifications: someone you follow posted a pin.
--
-- Following a person only ever told the person they were followed (0002); the
-- pins they went on to post never reached the follower's bell, so "I follow
-- them" was the one reason a notification could not arrive for. This is the
-- person-shaped twin of the 'company' rows 0048 added: one row per follower
-- of the pin's author, written when the pin is created.
--
-- No new column - the author is already the row's "actorId". The unique index
-- keeps a follower to one notification per pin, so a pin saved again does not
-- stack up bell entries, as 'today' and 'company' do.

CREATE UNIQUE INDEX "UX_Notification_pin" ON "Notification" ("userId", "pinId") WHERE "type" = 'pin';
